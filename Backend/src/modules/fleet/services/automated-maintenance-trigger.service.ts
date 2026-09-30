import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../../common/constants/collection-paths.constant';
import type { FirestoreDroneDocument } from '../../../database/firestore/contracts';

interface MaintenanceTrigger {
  droneId: string;
  reason: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  category: 'ROUTINE' | 'REPAIR' | 'EMERGENCY' | 'INSPECTION';
  details: string;
  autoTriggered: boolean;
}

/**
 * Automated Maintenance Trigger Service
 * 
 * Monitors drones and automatically creates maintenance tickets when:
 * 1. totalFlightHours > MAINTENANCE_INTERVAL_HOURS (100 hours)
 * 2. lastFlightDate > MAX_IDLE_DAYS without inspection (30 days)
 * 3. battery cycles > MAX_BATTERY_CYCLES
 * 4. pilot reports issue during pre-flight check
 * 5. insurance expiry < 30 days (warning)
 * 6. registration expiry < 30 days (warning)
 */
@Injectable()
export class AutomatedMaintenanceTriggerService {
  private readonly logger = new Logger(AutomatedMaintenanceTriggerService.name);

  // Configuration thresholds (from implementation plan)
  private readonly MAINTENANCE_INTERVAL_HOURS = 100;
  private readonly MAX_IDLE_DAYS = 30;
  private readonly MAX_BATTERY_CYCLES = 300;
  private readonly WARNING_DAYS_BEFORE_EXPIRY = 30;

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Check all drones and trigger maintenance tickets as needed
   * Should be run as a scheduled job (e.g., daily via cron)
   */
  async checkAllDronesForMaintenance(): Promise<{
    checked: number;
    triggered: number;
    tickets: MaintenanceTrigger[];
  }> {
    this.logger.log('Starting automated maintenance check for all drones');

    const dronesSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('status', 'in', ['deployable', 'assigned'])
      .get();

    const drones = dronesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      ...doc.data(),
    })) as any[];

    this.logger.log(`Found ${drones.length} drones to check`);

    const triggeredTickets: MaintenanceTrigger[] = [];

    for (const drone of drones) {
      const triggers = await this.checkDroneForMaintenanceTriggers(drone);
      
      if (triggers.length > 0) {
        // Create maintenance tickets for each trigger
        for (const trigger of triggers) {
          await this.createMaintenanceTicket(trigger, drone.vendorId);
          triggeredTickets.push(trigger);
        }

        // Update drone status if high priority
        if (triggers.some((t) => t.priority === 'URGENT' || t.priority === 'HIGH')) {
          await drone.ref.update({
            status: 'under_maintenance',
            updatedAt: new Date().toISOString(),
          });

          this.logger.log(`Drone ${drone.id} status changed to under_maintenance`);
        }
      }
    }

    this.logger.log(
      `Maintenance check complete. Checked: ${drones.length}, Triggered: ${triggeredTickets.length}`
    );

    return {
      checked: drones.length,
      triggered: triggeredTickets.length,
      tickets: triggeredTickets,
    };
  }

  /**
   * Check a single drone for maintenance triggers
   * Returns array of triggers (can be multiple issues)
   */
  async checkDroneForMaintenanceTriggers(drone: any): Promise<MaintenanceTrigger[]> {
    const triggers: MaintenanceTrigger[] = [];

    // Trigger 1: Flight hours exceeded
    if (drone.totalFlightHours >= this.MAINTENANCE_INTERVAL_HOURS) {
      triggers.push({
        droneId: drone.id,
        reason: 'FLIGHT_HOURS_EXCEEDED',
        priority: 'URGENT',
        category: 'ROUTINE',
        details: `Drone has ${drone.totalFlightHours} flight hours (max: ${this.MAINTENANCE_INTERVAL_HOURS}). Immediate maintenance required.`,
        autoTriggered: true,
      });
    }

    // Trigger 2: Idle too long
    if (drone.lastFlightDate) {
      const daysSinceLastFlight = this.getDaysSince(drone.lastFlightDate);
      
      if (daysSinceLastFlight > this.MAX_IDLE_DAYS) {
        triggers.push({
          droneId: drone.id,
          reason: 'IDLE_TOO_LONG',
          priority: 'NORMAL',
          category: 'INSPECTION',
          details: `Drone has been idle for ${daysSinceLastFlight} days (max: ${this.MAX_IDLE_DAYS}). Inspection recommended.`,
          autoTriggered: true,
        });
      }
    }

    // Trigger 3: Battery cycles exceeded
    if (drone.batteryCycles && drone.batteryCycles >= this.MAX_BATTERY_CYCLES) {
      triggers.push({
        droneId: drone.id,
        reason: 'BATTERY_CYCLES_EXCEEDED',
        priority: 'HIGH',
        category: 'REPAIR',
        details: `Battery has ${drone.batteryCycles} cycles (max: ${this.MAX_BATTERY_CYCLES}). Battery replacement required.`,
        autoTriggered: true,
      });
    }

    // Trigger 4: Insurance expiring soon
    if (drone.insuranceExpiry) {
      const daysUntilExpiry = this.getDaysUntil(drone.insuranceExpiry);
      
      if (daysUntilExpiry < this.WARNING_DAYS_BEFORE_EXPIRY && daysUntilExpiry >= 0) {
        triggers.push({
          droneId: drone.id,
          reason: 'INSURANCE_EXPIRING',
          priority: daysUntilExpiry <= 7 ? 'HIGH' : 'NORMAL',
          category: 'INSPECTION',
          details: `Insurance expires in ${daysUntilExpiry} days. Renewal required.`,
          autoTriggered: true,
        });
      }

      if (daysUntilExpiry < 0) {
        triggers.push({
          droneId: drone.id,
          reason: 'INSURANCE_EXPIRED',
          priority: 'URGENT',
          category: 'EMERGENCY',
          details: `Insurance has expired. Drone cannot be deployed until renewed.`,
          autoTriggered: true,
        });
      }
    }

    // Trigger 5: Registration expiring soon
    if (drone.registrationExpiry) {
      const daysUntilExpiry = this.getDaysUntil(drone.registrationExpiry);
      
      if (daysUntilExpiry < this.WARNING_DAYS_BEFORE_EXPIRY && daysUntilExpiry >= 0) {
        triggers.push({
          droneId: drone.id,
          reason: 'REGISTRATION_EXPIRING',
          priority: daysUntilExpiry <= 7 ? 'HIGH' : 'NORMAL',
          category: 'INSPECTION',
          details: `Registration expires in ${daysUntilExpiry} days. Renewal required.`,
          autoTriggered: true,
        });
      }

      if (daysUntilExpiry < 0) {
        triggers.push({
          droneId: drone.id,
          reason: 'REGISTRATION_EXPIRED',
          priority: 'URGENT',
          category: 'EMERGENCY',
          details: `Registration has expired. Drone cannot be deployed until renewed.`,
          autoTriggered: true,
        });
      }
    }

    // Trigger 6: Maintenance overdue
    if (drone.nextMaintenanceDue) {
      const daysUntilMaintenance = this.getDaysUntil(drone.nextMaintenanceDue);
      
      if (daysUntilMaintenance < 0) {
        const daysOverdue = Math.abs(daysUntilMaintenance);
        triggers.push({
          droneId: drone.id,
          reason: 'MAINTENANCE_OVERDUE',
          priority: daysOverdue > 7 ? 'URGENT' : 'HIGH',
          category: 'ROUTINE',
          details: `Maintenance is overdue by ${daysOverdue} days. Immediate service required.`,
          autoTriggered: true,
        });
      }
    }

    return triggers;
  }

  /**
   * Trigger maintenance from pilot pre-flight check
   * Called when pilot reports issue during pre-flight inspection
   */
  async triggerFromPreFlightCheck(
    droneId: string,
    pilotId: string,
    issue: {
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      photos?: string[];
    }
  ): Promise<MaintenanceTrigger> {
    const trigger: MaintenanceTrigger = {
      droneId,
      reason: 'PILOT_REPORTED_ISSUE',
      priority: this.mapSeverityToPriority(issue.severity),
      category: issue.severity === 'CRITICAL' ? 'EMERGENCY' : 'REPAIR',
      details: `Pilot ${pilotId} reported: ${issue.description}`,
      autoTriggered: false, // Manual trigger by pilot
    };

    // Get drone's vendorId
    const droneSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('id', '==', droneId)
      .limit(1)
      .get();

    if (droneSnapshot.empty) {
      throw new Error(`Drone ${droneId} not found`);
    }

    const drone = droneSnapshot.docs[0].data();
    await this.createMaintenanceTicket(trigger, drone.vendorId, {
      reportedBy: pilotId,
      photos: issue.photos,
    });

    // If critical, ground the drone immediately
    if (issue.severity === 'CRITICAL') {
      await droneSnapshot.docs[0].ref.update({
        status: 'under_maintenance',
        updatedAt: new Date().toISOString(),
      });

      this.logger.log(`Drone ${droneId} grounded due to critical issue reported by pilot ${pilotId}`);
    }

    return trigger;
  }

  /**
   * Create maintenance ticket in Firestore
   */
  private async createMaintenanceTicket(
    trigger: MaintenanceTrigger,
    vendorId: string,
    additionalData?: any
  ): Promise<string> {
    const ticketRef = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.maintenanceLogs)
      .doc();

    const now = new Date().toISOString();

    const ticket = {
      id: ticketRef.id,
      droneId: trigger.droneId,
      vendorId,
      title: this.generateTicketTitle(trigger.reason),
      description: trigger.details,
      category: trigger.category,
      priority: trigger.priority,
      reason: trigger.reason,
      status: 'open',
      stage: 'REPORTED',
      autoTriggered: trigger.autoTriggered,
      technicianId: null,
      estimatedCost: null,
      estimatedDurationHours: null,
      scheduledDate: null,
      completedAt: null,
      mediaUrls: additionalData?.photos || [],
      reportedBy: additionalData?.reportedBy || 'system',
      createdAt: now,
      updatedAt: now,
    };

    await ticketRef.set(ticket);

    // Emit event for notification
    this.eventEmitter.emit('maintenance.auto_triggered', {
      ticketId: ticketRef.id,
      droneId: trigger.droneId,
      vendorId,
      priority: trigger.priority,
      reason: trigger.reason,
    });

    this.logger.log(
      `Maintenance ticket ${ticketRef.id} created for drone ${trigger.droneId}: ${trigger.reason}`
    );

    return ticketRef.id;
  }

  /**
   * Generate human-readable ticket title from reason code
   */
  private generateTicketTitle(reason: string): string {
    const titles: Record<string, string> = {
      FLIGHT_HOURS_EXCEEDED: 'Scheduled Maintenance - Flight Hours Exceeded',
      IDLE_TOO_LONG: 'Inspection Required - Prolonged Inactivity',
      BATTERY_CYCLES_EXCEEDED: 'Battery Replacement Required',
      INSURANCE_EXPIRING: 'Insurance Renewal Required',
      INSURANCE_EXPIRED: 'URGENT: Insurance Expired',
      REGISTRATION_EXPIRING: 'Registration Renewal Required',
      REGISTRATION_EXPIRED: 'URGENT: Registration Expired',
      MAINTENANCE_OVERDUE: 'Overdue Maintenance Service',
      PILOT_REPORTED_ISSUE: 'Pilot Reported Issue - Pre-Flight Check',
    };

    return titles[reason] || 'Maintenance Required';
  }

  /**
   * Map issue severity to maintenance priority
   */
  private mapSeverityToPriority(
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    const mapping: Record<string, 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'> = {
      LOW: 'LOW',
      MEDIUM: 'NORMAL',
      HIGH: 'HIGH',
      CRITICAL: 'URGENT',
    };

    return mapping[severity];
  }

  /**
   * Calculate days since a date
   */
  private getDaysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate days until a date
   */
  private getDaysUntil(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get summary of maintenance triggers for all drones
   * Useful for fleet manager dashboard
   */
  async getMaintenanceAlertsSummary(vendorId: string): Promise<{
    total: number;
    byPriority: Record<string, number>;
    byReason: Record<string, number>;
    urgentDrones: string[];
  }> {
    const dronesSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('vendorId', '==', vendorId)
      .where('status', 'in', ['deployable', 'assigned'])
      .get();

    const drones = dronesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const allTriggers: MaintenanceTrigger[] = [];
    const urgentDrones: string[] = [];

    for (const drone of drones) {
      const triggers = await this.checkDroneForMaintenanceTriggers(drone);
      allTriggers.push(...triggers);

      if (triggers.some((t) => t.priority === 'URGENT')) {
        urgentDrones.push(drone.id);
      }
    }

    const byPriority: Record<string, number> = {
      LOW: 0,
      NORMAL: 0,
      HIGH: 0,
      URGENT: 0,
    };

    const byReason: Record<string, number> = {};

    for (const trigger of allTriggers) {
      byPriority[trigger.priority]++;
      byReason[trigger.reason] = (byReason[trigger.reason] || 0) + 1;
    }

    return {
      total: allTriggers.length,
      byPriority,
      byReason,
      urgentDrones,
    };
  }
}

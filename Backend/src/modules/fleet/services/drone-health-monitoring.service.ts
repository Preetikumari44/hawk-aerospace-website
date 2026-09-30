import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { FirestoreDroneDocument } from '../../../database/firestore/contracts';
import type { DroneHealthCheckDto, DroneHealthResponseDto } from '../dto/drone-health.dto';

interface HealthIssue {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  requiresAction: boolean;
}

@Injectable()
export class DroneHealthMonitoringService {
  private readonly logger = new Logger(DroneHealthMonitoringService.name);

  // Configuration thresholds
  private readonly MAINTENANCE_INTERVAL_HOURS = 100;
  private readonly MAX_BATTERY_CYCLES = 300;
  private readonly MAX_IDLE_DAYS = 30;
  private readonly WARNING_DAYS_BEFORE_EXPIRY = 30;
  private readonly CRITICAL_DAYS_BEFORE_EXPIRY = 7;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Comprehensive drone health check
   * Returns health score (0-100) and list of issues
   */
  evaluateDroneHealth(
    drone: FirestoreDroneDocument,
    additionalData?: Partial<DroneHealthCheckDto>
  ): DroneHealthResponseDto {
    const issues: HealthIssue[] = [];
    let healthScore = 100;

    // Check 1: Flight hours vs maintenance interval
    const flightHourIssue = this.checkFlightHours(
      additionalData?.totalFlightHours ?? drone.totalFlightHours
    );
    if (flightHourIssue) {
      issues.push(flightHourIssue);
      healthScore -= this.getSeverityPenalty(flightHourIssue.severity);
    }

    // Check 2: Battery cycles
    if (additionalData?.batteryCycles) {
      const batteryIssue = this.checkBatteryCycles(additionalData.batteryCycles);
      if (batteryIssue) {
        issues.push(batteryIssue);
        healthScore -= this.getSeverityPenalty(batteryIssue.severity);
      }
    }

    // Check 3: Idle time
    const lastFlightDate = additionalData?.lastFlightDate || drone.lastMaintenance;
    if (lastFlightDate) {
      const idleIssue = this.checkIdleTime(lastFlightDate);
      if (idleIssue) {
        issues.push(idleIssue);
        healthScore -= this.getSeverityPenalty(idleIssue.severity);
      }
    }

    // Check 4: Maintenance schedule
    const maintenanceIssue = this.checkMaintenanceSchedule(
      additionalData?.lastMaintenanceDate || drone.lastMaintenance || null,
      drone.nextMaintenanceDue ?? null
    );
    if (maintenanceIssue) {
      issues.push(maintenanceIssue);
      healthScore -= this.getSeverityPenalty(maintenanceIssue.severity);
    }

    // Check 5: Insurance expiry
    if (additionalData?.insuranceExpiry) {
      const insuranceIssue = this.checkInsuranceExpiry(additionalData.insuranceExpiry);
      if (insuranceIssue) {
        issues.push(insuranceIssue);
        healthScore -= this.getSeverityPenalty(insuranceIssue.severity);
      }
    }

    // Check 6: Registration expiry
    if (additionalData?.registrationExpiry) {
      const registrationIssue = this.checkRegistrationExpiry(additionalData.registrationExpiry);
      if (registrationIssue) {
        issues.push(registrationIssue);
        healthScore -= this.getSeverityPenalty(registrationIssue.severity);
      }
    }

    // Determine overall status
    const status = this.determineHealthStatus(healthScore, issues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, drone);

    // Emit event if health is critical
    if (status === 'CRITICAL' || status === 'GROUNDED') {
      this.eventEmitter.emit('drone.health.critical', {
        droneId: drone.id,
        status,
        healthScore,
        issues,
      });
    }

    return {
      droneId: drone.id,
      status,
      score: Math.max(0, Math.round(healthScore)),
      issues,
      nextMaintenanceDue: drone.nextMaintenanceDue ?? undefined,
      recommendations,
    };
  }

  /**
   * Check if drone needs maintenance based on flight hours
   */
  private checkFlightHours(totalFlightHours: number): HealthIssue | null {
    if (totalFlightHours >= this.MAINTENANCE_INTERVAL_HOURS) {
      return {
        type: 'FLIGHT_HOURS_EXCEEDED',
        severity: 'CRITICAL',
        message: `Drone has exceeded maintenance interval (${totalFlightHours}/${this.MAINTENANCE_INTERVAL_HOURS} hours)`,
        requiresAction: true,
      };
    }

    if (totalFlightHours >= this.MAINTENANCE_INTERVAL_HOURS * 0.9) {
      return {
        type: 'FLIGHT_HOURS_WARNING',
        severity: 'MEDIUM',
        message: `Drone approaching maintenance interval (${totalFlightHours}/${this.MAINTENANCE_INTERVAL_HOURS} hours)`,
        requiresAction: false,
      };
    }

    return null;
  }

  /**
   * Check battery health based on charge cycles
   */
  private checkBatteryCycles(batteryCycles: number): HealthIssue | null {
    if (batteryCycles >= this.MAX_BATTERY_CYCLES) {
      return {
        type: 'BATTERY_REPLACEMENT_NEEDED',
        severity: 'HIGH',
        message: `Battery has reached maximum cycles (${batteryCycles}/${this.MAX_BATTERY_CYCLES})`,
        requiresAction: true,
      };
    }

    if (batteryCycles >= this.MAX_BATTERY_CYCLES * 0.8) {
      return {
        type: 'BATTERY_AGING',
        severity: 'LOW',
        message: `Battery aging (${batteryCycles}/${this.MAX_BATTERY_CYCLES} cycles)`,
        requiresAction: false,
      };
    }

    return null;
  }

  /**
   * Check if drone has been idle too long
   */
  private checkIdleTime(lastFlightDate: string): HealthIssue | null {
    const daysSinceLastFlight = this.getDaysSince(lastFlightDate);

    if (daysSinceLastFlight > this.MAX_IDLE_DAYS) {
      return {
        type: 'IDLE_TOO_LONG',
        severity: 'MEDIUM',
        message: `Drone has been idle for ${daysSinceLastFlight} days. Inspection recommended.`,
        requiresAction: true,
      };
    }

    return null;
  }

  /**
   * Check maintenance schedule adherence
   */
  private checkMaintenanceSchedule(
    lastMaintenance: string | null,
    nextMaintenanceDue: string | null
  ): HealthIssue | null {
    if (!nextMaintenanceDue) {
      return {
        type: 'NO_MAINTENANCE_SCHEDULE',
        severity: 'LOW',
        message: 'No maintenance schedule set',
        requiresAction: true,
      };
    }

    const daysUntilMaintenance = this.getDaysUntil(nextMaintenanceDue);

    if (daysUntilMaintenance < 0) {
      return {
        type: 'MAINTENANCE_OVERDUE',
        severity: 'CRITICAL',
        message: `Maintenance is overdue by ${Math.abs(daysUntilMaintenance)} days`,
        requiresAction: true,
      };
    }

    if (daysUntilMaintenance <= 3) {
      return {
        type: 'MAINTENANCE_DUE_SOON',
        severity: 'MEDIUM',
        message: `Maintenance due in ${daysUntilMaintenance} days`,
        requiresAction: false,
      };
    }

    return null;
  }

  /**
   * Check insurance validity
   */
  private checkInsuranceExpiry(insuranceExpiry: string): HealthIssue | null {
    const daysUntilExpiry = this.getDaysUntil(insuranceExpiry);

    if (daysUntilExpiry < 0) {
      return {
        type: 'INSURANCE_EXPIRED',
        severity: 'CRITICAL',
        message: 'Insurance has expired. Drone cannot be deployed.',
        requiresAction: true,
      };
    }

    if (daysUntilExpiry <= this.CRITICAL_DAYS_BEFORE_EXPIRY) {
      return {
        type: 'INSURANCE_EXPIRING_SOON',
        severity: 'HIGH',
        message: `Insurance expires in ${daysUntilExpiry} days`,
        requiresAction: true,
      };
    }

    if (daysUntilExpiry <= this.WARNING_DAYS_BEFORE_EXPIRY) {
      return {
        type: 'INSURANCE_RENEWAL_DUE',
        severity: 'MEDIUM',
        message: `Insurance renewal due in ${daysUntilExpiry} days`,
        requiresAction: false,
      };
    }

    return null;
  }

  /**
   * Check registration validity
   */
  private checkRegistrationExpiry(registrationExpiry: string): HealthIssue | null {
    const daysUntilExpiry = this.getDaysUntil(registrationExpiry);

    if (daysUntilExpiry < 0) {
      return {
        type: 'REGISTRATION_EXPIRED',
        severity: 'CRITICAL',
        message: 'Registration has expired. Drone cannot be deployed.',
        requiresAction: true,
      };
    }

    if (daysUntilExpiry <= this.CRITICAL_DAYS_BEFORE_EXPIRY) {
      return {
        type: 'REGISTRATION_EXPIRING_SOON',
        severity: 'HIGH',
        message: `Registration expires in ${daysUntilExpiry} days`,
        requiresAction: true,
      };
    }

    if (daysUntilExpiry <= this.WARNING_DAYS_BEFORE_EXPIRY) {
      return {
        type: 'REGISTRATION_RENEWAL_DUE',
        severity: 'MEDIUM',
        message: `Registration renewal due in ${daysUntilExpiry} days`,
        requiresAction: false,
      };
    }

    return null;
  }

  /**
   * Determine overall health status from score and issues
   */
  private determineHealthStatus(
    score: number,
    issues: HealthIssue[]
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'GROUNDED' {
    const hasCriticalIssue = issues.some((i) => i.severity === 'CRITICAL');
    const hasHighIssue = issues.some((i) => i.severity === 'HIGH');

    if (hasCriticalIssue || score < 30) {
      return 'GROUNDED';
    }

    if (hasHighIssue || score < 50) {
      return 'CRITICAL';
    }

    if (score < 70) {
      return 'WARNING';
    }

    return 'HEALTHY';
  }

  /**
   * Generate actionable recommendations based on issues
   */
  private generateRecommendations(
    issues: HealthIssue[],
    drone: FirestoreDroneDocument
  ): string[] {
    const recommendations: string[] = [];

    if (issues.some((i) => i.type === 'FLIGHT_HOURS_EXCEEDED')) {
      recommendations.push('Schedule immediate maintenance inspection');
      recommendations.push('Ground drone until maintenance is completed');
    }

    if (issues.some((i) => i.type === 'BATTERY_REPLACEMENT_NEEDED')) {
      recommendations.push('Replace battery pack');
      recommendations.push('Order replacement battery immediately');
    }

    if (issues.some((i) => i.type === 'IDLE_TOO_LONG')) {
      recommendations.push('Perform pre-flight inspection');
      recommendations.push('Test all systems before next mission');
    }

    if (issues.some((i) => i.type.includes('INSURANCE'))) {
      recommendations.push('Renew insurance policy');
      recommendations.push('Do not deploy until insurance is valid');
    }

    if (issues.some((i) => i.type.includes('REGISTRATION'))) {
      recommendations.push('Renew DGCA registration');
      recommendations.push('Ensure all compliance documents are up to date');
    }

    if (recommendations.length === 0) {
      recommendations.push('Drone is in good health');
      recommendations.push('Continue regular maintenance schedule');
    }

    return recommendations;
  }

  /**
   * Get penalty score based on issue severity
   */
  private getSeverityPenalty(severity: string): number {
    switch (severity) {
      case 'CRITICAL':
        return 30;
      case 'HIGH':
        return 20;
      case 'MEDIUM':
        return 10;
      case 'LOW':
        return 5;
      default:
        return 0;
    }
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
   * Batch check health for multiple drones
   */
  async batchHealthCheck(drones: FirestoreDroneDocument[]): Promise<DroneHealthResponseDto[]> {
    return drones.map((drone) => this.evaluateDroneHealth(drone));
  }

  /**
   * Get drones that need immediate attention
   */
  getGroundedDrones(healthResults: DroneHealthResponseDto[]): DroneHealthResponseDto[] {
    return healthResults.filter(
      (result) => result.status === 'GROUNDED' || result.status === 'CRITICAL'
    );
  }
}

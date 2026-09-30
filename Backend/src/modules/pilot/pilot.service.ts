import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { CollectionReference } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import { CacheService } from '../../common/cache/cache.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
  FirestoreUserDocument,
  FirestoreServiceTicketDocument,
  GeoPointValue,
  FirestoreMissionDocument,
  FirestoreBookingDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { BookingService } from '../booking/booking.service';
import { PricingService } from '../pricing/pricing.service';
import { UsersService } from '../users/users.service';
import { PilotOnboardDto } from './dto/pilot-onboard.dto';
import { PilotPriceLockDto } from './dto/price-lock.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdatePilotProfileDto } from './dto/update-profile.dto';
import { UpdatePayoutMethodDto } from './dto/update-payout.dto';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import type { PilotRewardsSummary } from './interfaces/pilot.interface';

@Injectable()
export class PilotService {
  private readonly logger = new Logger(PilotService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly pricingService: PricingService,
    private readonly bookingService: BookingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async onboardPilot(dto: PilotOnboardDto, user: CurrentUser): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const updated: FirestoreUserDocument = {
      ...existing,
      role: 'pilot',
      status: 'pending',
      adminApproval: false,
      profileData: {
        ...existing.profileData,
        assignedVendorUid: dto.vendorUid,
        serviceTypes: dto.serviceTypes,
      },
      verification: {
        isVerified: false,
        documents: dto.documents,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    return updated;
  }

  async lockPrice(bookingId: string, dto: PilotPriceLockDto, user: CurrentUser) {
    const booking = await this.bookingService.getBooking(bookingId, user);
    const locked = await this.pricingService.lockPrice(
      {
        ...dto,
        bookingId,
        customerUid: booking.customerUid,
      },
      user.uid,
    );
    const updatedBooking = await this.bookingService.applyPriceLock(
      bookingId,
      locked.finalAmount,
      dto.paymentMethod,
      user.uid,
    );

    this.eventEmitter.emit(WS_EVENTS.PRICE_LOCKED, {
      bookingId,
      pilotUid: user.uid,
      customerUid: booking.customerUid,
      lockedAmount: locked.finalAmount,
      paymentMethod: dto.paymentMethod,
      timestamp: new Date().toISOString(),
    });

    return {
      booking: updatedBooking,
      previousEstimate: booking.priceEstimation,
      pricing: locked,
    };
  }

  getRewards(user: CurrentUser): PilotRewardsSummary {
    return {
      pilotUid: user.uid,
      points: 0,
      badges: [],
    };
  }

  // Profile Management
  async getProfile(user: CurrentUser): Promise<any> {
    const db = this.firebaseAdminService.firestore();
    const profile = await this.usersService.getByUid(user.uid);

    // Fetch fleet managers assigned to this pilot (scalar legacy + array, max 3)
    const fmUids: string[] = [];
    if (Array.isArray(profile.profileData?.fleetManagerUids)) {
      fmUids.push(...profile.profileData.fleetManagerUids);
    }
    if (profile.profileData?.assignedFleetManagerUid) {
      fmUids.push(profile.profileData.assignedFleetManagerUid);
    }
    if (profile.profileData?.assignedVendorUid) {
      fmUids.push(profile.profileData.assignedVendorUid);
    }

    const fleetManagers: any[] = [];
    for (const uid of [...new Set(fmUids)]) {
      try {
        const fmDoc = await db.collection(ROOT_COLLECTIONS.users).doc(uid).get();
        if (fmDoc.exists) {
          const fmData = fmDoc.data() as FirestoreUserDocument;
          const dronesSnapshot = await db
            .collection('drones')
            .where('fleetManagerUid', '==', uid)
            .where('status', '==', 'deployable')
            .limit(1)
            .get();
          fleetManagers.push({
            uid,
            name: fmData.name || 'Fleet Manager',
            dronesCount: dronesSnapshot.size,
            totalDrones: dronesSnapshot.size,
            address: fmData.profileData?.address || 'Address unavailable',
            location: {
              address: fmData.profileData?.address || '',
              city: fmData.profileData?.district || '',
              pincode: fmData.profileData?.pincode || '',
            },
          });
        }
      } catch {
        // skip if fleet manager doc is not accessible
      }
    }

    const result: any = { ...profile, fleetManagers };
    
    // Cache pilot profile for 5 minutes
    await this.cacheService.set(`pilot:profile:${user.uid}`, result, 300);
    
    return result;
  }

  async updateProfile(
    dto: UpdatePilotProfileDto,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const now = new Date().toISOString();

    const updated: FirestoreUserDocument = {
      ...existing,
      ...(dto.name && { name: dto.name }),
      ...(dto.email && { email: dto.email }),
      profileData: {
        ...existing.profileData,
        ...(dto.serviceTypes && { serviceTypes: dto.serviceTypes }),
        ...dto.profileData,
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    // Invalidate cache
    await this.cacheService.delete(`pilot:profile:${user.uid}`);

    this.logger.log(`Pilot profile updated: ${user.uid}`);
    return updated;
  }

  // Availability Management
  async updateAvailability(
    dto: UpdateAvailabilityDto,
    user: CurrentUser,
  ): Promise<{ isOnline: boolean }> {
    const existing = await this.usersService.getByUid(user.uid);
    const now = new Date().toISOString();

    const updated: FirestoreUserDocument = {
      ...existing,
      profileData: {
        ...existing.profileData,
        isOnline: dto.isOnline,
        lastAvailabilityChange: now,
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    // Mirror duty state onto the pilots doc so fleet managers see the pilot
    // as Available vs Off-Duty in their roster (fmPilotList tabs).
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.pilots)
      .doc(user.uid)
      .set(
        {
          isOnline: dto.isOnline,
          status: dto.isOnline ? 'AVAILABLE' : 'OFF_DUTY',
          updatedAt: now,
        },
        { merge: true },
      )
      .catch(() => {
        /* pilots doc mirror is best-effort */
      });

    // Invalidate cache
    await this.cacheService.delete(`pilot:profile:${user.uid}`);

    this.eventEmitter.emit(WS_EVENTS.PILOT_AVAILABILITY_CHANGED, {
      pilotUid: user.uid,
      isOnline: dto.isOnline,
      timestamp: now,
    });

    this.logger.log(`Pilot availability updated: ${user.uid} - ${dto.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    
    return { isOnline: dto.isOnline };
  }

  // GPS Location Tracking
  async updateLocation(dto: UpdateLocationDto, user: CurrentUser): Promise<void> {
    const now = new Date().toISOString();
    const location: GeoPointValue = {
      lat: dto.lat,
      lng: dto.lng,
    };

    // Update user profile with current location
    const existing = await this.usersService.getByUid(user.uid);
    const updated: FirestoreUserDocument = {
      ...existing,
      profileData: {
        ...existing.profileData,
        currentLocation: location,
        lastLocationUpdate: now,
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    // Broadcast location to any active missions
    this.eventEmitter.emit(WS_EVENTS.PILOT_LOCATION_UPDATED, {
      pilotUid: user.uid,
      location,
      timestamp: now,
    });

    // Mirror GPS into the pilots collection doc so team/geo queries
    // (e.g. FM "available pilots" radius filter) work without extra reads.
    this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.pilots)
      .doc(user.uid)
      .set({ currentLocation: location, lastLocationUpdate: now, updatedAt: now }, { merge: true })
      .catch(() => {
        /* pilots doc mirror is best-effort */
      });

    // Update cache with short TTL (30 seconds)
    await this.cacheService.set(`pilot:location:${user.uid}`, location, 30);
  }

  // Earnings & Payments
  async getEarningsDashboard(user: CurrentUser) {
    const cacheKey = `pilot:earnings:${user.uid}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query completed missions
    const missionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .where('pilotUid', '==', user.uid)
      .where('status', '==', 'completed')
      .get();

    let totalEarnings = 0;
    let thisMonthEarnings = 0;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    for (const doc of missionsSnapshot.docs) {
      const mission = doc.data();
      const earning = (mission as any).pilotEarning || 0;
      totalEarnings += earning;

      if (mission.createdAt >= thisMonthStart) {
        thisMonthEarnings += earning;
      }
    }

    const dashboard = {
      pilotUid: user.uid,
      totalEarnings,
      thisMonthEarnings,
      completedMissions: missionsSnapshot.size,
      pendingSettlement: 0, // TODO: Calculate from pending earnings
    };

    await this.cacheService.set(cacheKey, dashboard, 300); // 5 min cache
    return dashboard;
  }

  async getPendingEarnings(user: CurrentUser) {
    // Query missions that are completed but not yet settled
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .where('pilotUid', '==', user.uid)
      .where('status', '==', 'completed')
      .get();

    const pendingEarnings = snapshot.docs
      .map((doc) => {
        const mission = doc.data();
        return {
          missionId: mission.requestId,
          bookingId: mission.bookingId,
          amount: (mission as any).pilotEarning || 0,
          completedAt: mission.endTime,
          status: 'pending_settlement',
        };
      })
      .filter((e) => e.amount > 0);

    return pendingEarnings;
  }

  async getEarningsHistory(user: CurrentUser) {
    // Query settled earnings (this would typically come from a settlements collection)
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .where('pilotUid', '==', user.uid)
      .where('status', '==', 'completed')
      .orderBy('endTime', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => {
      const mission = doc.data();
      return {
        missionId: mission.requestId,
        bookingId: mission.bookingId,
        amount: (mission as any).pilotEarning || 0,
        settledAt: mission.endTime,
        status: 'settled',
      };
    });
  }

  async updatePayoutMethod(
    dto: UpdatePayoutMethodDto,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const now = new Date().toISOString();

    const payoutDetails =
      dto.method === 'bank'
        ? {
            method: dto.method,
            accountNumber: dto.accountNumber,
            ifscCode: dto.ifscCode,
            accountHolderName: dto.accountHolderName,
          }
        : {
            method: dto.method,
            upiId: dto.upiId,
          };

    const updated: FirestoreUserDocument = {
      ...existing,
      profileData: {
        ...existing.profileData,
        payoutMethod: payoutDetails,
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    await this.cacheService.delete(`pilot:profile:${user.uid}`);

    this.logger.log(`Pilot payout method updated: ${user.uid}`);
    return updated;
  }

  // Maintenance Tickets
  async createMaintenanceTicket(
    dto: CreateMaintenanceTicketDto,
    user: CurrentUser,
  ): Promise<FirestoreServiceTicketDocument> {
    const now = new Date().toISOString();
    const ticketId = this.firebaseAdminService.firestore().collection(ROOT_COLLECTIONS.serviceTickets).doc().id;

    // Get pilot's assignedVendorUid
    const pilot = await this.usersService.getByUid(user.uid);
    const vendorUid = pilot.profileData?.assignedVendorUid as string | undefined;

    const ticket: FirestoreServiceTicketDocument = {
      id: ticketId,
      ticketId,
      droneId: dto.droneId,
      pilotUid: user.uid,
      fleetManagerUid: dto.fleetManagerUid || vendorUid || null,
      technicianUid: null,
      category: dto.category,
      description: dto.description,
      priority: dto.priority,
      missionId: dto.missionId ?? null,
      location: dto.location ?? null,
      dateTime: dto.dateTime ?? null,
      fleetManagerName: dto.fleetManagerName ?? null,
      mediaUrls: dto.mediaUrls || [],
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.serviceTickets)
      .doc(ticketId)
      .set(ticket);

    this.eventEmitter.emit('maintenance.ticket.created', {
      ticketId,
      pilotUid: user.uid,
      droneId: dto.droneId,
      priority: dto.priority,
      timestamp: now,
    });

    this.logger.log(`Maintenance ticket created: ${ticketId} by pilot ${user.uid}`);
    return ticket;
  }

  async getMaintenanceTickets(user: CurrentUser): Promise<FirestoreServiceTicketDocument[]> {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.serviceTickets)
      .where('pilotUid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreServiceTicketDocument);
  }

  async getMaintenanceTicket(ticketId: string, user: CurrentUser): Promise<FirestoreServiceTicketDocument> {
    const doc = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.serviceTickets)
      .doc(ticketId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Maintenance ticket ${ticketId} not found`);
    }

    const ticket = doc.data() as FirestoreServiceTicketDocument;
    
    if (ticket.pilotUid !== user.uid) {
      throw new BadRequestException('You do not have access to this ticket');
    }

    return ticket;
  }

  // Complaints
  async createComplaint(dto: CreateComplaintDto, user: CurrentUser) {
    const now = new Date().toISOString();
    const complaintId = this.firebaseAdminService.firestore().collection('complaints').doc().id;

    const complaint = {
      id: complaintId,
      pilotUid: user.uid,
      subject: dto.subject,
      description: dto.description,
      bookingId: dto.bookingId || null,
      category: dto.category,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection('complaints')
      .doc(complaintId)
      .set(complaint);

    this.eventEmitter.emit('complaint.created', {
      complaintId,
      pilotUid: user.uid,
      category: dto.category,
      timestamp: now,
    });

    this.logger.log(`Complaint created: ${complaintId} by pilot ${user.uid}`);
    return complaint;
  }

  async getComplaints(user: CurrentUser) {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('complaints')
      .where('pilotUid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

  async getComplaint(complaintId: string, user: CurrentUser) {
    const doc = await this.firebaseAdminService
      .firestore()
      .collection('complaints')
      .doc(complaintId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Complaint ${complaintId} not found`);
    }

    const complaint = doc.data();
    
    if (complaint?.pilotUid !== user.uid) {
      throw new BadRequestException('You do not have access to this complaint');
    }

    return complaint;
  }

  // Notification Settings
  async updateNotificationSettings(
    dto: UpdateNotificationSettingsDto,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const now = new Date().toISOString();

    const updated: FirestoreUserDocument = {
      ...existing,
      profileData: {
        ...existing.profileData,
        notificationSettings: {
          ...((existing.profileData?.notificationSettings as any) || {}),
          ...dto,
        },
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    await this.cacheService.delete(`pilot:profile:${user.uid}`);

    this.logger.log(`Pilot notification settings updated: ${user.uid}`);
    return updated;
  }

  async getNotificationSettings(user: CurrentUser) {
    const pilot = await this.usersService.getByUid(user.uid);
    return (pilot.profileData?.notificationSettings as any) || {
      pushNotifications: true,
      smsNotifications: true,
      emailNotifications: true,
      missionAlerts: true,
      earningsUpdates: true,
    };
  }

  // Account Deletion
  async requestDeletion(user: CurrentUser) {
    // Check for active missions
    const activeMissionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .where('pilotUid', '==', user.uid)
      .where('status', 'in', ['pending', 'accepted', 'en_route', 'at_location', 'preflight', 'started'])
      .get();

    if (!activeMissionsSnapshot.empty) {
      throw new BadRequestException(
        'Cannot delete account with active missions. Please complete or cancel all active missions first.',
      );
    }

    const now = new Date().toISOString();
    const deletionRequestId = this.firebaseAdminService.firestore().collection('deletion_requests').doc().id;

    const deletionRequest = {
      id: deletionRequestId,
      userId: user.uid,
      role: 'pilot',
      requestedAt: now,
      status: 'pending',
      processedAt: null,
    };

    await this.firebaseAdminService
      .firestore()
      .collection('deletion_requests')
      .doc(deletionRequestId)
      .set(deletionRequest);

    this.logger.log(`Account deletion requested by pilot: ${user.uid}`);

    return {
      message: 'Account deletion request submitted. Admin will review within 48 hours.',
      requestId: deletionRequestId,
    };
  }

  /**
   * ⭐ Event Listener: Handle pilot auto-assignment trigger after fleet manager accepts
   * This enforces the hierarchy: Fleet Manager accepts → Auto-assign pilot from that FM
   */
  @OnEvent('pilot.auto-assign.trigger')
  async handlePilotAutoAssignmentTrigger(payload: {
    bookingId: string;
    fleetManagerUid: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Received pilot auto-assignment trigger for booking ${payload.bookingId} (Fleet Manager: ${payload.fleetManagerUid})`
      );

      // Guard: Skip if pilot+drone already assigned (full auto-assignment may have already completed)
      const existingBooking = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.bookings)
        .doc(payload.bookingId)
        .get();
      if (existingBooking.exists) {
        const data = existingBooking.data() as FirestoreBookingDocument;
        if (data.assignedPilot && data.assignedDrone) {
          this.logger.log(
            `Booking ${payload.bookingId} already has pilot ${data.assignedPilot} and drone ${data.assignedDrone} assigned, skipping legacy pilot-only flow`
          );
          return;
        }
      }

      // Call auto-assignment with the fleet manager UID
      const result = await this.autoAssignPilot(payload.bookingId, payload.fleetManagerUid);

      if (result.assignedPilot && result.topCandidates.length > 0) {
        // Send mission requests to top 3 pilots
        const pilotUids = result.topCandidates.map((c) => c.pilot.uid);
        await this.sendMissionRequests(payload.bookingId, pilotUids);

        this.logger.log(
          `Pilot auto-assignment completed for booking ${payload.bookingId}: ${result.topCandidates.length} candidates, requests sent to pilots`
        );
      } else {
        // No pilots available - notify fleet manager
        this.logger.warn(
          `No pilots available for booking ${payload.bookingId} from fleet manager ${payload.fleetManagerUid}: ${result.reason}`
        );

        // Emit event to notify fleet manager
        this.eventEmitter.emit('pilot.assignment.failed', {
          bookingId: payload.bookingId,
          fleetManagerUid: payload.fleetManagerUid,
          reason: result.reason,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling pilot auto-assignment trigger for booking ${payload.bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Helper method: Calculate Haversine distance
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Mission Auto-Assignment Algorithm
  async autoAssignPilot(
    bookingId: string,
    fleetManagerUid: string  // ⭐ REQUIRED - pilots can ONLY be from this fleet manager
  ): Promise<{
    assignedPilot: FirestoreUserDocument | null;
    topCandidates: Array<{ pilot: FirestoreUserDocument; score: number }>;
    reason?: string;
  }> {
    const cacheKey = `booking:assignment:${bookingId}:${fleetManagerUid}`;
    const cached = await this.cacheService.get<{
      assignedPilot: FirestoreUserDocument | null;
      topCandidates: Array<{ pilot: FirestoreUserDocument; score: number }>;
      reason?: string;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get booking details from the root bookings collection
    const booking = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.bookings)
      .doc(bookingId)
      .get();

    if (!booking.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const bookingData = booking.data() as FirestoreBookingDocument;

    // ⭐ CRITICAL: Query ONLY pilots assigned to this fleet manager
    // This enforces the hierarchy: Fleet Manager → Pilots
    this.logger.log(`Querying pilots for fleet manager: ${fleetManagerUid}`);

    const pilotsQuery = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('status', '==', 'active')
      .where('adminApproval', '==', true); // MUST be approved by admin after onboarding

    const pilotsSnapshot = await pilotsQuery.get();

    if (pilotsSnapshot.empty) {
      this.logger.warn(`No admin-approved pilots found for fleet manager ${fleetManagerUid}`);
      return {
        assignedPilot: null,
        topCandidates: [],
        reason: 'No admin-approved pilots available from this fleet manager. All pilots must complete onboarding document verification and receive admin approval before being eligible for missions.',
      };
    }

    // ⭐ Filter pilots by fleet manager assignment (support both field names for backward compatibility)
    const eligiblePilots = pilotsSnapshot.docs.filter((pilotDoc) => {
      const pilot = pilotDoc.data() as FirestoreUserDocument;
      const profileData = pilot.profileData || {};
      
      // Check assignedFleetManagerUid (primary field) or fallback to assignedVendorUid
      const assignedFleetMgr = (profileData as any).assignedFleetManagerUid;
      const assignedVendor = (profileData as any).assignedVendorUid;
      
      return assignedFleetMgr === fleetManagerUid || assignedVendor === fleetManagerUid;
    });

    if (eligiblePilots.length === 0) {
      this.logger.warn(
        `No pilots assigned to fleet manager ${fleetManagerUid} (checked ${pilotsSnapshot.size} total pilots)`
      );
      return {
        assignedPilot: null,
        topCandidates: [],
        reason: `No pilots assigned to this fleet manager. Fleet manager must have pilots in their roster.`,
      };
    }

    this.logger.log(
      `Found ${eligiblePilots.length} pilots assigned to fleet manager ${fleetManagerUid}`
    );

    // Score each pilot
    const scoredPilots: Array<{ pilot: FirestoreUserDocument; score: number; breakdown: any }> = [];

    for (const pilotDoc of eligiblePilots) {
      const pilot = pilotDoc.data() as FirestoreUserDocument;

      // CRITICAL VALIDATION: Pilot MUST have completed onboarding and been approved
      // Check 1: Admin approval (already in query, but double-check)
      if (!pilot.adminApproval) {
        this.logger.warn(`Pilot ${pilot.uid} not admin-approved, skipping`);
        continue;
      }

      // Check 2: Status must be 'active' (not pending/rejected)
      if (pilot.status !== 'active') {
        this.logger.warn(`Pilot ${pilot.uid} status is ${pilot.status}, skipping`);
        continue;
      }

      // Check 3: Documents must be verified
      if (!pilot.verification?.isVerified) {
        this.logger.warn(`Pilot ${pilot.uid} documents not verified, skipping`);
        continue;
      }

      // Check 4: Must have submitted documents (extra safety)
      const hasDocuments = pilot.verification?.documents && pilot.verification.documents.length > 0;
      if (!hasDocuments) {
        this.logger.warn(`Pilot ${pilot.uid} has no documents, skipping`);
        continue;
      }

      // Check online status (MUST be online to receive missions)
      const isOnline = pilot.profileData?.isOnline as boolean | undefined;
      if (!isOnline) {
        continue;
      }

      // Check availability schedule (if pilot has set one)
      if (bookingData.scheduledDate) {
        const scheduledDateTime = new Date(bookingData.scheduledDate);
        const isAvailableAtScheduledTime = await this.checkAvailabilityForTime(pilot.uid, scheduledDateTime);
        if (!isAvailableAtScheduledTime) {
          this.logger.debug(`Pilot ${pilot.uid} not available at scheduled time, skipping`);
          continue;
        }
      }

      // Check service types (MUST include the booking's service type)
      const serviceTypes = (pilot.profileData?.serviceTypes as string[]) || [];
      if (!serviceTypes.includes(bookingData.serviceType)) {
        continue;
      }

      // Check license expiry (MUST have valid license)
      const licenseExpiry = pilot.profileData?.licenseExpiry as string | undefined;
      if (licenseExpiry && new Date(licenseExpiry) < new Date()) {
        this.logger.debug(`Pilot ${pilot.uid} license expired, skipping`);
        continue;
      }

      // Calculate score
      const currentLocation = pilot.profileData?.currentLocation as GeoPointValue | undefined;
      const stats = (pilot.profileData?.stats as any) || {};

      // Distance score (40%)
      let distanceScore = 0;
      if (currentLocation && bookingData.location) {
        const distance = this.calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          bookingData.location.lat,
          bookingData.location.lng,
        );
        // Inverse distance score: closer = higher score
        // Max 50km radius, beyond that score drops significantly
        distanceScore = Math.max(0, 1 - distance / 50) * 0.4;
      }

      // Rating score (25%)
      const averageRating = stats.averageRating || 3.5;
      const ratingScore = (averageRating / 5) * 0.25;

      // Completion rate score (20%)
      const completedMissions = stats.completedMissions || 0;
      const totalMissions = stats.totalMissions || 1;
      const completionRate = completedMissions / totalMissions;
      const completionScore = completionRate * 0.2;

      // Experience score (15%)
      const experience = stats.experience || 0; // in years or mission count
      const experienceScore = Math.min(experience / 10, 1) * 0.15;

      const totalScore = distanceScore + ratingScore + completionScore + experienceScore;

      scoredPilots.push({
        pilot,
        score: totalScore,
        breakdown: {
          distanceScore: distanceScore.toFixed(3),
          ratingScore: ratingScore.toFixed(3),
          completionScore: completionScore.toFixed(3),
          experienceScore: experienceScore.toFixed(3),
          totalScore: totalScore.toFixed(3),
        },
      });
    }

    // Sort by score descending
    scoredPilots.sort((a, b) => b.score - a.score);

    // Get top 3 candidates
    const topCandidates = scoredPilots.slice(0, 3);

    const result = {
      assignedPilot: topCandidates.length > 0 ? topCandidates[0].pilot : null,
      topCandidates: topCandidates.map((c) => ({
        pilot: c.pilot,
        score: c.score,
      })),
      reason: topCandidates.length > 0 
        ? `Auto-assigned to best admin-approved pilot from fleet manager ${fleetManagerUid}` 
        : 'No qualified admin-approved pilots available from this fleet manager (online, verified, licensed, and specialized)',
    };

    // Cache for 2 minutes (in case of retry)
    await this.cacheService.set(cacheKey, result, 120);

    if (topCandidates.length > 0) {
      this.logger.log(`Auto-assignment for booking ${bookingId}: ${topCandidates.length} admin-approved candidates found from fleet manager ${fleetManagerUid}`);
    } else {
      this.logger.warn(`Auto-assignment for booking ${bookingId}: No admin-approved pilots matched criteria from fleet manager ${fleetManagerUid} (checked ${eligiblePilots.length} pilots)`);
    }

    return result;
  }

  async sendMissionRequests(bookingId: string, pilotUids: string[]): Promise<{
    sentTo: string[];
    timeout: number;
  }> {
    const now = new Date().toISOString();
    const ACCEPTANCE_TIMEOUT_MINUTES = 5;

    // Create mission documents for top 3 pilots (race condition)
    const sentTo: string[] = [];

    for (const pilotUid of pilotUids.slice(0, 3)) {
      const missionId = this.firebaseAdminService.firestore().collection(ROOT_COLLECTIONS.missions).doc().id;

      const mission: FirestoreMissionDocument = {
        id: missionId,
        requestId: missionId,
        pilotUid: pilotUid,
        bookingId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.missions)
        .doc(missionId)
        .set(mission);

      sentTo.push(pilotUid);

      // Emit event for real-time notification
      this.eventEmitter.emit('mission.request.sent', {
        missionId,
        pilotUid,
        bookingId,
        timeoutMinutes: ACCEPTANCE_TIMEOUT_MINUTES,
        timestamp: now,
      });

      this.logger.log(`Mission request sent to pilot ${pilotUid} for booking ${bookingId}`);
    }

    // Schedule timeout check (to be handled by a background job or webhook)
    const timeoutAt = new Date(Date.now() + ACCEPTANCE_TIMEOUT_MINUTES * 60 * 1000);
    
    // Store timeout metadata for escalation
    await this.firebaseAdminService
      .firestore()
      .collection('mission_timeouts')
      .doc(bookingId)
      .set({
        bookingId,
        sentTo,
        timeoutAt: timeoutAt.toISOString(),
        status: 'pending',
        createdAt: now,
      });

    return {
      sentTo,
      timeout: ACCEPTANCE_TIMEOUT_MINUTES,
    };
  }

  // Handle mission timeout (called by scheduler after 5 minutes)
  async handleMissionTimeout(bookingId: string): Promise<void> {
    const timeoutDoc = await this.firebaseAdminService
      .firestore()
      .collection('mission_timeouts')
      .doc(bookingId)
      .get();

    if (!timeoutDoc.exists) {
      return;
    }

    const timeoutData = timeoutDoc.data();
    if (timeoutData?.status !== 'pending') {
      return; // Already handled
    }

    // Check if any pilot accepted
    const missionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .where('bookingId', '==', bookingId)
      .where('status', 'in', ['accepted', 'en_route', 'at_location', 'preflight', 'started'])
      .limit(1)
      .get();

    if (!missionsSnapshot.empty) {
      // Mission was accepted, mark timeout as resolved
      await timeoutDoc.ref.update({ status: 'accepted' });
      return;
    }

    // No acceptance after 5 minutes → escalate to fleet manager
    this.logger.warn(`Mission timeout for booking ${bookingId}, escalating to fleet manager`);

    // Update booking with escalation flag
    const bookingSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('bookings')
      .where('id', '==', bookingId)
      .limit(1)
      .get();

    if (!bookingSnapshot.empty) {
      const bookingRef = bookingSnapshot.docs[0].ref;
      await bookingRef.update({
        escalatedToFleetManager: true,
        escalatedAt: new Date().toISOString(),
      });
    }

    // Mark timeout as escalated
    await timeoutDoc.ref.update({ status: 'escalated' });

    // Emit escalation event
    this.eventEmitter.emit('mission.auto.assignment.timeout', {
      bookingId,
      sentTo: timeoutData.sentTo,
      escalatedAt: new Date().toISOString(),
    });
  }

  // Notify customer about wait time
  async notifyCustomerNoAvailablePilots(bookingId: string): Promise<void> {
    const bookingSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('bookings')
      .where('id', '==', bookingId)
      .limit(1)
      .get();

    if (bookingSnapshot.empty) {
      return;
    }

    const booking = bookingSnapshot.docs[0].data() as FirestoreBookingDocument;
    const estimatedWaitMinutes = 30; // Configurable based on historical data

    this.eventEmitter.emit('customer.notification.no.pilots', {
      bookingId,
      customerUid: booking.customerUid,
      serviceType: booking.serviceType,
      estimatedWaitMinutes,
      message: `No pilots are currently available for ${booking.serviceType} service. Estimated wait time: ${estimatedWaitMinutes} minutes. We'll notify you when a pilot becomes available.`,
      timestamp: new Date().toISOString(),
    });

    this.logger.warn(`No pilots available for booking ${bookingId}, customer notified with ${estimatedWaitMinutes}min wait time`);
  }

  // Earnings Settlement Engine
  async calculatePilotEarning(missionId: string): Promise<number> {
    const mission = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .doc(missionId)
      .get();

    if (!mission.exists) {
      throw new NotFoundException(`Mission ${missionId} not found`);
    }

    const missionData = mission.data() as FirestoreMissionDocument;

    // Get booking to fetch total amount
    const bookingSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('bookings')
      .where('id', '==', missionData.bookingId)
      .limit(1)
      .get();

    if (bookingSnapshot.empty) {
      throw new NotFoundException(`Booking ${missionData.bookingId} not found`);
    }

    const booking = bookingSnapshot.docs[0].data() as FirestoreBookingDocument;
    const totalAmount = booking.finalPrice || booking.priceEstimation || 0;

    // Pilot share: 60% (configurable)
    const PILOT_SHARE_PERCENTAGE = 0.6;
    const pilotEarning = totalAmount * PILOT_SHARE_PERCENTAGE;

    return pilotEarning;
  }

  async processPilotSettlement(pilotUid: string, period: 'weekly' | 'monthly'): Promise<{
    totalEarnings: number;
    missionsCount: number;
    penalties: number;
    netAmount: number;
    missions: Array<{ missionId: string; bookingId: string; amount: number }>;
  }> {
    const now = new Date();
    let startDate: Date;

    if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Query completed missions in period
    const missionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .where('pilotUid', '==', pilotUid)
      .where('status', '==', 'completed')
      .where('endTime', '>=', startDate.toISOString())
      .where('endTime', '<=', now.toISOString())
      .get();

    let totalEarnings = 0;
    const missions: Array<{ missionId: string; bookingId: string; amount: number }> = [];

    for (const missionDoc of missionsSnapshot.docs) {
      const mission = missionDoc.data() as FirestoreMissionDocument;
      
      // Calculate earning for this mission
      const earning = await this.calculatePilotEarning(mission.requestId);
      totalEarnings += earning;

      missions.push({
        missionId: mission.requestId,
        bookingId: mission.bookingId,
        amount: earning,
      });
    }

    // Calculate penalties (cancelled missions, complaints)
    const penalties = await this.calculatePilotPenalties(pilotUid, startDate, now);

    const netAmount = totalEarnings - penalties;

    return {
      totalEarnings,
      missionsCount: missions.length,
      penalties,
      netAmount,
      missions,
    };
  }

  private async calculatePilotPenalties(pilotUid: string, startDate: Date, endDate: Date): Promise<number> {
    let totalPenalties = 0;

    // Penalty for cancelled missions (10% of mission value)
    const cancelledMissionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .where('pilotUid', '==', pilotUid)
      .where('status', '==', 'cancelled')
      .where('updatedAt', '>=', startDate.toISOString())
      .where('updatedAt', '<=', endDate.toISOString())
      .get();

    for (const missionDoc of cancelledMissionsSnapshot.docs) {
      const mission = missionDoc.data() as FirestoreMissionDocument;
      const cancelledBy = (mission as any).cancelledBy;

      // Only penalize if pilot cancelled
      if (cancelledBy === pilotUid) {
        // Get booking value
        const bookingSnapshot = await this.firebaseAdminService
          .firestore()
          .collection('bookings')
          .where('id', '==', mission.bookingId)
          .limit(1)
          .get();

        if (!bookingSnapshot.empty) {
          const booking = bookingSnapshot.docs[0].data() as FirestoreBookingDocument;
          const bookingValue = booking.finalPrice || booking.priceEstimation || 0;
          const penalty = bookingValue * 0.1; // 10% penalty
          totalPenalties += penalty;
        }
      }
    }

    // TODO: Add penalties for complaints if applicable

    return totalPenalties;
  }

  async createSettlementBatch(
    pilotUids: string[],
    period: 'weekly' | 'monthly',
  ): Promise<Array<{ pilotUid: string; settlement: any }>> {
    const settlements = [];

    for (const pilotUid of pilotUids) {
      const settlement = await this.processPilotSettlement(pilotUid, period);
      
      if (settlement.netAmount > 0) {
        // Create settlement record
        const settlementId = this.firebaseAdminService.firestore().collection('settlements').doc().id;
        const now = new Date().toISOString();

        const settlementRecord = {
          id: settlementId,
          pilotUid,
          period,
          totalEarnings: settlement.totalEarnings,
          penalties: settlement.penalties,
          netAmount: settlement.netAmount,
          missionsCount: settlement.missionsCount,
          missions: settlement.missions,
          status: 'pending_approval',
          createdAt: now,
          approvedAt: null,
          paidAt: null,
        };

        await this.firebaseAdminService
          .firestore()
          .collection('settlements')
          .doc(settlementId)
          .set(settlementRecord);

        settlements.push({
          pilotUid,
          settlement: settlementRecord,
        });

        this.logger.log(`Settlement created for pilot ${pilotUid}: ${settlement.netAmount}`);
      }
    }

    return settlements;
  }

  async getPendingSettlements(pilotUid: string) {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('settlements')
      .where('pilotUid', '==', pilotUid)
      .where('status', '==', 'pending_approval')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

  async getSettlementHistory(pilotUid: string) {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('settlements')
      .where('pilotUid', '==', pilotUid)
      .where('status', '==', 'paid')
      .orderBy('paidAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

  // Availability Schedule Management
  async updateSchedule(dto: UpdateScheduleDto, user: CurrentUser): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const now = new Date().toISOString();

    // Validate time slots don't overlap
    for (const daySchedule of dto.weeklySchedule) {
      this.validateTimeSlots(daySchedule.slots);
    }

    const updated: FirestoreUserDocument = {
      ...existing,
      profileData: {
        ...existing.profileData,
        weeklySchedule: dto.weeklySchedule,
        scheduleUpdatedAt: now,
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    await this.cacheService.delete(`pilot:profile:${user.uid}`);

    this.logger.log(`Pilot schedule updated: ${user.uid}`);
    return updated;
  }

  async getSchedule(user: CurrentUser) {
    const pilot = await this.usersService.getByUid(user.uid);
    return (pilot.profileData?.weeklySchedule as any) || [];
  }

  private validateTimeSlots(slots: Array<{ start: string; end: string }>): void {
    // Convert HH:MM to minutes for comparison
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    for (let i = 0; i < slots.length; i++) {
      const slot1Start = toMinutes(slots[i].start);
      const slot1End = toMinutes(slots[i].end);

      if (slot1End <= slot1Start) {
        throw new BadRequestException(`Invalid time slot: ${slots[i].start} - ${slots[i].end}`);
      }

      // Check for overlaps with other slots
      for (let j = i + 1; j < slots.length; j++) {
        const slot2Start = toMinutes(slots[j].start);
        const slot2End = toMinutes(slots[j].end);

        const overlaps =
          (slot1Start < slot2End && slot1End > slot2Start) ||
          (slot2Start < slot1End && slot2End > slot1Start);

        if (overlaps) {
          throw new BadRequestException(
            `Time slots overlap: ${slots[i].start}-${slots[i].end} and ${slots[j].start}-${slots[j].end}`,
          );
        }
      }
    }
  }

  async checkAvailabilityForTime(pilotUid: string, dateTime: Date): Promise<boolean> {
    const pilot = await this.usersService.getByUid(pilotUid);
    const weeklySchedule = (pilot.profileData?.weeklySchedule as any) || [];

    if (weeklySchedule.length === 0) {
      // No schedule set, assume always available
      return true;
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dateTime.getDay()];
    const timeMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();

    // Find schedule for this day
    const daySchedule = weeklySchedule.find((s: any) => s.day === dayName);
    if (!daySchedule) {
      return false; // No schedule for this day
    }

    // Check if time falls within any slot
    for (const slot of daySchedule.slots) {
      const [startHours, startMinutes] = slot.start.split(':').map(Number);
      const [endHours, endMinutes] = slot.end.split(':').map(Number);
      const slotStart = startHours * 60 + startMinutes;
      const slotEnd = endHours * 60 + endMinutes;

      if (timeMinutes >= slotStart && timeMinutes < slotEnd) {
        return true;
      }
    }

    return false;
  }

  // Onboarding Document Verification Workflow
  async getOnboardingStatus(user: CurrentUser) {
    const pilot = await this.usersService.getByUid(user.uid);
    
    return {
      status: pilot.status, // pending, active, rejected
      adminApproval: pilot.adminApproval,
      verification: pilot.verification,
      remarks: pilot.verification?.remarks || null,
      documentsSubmitted: (pilot.verification?.documents || []).length > 0,
    };
  }

  async submitOnboardingDocuments(
    documents: Array<{ type: string; url: string }>,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const now = new Date().toISOString();

    if (existing.status === 'active' && existing.adminApproval) {
      throw new BadRequestException('Pilot is already approved and active');
    }

    const updated: FirestoreUserDocument = {
      ...existing,
      status: 'pending',
      verification: {
        isVerified: false,
        documents: documents.map((doc) => ({
          type: doc.type,
          url: doc.url,
          uploadedAt: now,
        })),
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    // Notify admin
    this.eventEmitter.emit('pilot.onboarding.submitted', {
      pilotUid: user.uid,
      documentsCount: documents.length,
      timestamp: now,
    });

    this.logger.log(`Pilot onboarding documents submitted: ${user.uid}`);
    return updated;
  }

  async resubmitOnboardingDocuments(
    documents: Array<{ type: string; url: string }>,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const now = new Date().toISOString();

    if (existing.status !== 'rejected') {
      throw new BadRequestException('Can only resubmit documents after rejection');
    }

    const updated: FirestoreUserDocument = {
      ...existing,
      status: 'pending',
      verification: {
        isVerified: false,
        documents: documents.map((doc) => ({
          type: doc.type,
          url: doc.url,
          uploadedAt: now,
        })),
        remarks: '', // Clear previous rejection remarks
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    this.eventEmitter.emit('pilot.onboarding.resubmitted', {
      pilotUid: user.uid,
      documentsCount: documents.length,
      timestamp: now,
    });

    this.logger.log(`Pilot onboarding documents resubmitted: ${user.uid}`);
    return updated;
  }

  // Admin-side methods (to be called by AdminService)
  async approvePilotOnboarding(pilotUid: string, adminId: string): Promise<FirestoreUserDocument> {
    const pilot = await this.usersService.getByUid(pilotUid);
    const now = new Date().toISOString();

    if (pilot.role !== 'pilot') {
      throw new BadRequestException('User is not a pilot');
    }

    if (pilot.status === 'active' && pilot.adminApproval) {
      throw new BadRequestException('Pilot is already approved');
    }

    // Validate onboarding documents exist
    const hasDocuments = pilot.verification?.documents && pilot.verification.documents.length > 0;
    if (!hasDocuments) {
      throw new BadRequestException('Cannot approve pilot without submitted documents');
    }

    // Validate pilot has submitted required profile data
    const serviceTypes = pilot.profileData?.serviceTypes;
    if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      throw new BadRequestException('Pilot must specify at least one service type before approval');
    }

    const updated: FirestoreUserDocument = {
      ...pilot,
      status: 'active',
      adminApproval: true,
      verification: {
        ...pilot.verification,
        isVerified: true,
        remarks: 'Approved by admin - eligible for mission assignment',
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(pilotUid)
      .set(updated, { merge: true });

    // Log admin action
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(adminId)
      .collection('admin_actions')
      .add({
        actionType: 'pilot_approved',
        targetId: pilotUid,
        status: 'approved',
        timestamp: now,
      });

    this.eventEmitter.emit('pilot.onboarding.approved', {
      pilotUid,
      approvedBy: adminId,
      timestamp: now,
    });

    this.logger.log(`Pilot onboarding approved: ${pilotUid} by admin ${adminId} - now eligible for auto-assignment`);
    return updated;
  }

  async rejectPilotOnboarding(
    pilotUid: string,
    adminId: string,
    reason: string,
  ): Promise<FirestoreUserDocument> {
    const pilot = await this.usersService.getByUid(pilotUid);
    const now = new Date().toISOString();

    if (pilot.role !== 'pilot') {
      throw new BadRequestException('User is not a pilot');
    }

    const updated: FirestoreUserDocument = {
      ...pilot,
      status: 'rejected',
      adminApproval: false,
      verification: {
        ...pilot.verification,
        isVerified: false,
        remarks: reason,
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(pilotUid)
      .set(updated, { merge: true });

    // Log admin action
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(adminId)
      .collection('admin_actions')
      .add({
        actionType: 'pilot_rejected',
        targetId: pilotUid,
        status: 'rejected',
        remarks: reason,
        timestamp: now,
      });

    this.eventEmitter.emit('pilot.onboarding.rejected', {
      pilotUid,
      rejectedBy: adminId,
      reason,
      timestamp: now,
    });

    this.logger.log(`Pilot onboarding rejected: ${pilotUid} by admin ${adminId} - ${reason}`);
    return updated;
  }

  async getPendingOnboardingApplications(): Promise<FirestoreUserDocument[]> {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);
  }

  // ========== ROLE APPLICATION & SWITCHING ==========

  /**
   * Apply for a new role (Pilot → Fleet Manager, Vendor, or Technician)
   * Creates application record for admin approval
   */
  async applyForRole(dto: any, user: CurrentUser): Promise<any> {
    const pilot = await this.usersService.getByUid(user.uid);
    
    // Validation: Must be active pilot
    if (pilot.role !== 'pilot') {
      throw new BadRequestException('Only active pilots can apply for role upgrades');
    }

    if (pilot.status !== 'active') {
      throw new BadRequestException('Pilot account must be active to apply for new roles');
    }

    // Check for existing pending application
    const existingApplicationSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('role_applications')
      .where('pilotUid', '==', user.uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingApplicationSnapshot.empty) {
      throw new BadRequestException(
        'You already have a pending role application. Please wait for admin review.',
      );
    }

    const now = new Date().toISOString();
    const applicationId = this.firebaseAdminService
      .firestore()
      .collection('role_applications')
      .doc().id;

    const application = {
      applicationId,
      pilotUid: user.uid,
      pilotName: pilot.name,
      currentRole: pilot.role,
      targetRole: dto.targetRole,
      reason: dto.reason,
      documents: dto.documents || [],
      businessName: dto.businessName,
      gstNumber: dto.gstNumber,
      serviceRegions: dto.serviceRegions || [],
      specializations: dto.specializations || [],
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection('role_applications')
      .doc(applicationId)
      .set(application);

    this.eventEmitter.emit('role.application.submitted', {
      applicationId,
      pilotUid: user.uid,
      targetRole: dto.targetRole,
      timestamp: now,
    });

    this.logger.log(
      `Role application submitted: ${applicationId} - Pilot ${user.uid} applying for ${dto.targetRole}`,
    );

    return {
      success: true,
      application,
      message: `Your application for ${dto.targetRole} role has been submitted for admin review. You will be notified once reviewed.`,
    };
  }

  /**
   * Get available roles for the current user
   * Returns roles they can switch to (if they have multi-role access)
   */
  async getAvailableRoles(user: CurrentUser): Promise<any[]> {
    const userDoc = await this.usersService.getByUid(user.uid);
    
    // Get additional roles from user profile (users who were approved for multiple roles)
    const additionalRoles = (userDoc.profileData?.additionalRoles as string[]) || [];
    const allRoles = [userDoc.role, ...additionalRoles];

    // Map roles to display information
    const roleDisplayMap: Record<string, { displayName: string; description: string }> = {
      pilot: {
        displayName: 'Pilot',
        description: 'Accept and complete drone service missions',
      },
      fleet_manager: {
        displayName: 'Fleet Manager',
        description: 'Manage fleet operations, assign pilots, and track performance',
      },
      vendor: {
        displayName: 'Vendor',
        description: 'Manage service offerings and business operations',
      },
      technician: {
        displayName: 'Technician',
        description: 'Handle drone maintenance and repair tickets',
      },
      customer: {
        displayName: 'Customer',
        description: 'Book and track drone services',
      },
    };

    const availableRoles = allRoles.map((role) => ({
      role,
      displayName: roleDisplayMap[role]?.displayName || role,
      description: roleDisplayMap[role]?.description || `Switch to ${role} role`,
      isActive: role === userDoc.role,
    }));

    return availableRoles;
  }

  /**
   * Switch to a different role (if user has multi-role access)
   * Updates current active role in user profile
   */
  async switchRole(dto: any, user: CurrentUser): Promise<any> {
    const userDoc = await this.usersService.getByUid(user.uid);
    const additionalRoles = (userDoc.profileData?.additionalRoles as string[]) || [];
    const allRoles = [userDoc.role, ...additionalRoles];

    // Validation: Check if user has access to target role
    if (!allRoles.includes(dto.targetRole)) {
      throw new BadRequestException(
        `You do not have access to the ${dto.targetRole} role. Available roles: ${allRoles.join(', ')}`,
      );
    }

    // Check if already on target role
    if (userDoc.role === dto.targetRole) {
      return {
        success: true,
        message: `You are already using the ${dto.targetRole} role.`,
        currentRole: dto.targetRole,
      };
    }

    const now = new Date().toISOString();

    // Update user's active role
    const updated: FirestoreUserDocument = {
      ...userDoc,
      role: dto.targetRole as any,
      profileData: {
        ...userDoc.profileData,
        previousRole: userDoc.role,
        lastRoleSwitch: now,
      },
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    // Invalidate cache
    await this.cacheService.delete(`user:${user.uid}`);
    await this.cacheService.delete(`pilot:profile:${user.uid}`);

    this.eventEmitter.emit('role.switched', {
      userId: user.uid,
      fromRole: userDoc.role,
      toRole: dto.targetRole,
      timestamp: now,
    });

    this.logger.log(`User ${user.uid} switched role from ${userDoc.role} to ${dto.targetRole}`);

    return {
      success: true,
      message: `Successfully switched to ${dto.targetRole} role.`,
      previousRole: userDoc.role,
      currentRole: dto.targetRole,
    };
  }

  /**
   * Get current role application status for the pilot
   */
  async getRoleApplicationStatus(user: CurrentUser): Promise<any> {
    const applicationsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('role_applications')
      .where('pilotUid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const applications = applicationsSnapshot.docs.map((doc) => doc.data());

    return {
      applications,
      hasPending: applications.some((app: any) => app.status === 'pending'),
    };
  }
}


import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../../common/constants/collection-paths.constant';
import { WS_EVENTS } from '../../../gateway/events/event.constants';
import { FleetManagerMatchingService } from './fleet-manager-matching.service';
import { DronePilotMatchingService } from './drone-pilot-matching.service';
import { BookingService } from '../../booking/booking.service';
import {
  generateHandoverCode,
  normalizeHandoverCode,
} from '../../../common/utils/handover-code.util';
import type {
  FirestoreBookingDocument,
  FirestoreMissionDocument,
} from '../../../database/firestore/contracts';

export interface FleetManagerRequest {
  id: string;
  requestId: string;
  bookingId: string;
  fleetManagerUid: string;
  status: 'pending' | 'accepted' | 'rejected' | 'timeout';
  bookingDetails: {
    serviceType: string;
    location: { lat: number; lng: number };
    scheduledDate: string;
    cropType: string;
    area: { value: number; unit: string };
    customerName?: string;
  };
  score: number;
  distance: number;
  sentAt: string;
  expiresAt: string;
  respondedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class FleetManagerRequestService {
  private readonly logger = new Logger(FleetManagerRequestService.name);
  private readonly REQUEST_TIMEOUT_MINUTES = 10; // Fleet managers have 10 minutes to respond

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly fleetManagerMatchingService: FleetManagerMatchingService,
    private readonly dronePilotMatchingService: DronePilotMatchingService,
    private readonly bookingService: BookingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Auto-assign booking to top fleet managers and send requests
   * Similar to pilot request system but for fleet managers
   */
  async autoAssignFleetManagerRequest(bookingId: string): Promise<{
    sentTo: string[];
    requests: FleetManagerRequest[];
    timeout: number;
  }> {
    const db = this.firebaseAdminService.firestore();

    // Get booking details
    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();

    if (!bookingDoc.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const booking = bookingDoc.data() as FirestoreBookingDocument;

    // Check if booking already has fleet manager assigned
    if (booking.fleetManagerUid) {
      throw new BadRequestException('Booking already assigned to a fleet manager');
    }

    // Find top 3 fleet managers
    const topFleetManagers = await this.fleetManagerMatchingService.findTopFleetManagers(
      bookingId,
      booking.location,
      booking.serviceType,
      booking.scheduledDate,
      3 // Send to top 3 fleet managers
    );

    if (topFleetManagers.length === 0) {
      throw new NotFoundException('No eligible fleet managers found for this booking');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.REQUEST_TIMEOUT_MINUTES * 60 * 1000);

    const requests: FleetManagerRequest[] = [];
    const sentTo: string[] = [];

    // Send requests to top 3 fleet managers
    for (const fm of topFleetManagers) {
      const requestId = db.collection(ROOT_COLLECTIONS.fleetManagerRequests).doc().id;

      const request: FleetManagerRequest = {
        id: requestId,
        requestId,
        bookingId,
        fleetManagerUid: fm.fleetManagerUid,
        status: 'pending',
        bookingDetails: {
          serviceType: booking.serviceType,
          location: booking.location,
          scheduledDate: booking.scheduledDate,
          cropType: booking.cropType,
          area: booking.area,
          customerName: undefined, // Will be populated from customer doc
        },
        score: fm.score,
        distance: fm.distance,
        sentAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        respondedAt: null,
        rejectionReason: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      // Save request to Firestore
      await db.collection(ROOT_COLLECTIONS.fleetManagerRequests).doc(requestId).set(request);

      requests.push(request);
      sentTo.push(fm.fleetManagerUid);

      // Emit WebSocket event for real-time notification
      this.eventEmitter.emit(WS_EVENTS.FLEET_MANAGER_REQUEST_SENT, {
        requestId,
        fleetManagerUid: fm.fleetManagerUid,
        bookingId,
        bookingDetails: request.bookingDetails,
        score: fm.score,
        distance: fm.distance,
        timeoutMinutes: this.REQUEST_TIMEOUT_MINUTES,
        expiresAt: expiresAt.toISOString(),
        timestamp: now.toISOString(),
      });

      this.logger.log(
        `Fleet manager request sent to ${fm.fleetManagerUid} for booking ${bookingId} (score: ${fm.score}, distance: ${fm.distance}km)`
      );
    }

    // Update booking with request metadata
    await bookingDoc.ref.update({
      fleetManagerRequestSentAt: now.toISOString(),
      fleetManagerRequestExpiresAt: expiresAt.toISOString(),
      fleetManagerRequestStatus: 'pending',
      updatedAt: now.toISOString(),
    });

    // Schedule timeout check (to be handled by background job)
    await this.scheduleTimeoutCheck(bookingId, sentTo, expiresAt);

    this.logger.log(
      `Fleet manager requests sent for booking ${bookingId} to ${sentTo.length} fleet managers`
    );

    return {
      sentTo,
      requests,
      timeout: this.REQUEST_TIMEOUT_MINUTES,
    };
  }

  /**
   * Fleet manager accepts the booking request
   * First fleet manager to accept wins (race condition)
   */
  async acceptRequest(requestId: string, fleetManagerUid: string): Promise<{
    success: boolean;
    booking: FirestoreBookingDocument;
    message: string;
  }> {
    const db = this.firebaseAdminService.firestore();

    // Get request document
    const requestDoc = await db.collection(ROOT_COLLECTIONS.fleetManagerRequests).doc(requestId).get();

    if (!requestDoc.exists) {
      throw new NotFoundException(`Fleet manager request ${requestId} not found`);
    }

    const request = requestDoc.data() as FleetManagerRequest;

    // Verify fleet manager owns this request
    if (request.fleetManagerUid !== fleetManagerUid) {
      throw new BadRequestException('This request is not for you');
    }

    // Duty toggle: off-duty FMs cannot accept incoming requests.
    const fmDoc = await db.collection(ROOT_COLLECTIONS.users).doc(fleetManagerUid).get();
    if ((fmDoc.data() as any)?.profileData?.isOnline === false) {
      throw new BadRequestException('You are off-duty. Go active to accept requests.');
    }

    // Check if request already responded to
    if (request.status !== 'pending') {
      throw new BadRequestException(`Request already ${request.status}`);
    }

    // Check if request has expired
    if (new Date(request.expiresAt) < new Date()) {
      await requestDoc.ref.update({
        status: 'timeout',
        updatedAt: new Date().toISOString(),
      });
      throw new BadRequestException('Request has expired');
    }

    // Get booking document
    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(request.bookingId).get();

    if (!bookingDoc.exists) {
      throw new NotFoundException(`Booking ${request.bookingId} not found`);
    }

    const booking = bookingDoc.data() as FirestoreBookingDocument;

    // Check if booking already assigned (race condition - another fleet manager accepted first)
    if (booking.fleetManagerUid) {
      await requestDoc.ref.update({
        status: 'rejected',
        rejectionReason: 'Another fleet manager already accepted',
        respondedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      throw new BadRequestException('Booking already assigned to another fleet manager');
    }

    const now = new Date().toISOString();

    // Use transaction to ensure atomic update
    await db.runTransaction(async (transaction) => {
      // Re-check booking assignment within transaction
      const bookingSnapshot = await transaction.get(bookingDoc.ref);
      const currentBooking = bookingSnapshot.data() as FirestoreBookingDocument;

      if (currentBooking.fleetManagerUid) {
        throw new BadRequestException('Booking already assigned to another fleet manager');
      }

      // Update booking with fleet manager assignment
      transaction.update(bookingDoc.ref, {
        fleetManagerUid,
        fleetManagerRequestStatus: 'accepted',
        fleetManagerAcceptedAt: now,
        status: 'confirmed', // Move to confirmed status
        stage: 2, // PILOT_ASSIGNED stage (awaiting pilot assignment)
        updatedAt: now,
      });

      // Update request status
      transaction.update(requestDoc.ref, {
        status: 'accepted',
        respondedAt: now,
        updatedAt: now,
      });
    });

    // Cancel other pending requests for this booking
    await this.cancelOtherRequests(request.bookingId, requestId);

    // Emit WebSocket events
    this.eventEmitter.emit(WS_EVENTS.FLEET_MANAGER_REQUEST_ACCEPTED, {
      requestId,
      fleetManagerUid,
      bookingId: request.bookingId,
      timestamp: now,
    });

    this.eventEmitter.emit(WS_EVENTS.BOOKING_FLEET_MANAGER_ASSIGNED, {
      bookingId: request.bookingId,
      fleetManagerUid,
      customerUid: booking.customerUid,
      timestamp: now,
    });

    // ⭐ Trigger pilot auto-assignment after fleet manager accepts
    this.eventEmitter.emit('fleet-manager.accepted.trigger-pilot-assignment', {
      bookingId: request.bookingId,
      fleetManagerUid,
    });

    this.logger.log(
      `Fleet manager ${fleetManagerUid} accepted booking ${request.bookingId} (request: ${requestId})`
    );

    // Get updated booking
    const updatedBooking = await bookingDoc.ref.get();

    return {
      success: true,
      booking: updatedBooking.data() as FirestoreBookingDocument,
      message: 'Booking accepted successfully. You can now assign pilot and drone.',
    };
  }

  /**
   * Fleet manager rejects the booking request
   */
  async rejectRequest(
    requestId: string,
    fleetManagerUid: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const db = this.firebaseAdminService.firestore();

    // Get request document
    const requestDoc = await db.collection(ROOT_COLLECTIONS.fleetManagerRequests).doc(requestId).get();

    if (!requestDoc.exists) {
      throw new NotFoundException(`Fleet manager request ${requestId} not found`);
    }

    const request = requestDoc.data() as FleetManagerRequest;

    // Verify fleet manager owns this request
    if (request.fleetManagerUid !== fleetManagerUid) {
      throw new BadRequestException('This request is not for you');
    }

    // Check if request already responded to
    if (request.status !== 'pending') {
      throw new BadRequestException(`Request already ${request.status}`);
    }

    const now = new Date().toISOString();

    // Update request status
    await requestDoc.ref.update({
      status: 'rejected',
      rejectionReason: reason || 'Declined by fleet manager',
      respondedAt: now,
      updatedAt: now,
    });

    // Emit event
    this.eventEmitter.emit(WS_EVENTS.FLEET_MANAGER_REQUEST_REJECTED, {
      requestId,
      fleetManagerUid,
      bookingId: request.bookingId,
      reason,
      timestamp: now,
    });

    this.logger.log(
      `Fleet manager ${fleetManagerUid} rejected booking ${request.bookingId} (request: ${requestId}). Reason: ${reason}`
    );

    // Check if all requests have been rejected
    await this.checkAllRequestsRejected(request.bookingId);

    return {
      success: true,
      message: 'Request rejected successfully',
    };
  }

  /**
   * Get pending requests for a fleet manager
   */
  async getPendingRequests(fleetManagerUid: string): Promise<FleetManagerRequest[]> {
    const db = this.firebaseAdminService.firestore();

    // Duty toggle: off-duty FMs see no incoming requests.
    const fmDoc = await db.collection(ROOT_COLLECTIONS.users).doc(fleetManagerUid).get();
    if ((fmDoc.data() as any)?.profileData?.isOnline === false) {
      return [];
    }

    const snapshot = await db
      .collection(ROOT_COLLECTIONS.fleetManagerRequests)
      .where('fleetManagerUid', '==', fleetManagerUid)
      .where('status', '==', 'pending')
      .orderBy('sentAt', 'desc')
      .get();

    const requests = snapshot.docs.map((doc) => doc.data() as FleetManagerRequest);

    // Filter out expired requests
    const now = new Date();
    return requests.filter((req) => new Date(req.expiresAt) > now);
  }

  /**
   * Get request history for a fleet manager
   */
  async getRequestHistory(
    fleetManagerUid: string,
    limit: number = 50
  ): Promise<FleetManagerRequest[]> {
    const db = this.firebaseAdminService.firestore();

    const snapshot = await db
      .collection(ROOT_COLLECTIONS.fleetManagerRequests)
      .where('fleetManagerUid', '==', fleetManagerUid)
      .orderBy('sentAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as FleetManagerRequest);
  }

  /**
   * Cancel other pending requests when one is accepted
   */
  private async cancelOtherRequests(bookingId: string, acceptedRequestId: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    const snapshot = await db
      .collection(ROOT_COLLECTIONS.fleetManagerRequests)
      .where('bookingId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();

    const batch = db.batch();
    const now = new Date().toISOString();

    for (const doc of snapshot.docs) {
      if (doc.id !== acceptedRequestId) {
        batch.update(doc.ref, {
          status: 'rejected',
          rejectionReason: 'Another fleet manager accepted the booking',
          respondedAt: now,
          updatedAt: now,
        });

        // Emit cancellation event
        const request = doc.data() as FleetManagerRequest;
        this.eventEmitter.emit(WS_EVENTS.FLEET_MANAGER_REQUEST_CANCELLED, {
          requestId: doc.id,
          fleetManagerUid: request.fleetManagerUid,
          bookingId,
          reason: 'Another fleet manager accepted',
          timestamp: now,
        });
      }
    }

    await batch.commit();
    this.logger.log(`Cancelled other pending requests for booking ${bookingId}`);
  }

  /**
   * Check if all requests for a booking have been rejected
   * If yes, escalate to admin
   */
  private async checkAllRequestsRejected(bookingId: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    const snapshot = await db
      .collection(ROOT_COLLECTIONS.fleetManagerRequests)
      .where('bookingId', '==', bookingId)
      .get();

    const requests = snapshot.docs.map((doc) => doc.data() as FleetManagerRequest);
    const allRejected = requests.every((req) => req.status === 'rejected' || req.status === 'timeout');

    if (allRejected && requests.length > 0) {
      // All fleet managers rejected - escalate to admin
      this.eventEmitter.emit(WS_EVENTS.BOOKING_ALL_FLEET_MANAGERS_REJECTED, {
        bookingId,
        rejectedBy: requests.map((r) => r.fleetManagerUid),
        timestamp: new Date().toISOString(),
      });

      // Update booking status
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();
      if (bookingDoc.exists) {
        await bookingDoc.ref.update({
          fleetManagerRequestStatus: 'all_rejected',
          updatedAt: new Date().toISOString(),
        });
      }

      this.logger.warn(
        `All fleet managers rejected booking ${bookingId}. Admin intervention required.`
      );
    }
  }

  /**
   * Schedule timeout check for fleet manager requests
   */
  private async scheduleTimeoutCheck(
    bookingId: string,
    fleetManagerUids: string[],
    expiresAt: Date
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    // Store timeout metadata
    const timeoutDoc = {
      bookingId,
      fleetManagerUids,
      expiresAt: expiresAt.toISOString(),
      checked: false,
      createdAt: new Date().toISOString(),
    };

    await db
      .collection(ROOT_COLLECTIONS.fleetManagerRequestTimeouts)
      .doc(bookingId)
      .set(timeoutDoc);

    this.logger.log(
      `Scheduled timeout check for booking ${bookingId} at ${expiresAt.toISOString()}`
    );

    // TODO: In production, use Cloud Functions or background job to check timeouts
    // For now, this relies on manual timeout handling or polling
  }

  /**
   * ⭐ Event Listener: Admin approved a booking WITHOUT auto-assign.
   * The booking is pushed to EVERY active fleet manager's incoming requests
   * so any one of them can accept/claim it. First to accept wins.
   */
  @OnEvent('booking.approved.manual-assign')
  async handleAdminApprovedWithoutAutoAssign(payload: {
    bookingId: string;
    location: { lat: number; lng: number };
    serviceType: string;
    scheduledDate: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Booking ${payload.bookingId} approved without auto-assign — creating incoming requests for all fleet managers`
      );
      await this.createIncomingRequestsForBooking(payload.bookingId);
    } catch (error) {
      this.logger.error(
        `Failed to create incoming requests for booking ${payload.bookingId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Create a pending "incoming request" for EVERY active fleet manager so the
   * booking appears in all fleet managers' incoming requests section.
   */
  async createIncomingRequestsForBooking(bookingId: string): Promise<{
    sentTo: string[];
    requests: FleetManagerRequest[];
    timeout: number;
  }> {
    const db = this.firebaseAdminService.firestore();

    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    const booking = bookingDoc.data() as FirestoreBookingDocument;

    // Skip if already assigned to a fleet manager
    if (booking.fleetManagerUid) {
      throw new BadRequestException('Booking already assigned to a fleet manager');
    }

    // Fetch ALL active fleet managers
    const fleetManagersSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'fleet_manager')
      .where('status', '==', 'active')
      .get();

    // Duty toggle: only on-duty FMs get incoming requests.
    const fleetManagerUids = fleetManagersSnapshot.docs
      .filter((doc) => (doc.data() as any)?.profileData?.isOnline !== false)
      .map((doc) => doc.id);
    if (fleetManagerUids.length === 0) {
      this.logger.warn(
        `No active fleet managers found for booking ${bookingId}; no incoming requests created`
      );
      return { sentTo: [], requests: [], timeout: this.REQUEST_TIMEOUT_MINUTES };
    }

    // Do not re-send to fleet managers that already have a pending request
    const existingSnapshot = await db
      .collection(ROOT_COLLECTIONS.fleetManagerRequests)
      .where('bookingId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();
    const alreadySent = new Set(existingSnapshot.docs.map((doc) => doc.data().fleetManagerUid));
    const targets = fleetManagerUids.filter((uid) => !alreadySent.has(uid));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.REQUEST_TIMEOUT_MINUTES * 60 * 1000);
    const requests: FleetManagerRequest[] = [];

    for (const fmUid of targets) {
      const requestId = db.collection(ROOT_COLLECTIONS.fleetManagerRequests).doc().id;
      const request: FleetManagerRequest = {
        id: requestId,
        requestId,
        bookingId,
        fleetManagerUid: fmUid,
        status: 'pending',
        bookingDetails: {
          serviceType: booking.serviceType,
          location: booking.location,
          scheduledDate: booking.scheduledDate,
          cropType: booking.cropType,
          area: booking.area,
          customerName: undefined,
        },
        score: 0,
        distance: 0,
        sentAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        respondedAt: null,
        rejectionReason: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await db.collection(ROOT_COLLECTIONS.fleetManagerRequests).doc(requestId).set(request);
      requests.push(request);

      this.eventEmitter.emit(WS_EVENTS.FLEET_MANAGER_REQUEST_SENT, {
        requestId,
        fleetManagerUid: fmUid,
        bookingId,
        bookingDetails: request.bookingDetails,
        score: 0,
        distance: 0,
        timeoutMinutes: this.REQUEST_TIMEOUT_MINUTES,
        expiresAt: expiresAt.toISOString(),
        timestamp: now.toISOString(),
      });
    }

    await bookingDoc.ref.update({
      fleetManagerRequestSentAt: now.toISOString(),
      fleetManagerRequestExpiresAt: expiresAt.toISOString(),
      fleetManagerRequestStatus: 'pending',
      updatedAt: now.toISOString(),
    });

    this.logger.log(
      `Incoming requests created for booking ${bookingId} → ${targets.length} fleet managers`
    );

    return {
      sentTo: targets,
      requests,
      timeout: this.REQUEST_TIMEOUT_MINUTES,
    };
  }

  /**
   * ⭐ Assign pilot to booking - Fleet Manager manually selects pilot
   * ENFORCES HIERARCHY: Only pilots from the fleet manager's roster can be assigned
   */
  async assignPilotToBooking(
    bookingId: string,
    pilotUid: string,
    fleetManagerUid: string,
  ): Promise<{
    success: boolean;
    booking: FirestoreBookingDocument;
    pilot: any;
    message: string;
  }> {
    const db = this.firebaseAdminService.firestore();

    // 1. Get booking
    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    const booking = bookingDoc.data() as FirestoreBookingDocument;

    // 2. Verify fleet manager owns this booking
    if (booking.fleetManagerUid !== fleetManagerUid) {
      throw new BadRequestException('This booking is not assigned to you');
    }

    // 3. Get pilot document
    const pilotDoc = await db.collection(ROOT_COLLECTIONS.users).doc(pilotUid).get();
    if (!pilotDoc.exists) {
      throw new NotFoundException(`Pilot ${pilotUid} not found`);
    }
    const pilot = pilotDoc.data() as any;
    if (pilot.role !== 'pilot') {
      throw new BadRequestException('Selected user is not a pilot');
    }

    // 4. ⭐ CRITICAL: Verify pilot belongs to this fleet manager
    // Accept every known ownership field variant (profileData vs top-level
    // vs pilots-collection mirror) so newly onboarded pilots are assignable.
    const profileData = pilot.profileData || {};
    const assignedFleetMgr =
      profileData.assignedFleetManagerUid ??
      (pilot as any).assignedFleetManagerUid ??
      (pilot as any).managedByFleetManagerUid;
    const assignedVendor =
      profileData.assignedVendorUid ?? (pilot as any).assignedVendorUid;
    if (assignedFleetMgr !== fleetManagerUid && assignedVendor !== fleetManagerUid) {
      throw new BadRequestException(
        'Access denied: This pilot does not belong to your fleet. You can only assign pilots from your own roster.'
      );
    }

    // 5. Verify pilot can handle the service type
    const serviceTypes = profileData.serviceTypes || (pilot as any).serviceTypes || [];
    const pilotServiceTypes = [...serviceTypes];
    if (
      pilotServiceTypes.length > 0 &&
      !pilotServiceTypes.includes(booking.serviceType) &&
      !pilotServiceTypes.includes('multi_purpose')
    ) {
      throw new BadRequestException(
        `Pilot not compatible: This pilot is not trained for ${booking.serviceType} service.`
      );
    }

    // 6. Verify pilot is available — accept all known "free" statuses
    // (users docs use active/available, pilots collection uses AVAILABLE,
    // fresh onboarding uses pending).
    const pilotStatus = String(pilot.status || '').toLowerCase();
    if (!['active', 'available', 'pending'].includes(pilotStatus)) {
      throw new BadRequestException(
        `Pilot unavailable: This pilot is currently ${pilot.status}. Please select an available pilot.`
      );
    }

    // 7. Check pilot is not already on another mission
    if (profileData.currentMissionId || pilot.currentBookingId) {
      throw new BadRequestException(
        'Pilot already assigned: This pilot is currently on another mission.'
      );
    }

    const now = new Date().toISOString();

    // 8. Update booking with pilot assignment
    await bookingDoc.ref.update({
      assignedPilot: pilotUid,
      assignedPilotName: pilot.name || profileData.fullName || null,
      pilotAssignedAt: now,
      stage: booking.assignedDrone ? 2 : booking.stage || 2,
      updatedAt: now,
    });

    // 9. Update pilot status
    await pilotDoc.ref
      .update({ status: 'assigned', isAvailable: false, currentBookingId: bookingId, updatedAt: now })
      .catch((err: any) =>
        this.logger.warn(`Failed to update pilot ${pilotUid} status: ${err.message}`),
      );

    // 9b. ⭐ Create/update the mission record so the assigned pilot sees this
    // booking in their "incoming requests" section (the pilot app lists
    // missions from the `missions` collection with status 'pending').
    await this.upsertMissionForBooking(bookingId, pilotUid, now);

    // 10. Emit WebSocket events
    this.eventEmitter.emit(WS_EVENTS.BOOKING_PILOT_ASSIGNED, {
      bookingId,
      pilotUid,
      fleetManagerUid,
      customerUid: booking.customerUid,
      pilotDetails: {
        name: pilot.name || profileData.fullName,
        phone: pilot.phone,
      },
      timestamp: now,
    });

    // Notify the pilot app that a new mission is waiting (incoming request).
    this.eventEmitter.emit(WS_EVENTS.MISSION_CREATED, {
      bookingId,
      pilotUid,
      fleetManagerUid,
      timestamp: now,
    });

    this.logger.log(
      `Pilot ${pilotUid} assigned to booking ${bookingId} by fleet manager ${fleetManagerUid}`
    );

    const updatedBooking = await bookingDoc.ref.get();

    return {
      success: true,
      booking: updatedBooking.data() as FirestoreBookingDocument,
      pilot: {
        id: pilotDoc.id,
        name: pilot.name || profileData.fullName,
        phone: pilot.phone,
        status: 'assigned',
      },
      message: 'Pilot assigned successfully. Pilot has been notified.',
    };
  }

  /**
   * Get pilot recommendations for a booking
   * Returns only pilots from the fleet manager's roster matching the service type
   */
  async getPilotRecommendations(
    bookingId: string,
    fleetManagerUid: string,
  ): Promise<any[]> {
    const db = this.firebaseAdminService.firestore();

    // Get booking details
    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    const booking = bookingDoc.data() as FirestoreBookingDocument;

    // Verify fleet manager owns this booking
    if (booking.fleetManagerUid !== fleetManagerUid) {
      throw new BadRequestException('This booking is not assigned to you');
    }

    // Query pilots from the fleet manager's roster. NOTE: no `status`
    // filter here — newly onboarded pilots are stored with status
    // 'pending' in users and 'AVAILABLE' in the pilots collection, so a
    // strict active/available query would hide the FM's own new pilots.
    // Availability is enforced in the in-code filter below instead.
    const pilotsSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .get();

    const suitablePilots = pilotsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((pilot: any) => {
        const profileData = pilot.profileData || {};

        // Check ownership — accept every known ownership field variant:
        // profileData.assignedFleetManagerUid (pilot onboarding),
        // profileData.assignedVendorUid, top-level managedByFleetManagerUid
        // (pilots collection mirror), or direct uid fields.
        const assignedFleetMgr =
          profileData.assignedFleetManagerUid ??
          pilot.assignedFleetManagerUid ??
          pilot.managedByFleetManagerUid;
        const assignedVendor =
          profileData.assignedVendorUid ?? pilot.assignedVendorUid;
        if (assignedFleetMgr !== fleetManagerUid && assignedVendor !== fleetManagerUid) {
          return false;
        }

        // Check service type compatibility — accept serviceTypes stored
        // either in profileData or at the top level of the pilot doc.
        const serviceTypes = profileData.serviceTypes || pilot.serviceTypes || [];
        const pilotServiceTypes = [...serviceTypes];
        if (
          pilotServiceTypes.length > 0 &&
          !pilotServiceTypes.includes(booking.serviceType) &&
          !pilotServiceTypes.includes('multi_purpose')
        ) {
          return false;
        }

        // Check if already on another mission
        if (profileData.currentMissionId || pilot.currentBookingId) {
          return false;
        }

        return true;
      })
      .map((pilot: any) => {
        const profileData = pilot.profileData || {};
        let score = 0;

        // Service type match (40%)
        const serviceTypes = profileData.serviceTypes || pilot.serviceTypes || [];
        if (serviceTypes.includes(booking.serviceType)) {
          score += 40;
        } else if ([...serviceTypes].includes('multi_purpose')) {
          score += 30;
        }

        // Rating score (35%)
        const rating = Number(pilot.rating) || Number(profileData.rating) || 0;
        score += (rating / 5) * 35;

        // Availability score (15%)
        const isOnline = profileData.isOnline !== false;
        if (isOnline) score += 15;

        // Experience score (10%)
        const flightHours = Number(pilot.totalFlightHours) || 0;
        score += Math.min(flightHours / 500, 1) * 10;

        return {
          ...pilot,
          profileData: undefined,
          serviceTypes,
          suitabilityScore: Math.round(score),
          recommendation: score >= 80 ? 'highly_recommended' : score >= 60 ? 'recommended' : 'suitable',
        };
      })
      .sort((a: any, b: any) => b.suitabilityScore - a.suitabilityScore);

    this.logger.log(
      `Found ${suitablePilots.length} suitable pilots for booking ${bookingId} (Fleet Manager: ${fleetManagerUid})`
    );

    return suitablePilots;
  }

  /**
   * ⭐ Event Listener: Handle booking creation with COMPLETE auto-assignment
   * Immediately assigns: Fleet Manager → Pilot → Drone in one flow
   * No manual request/accept cycle — direct assignment at any cost
   */
  @OnEvent('booking.created.trigger-fleet-manager-assignment')
  async handleBookingCreatedEvent(payload: {
    bookingId: string;
    location: { lat: number; lng: number };
    serviceType: string;
    scheduledDate: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Starting complete auto-assignment for booking ${payload.bookingId}`
      );

      // Ensure booking is fully persisted before reading
      await new Promise(resolve => setTimeout(resolve, 1000));

      const db = this.firebaseAdminService.firestore();
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(payload.bookingId).get();

      if (!bookingDoc.exists) {
        throw new NotFoundException(`Booking ${payload.bookingId} not found`);
      }

      const booking = bookingDoc.data() as FirestoreBookingDocument;

      // Skip if already fully assigned
      if (booking.assignedPilot && booking.assignedDrone && booking.fleetManagerUid) {
        this.logger.log(`Booking ${payload.bookingId} already fully assigned, skipping`);
        return;
      }

      // ── STEP 1: Find ANY active Fleet Manager (bypass strict validation) ─
      this.logger.log(`Step 1: Finding any active Fleet Manager for booking ${payload.bookingId}`);

      let fmUid: string | null = null;

      // Try optimal matching first (works well if FM profiles are complete)
      try {
        const fmMatch = await this.fleetManagerMatchingService.findOptimalFleetManager(
          payload.bookingId,
          payload.location,
          payload.serviceType,
          payload.scheduledDate,
        );
        fmUid = fmMatch.fleetManagerUid;
        this.logger.log(`Optimal Fleet Manager ${fmUid} found (score: ${fmMatch.score})`);
      } catch {
        this.logger.log('Optimal FM matching returned no results, falling back to simple query');
      }

      // If optimal matching failed, query ANY active + on-duty FM directly.
      // Off-duty FMs must never receive auto-assign missions.
      if (!fmUid) {
        const fmSnapshot = await db
          .collection(ROOT_COLLECTIONS.users)
          .where('role', '==', 'fleet_manager')
          .where('status', '==', 'active')
          .limit(10)
          .get();

        const onDutyFm = fmSnapshot.docs.find(
          (doc) => (doc.data() as any)?.profileData?.isOnline !== false,
        );
        if (onDutyFm) {
          fmUid = onDutyFm.id;
          this.logger.log(`Simple FM query found on-duty FM: ${fmUid}`);
        } else {
          this.logger.log('Simple FM query found no on-duty FM; skipping auto-assign');
        }
      }

      // If still no FM found, fall back to old request flow
      if (!fmUid) {
        this.logger.error(`No active Fleet Manager found in database for booking ${payload.bookingId}, falling back to request flow`);
        setTimeout(async () => {
          try {
            await this.autoAssignFleetManagerRequest(payload.bookingId);
          } catch (fallbackError) {
            this.logger.error(`Fallback FM request also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
          }
        }, 1000);
        return;
      }

      // ── STEP 2: Find ANY active Pilot (bypass strict validation) ─────────
      this.logger.log(`Step 2: Finding any active Pilot for booking ${payload.bookingId}`);

      let pilotUid: string | null = null;

      // Try optimal pairing first
      try {
        const match = await this.dronePilotMatchingService.findOptimalPairing(
          payload.bookingId,
          booking.serviceType || payload.serviceType,
          booking.location || payload.location,
          fmUid,
          booking.scheduledDate || payload.scheduledDate,
        );
        pilotUid = match.pilotUid;
        this.logger.log(`Optimal pilot found: ${pilotUid} (score: ${match.pilot.score})`);
      } catch {
        this.logger.log('Optimal pilot matching returned no results, falling back to simple query');
      }

      // If optimal matching failed, query pilots from this fleet manager with active status
      if (!pilotUid) {
        const pilotSnapshot = await db
          .collection(ROOT_COLLECTIONS.users)
          .where('role', '==', 'pilot')
          .where('status', 'in', ['active', 'available'])
          .get();

        const eligiblePilots = pilotSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((pilot: any) => {
            const profileData = pilot.profileData || {};
            const assignedFleetMgr = profileData.assignedFleetManagerUid;
            const assignedVendor = profileData.assignedVendorUid;
            if (assignedFleetMgr !== fmUid && assignedVendor !== fmUid) {
              return false;
            }
            if (profileData.currentMissionId) {
              return false;
            }
            const serviceTypes = profileData.serviceTypes || [];
            const serviceType = booking.serviceType || payload.serviceType;
            if (!serviceTypes.includes(serviceType)) {
              return false;
            }
            return true;
          });

        if (eligiblePilots.length > 0) {
          pilotUid = eligiblePilots[0].id;
          this.logger.log(`Filtered pilot query found: ${pilotUid}`);
        }
      }

      // ── STEP 3: Find ANY available Drone (bypass strict validation) ──────
      this.logger.log(`Step 3: Finding any available Drone for booking ${payload.bookingId}`);

      let droneId: string | null = null;

      // Try optimal pairing first (this gives us drone from the same method)
      if (pilotUid) {
        try {
          const match = await this.dronePilotMatchingService.findOptimalPairing(
            payload.bookingId,
            booking.serviceType || payload.serviceType,
            booking.location || payload.location,
            fmUid,
            booking.scheduledDate || payload.scheduledDate,
          );
          droneId = match.droneId;
          this.logger.log(`Optimal drone found: ${droneId} (score: ${match.drone.score})`);
        } catch {
          this.logger.log('Optimal drone matching returned no results, falling back to simple query');
        }
      }

      // If optimal matching failed, query drones matching service type and owned by this fleet manager
      if (!droneId) {
        const serviceType = booking.serviceType || payload.serviceType;

        for (const status of ['deployable', 'available']) {
          try {
            const droneSnapshot = await db
              .collectionGroup(USER_SUBCOLLECTIONS.drones)
              .where('status', '==', status)
              .get();

            const eligibleDrones = droneSnapshot.docs
              .filter((doc) => {
                const drone = doc.data();
                if (drone.type !== serviceType && drone.type !== 'multi_purpose') {
                  return false;
                }
                const droneFleetMgr = drone.fleetManagerUid || drone.assignedFleetManagerUid;
                const droneVendor = drone.vendorUid;
                if (droneFleetMgr !== fmUid && droneVendor !== fmUid) {
                  return false;
                }
                if (drone.currentBookingId && drone.currentBookingId !== payload.bookingId) {
                  return false;
                }
                if (drone.totalFlightHours && drone.totalFlightHours >= 100) {
                  return false;
                }
                const insuranceExpiry = drone.insuranceExpiry;
                if (insuranceExpiry && new Date(insuranceExpiry) < new Date()) {
                  return false;
                }
                return true;
              });

            if (eligibleDrones.length > 0) {
              droneId = eligibleDrones[0].id;
              this.logger.log(`Filtered drone query found: ${droneId} (status=${status}, type=${serviceType})`);
              break;
            }
          } catch {
            this.logger.warn(`Drone query with status=${status} failed, trying next`);
          }
        }
      }

      // ── STEP 4: Assign what we found ─────────────────────────────────────
      const now = new Date().toISOString();
      const partialNote = `Pilot busy, will assign ASAP`;

      if (pilotUid && droneId) {
        this.logger.log(`Step 4: Assigning FM=${fmUid}, Pilot=${pilotUid}, Drone=${droneId} to booking ${payload.bookingId}`);

        await this.bookingService.assignBooking(
          payload.bookingId,
          { pilotUid, droneId },
          fmUid,
        );

        this.logger.log(
          `✓ Complete auto-assignment done for booking ${payload.bookingId}: ` +
          `FM=${fmUid}, Pilot=${pilotUid}, Drone=${droneId}, status=confirmed, stage=2`
        );
      } else if (pilotUid) {
        // Have FM + pilot but no drone — save what we have
        this.logger.log(`Step 4: Assigning FM=${fmUid}, Pilot=${pilotUid} (drone pending) to booking ${payload.bookingId}`);
        await bookingDoc.ref.update({
          fleetManagerUid: fmUid,
          assignedPilot: pilotUid,
          assignedDrone: null,
          fleetManagerAutoAssigned: true,
          fleetManagerAssignedAt: now,
          status: 'confirmed',
          stage: 2,
          updatedAt: now,
        });
        // Update pilot status to 'assigned'
        await db.collection(ROOT_COLLECTIONS.users).doc(pilotUid).update({
          status: 'assigned', isAvailable: false, updatedAt: now,
        }).catch((err: any) => this.logger.warn(`Failed to update pilot ${pilotUid} status: ${err.message}`));
      } else if (droneId) {
        // Have FM + drone but no pilot — save what we have, frontend will show "pilot busy"
        this.logger.log(`Step 4: Assigning FM=${fmUid}, Drone=${droneId} (pilot pending) to booking ${payload.bookingId}`);
        await bookingDoc.ref.update({
          fleetManagerUid: fmUid,
          assignedPilot: null,
          assignedDrone: droneId,
          fleetManagerAutoAssigned: true,
          fleetManagerAssignedAt: now,
          status: 'confirmed',
          stage: 2,
          updatedAt: now,
        });
        // Update drone status to 'assigned'
        const dSnap = await db.collectionGroup(USER_SUBCOLLECTIONS.drones).where('id', '==', droneId).limit(1).get();
        if (!dSnap.empty) {
          await dSnap.docs[0].ref.update({
            status: 'assigned', isAvailable: false, updatedAt: now,
          }).catch((err: any) => this.logger.warn(`Failed to update drone ${droneId} status: ${err.message}`));
        }
      } else {
        // Have FM only — assign FM, frontend will show "pilot/drone busy"
        this.logger.log(`Step 4: Assigning FM=${fmUid} only (pilot and drone pending) to booking ${payload.bookingId}`);
        await bookingDoc.ref.update({
          fleetManagerUid: fmUid,
          assignedPilot: null,
          assignedDrone: null,
          fleetManagerAutoAssigned: true,
          fleetManagerAssignedAt: now,
          status: 'confirmed',
          stage: 2,
          updatedAt: now,
        });
      }
    } catch (error) {
      this.logger.error(
        `Complete auto-assignment failed for booking ${payload.bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Last resort fallback: try the old request-based flow
      setTimeout(async () => {
        try {
          await this.autoAssignFleetManagerRequest(payload.bookingId);
        } catch (fallbackError) {
          this.logger.error(`Fallback FM request also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      }, 1000);
    }
  }

  /**
   * ⭐ Event Listener: Handle fleet manager acceptance and auto-assign pilot + drone
   * Uses DronePilotMatchingService to find the optimal pilot+drone combination
   * from the fleet manager's resources, then calls BookingService.assignBooking()
   * to update the booking with assignedPilot, assignedDrone, status confirmed, stage 2
   */
  @OnEvent('fleet-manager.accepted.trigger-pilot-assignment')
  async handleFleetManagerAcceptedEvent(payload: {
    bookingId: string;
    fleetManagerUid: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Auto-assigning pilot and drone for booking ${payload.bookingId} after FM acceptance`
      );

      // Small delay to ensure booking is fully updated from acceptRequest transaction
      await new Promise(resolve => setTimeout(resolve, 500));

      const db = this.firebaseAdminService.firestore();
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(payload.bookingId).get();

      if (!bookingDoc.exists) {
        throw new NotFoundException(`Booking ${payload.bookingId} not found`);
      }

      const booking = bookingDoc.data() as FirestoreBookingDocument;

      // Skip if pilot+drone already assigned (e.g., FM manually assigned via assign endpoint)
      if (booking.assignedPilot && booking.assignedDrone) {
        this.logger.log(
          `Booking ${payload.bookingId} already has pilot+drone assigned, skipping auto-assignment`
        );
        return;
      }

      // Use DronePilotMatchingService to find best pilot+drone from this FM's resources
      const match = await this.dronePilotMatchingService.findOptimalPairing(
        payload.bookingId,
        booking.serviceType,
        booking.location,
        payload.fleetManagerUid,
        booking.scheduledDate,
      );

      // Assign both pilot and drone via BookingService
      await this.bookingService.assignBooking(
        payload.bookingId,
        { pilotUid: match.pilotUid, droneId: match.droneId },
        payload.fleetManagerUid,
      );

      this.logger.log(
        `Complete auto-assignment done for booking ${payload.bookingId}: ` +
        `Pilot ${match.pilotUid} (score: ${match.pilot.score}), ` +
        `Drone ${match.droneId} (score: ${match.drone.score}), ` +
        `Fleet Manager: ${payload.fleetManagerUid}`
      );
    } catch (error) {
      this.logger.error(
        `Full auto-assignment failed for booking ${payload.bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Fallback: emit event for pilot-only mission requests (legacy behavior)
      this.logger.log(
        `Falling back to pilot mission requests for booking ${payload.bookingId}`
      );
      this.eventEmitter.emit('pilot.auto-assign.trigger', {
        bookingId: payload.bookingId,
        fleetManagerUid: payload.fleetManagerUid,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle timeout - called by background job/scheduler
   */
  async handleTimeout(bookingId: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    // Get all pending requests for this booking
    const requestsSnapshot = await db
      .collection(ROOT_COLLECTIONS.fleetManagerRequests)
      .where('bookingId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();

    if (requestsSnapshot.empty) {
      return; // All requests already responded to
    }

    const batch = db.batch();
    const now = new Date().toISOString();

    // Mark all pending requests as timeout
    for (const doc of requestsSnapshot.docs) {
      batch.update(doc.ref, {
        status: 'timeout',
        updatedAt: now,
      });
    }

    await batch.commit();

    // Emit timeout event
    this.eventEmitter.emit(WS_EVENTS.FLEET_MANAGER_REQUEST_TIMEOUT, {
      bookingId,
      fleetManagerUids: requestsSnapshot.docs.map((doc) => doc.data().fleetManagerUid),
      timestamp: now,
    });

    // Update booking
    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();
    if (bookingDoc.exists) {
      await bookingDoc.ref.update({
        fleetManagerRequestStatus: 'timeout',
        updatedAt: now,
      });
    }

    this.logger.warn(
      `Fleet manager request timeout for booking ${bookingId}. Admin intervention required.`
    );
  }

  /**
   * ⭐ Assign drone to booking - Fleet Manager manually selects drone
   * ENFORCES HIERARCHY: Only drones from the fleet manager's inventory can be assigned
   */
  async assignDroneToBooking(
    bookingId: string,
    droneId: string,
    fleetManagerUid: string,
  ): Promise<{
    success: boolean;
    booking: FirestoreBookingDocument;
    drone: any;
    message: string;
    handoverIssueCode: string;
  }> {
    const db = this.firebaseAdminService.firestore();

    // 1. Get booking
    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const booking = bookingDoc.data() as FirestoreBookingDocument;

    // 2. Verify fleet manager owns this booking
    if (booking.fleetManagerUid !== fleetManagerUid) {
      throw new BadRequestException('This booking is not assigned to you');
    }

    // 3. Get drone document
    const droneSnapshot = await db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('id', '==', droneId)
      .limit(1)
      .get();

    if (droneSnapshot.empty) {
      throw new NotFoundException(`Drone ${droneId} not found`);
    }

    const droneDoc = droneSnapshot.docs[0];
    const drone = droneDoc.data();

    // 4. ⭐ CRITICAL: Verify drone belongs to this fleet manager
    // createDrone stores `fleetManagerUid`, so accept it alongside the
    // assigned/vendor variants.
    const assignedFleetMgr = drone.assignedFleetManagerUid ?? drone.fleetManagerUid;
    const assignedVendor = drone.vendorUid;

    if (assignedFleetMgr !== fleetManagerUid && assignedVendor !== fleetManagerUid) {
      throw new BadRequestException(
        'Access denied: This drone does not belong to your fleet. You can only assign drones from your own inventory.'
      );
    }

    // 5. Verify drone can handle the service type
    const droneType = drone.type;
    if (droneType !== booking.serviceType && droneType !== 'multi_purpose') {
      throw new BadRequestException(
        `Drone type mismatch: This drone (${droneType}) cannot perform ${booking.serviceType} service. Please select a compatible drone.`
      );
    }

    // 6. Verify drone is available
    if (drone.status !== 'deployable' && drone.status !== 'available') {
      throw new BadRequestException(
        `Drone unavailable: This drone is currently ${drone.status}. Please select an available drone.`
      );
    }

    // 7. Check if drone needs maintenance
    const totalFlightHours = drone.totalFlightHours || 0;
    if (totalFlightHours >= 100) {
      throw new BadRequestException(
        `Drone requires maintenance: This drone has ${totalFlightHours} flight hours and needs servicing before deployment.`
      );
    }

    // 8. Verify insurance and registration are valid
    const insuranceExpiry = drone.insuranceExpiry;
    if (insuranceExpiry && new Date(insuranceExpiry) < new Date()) {
      throw new BadRequestException(
        `Drone insurance expired: Insurance expired on ${new Date(insuranceExpiry).toLocaleDateString()}. Please renew before assignment.`
      );
    }

    const registrationExpiry = drone.registrationExpiry;
    if (registrationExpiry && new Date(registrationExpiry) < new Date()) {
      throw new BadRequestException(
        `Drone registration expired: Registration expired on ${new Date(registrationExpiry).toLocaleDateString()}. Please renew before assignment.`
      );
    }

    // 9. Check if drone is already assigned to another booking
    if (drone.currentBookingId && drone.currentBookingId !== bookingId) {
      throw new BadRequestException(
        `Drone already assigned: This drone is currently assigned to another booking (${drone.currentBookingId}).`
      );
    }

    const now = new Date().toISOString();

    // 10. Update booking with drone assignment + drone-handover issue code.
    // The FM shares this 4-char code with the pilot in person; the pilot must
    // enter it before starting the mission.
    const handoverIssueCode = generateHandoverCode();
    await bookingDoc.ref.update({
      assignedDrone: droneId,
      droneId,
      droneAssignedAt: now,
      handoverIssueCode,
      handoverIssueVerified: false,
      handoverIssueVerifiedAt: null,
      stage: booking.assignedPilot ? 2 : booking.stage || 2,
      updatedAt: now,
    });

    // 11. Update drone with current booking
    await droneDoc.ref.update({
      currentBookingId: bookingId,
      status: 'assigned',
      updatedAt: now,
    });

    // 12. Emit WebSocket events
    this.eventEmitter.emit(WS_EVENTS.DRONE_ASSIGNED, {
      bookingId,
      droneId,
      fleetManagerUid,
      pilotUid: (booking as any).pilotUid || null,
      customerUid: booking.customerUid,
      droneDetails: {
        model: drone.model,
        type: drone.type,
        registrationNumber: drone.registrationNumber,
      },
      timestamp: now,
    });

    this.logger.log(
      `Drone ${droneId} assigned to booking ${bookingId} by fleet manager ${fleetManagerUid}`
    );

    // Get updated booking
    const updatedBooking = await bookingDoc.ref.get();

    return {
      success: true,
      booking: updatedBooking.data() as FirestoreBookingDocument,
      drone: {
        id: drone.id,
        model: drone.model,
        type: drone.type,
        registrationNumber: drone.registrationNumber,
        status: 'assigned',
      },
      message: 'Drone assigned successfully. Pilot has been notified.',
      handoverIssueCode,
    };
  }

  /**
   * ⭐ Verify drone return — FM enters the 4-char code the pilot received on
   * service end. Only on a correct code is the booking marked completed
   * (proves the pilot handed the drone back).
   */
  async verifyDroneReturn(
    bookingId: string,
    code: string,
    fleetManagerUid: string,
  ): Promise<{ success: boolean; booking: FirestoreBookingDocument; message: string }> {
    const db = this.firebaseAdminService.firestore();
    const lookup = await this.bookingService.findBookingLookup(bookingId);
    const booking = lookup.booking as any;

    if (booking.fleetManagerUid !== fleetManagerUid) {
      throw new BadRequestException('This booking is not assigned to you');
    }
    if (booking.status === 'completed') {
      return { success: true, booking: booking as FirestoreBookingDocument, message: 'Service already marked completed.' };
    }
    if (booking.status === 'cancelled') {
      throw new BadRequestException('This booking has been cancelled.');
    }
    const expected = normalizeHandoverCode(booking.handoverReturnCode);
    if (!expected) {
      throw new BadRequestException('The pilot has not ended the service yet — no return code exists for this booking.');
    }
    if (booking.handoverReturnVerified) {
      throw new BadRequestException('Drone return already verified for this booking.');
    }
    const entered = normalizeHandoverCode(code);
    if (!entered || entered !== expected) {
      throw new BadRequestException('Incorrect return code. Ask the pilot for the code shown on their screen.');
    }

    const now = new Date().toISOString();
    await lookup.ref.set(
      { handoverReturnVerified: true, handoverReturnVerifiedAt: now, updatedAt: now },
      { merge: true },
    );

    // Mark the service completed (validated transition in_progress → completed).
    const fmUser = { uid: fleetManagerUid, role: 'fleet_manager' } as any;
    const completed = await this.bookingService.updateStatus(
      bookingId,
      { status: 'completed', remarks: 'Drone return verified by fleet manager' },
      fmUser,
    );

    // Release pilot + drone back to available.
    if (completed.assignedPilot) {
      await db.collection(ROOT_COLLECTIONS.users).doc(completed.assignedPilot).set(
        { status: 'available', isAvailable: true, currentBookingId: null, updatedAt: now },
        { merge: true },
      ).catch(() => null);
    }
    if (completed.assignedDrone) {
      const droneSnap = await db
        .collectionGroup(USER_SUBCOLLECTIONS.drones)
        .where('id', '==', completed.assignedDrone)
        .limit(1)
        .get()
        .catch(() => null);
      if (droneSnap && !droneSnap.empty) {
        await droneSnap.docs[0].ref.set(
          { status: 'deployable', deployable: true, currentBookingId: null, updatedAt: now },
          { merge: true },
        ).catch(() => null);
      }
    }

    this.eventEmitter.emit(WS_EVENTS.MISSION_COMPLETED, {
      bookingId,
      pilotUid: completed.assignedPilot,
      customerUid: completed.customerUid,
      fleetManagerUid,
      timestamp: now,
    });

    this.logger.log(`Drone return verified for booking ${bookingId} by FM ${fleetManagerUid}`);

    const fresh = await lookup.ref.get();
    return {
      success: true,
      booking: fresh.data() as FirestoreBookingDocument,
      message: 'Drone return verified. Service marked as completed.',
    };
  }

  /**
   * Get drone recommendations for a booking
   * Returns only drones from the fleet manager's inventory
   */
  async getDroneRecommendations(
    bookingId: string,
    fleetManagerUid: string,
  ): Promise<any[]> {
    const db = this.firebaseAdminService.firestore();

    // Get booking details
    const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const booking = bookingDoc.data() as FirestoreBookingDocument;

    // Verify fleet manager owns this booking
    if (booking.fleetManagerUid !== fleetManagerUid) {
      throw new BadRequestException('This booking is not assigned to you');
    }

    // Query drones from fleet manager's inventory. NOTE: no `status`
    // filter here — createDrone stores status 'deployable' but older/other
    // flows use 'available'/'ready', so availability is enforced in the
    // in-code filter below instead of a single-status query.
    const dronesSnapshot = await db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .get();

    // Filter drones by fleet manager and service compatibility
    const suitableDrones = dronesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((drone: any) => {
        // Check ownership — createDrone stores `fleetManagerUid`, so accept
        // it alongside the assigned/vendor variants.
        const assignedFleetMgr =
          drone.assignedFleetManagerUid ?? drone.fleetManagerUid;
        const assignedVendor = drone.vendorUid;
        if (assignedFleetMgr !== fleetManagerUid && assignedVendor !== fleetManagerUid) {
          return false;
        }

        // Only deployable/available drones are assignable.
        const droneStatus = String(drone.status || '').toLowerCase();
        if (droneStatus && !['deployable', 'available', 'ready'].includes(droneStatus)) {
          return false;
        }

        // Check service type compatibility
        if (drone.type !== booking.serviceType && drone.type !== 'multi_purpose') {
          return false;
        }

        // Check maintenance needs
        if (drone.totalFlightHours >= 100) {
          return false;
        }

        // Check insurance validity
        if (drone.insuranceExpiry && new Date(drone.insuranceExpiry) < new Date()) {
          return false;
        }

        // Check registration validity
        if (drone.registrationExpiry && new Date(drone.registrationExpiry) < new Date()) {
          return false;
        }

        // Check if already assigned
        if (drone.currentBookingId && drone.currentBookingId !== bookingId) {
          return false;
        }

        return true;
      })
      .map((drone: any) => {
        // Calculate suitability score
        let score = 0;

        // Type match score (40%)
        if (drone.type === booking.serviceType) {
          score += 40;
        } else if (drone.type === 'multi_purpose') {
          score += 30;
        }

        // Condition score (35%) - based on remaining flight hours
        const hoursRemaining = 100 - (drone.totalFlightHours || 0);
        score += (hoursRemaining / 100) * 35;

        // Battery health score (15%)
        const batteryHealth = drone.batteryHealth || 80;
        score += (batteryHealth / 100) * 15;

        // Availability score (10%) - prefer recently maintained drones
        const daysSinceLastMaintenance = drone.lastMaintenanceDate
          ? (Date.now() - new Date(drone.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        const freshness = Math.max(0, 100 - daysSinceLastMaintenance);
        score += (freshness / 100) * 10;

        return {
          ...drone,
          suitabilityScore: Math.round(score),
          recommendation: score >= 80 ? 'highly_recommended' : score >= 60 ? 'recommended' : 'suitable',
        };
      })
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    this.logger.log(
      `Found ${suitableDrones.length} suitable drones for booking ${bookingId} (Fleet Manager: ${fleetManagerUid})`
    );

    return suitableDrones;
  }

  /**
   * Create (or update) the mission record for a booking so the assigned pilot
   * sees it in their "incoming requests" section. Mission docs are stored at
   * missions/{bookingId} with status 'pending' until the pilot accepts.
   */
  private async upsertMissionForBooking(
    bookingId: string,
    pilotUid: string,
    now: string,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    const missionRef = db.collection(ROOT_COLLECTIONS.missions).doc(bookingId);
    const existing = await missionRef.get().catch(() => null);

    if (existing?.exists) {
      const data = existing.data() as FirestoreMissionDocument | undefined;
      const advancedStatuses = ['accepted', 'en_route', 'at_location', 'preflight', 'started', 'completed'];
      if (data && advancedStatuses.includes(data.status)) {
        // Don't downgrade an already-accepted/started mission.
        await missionRef.update({ pilotUid, updatedAt: now }).catch(() => {});
        return;
      }
      await missionRef.set(
        {
          ...(data || {}),
          requestId: bookingId,
          bookingId,
          pilotUid,
          status: 'pending',
          updatedAt: now,
        },
        { merge: true },
      );
      return;
    }

    const mission: FirestoreMissionDocument = {
      requestId: bookingId,
      bookingId,
      pilotUid,
      status: 'pending',
      startTime: null,
      endTime: null,
      geoTrack: [],
      reportSummary: {},
      createdAt: now,
      updatedAt: now,
    };
    await missionRef.set(mission, { merge: true });
  }
}

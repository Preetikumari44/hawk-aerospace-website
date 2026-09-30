import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../../common/interfaces/current-user.interface';
import type {
  FirestoreBookingDocument,
  FirestoreMissionDocument,
} from '../../../database/firestore/contracts';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../../gateway/events/event.constants';
import type {
  MissionAcceptedPayload,
  MissionCompletedPayload,
  MissionRejectedPayload,
  MissionStartedPayload,
} from '../../../gateway/events/event.interfaces';
import { BookingService } from '../../booking/booking.service';
import { UsersService } from '../../users/users.service';
import {
  generateHandoverCode,
  normalizeHandoverCode,
} from '../../../common/utils/handover-code.util';
import { MissionAcceptanceDto } from '../dto/mission-acceptance.dto';
import { MissionStatusDto } from '../dto/mission-status.dto';
import { PostMissionDto } from '../dto/post-mission.dto';
import { RejectMissionDto } from '../dto/reject-mission.dto';
import { PreFlightCheckDto } from '../dto/pre-flight-check.dto';
import { UploadMediaDto } from '../dto/upload-media.dto';

interface MissionEventContext {
  booking: FirestoreBookingDocument;
  pilotName: string;
}

@Injectable()
export class MissionService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly bookingService: BookingService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listMissions(user: CurrentUser): Promise<any[]> {
    const snapshot = await this.collection().where('pilotUid', '==', user.uid).get();
    const missions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return this.enrichMissionsWithBookings(missions, user);
  }

  async getMission(id: string, user: CurrentUser): Promise<FirestoreMissionDocument> {
    const mission = await this.findMission(id);
    this.assertPilotOwnsMission(mission, user);
    return mission;
  }

  async getEnrichedMission(id: string, user: CurrentUser): Promise<any> {
    const mission = await this.getMission(id, user);
    const enriched = await this.enrichMissionsWithBookings([{ id, ...mission }], user);
    return enriched[0] || mission;
  }

  /** YYYY-MM-DD of a mission's scheduled date (mission field, else booking). */
  private missionDay(mission: any, booking?: any): string | null {
    const raw = mission?.scheduledDate || booking?.scheduledDate;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  async acceptMission(id: string, dto: MissionAcceptanceDto, user: CurrentUser) {
    const mission = await this.getMission(id, user);
    const context = await this.resolveMissionContext(mission, user);

    // No double-booking on the same date: a pilot accepting multiple bookings
    // must not hold 2 accepted missions scheduled for the same day.
    if (dto.accepted) {
      const day = this.missionDay(mission, context.booking);
      if (day) {
        const others = await this.collection()
          .where('pilotUid', '==', user.uid)
          .where('status', '==', 'accepted')
          .get();
        for (const doc of others.docs) {
          if (doc.id === id) continue;
          const other = { id: doc.id, ...doc.data() } as any;
          let otherDay = this.missionDay(other);
          if (!otherDay && other.bookingId) {
            try {
              const b = await this.bookingService.getBooking(other.bookingId, user).catch(() => null);
              otherDay = this.missionDay(other, b);
            } catch {
              /* ignore lookup failures */
            }
          }
          if (otherDay === day) {
            throw new BadRequestException(
              'You already have an accepted booking on this date. A pilot cannot hold 2 bookings on the same date.',
            );
          }
        }
      }
    }

    const now = new Date().toISOString();
    const updated: FirestoreMissionDocument = {
      ...mission,
      status: dto.accepted ? 'accepted' : 'rejected',
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    // ⭐ When a pilot accepts a mission, mark them as assigned (from available).
    if (dto.accepted) {
      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(user.uid)
        .update({
          status: 'assigned',
          isAvailable: false,
          currentBookingId: mission.bookingId,
          updatedAt: now,
        })
        .catch(() => {
          /* pilot status update is best-effort */
        });
    }

    const payload: MissionAcceptedPayload | MissionRejectedPayload = dto.accepted
      ? {
          bookingId: mission.bookingId,
          pilotUid: user.uid,
          pilotName: context.pilotName,
          customerUid: context.booking.customerUid,
          timestamp: now,
        }
      : {
          bookingId: mission.bookingId,
          pilotUid: user.uid,
          customerUid: context.booking.customerUid,
          reason: dto.remarks,
          timestamp: now,
        };

    this.eventEmitter.emit(
      dto.accepted ? WS_EVENTS.MISSION_ACCEPTED : WS_EVENTS.MISSION_REJECTED,
      payload,
    );

    return updated;
  }

  async updateMissionStatus(id: string, dto: MissionStatusDto, user: CurrentUser) {
    const mission = await this.getMission(id, user);
    const context = await this.resolveMissionContext(mission, user);

    if (mission.status === 'rejected' || mission.status === 'cancelled') {
      throw new BadRequestException(`Cannot update ${mission.status} mission.`);
    }

    const now = new Date().toISOString();

    // ── Drone handover (issue) gate: the pilot must enter the 4-char code
    // the FM received on drone assignment before the service can start. ──
    let issueJustVerified = false;
    if (dto.status === 'started') {
      const booking = context.booking as any;
      if (booking?.assignedDrone && booking?.handoverIssueCode && !booking?.handoverIssueVerified) {
        const entered = normalizeHandoverCode((dto as any).handoverCode);
        if (!entered) {
          throw new BadRequestException(
            'Enter the 4-character drone code shared by your fleet manager to start the mission.',
          );
        }
        if (entered !== normalizeHandoverCode(booking.handoverIssueCode)) {
          throw new BadRequestException('Incorrect drone code. Ask your fleet manager for the correct code.');
        }
        issueJustVerified = true;
        const bookingLookup = await this.bookingService.findBookingLookup(mission.bookingId).catch(() => null);
        await bookingLookup?.ref
          .set({ handoverIssueVerified: true, handoverIssueVerifiedAt: now, updatedAt: now }, { merge: true })
          .catch(() => null);
      }
    }

    const updated: FirestoreMissionDocument = {
      ...mission,
      status: dto.status,
      startTime: dto.status === 'started' ? now : mission.startTime,
      endTime: dto.status === 'completed' ? now : mission.endTime,
      ...(issueJustVerified ? { handoverIssueVerified: true, handoverIssueVerifiedAt: now } : {}),
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    if (dto.status === 'started') {
      await this.bookingService.updateStatus(
        mission.bookingId,
        { status: 'in_progress', remarks: dto.remarks },
        user,
      );

      const db = this.firebaseAdminService.firestore();
      await db.collection(ROOT_COLLECTIONS.users).doc(user.uid).set(
        { isAvailable: false },
        { merge: true },
      );

      const droneId = context.booking.assignedDrone;
      if (droneId) {
        const droneSnap = await db.collectionGroup('drones')
          .where('id', '==', droneId)
          .limit(1)
          .get();
        if (!droneSnap.empty) {
          await droneSnap.docs[0].ref.set(
            { deployable: false },
            { merge: true },
          );
        }
      }

      const payload: MissionStartedPayload = {
        bookingId: mission.bookingId,
        pilotUid: user.uid,
        customerUid: context.booking.customerUid,
        fleetManagerUid: context.booking.fleetManagerUid ?? undefined,
        timestamp: now,
      };
      this.eventEmitter.emit(WS_EVENTS.MISSION_STARTED, payload);
    }

    if (dto.status === 'completed') {
      // ── Drone handover (return): generate the 4-char code the pilot shows
      // the FM on drone hand-back. The booking stays in_progress until the FM
      // enters this code (verify-return) — the service is NOT completed yet. ──
      const returnCode =
        normalizeHandoverCode((mission as any).handoverReturnCode) ||
        normalizeHandoverCode((context.booking as any)?.handoverReturnCode) ||
        generateHandoverCode();
      const requestedAt =
        (mission as any).handoverReturnRequestedAt ||
        (context.booking as any)?.handoverReturnRequestedAt ||
        now;
      updated.handoverReturnCode = returnCode;
      updated.handoverReturnRequestedAt = requestedAt;
      await this.collection().doc(id).set(updated, { merge: true });

      const bookingLookup = await this.bookingService.findBookingLookup(mission.bookingId).catch(() => null);
      await bookingLookup?.ref
        .set(
          { handoverReturnCode: returnCode, handoverReturnRequestedAt: requestedAt, updatedAt: now },
          { merge: true },
        )
        .catch(() => null);

      this.eventEmitter.emit('mission.service.ended.pending.return', {
        missionId: id,
        pilotUid: user.uid,
        bookingId: mission.bookingId,
        timestamp: now,
      });

      return { ...updated };
    }

    return updated;
  }

  async postMissionReport(id: string, dto: PostMissionDto, user: CurrentUser) {
    const mission = await this.getMission(id, user);
    const context = await this.resolveMissionContext(mission, user);
    const now = new Date().toISOString();

    const updated: FirestoreMissionDocument = {
      ...mission,
      reportSummary: {
        areaActual: dto.areaActual,
        notes: dto.notes,
        photos: dto.photos ?? [],
        submittedAt: now,
      },
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    if (updated.status === 'completed') {
      const payload: MissionCompletedPayload = {
        bookingId: mission.bookingId,
        pilotUid: user.uid,
        customerUid: context.booking.customerUid,
        fleetManagerUid: context.booking.fleetManagerUid ?? undefined,
        summary: updated.reportSummary,
        timestamp: now,
      };
      this.eventEmitter.emit(WS_EVENTS.MISSION_COMPLETED, payload);
    }

    return updated;
  }

  private async resolveMissionContext(
    mission: FirestoreMissionDocument,
    user: CurrentUser,
  ): Promise<MissionEventContext> {
    const [booking, pilot] = await Promise.all([
      this.bookingService.getBooking(mission.bookingId, user),
      this.usersService.getByUid(user.uid),
    ]);

    return {
      booking,
      pilotName: pilot.name,
    };
  }

  private async findMission(id: string): Promise<FirestoreMissionDocument & { id: string }> {
    const snapshot = await this.collection().doc(id).get();
    if (!snapshot.exists) {
      throw new NotFoundException(`Mission ${id} not found.`);
    }

    const mission = snapshot.data();
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found.`);
    }

    return { id, ...mission };
  }

  private async enrichMissionsWithBookings(missions: any[], user: CurrentUser): Promise<any[]> {
    const bookingIds = [...new Set(missions.map((m) => m.bookingId).filter(Boolean))];
    if (bookingIds.length === 0) return missions;

    const bookings = await Promise.all(
      bookingIds.map((id) =>
        this.bookingService.getBooking(id, user).catch(() => null),
      ),
    );

    const bookingMap = new Map<string, any>();
    bookingIds.forEach((id, i) => {
      if (bookings[i]) bookingMap.set(id, bookings[i]);
    });

    // Collect unique fleet manager UIDs and drone IDs across all bookings
    const fmUids = [...new Set(bookings.filter(Boolean).map((b) => b.fleetManagerUid).filter(Boolean))];
    const droneIds = [...new Set(bookings.filter(Boolean).map((b) => b.assignedDrone).filter(Boolean))];

    // Batch-fetch fleet manager user documents
    const fmDocs = await Promise.all(
      fmUids.map((uid) =>
        this.firebaseAdminService.firestore()
          .collection(ROOT_COLLECTIONS.users)
          .doc(uid)
          .get()
          .then((s) => s.exists ? { uid, ...s.data() } as any : null)
          .catch(() => null),
      ),
    );
    const fmMap = new Map<string, any>();
    fmUids.forEach((uid, i) => {
      if (fmDocs[i]) fmMap.set(uid, fmDocs[i]);
    });

    // Batch-fetch drone documents (drones are a subcollection under users)
    const droneDocs = await Promise.all(
      droneIds.map((id) =>
        this.firebaseAdminService.firestore()
          .collectionGroup('drones')
          .where('id', '==', id)
          .limit(1)
          .get()
          .then((snap) => {
            if (snap.empty) return null;
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() } as any;
          })
          .catch(() => null),
      ),
    );
    const droneMap = new Map<string, any>();
    droneIds.forEach((id, i) => {
      if (droneDocs[i]) droneMap.set(id, droneDocs[i]);
    });

    return missions.map((mission) => {
      const booking = bookingMap.get(mission.bookingId);
      if (!booking) return mission;

      const fleetManager = fmMap.get(booking.fleetManagerUid);
      const drone = droneMap.get(booking.assignedDrone);

      const areaValue = booking.farmSnapshot?.area?.value ?? booking.area?.value;
      const areaUnit = booking.farmSnapshot?.area?.unit ?? booking.area?.unit;
      const landAreaStr = areaValue != null ? `${areaValue}${areaUnit ? ` ${areaUnit}` : ''}` : undefined;

      const pricingTotal = booking.priceBreakdown?.totalAmount ?? booking.finalPrice ?? booking.priceEstimation;
      const subService =
        (booking.serviceDetails?.sprayingSubType) ||
        (booking.serviceDetails?.seedingSubType) ||
        (booking.serviceDetails?.monitoringSubType) ||
        (booking.serviceDetails?.mappingSubType) ||
        (booking.serviceDetails?.mappingType) ||
        (booking.serviceDetails?.surveillanceSubType) ||
        (booking.serviceDetails?.surveillanceType) ||
        (booking.serviceDetails?.deliverySubType) ||
        (booking.serviceDetails?.videographySubType) ||
        (booking.serviceDetails?.videographyType) ||
        (booking.serviceDetails?.eventType) ||
        undefined;

      return {
        ...mission,
        serviceType: mission.serviceType || booking.serviceType,
        title: mission.title || booking.serviceType,
        address: mission.address || booking.address,
        detailedAddress: mission.detailedAddress || booking.detailedAddress || null,
        scheduledDate: mission.scheduledDate || booking.scheduledDate,
        preferredTimeSlot: mission.preferredTimeSlot || booking.preferredTimeSlot,
        priceEstimation: mission.priceEstimation ?? booking.priceEstimation ?? booking.priceBreakdown?.totalAmount,
        estimatedEarnings: mission.estimatedEarnings ?? booking.priceEstimation ?? booking.priceBreakdown?.totalAmount,
        farmName: mission.farmName || booking.farmSnapshot?.farmName,
        farmArea: mission.farmArea ?? areaValue,
        customerName: mission.customerName || booking.customerName,
        customerPhone: mission.customerPhone || booking.customerPhone,
        customerEmail: mission.customerEmail || booking.customerEmail,
        timeSlot: mission.timeSlot || mission.preferredTimeSlot || booking.preferredTimeSlot,
        eta: mission.eta || mission.estimatedArrival,
        // --- Additional fields for ActiveMissionDetails screen ---
        landArea: mission.landArea ?? landAreaStr,
        subService: mission.subService || subService,
        costToCustomer: mission.costToCustomer ?? pricingTotal,
        pilotServiceCost: mission.pilotServiceCost ?? booking.priceEstimation,
        totalEarnings: mission.totalEarnings ?? booking.priceEstimation,
        paymentStatus: mission.paymentStatus || booking.paymentStatus,
        paymentMethod: mission.paymentMethod ?? booking.paymentMethod,
        cashPending: mission.cashPending ?? booking.cashPending ?? false,
        bookingId: mission.bookingId || booking.id,
        fleetManagerName: mission.fleetManagerName || fleetManager?.name,
        fleetManagerPhone: mission.fleetManagerPhone || fleetManager?.phone,
        fleetManagerEmail: mission.fleetManagerEmail || fleetManager?.email,
        fleetManagerAddress: mission.fleetManagerAddress || fleetManager?.profileData?.address,
        droneName: mission.droneName || drone?.model,
        droneId: mission.droneId || drone?.id,
        coordinates: mission.coordinates || (booking.location ? {
          lat: booking.location.lat ?? booking.location.latitude,
          lng: booking.location.lng ?? booking.location.longitude,
        } : undefined),
        // --- Weather & Flying Restrictions from booking ---
        weather: mission.weather || (booking.weatherCheck ? {
          temperature: booking.weatherCheck.temperature,
          condition: booking.weatherCheck.forecast,
          wind: booking.weatherCheck.windSpeed != null ? `${booking.weatherCheck.windSpeed} km/h` : undefined,
          humidity: booking.weatherCheck.humidity != null ? `${booking.weatherCheck.humidity}%` : undefined,
          isSafe: booking.weatherCheck.status === 'green',
          lastChecked: booking.updatedAt,
        } : undefined),
        restrictions: mission.restrictions || (booking.flyingRestriction ? {
          nearestAirport: booking.flyingRestriction.zone,
          zoneDetails: booking.flyingRestriction.zone,
          isSafe: booking.flyingRestriction.status === 'green',
        } : undefined),
      };
    });
  }

  private assertPilotOwnsMission(mission: FirestoreMissionDocument, user: CurrentUser): void {
    if (mission.pilotUid !== user.uid) {
      throw new ForbiddenException('Pilot is not assigned to this mission.');
    }
  }

  private collection(): CollectionReference<FirestoreMissionDocument> {
    const collection = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions) as CollectionReference<FirestoreMissionDocument>;

    return collection;
  }

  // Enhanced Mission Lifecycle Methods

  async getIncomingMissions(user: CurrentUser): Promise<any[]> {
    const snapshot = await this.collection()
      .where('pilotUid', '==', user.uid)
      .where('status', '==', 'pending')
      .get();

    const missions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return this.enrichMissionsWithBookings(missions, user);
  }

  async rejectMission(id: string, dto: RejectMissionDto, user: CurrentUser) {
    const mission = await this.getMission(id, user);
    
    if (mission.status !== 'pending') {
      throw new BadRequestException('Can only reject pending missions');
    }

    const context = await this.resolveMissionContext(mission, user);
    const now = new Date().toISOString();

    const updated: FirestoreMissionDocument = {
      ...mission,
      status: 'rejected',
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    // Update booking status back to confirmed
    await this.bookingService.updateStatus(
      mission.bookingId,
      { status: 'confirmed', remarks: `Mission rejected by pilot: ${dto.reason}` },
      user,
    );

    const payload: MissionRejectedPayload = {
      bookingId: mission.bookingId,
      pilotUid: user.uid,
      customerUid: context.booking.customerUid,
      reason: dto.reason,
      timestamp: now,
    };

    this.eventEmitter.emit(WS_EVENTS.MISSION_REJECTED, payload);

    return updated;
  }

  async getRejectedMissions(user: CurrentUser): Promise<any[]> {
    const snapshot = await this.collection()
      .where('pilotUid', '==', user.uid)
      .where('status', '==', 'rejected')
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    const missions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return this.enrichMissionsWithBookings(missions, user);
  }

  async startNavigation(id: string, user: CurrentUser) {
    const mission = await this.getMission(id, user);

    if (mission.status !== 'accepted') {
      throw new BadRequestException('Mission must be accepted before starting navigation');
    }

    const now = new Date().toISOString();
    const updated: FirestoreMissionDocument = {
      ...mission,
      status: 'en_route',
      startTime: now,
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    // Update booking to indicate pilot is en route
    await this.bookingService.updateStatus(
      mission.bookingId,
      { status: 'in_progress', remarks: 'Pilot is en route to location' },
      user,
    );

    this.eventEmitter.emit('mission.navigation.started', {
      missionId: id,
      pilotUid: user.uid,
      bookingId: mission.bookingId,
      timestamp: now,
    });

    return { stage: 'EN_ROUTE', mission: updated };
  }

  async markArrived(id: string, user: CurrentUser) {
    const mission = await this.getMission(id, user);

    if (mission.status !== 'en_route') {
      throw new BadRequestException('Must be en route before marking as arrived');
    }

    const now = new Date().toISOString();
    const updated: FirestoreMissionDocument = {
      ...mission,
      status: 'at_location',
      updatedAt: now,
      arrivalTime: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    this.eventEmitter.emit('mission.arrived', {
      missionId: id,
      pilotUid: user.uid,
      bookingId: mission.bookingId,
      timestamp: now,
    });

    return { stage: 'AT_LOCATION', mission: updated };
  }

  async submitPreFlightCheck(id: string, dto: PreFlightCheckDto, user: CurrentUser) {
    const mission = await this.getMission(id, user);

    if (mission.status !== 'at_location') {
      throw new BadRequestException('Must be at location before pre-flight check');
    }

    if (!dto.allChecksPassed) {
      throw new BadRequestException(
        'All pre-flight checks must pass before starting mission. Please create a maintenance ticket for any issues.',
      );
    }

    const now = new Date().toISOString();
    const updated: FirestoreMissionDocument = {
      ...mission,
      status: 'preflight',
      updatedAt: now,
      preFlightCheck: {
        checks: dto.checks,
        completedAt: now,
        allPassed: dto.allChecksPassed,
      },
    };

    await this.collection().doc(id).set(updated, { merge: true });

    this.eventEmitter.emit('mission.preflight.completed', {
      missionId: id,
      pilotUid: user.uid,
      bookingId: mission.bookingId,
      allChecksPassed: dto.allChecksPassed,
      timestamp: now,
    });

    return { stage: 'PRE_FLIGHT', mission: updated };
  }

  async startMission(id: string, user: CurrentUser) {
    const mission = await this.getMission(id, user);

    // Validate pre-flight check was completed
    if (mission.status !== 'preflight') {
      throw new BadRequestException('Pre-flight check must be completed before starting mission');
    }

    if (!(mission as any).preFlightCheck) {
      throw new BadRequestException('Pre-flight check data is missing');
    }

    const context = await this.resolveMissionContext(mission, user);
    const now = new Date().toISOString();

    // Staged start requires the drone-issue verification to be done first
    // (via PATCH /pilots/missions/:id/status {status:'started', handoverCode}).
    const stagedBooking = context.booking as any;
    if (stagedBooking?.assignedDrone && stagedBooking?.handoverIssueCode && !stagedBooking?.handoverIssueVerified) {
      throw new BadRequestException(
        'Enter the 4-character drone code shared by your fleet manager to start the mission.',
      );
    }

    const updated: FirestoreMissionDocument = {
      ...mission,
      status: 'started',
      startTime: now,
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    await this.bookingService.updateStatus(
      mission.bookingId,
      { status: 'in_progress', remarks: 'Mission active' },
      user,
    );

    const payload: MissionStartedPayload = {
      bookingId: mission.bookingId,
      pilotUid: user.uid,
      customerUid: context.booking.customerUid,
      fleetManagerUid: context.booking.fleetManagerUid ?? undefined,
      timestamp: now,
    };

    this.eventEmitter.emit(WS_EVENTS.MISSION_STARTED, payload);

    return { stage: 'IN_FLIGHT', mission: updated };
  }

  async completeMission(id: string, user: CurrentUser) {
    const mission = await this.getMission(id, user);

    if (mission.status !== 'started') {
      throw new BadRequestException('Mission must be started before completing');
    }

    const now = new Date().toISOString();
    // Same return-handover semantics as updateMissionStatus(completed):
    // issue the FM-verification code, keep the booking in_progress.
    const bookingLookup = await this.bookingService.findBookingLookup(mission.bookingId).catch(() => null);
    const bookingReturnCode = normalizeHandoverCode((bookingLookup?.booking as any)?.handoverReturnCode);
    const returnCode =
      normalizeHandoverCode((mission as any).handoverReturnCode) || bookingReturnCode || generateHandoverCode();
    const requestedAt =
      (mission as any).handoverReturnRequestedAt ||
      (bookingLookup?.booking as any)?.handoverReturnRequestedAt ||
      now;
    const updated: FirestoreMissionDocument = {
      ...mission,
      status: 'completed',
      endTime: now,
      handoverReturnCode: returnCode,
      handoverReturnRequestedAt: requestedAt,
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });
    await bookingLookup?.ref
      .set(
        { handoverReturnCode: returnCode, handoverReturnRequestedAt: requestedAt, updatedAt: now },
        { merge: true },
      )
      .catch(() => null);

    this.eventEmitter.emit('mission.completed.pending.media', {
      missionId: id,
      pilotUid: user.uid,
      bookingId: mission.bookingId,
      timestamp: now,
    });

    return { stage: 'MISSION_COMPLETE', mission: updated };
  }

  async uploadMissionMedia(id: string, dto: UploadMediaDto, user: CurrentUser) {
    const mission = await this.getMission(id, user);
    const context = await this.resolveMissionContext(mission, user);

    if (mission.status !== 'completed') {
      throw new BadRequestException('Mission must be completed before uploading media');
    }

    const now = new Date().toISOString();
    const updated: FirestoreMissionDocument = {
      ...mission,
      reportSummary: {
        ...(mission.reportSummary || {}),
        photos: dto.mediaUrls,
        submittedAt: now,
      },
      updatedAt: now,
    };

    await this.collection().doc(id).set(updated, { merge: true });

    // Complete the booking only when no drone-return verification is pending:
    // with handover codes the FM marks the service completed by entering the
    // pilot's return code (verify-return endpoint).
    const returnPending = Boolean(
      (mission as any).handoverReturnCode && !(context.booking as any)?.handoverReturnVerified,
    );
    if (!returnPending) {
      // Update booking to completed
      await this.bookingService.updateStatus(
        mission.bookingId,
        { status: 'completed', remarks: 'Mission completed, media uploaded' },
        user,
      );

      const payload: MissionCompletedPayload = {
        bookingId: mission.bookingId,
        pilotUid: user.uid,
        customerUid: context.booking.customerUid,
        fleetManagerUid: context.booking.fleetManagerUid ?? undefined,
        summary: updated.reportSummary,
        timestamp: now,
      };

      this.eventEmitter.emit(WS_EVENTS.MISSION_COMPLETED, payload);
    }

    return { stage: 'UPLOADING_MEDIA', mission: updated };
  }

  async cancelMission(id: string, reason: string, user: CurrentUser) {
    const mission = await this.getMission(id, user);

    if (['completed', 'cancelled'].includes(mission.status)) {
      throw new BadRequestException(`Cannot cancel ${mission.status} mission`);
    }

    if (mission.status === 'started') {
      throw new BadRequestException(
        'Cannot cancel after the service has started. Please contact admin or support.',
      );
    }

    // Delegate to the unified booking cancellation (handles authorization,
    // mission document, resource release, refund calculation and notifications)
    return this.bookingService.cancelBookingWithRefund(mission.bookingId, reason, user);
  }

  /**
   * Update mission progress during flight.
   * This allows pilots to report progress percentage and current phase.
   */
  async updateMissionProgress(
    id: string,
    progressPercentage: number,
    currentPhase: string,
    user: CurrentUser,
  ): Promise<void> {
    const mission = await this.getMission(id, user);

    if (mission.status !== 'started') {
      throw new BadRequestException('Mission must be in progress to update progress');
    }

    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new BadRequestException('Progress percentage must be between 0 and 100');
    }

    const now = new Date().toISOString();

    // Calculate estimated completion time based on progress and elapsed time
    let estimatedCompletionTime: string | undefined;
    if (mission.startTime && progressPercentage > 0) {
      const elapsedMs = new Date(now).getTime() - new Date(mission.startTime).getTime();
      const totalEstimatedMs = (elapsedMs / progressPercentage) * 100;
      const remainingMs = totalEstimatedMs - elapsedMs;
      const estimatedEndDate = new Date(new Date(now).getTime() + remainingMs);
      estimatedCompletionTime = estimatedEndDate.toISOString();
    }

    // Emit real-time progress event (no need to store in Firestore)
    this.eventEmitter.emit('mission.progress.update', {
      bookingId: mission.bookingId,
      missionId: id,
      pilotUid: user.uid,
      progressPercentage,
      currentPhase,
      estimatedCompletionTime,
      timestamp: now,
    });
  }
}

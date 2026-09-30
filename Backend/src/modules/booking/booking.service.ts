import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FieldValue, type CollectionReference, type DocumentReference, type Query } from 'firebase-admin/firestore';

import {
  ROOT_COLLECTIONS,
  USER_SUBCOLLECTIONS,
} from '../../common/constants/collection-paths.constant';
import { CacheService } from '../../common/cache/cache.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import {
  paginateFirestoreQuery,
  type CursorPage,
} from '../../common/utils/firestore-cursor-pagination.util';
import type {
  BookingServiceDetails,
  BookingStatus,
  DroneServiceType,
  FirestoreBookingDocument,
  FirestoreMissionDocument,
  GeoPointValue,
  FarmSnapshot,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { PricingService } from '../pricing/pricing.service';
import { WeatherService } from '../flight-conditions/weather.service';
import { AirspaceService } from '../flight-conditions/airspace.service';
import { CouponService } from '../coupon/coupon.service';
import { AssignBookingDto } from './dto/assign-booking.dto';
import { BookingAnalyticsFilterDto } from './dto/booking-analytics-filter.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CompletePaymentDto } from './dto/complete-payment.dto';
import { TIME_SLOTS, isValidTimeSlot, type TimeSlot } from './constants/time-slots.constant';
import { BookingHistoryService } from './history/booking-history.service';
import { BOOKING_STATUS_TRANSITIONS, canTransitionBookingStatus } from './interfaces/booking-status.enum';
import { FarmService } from '../farm/farm.service';
import type { FirestoreFarmDocument } from '../../database/firestore/contracts';
import { BookingEventsService } from './services/booking-events.service';
import { RazorpayService } from '../payment/razorpay.service';
import { generateHandoverCode } from '../../common/utils/handover-code.util';

interface BookingLookup {
  booking: FirestoreBookingDocument;
  ref: DocumentReference<FirestoreBookingDocument>;
  ownerUid: string;
}

export type PaginatedBookings = CursorPage<FirestoreBookingDocument>;

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly pricingService: PricingService,
    private readonly bookingHistoryService: BookingHistoryService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly weatherService: WeatherService,
    private readonly airspaceService: AirspaceService,
    private readonly farmService: FarmService,
    private readonly bookingEventsService: BookingEventsService,
    private readonly couponService: CouponService,
    private readonly razorpayService: RazorpayService,
  ) { }

  async createBooking(dto: CreateBookingDto, user: CurrentUser): Promise<FirestoreBookingDocument> {
    this.assertScheduledWithinWindow(dto.scheduledDate);
    this.assertServiceDetails(dto.serviceType, dto.serviceDetails, dto.dropoffLocation);

    const ownerUid = user.role === 'aggregator' && dto.customerUid ? dto.customerUid : user.uid;

    // If farmId provided, validate and fetch farm data
    let farm: FirestoreFarmDocument | null = null;
    let farmSnapshot: FarmSnapshot | null = null;

    if (dto.farmId) {
      try {
        farm = await this.farmService.findOne(dto.farmId, user, ownerUid);

        // Validate farm belongs to the booking customer
        if (farm.customerUid !== ownerUid) {
          throw new BadRequestException('Farm does not belong to the specified customer');
        }

        // Validate farm is active
        if (!farm.isActive) {
          throw new BadRequestException('Cannot create booking for inactive farm');
        }

        // Create immutable farm snapshot
        farmSnapshot = {
          farmId: farm.farmId,
          farmName: farm.farmName,
          gpsCenter: farm.gpsCenter,
          gpsBoundary: farm.gpsBoundary,
          address: farm.address,
          village: farm.village,
          taluka: farm.taluka,
          district: farm.district,
          state: farm.state,
          pincode: farm.pincode,
          area: farm.area,
          crop: farm.crop,
          season: farm.season,
          plantingDate: farm.plantingDate,
          expectedHarvestDate: farm.expectedHarvestDate,
          soilType: farm.soilType,
          soilHealth: farm.soilHealth,
          irrigationType: farm.irrigationType,
          waterSource: farm.waterSource,
        };

        this.logger.log(`Booking linked to farm: ${dto.farmId} for customer ${ownerUid}`);
        this.logger.log(`Farm snapshot created: ${farmSnapshot.farmName} (${farmSnapshot.area.value} ${farmSnapshot.area.unit})`);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException(`Farm ${dto.farmId} not found`);
        }
        throw error;
      }
    }

    // Check airspace restrictions before creating booking
    // Use farm gpsCenter if farmId provided, otherwise use dto.location
    const checkLocation = farmSnapshot ? farmSnapshot.gpsCenter : { lat: dto.location.lat, lng: dto.location.lng };
    const airspaceCheck = dto.serviceType === 'delivery' && dto.dropoffLocation
      ? await this.airspaceService.checkRoute(checkLocation, {
        lat: dto.dropoffLocation.lat,
        lng: dto.dropoffLocation.lng,
      })
      : await this.airspaceService.checkRestrictions(checkLocation);

    // Airspace restriction check for the booking location
    // Note: Bookings in no-fly / restricted zones are accepted but tagged with red/yellow flyingRestriction
    // so that permissions required are clearly surfaced to users, operators, and pilots.

    // Generate the sequential booking number first so it can be used as the
    // Firestore document ID (0001, 0002, ...). The counter transaction
    // guarantees the numbers are always ascending and always unique.
    const bookingNumber = await this.generateBookingNumber();
    const docRef = this.bookingsCollection().doc(bookingNumber);

    // ── Pricing ───────────────────────────────────────────────────────────────
    // When the selected service exists in the authoritative price list (video-
    // graphy, agriculture NDVI/precision spraying, mapping, surveillance), price
    // it per unit/quantity with dynamic factors. Otherwise fall back to the
    // legacy crop-rate engine (preserves existing behaviour).
    const serviceEstimate = this.pricingService.estimateBookingPriceForService({
      serviceType: dto.serviceType,
      serviceDetails: dto.serviceDetails,
      areaValue: dto.areaValue,
      scheduledDate: dto.scheduledDate,
      preferredTime: this.hourForTimeSlot(dto.preferredTimeSlot),
    });

    const isServiceEstimate = serviceEstimate !== null;

    type BookingEstimateLike = {
      lineItems: Array<{ label: string; amount: number }>;
      subtotal: number;
      taxAmount: number;
      estimatedAmount: number;
      areaTierDiscount?: number;
      couponDiscount?: number;
      baseAmount?: number;
    };

    let baseEstimate: Awaited<ReturnType<PricingService['estimatePrice']>> | null = null;
    let estimate!: BookingEstimateLike;
    let appliedCouponCode: string | null = dto.couponCode ?? null;

    if (isServiceEstimate) {
      estimate = serviceEstimate!;
      // Coupon validation is done at payment time for catalog-based services.
      appliedCouponCode = null;
    } else {
      baseEstimate = await this.pricingService.estimatePrice({
        cropType: dto.cropType,
        areaValue: dto.areaValue,
        areaUnit: dto.areaUnit,
        droneTier: dto.droneTier,
        distanceKm: dto.distanceKm,
        chemicalRequired: true,
      });

      estimate = { ...baseEstimate, baseAmount: undefined };

      if (appliedCouponCode) {
        const couponResult = await this.couponService.apply(
          appliedCouponCode,
          baseEstimate.subtotal - baseEstimate.areaTierDiscount,
          user,
        );
        const couponEstimate = await this.pricingService.estimatePrice({
          cropType: dto.cropType,
          areaValue: dto.areaValue,
          areaUnit: dto.areaUnit,
          droneTier: dto.droneTier,
          distanceKm: dto.distanceKm,
          chemicalRequired: true,
          couponDiscountAmount: couponResult.discount,
        });
        estimate = { ...couponEstimate, baseAmount: undefined };
        appliedCouponCode = couponResult.coupon.code.toUpperCase();
      }
    }

    const now = new Date().toISOString();

    // Build price breakdown from the (crop or catalog-service) estimate
    const serviceBase = isServiceEstimate ? (estimate.baseAmount ?? 0) : 0;
    const baseAmount = isServiceEstimate
      ? serviceBase
      : estimate.lineItems.find(item => item.label.includes('Base') || item.label.includes('Crop'))?.amount || 0;
    const travelCharges = isServiceEstimate
      ? 0
      : estimate.lineItems.find(item => item.label.includes('Travel') || item.label.includes('Distance'))?.amount || 0;
    const additionalCharges = isServiceEstimate
      ? estimate.subtotal - serviceBase
      : estimate.lineItems.filter(item =>
        !item.label.includes('Base') &&
        !item.label.includes('Crop') &&
        !item.label.includes('Travel') &&
        !item.label.includes('Distance') &&
        !item.label.includes('Tax') &&
        !item.label.includes('Discount')
      ).reduce((sum, item) => sum + item.amount, 0);

    const priceBreakdown = {
      baseAmount,
      travelCharges,
      additionalCharges,
      discount: isServiceEstimate ? 0 : estimate.areaTierDiscount || 0,
      couponDiscount: isServiceEstimate ? 0 : estimate.couponDiscount || 0,
      taxAmount: estimate.taxAmount || 0,
      totalAmount: estimate.estimatedAmount || 0,
    };

    // Cache airspace check result - map ConditionStatus enum to lowercase string
    const statusMap: Record<string, 'green' | 'yellow' | 'red'> = {
      'GREEN': 'green',
      'YELLOW': 'yellow',
      'RED': 'red',
    };

    const flyingRestriction = {
      status: statusMap[airspaceCheck.status] || 'green',
      zone: airspaceCheck.nearestZone?.name || 'Unrestricted',
      restrictions: airspaceCheck.reasons || [],
    };

    const plainServiceDetails = dto.serviceDetails
      ? this.toFirestorePlain(dto.serviceDetails)
      : null;

    const plainLocation = this.toFirestorePlain(dto.location);
    const plainDropoffLocation = dto.dropoffLocation
      ? this.toFirestorePlain(dto.dropoffLocation)
      : null;

    const plainFarmSnapshot = farmSnapshot
      ? this.toFirestorePlain(farmSnapshot)
      : null;
    const plainDetailedAddress = dto.detailedAddress
      ? this.toFirestorePlain(dto.detailedAddress)
      : null;

    const booking: FirestoreBookingDocument = {
      id: bookingNumber,
      bookingNumber,
      customerUid: ownerUid,
      createdBy: user.uid,
      aggregatorUid: user.role === 'aggregator' ? user.uid : null,
      fleetManagerUid: null,
      assignedPilot: null,
      assignedDrone: null,

      // Farm reference and snapshot
      farmId: dto.farmId ?? null,
      farmSnapshot: plainFarmSnapshot,

      address: dto.address,
      detailedAddress: plainDetailedAddress,
      area: {
        unit: dto.areaUnit,
        value: dto.areaValue,
      },
      cropType: dto.cropType,
      serviceType: dto.serviceType,
      serviceDetails: plainServiceDetails,
      droneTier: dto.droneTier ?? 'standard',
      location: plainLocation,
      dropoffLocation: plainDropoffLocation,

      // Scheduling - Calculate start/end times from time slot
      ...this.calculateScheduledTimes(dto.scheduledDate, dto.preferredTimeSlot),
      preferredTimeSlot: dto.preferredTimeSlot ?? null,

      // Pricing
      couponCode: appliedCouponCode,
      priceEstimation: estimate.estimatedAmount,
      priceBreakdown,
      finalPrice: null,
      paymentMethod: null,
      paymentStatus: 'pending',
      paymentId: null,
      invoiceId: null,

      // Status
      status: 'pending',
      adminApprovalStatus: 'pending',
      stage: 1, // SUBMITTED

      // Flight conditions (cached)
      flyingRestriction,
      weatherCheck: null, // Will be updated when pilot accepts

      // Mission
      missionId: null,

      // Timestamps
      confirmedAt: null,
      actualStartTime: null,
      actualEndTime: null,
      actualDuration: null,
      completedAt: null,

      // Completion
      completionNotes: null,
      customerRating: null,
      customerFeedback: null,

      // Cancellation
      cancellationReason: null,
      cancelledBy: null,
      cancelledAt: null,
      refundAmount: null,

      createdAt: now,
      updatedAt: now,
    };

    const firestoreSafeBooking = this.sanitizeBookingDocument(booking);
    await docRef.set(firestoreSafeBooking);

    const persistedBooking = firestoreSafeBooking;

    const sideEffects = await Promise.allSettled([
      this.bookingHistoryService.recordHistory(persistedBooking, user.uid, 'Booking created'),
      this.bookingEventsService.logBookingCreated(
        persistedBooking.id,
        user.uid,
        user.role,
        {
          area: persistedBooking.area,
          scheduledDate: persistedBooking.scheduledDate,
          serviceType: persistedBooking.serviceType,
          cropType: persistedBooking.cropType,
        },
      ),
    ]);

    for (const result of sideEffects) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Booking side effect failed for ${persistedBooking.id}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`,
        );
      }
    }

    this.safeEmit(WS_EVENTS.BOOKING_CREATED, {
      bookingId: persistedBooking.id,
      customerUid: persistedBooking.customerUid,
      farmId: persistedBooking.farmId,
      area: persistedBooking.area.value,
      cropType: persistedBooking.cropType,
      serviceType: persistedBooking.serviceType,
      location: persistedBooking.location,
      timestamp: persistedBooking.createdAt,
    });

    return persistedBooking;
  }

  async listBookings(filter: BookingFilterDto, user: CurrentUser): Promise<PaginatedBookings> {
    let query: Query<FirestoreBookingDocument> = this.bookingCollectionGroup();

    if (user.role === 'customer') {
      query = query.where('customerUid', '==', user.uid);
    } else if (user.role === 'aggregator') {
      query = query.where('aggregatorUid', '==', user.uid);
    } else if (user.role === 'fleet_manager') {
      query = query.where('fleetManagerUid', '==', user.uid);
    } else if (user.role === 'pilot') {
      query = query.where('assignedPilot', '==', user.uid);
    } else if (user.role === 'technician') {
      return {
        items: [],
        meta: { limit: filter.limit, total: 0, nextCursor: null, hasMore: false },
      };
    }

    // Filter by status — supports a comma-separated list of statuses
    if (filter.status) {
      const statuses = filter.status
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean);
      if (statuses.length > 1) {
        query = query.where('status', 'in', statuses);
      } else if (statuses.length === 1) {
        query = query.where('status', '==', statuses[0]);
      }
    }

    if (filter.customerUid && (user.role === 'admin' || user.role === 'subadmin')) {
      query = query.where('customerUid', '==', filter.customerUid);
    }

    if (filter.fleetManagerUid && (user.role === 'admin' || user.role === 'subadmin')) {
      query = query.where('fleetManagerUid', '==', filter.fleetManagerUid);
    }

    if (filter.pilotUid && (user.role === 'admin' || user.role === 'subadmin')) {
      query = query.where('assignedPilot', '==', filter.pilotUid);
    }

    if (filter.cropType) {
      query = query.where('cropType', '==', filter.cropType);
    }

    if (filter.aggregatorUid && (user.role === 'admin' || user.role === 'subadmin')) {
      query = query.where('aggregatorUid', '==', filter.aggregatorUid);
    }

    if (filter.adminApprovalStatus) {
      query = query.where('adminApprovalStatus', '==', filter.adminApprovalStatus);
    }

    if (filter.dateFrom) {
      query = query.where('scheduledDate', '>=', filter.dateFrom);
    }

    if (filter.dateTo) {
      query = query.where('scheduledDate', '<=', filter.dateTo);
    }

    const result = await paginateFirestoreQuery(query, {
      limit: filter.limit,
      cursor: filter.cursor,
      orderBy: [
        { field: 'scheduledDate', direction: 'desc' },
        { field: 'id', direction: 'desc' },
      ],
      getCursorValues: (booking: any) => [booking.scheduledDate, booking.id],
      includeTotal: true,
    });

    const items = result.items.map((booking: any) => ({
      ...booking,
      adminApprovalStatus: booking.adminApprovalStatus || 'pending',
    }));

    return {
      items,
      meta: result.meta,
    };
  }

  async getBooking(id: string, user?: CurrentUser): Promise<any> {
    const cacheKey = `booking:${id}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for booking: ${id}`);
      if (user) {
        this.assertCanView(cached, user);
      }
      return this.stripHandoverCodesForPilot({ ...cached }, user);
    }

    const lookup = await this.findBookingLookup(id);
    if (user) {
      this.assertCanView(lookup.booking, user);
    }

    const booking = { ...lookup.booking } as any;

    // Enrich with customer details from users collection
    if (booking.customerUid) {
      try {
        const customerDoc = await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.users)
          .doc(booking.customerUid)
          .get();
        if (customerDoc.exists) {
          const customerData = customerDoc.data() as any;
          booking.customerName = customerData.name || null;
          booking.customerPhone = customerData.phone || null;
          booking.customerEmail = customerData.email || null;
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch customer details for booking ${id}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    // Cache for 3 minutes
    await this.cacheService.set(cacheKey, booking, 3 * 60 * 1000);
    return this.stripHandoverCodesForPilot(booking, user);
  }

  /**
   * Pilots must never see handover codes via the booking API: the issue code
   * is shared by the FM in person, and the return code is delivered on the
   * pilot's own mission document after service end.
   */
  private stripHandoverCodesForPilot(booking: any, user?: CurrentUser): any {
    if (user?.role === 'pilot') {
      delete booking.handoverIssueCode;
      delete booking.handoverReturnCode;
    }
    return booking;
  }

  async updatePendingBooking(
    id: string,
    dto: UpdateBookingDto,
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);
    this.assertCanManagePending(lookup.booking, user);

    if (lookup.booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be modified.');
    }

    // Validate the merged service details against the (possibly unchanged) service type.
    const mergedServiceDetails =
      dto.serviceDetails ?? lookup.booking.serviceDetails ?? undefined;
    const mergedDropoff =
      dto.dropoffLocation ?? lookup.booking.dropoffLocation ?? undefined;
    this.assertServiceDetails(
      lookup.booking.serviceType,
      mergedServiceDetails,
      mergedDropoff,
    );

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      ...(dto.address ? { address: dto.address } : {}),
      ...(dto.detailedAddress
        ? { detailedAddress: this.toFirestorePlain(dto.detailedAddress) }
        : {}),
      ...(dto.cropType ? { cropType: dto.cropType } : {}),
      ...(dto.serviceDetails
        ? { serviceDetails: this.toFirestorePlain(dto.serviceDetails) }
        : {}),
      ...(dto.location
        ? { location: this.toFirestorePlain(dto.location) }
        : {}),
      ...(dto.dropoffLocation
        ? { dropoffLocation: this.toFirestorePlain(dto.dropoffLocation) }
        : {}),
      ...(dto.couponCode ? { couponCode: dto.couponCode } : {}),
      ...(dto.scheduledDate ? { scheduledDate: dto.scheduledDate } : {}),
      ...(dto.areaValue
        ? {
          area: {
            unit: dto.areaUnit ?? lookup.booking.area.unit,
            value: dto.areaValue,
          },
        }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    await lookup.ref.set(this.sanitizeBookingDocument(updated), { merge: true });

    // Invalidate cache
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    return updated;
  }

  async cancelBooking(id: string, user: CurrentUser): Promise<FirestoreBookingDocument> {
    return this.cancelBookingWithRefund(id, undefined, user);
  }

  /**
   * Load the mission document associated with a booking, if any.
   */
  private async getMissionForBooking(
    booking: FirestoreBookingDocument,
  ): Promise<FirestoreMissionDocument | null> {
    const missionId = booking.missionId || booking.id;
    if (!missionId) return null;

    try {
      const doc = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.missions)
        .doc(missionId)
        .get();

      return doc.exists ? (doc.data() as FirestoreMissionDocument) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to load mission for booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Role-based cancellation authorization matrix.
   * Customers / sales aggregators / fleet managers / pilots can only cancel before the
   * service has started (mission.status === 'started'). Admin roles can cancel at any
   * stage except already-completed or already-cancelled bookings.
   */
  private assertCanCancel(
    booking: FirestoreBookingDocument,
    mission: FirestoreMissionDocument | null,
    user: CurrentUser,
  ): void {
    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled.');
    }

    if (booking.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed booking.');
    }

    const isAdmin = ['admin', 'subadmin', 'super_admin'].includes(user.role);
    if (isAdmin) {
      return;
    }

    const serviceStarted = mission?.status === 'started';
    if (serviceStarted) {
      throw new BadRequestException(
        'Mission has already started. Please contact admin or support to cancel this booking.',
      );
    }

    switch (user.role) {
      case 'customer':
        if (booking.customerUid !== user.uid && booking.createdBy !== user.uid) {
          throw new ForbiddenException('You can only cancel your own bookings.');
        }
        break;
      case 'aggregator':
        if (booking.aggregatorUid !== user.uid) {
          throw new ForbiddenException('You can only cancel bookings created by you.');
        }
        break;
      case 'fleet_manager':
      case 'vendor':
        if (booking.fleetManagerUid !== user.uid) {
          throw new ForbiddenException('This booking is not assigned to you.');
        }
        break;
      case 'pilot':
        if (booking.assignedPilot !== user.uid) {
          throw new ForbiddenException('You are not assigned to this booking.');
        }
        break;
      default:
        throw new ForbiddenException('You cannot cancel this booking.');
    }
  }

  /**
   * Mark the associated mission (if any) as cancelled.
   */
  private async cancelMissionDocument(
    booking: FirestoreBookingDocument,
    reason: string,
    cancelledBy: string,
  ): Promise<void> {
    const missionId = booking.missionId || booking.id;
    if (!missionId) return;

    const now = new Date().toISOString();
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .doc(missionId)
      .set(
        {
          status: 'cancelled',
          cancellationReason: reason,
          cancelledBy,
          cancelledAt: now,
          updatedAt: now,
        },
        { merge: true },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `Failed to cancel mission ${missionId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ),
      );
  }

  /**
   * Release assigned pilot and drone resources after a cancellation so they can
   * accept new assignments.
   */
  private async releaseBookingResources(booking: FirestoreBookingDocument): Promise<void> {
    const now = new Date().toISOString();

    if (booking.assignedPilot) {
      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(booking.assignedPilot)
        .update({ status: 'active', isAvailable: true, currentBookingId: null, updatedAt: now })
        .catch((err: unknown) =>
          this.logger.warn(
            `Failed to reset pilot ${booking.assignedPilot} status: ${err instanceof Error ? err.message : 'Unknown error'}`,
          ),
        );
    }

    if (booking.assignedDrone) {
      const droneSnapshot = await this.firebaseAdminService
        .firestore()
        .collectionGroup(USER_SUBCOLLECTIONS.drones)
        .where('id', '==', booking.assignedDrone)
        .limit(1)
        .get()
        .catch(() => null);

      if (droneSnapshot && !droneSnapshot.empty) {
        await droneSnapshot.docs[0].ref
          .update({ status: 'deployable', isAvailable: true, currentBookingId: null, updatedAt: now })
          .catch((err: unknown) =>
            this.logger.warn(
              `Failed to reset drone ${booking.assignedDrone} status: ${err instanceof Error ? err.message : 'Unknown error'}`,
            ),
          );
      }
    }
  }

  async assignBooking(
    id: string,
    dto: AssignBookingDto,
    fleetManagerUid: string,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);
    if (lookup.booking.status !== 'pending' && lookup.booking.status !== 'confirmed') {
      throw new BadRequestException('Only pending or confirmed bookings can be assigned.');
    }

    const now = new Date().toISOString();

    // Fetch live weather data for the booking location
    let weatherCheck = null;
    try {
      const weather = await this.weatherService.checkWeather(
        lookup.booking.location,
        lookup.booking.scheduledDate,
      );

      const statusMap: Record<string, 'green' | 'yellow' | 'red'> = {
        'GREEN': 'green',
        'YELLOW': 'yellow',
        'RED': 'red',
      };

      weatherCheck = {
        status: statusMap[weather.status] || 'green',
        temperature: weather.metrics.temperatureC,
        humidity: 0, // weatherService doesn't provide humidity
        windSpeed: weather.metrics.windSpeedKmh,
        forecast: weather.summary,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch weather for booking ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      assignedPilot: dto.pilotUid,
      assignedDrone: dto.droneId,
      fleetManagerUid,
      status: 'confirmed',
      stage: 2, // PILOT_ASSIGNED
      confirmedAt: now,
      weatherCheck,
      updatedAt: now,
      // Auto assignment also issues the drone handover code when a drone is set.
      ...(dto.droneId
        ? {
            handoverIssueCode: generateHandoverCode(),
            handoverIssueVerified: false,
            handoverIssueVerifiedAt: null,
          }
        : {}),
    };
    const mission: FirestoreMissionDocument = {
      requestId: id,
      bookingId: id,
      pilotUid: dto.pilotUid,
      status: 'pending',
      startTime: null,
      endTime: null,
      geoTrack: [],
      reportSummary: {},
      createdAt: now,
      updatedAt: now,
    };

    await lookup.ref.set(updated, { merge: true });
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.missions)
      .doc(id)
      .set(mission, { merge: true });

    // Update pilot and drone status to 'assigned'
    if (dto.pilotUid) {
      const pilotDoc = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(dto.pilotUid)
        .get()
        .catch(() => null);

      let pilotName = null;
      if (pilotDoc?.exists) {
        const pilotData = pilotDoc.data();
        pilotName = pilotData?.name || pilotData?.profileData?.fullName || null;
      }

      if (pilotName) {
        updated.assignedPilotName = pilotName;
        await lookup.ref.set(this.sanitizeBookingDocument(updated), { merge: true });
      }

      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(dto.pilotUid)
        .update({ status: 'assigned', isAvailable: false, updatedAt: now })
        .catch((err) => this.logger.warn(`Failed to update pilot ${dto.pilotUid} status: ${err.message}`));
    }
    if (dto.droneId) {
      const droneSnapshot = await this.firebaseAdminService
        .firestore()
        .collectionGroup(USER_SUBCOLLECTIONS.drones)
        .where('id', '==', dto.droneId)
        .limit(1)
        .get()
        .catch(() => null);

      if (droneSnapshot && !droneSnapshot.empty) {
        await droneSnapshot.docs[0].ref
          .update({ status: 'assigned', isAvailable: false, currentBookingId: id, updatedAt: now })
          .catch((err) => this.logger.warn(`Failed to update drone ${dto.droneId} status: ${err.message}`));
      } else {
        this.logger.warn(`Drone ${dto.droneId} not found via collectionGroup, skipping status update`);
      }
    }

    await this.bookingHistoryService.recordHistory(updated, fleetManagerUid, 'Pilot and drone assigned');

    // Log pilot assigned event to events subcollection
    await this.bookingEventsService.logPilotAssigned(
      updated.id,
      dto.pilotUid,
      dto.droneId,
      fleetManagerUid,
      'fleet_manager',
      {
        scheduledDate: updated.scheduledDate,
        serviceType: updated.serviceType,
      },
    );

    this.safeEmit(WS_EVENTS.BOOKING_ASSIGNED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      fleetManagerUid,
      pilotUid: dto.pilotUid,
      droneId: dto.droneId,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);

    if (user.role === 'pilot' && lookup.booking.assignedPilot !== user.uid) {
      throw new ForbiddenException('Pilot is not assigned to this booking.');
    }

    if (user.role === 'fleet_manager' && lookup.booking.fleetManagerUid !== user.uid) {
      throw new ForbiddenException('Fleet manager is not assigned to this booking.');
    }

    return this.transitionBookingStatus(lookup, dto.status, user.uid, dto.remarks);
  }

  async applyPriceLock(
    bookingId: string,
    finalPrice: number,
    paymentMethod: FirestoreBookingDocument['paymentMethod'],
    pilotUid: string,
    paymentStatus: FirestoreBookingDocument['paymentStatus'] = 'pending',
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(bookingId);

    // Determine stage based on payment status
    const stage = paymentStatus === 'paid' ? 7 : 6; // COMPLETED or PAYMENT_PENDING

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      finalPrice,
      paymentMethod,
      paymentStatus,
      stage,
      updatedAt: new Date().toISOString(),
    };

    await lookup.ref.set(updated, { merge: true });
    await this.bookingHistoryService.recordHistory(
      updated,
      pilotUid,
      paymentStatus === 'paid' ? 'Payment confirmed' : 'Final price locked',
    );

    return updated;
  }

  async completePayment(
    id: string,
    user: CurrentUser,
    dto?: CompletePaymentDto,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);

    const canPay =
      lookup.booking.customerUid === user.uid ||
      lookup.booking.aggregatorUid === user.uid ||
      user.role === 'admin' ||
      user.role === 'subadmin';

    if (!canPay) {
      throw new ForbiddenException('Only the booking customer or sales aggregator can complete payment.');
    }

    if (lookup.booking.paymentStatus === 'paid') {
      throw new BadRequestException('Payment already completed for this booking.');
    }

    const finalPrice = lookup.booking.finalPrice || lookup.booking.priceEstimation || 0;

    if (!finalPrice && dto?.method !== 'cash') {
      throw new BadRequestException('Booking has no payable amount.');
    }

    // Apply an optional coupon at payment time (validated + computed server-side).
    let payable = finalPrice;
    let appliedCouponCode: string | null = null;
    let couponDiscount = 0;
    let originalPrice: number | null = null;
    if (dto?.couponCode) {
      const couponResult = await this.couponService.apply(dto.couponCode, finalPrice, user);
      appliedCouponCode = couponResult.coupon.code.toUpperCase();
      couponDiscount = couponResult.discount;
      payable = couponResult.finalAmount;
      originalPrice = finalPrice;
    }

    // Gateway: verify the Razorpay payment server-side before marking paid.
    if (dto?.method === 'gateway') {
      const payment = dto.payment;
      if (!payment?.razorpayOrderId || !payment.razorpayPaymentId || !payment.razorpaySignature) {
        throw new BadRequestException('Razorpay payment details are required for online payments.');
      }

      const link = await this.razorpayService.verifyAndConsume(
        payment.razorpayOrderId,
        payment.razorpayPaymentId,
        payment.razorpaySignature,
        user,
      );

      if (link.bookingId !== id) {
        throw new BadRequestException('This Razorpay order was not created for this booking.');
      }
      if (link.amount !== Math.round(payable * 100)) {
        throw new BadRequestException(
          'The paid amount does not match the booking payable amount.',
        );
      }
    } else if (!dto?.method) {
      throw new BadRequestException('A payment method is required.');
    }

    const now = new Date().toISOString();

    // Cash intent: the booking is only marked paid once the assigned pilot confirms receipt.
    if (dto?.method === 'cash') {
      const cashBooking: FirestoreBookingDocument = {
        ...lookup.booking,
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        cashPending: true,
        cashConfirmedAt: null,
        cashConfirmedBy: null,
        couponCode: appliedCouponCode ?? lookup.booking.couponCode ?? null,
        couponDiscount,
        originalPrice,
        finalPrice: payable,
        billingAddress: dto?.billingAddress ? this.toFirestorePlain(dto.billingAddress) : lookup.booking.billingAddress ?? null,
        updatedAt: now,
      };

      await lookup.ref.set(this.sanitizeBookingDocument(cashBooking), { merge: true });
      await this.cacheService.delete(`booking:${id}`);
      await this.bookingHistoryService.recordHistory(
        cashBooking,
        user.uid,
        'Cash payment selected by customer (awaiting pilot confirmation)',
      );

      this.safeEmit(WS_EVENTS.PAYMENT_INITIATED, {
        bookingId: id,
        customerUid: cashBooking.customerUid,
        pilotUid: cashBooking.assignedPilot,
        fleetManagerUid: cashBooking.fleetManagerUid ?? undefined,
        amount: payable,
        timestamp: now,
      });

      return cashBooking;
    }

    // Gateway / default: mark paid immediately.
    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      paymentStatus: 'paid',
      paymentId: dto?.method === 'gateway' && dto.payment
        ? dto.payment.razorpayPaymentId
        : `pay_${id}`,
      invoiceId: `inv_${id}`,
      couponCode: appliedCouponCode ?? lookup.booking.couponCode ?? null,
      couponDiscount,
      originalPrice,
      finalPrice: payable,
      billingAddress: dto?.billingAddress ? this.toFirestorePlain(dto.billingAddress) : lookup.booking.billingAddress ?? null,
      updatedAt: now,
    };

    await lookup.ref.set(this.sanitizeBookingDocument(updated), { merge: true });
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    await this.bookingHistoryService.recordHistory(updated, user.uid, 'Payment completed by customer');

    return this.applyPaidSideEffects(lookup, updated, payable, now);
  }

  async confirmCashReceipt(
    id: string,
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);
    const booking = lookup.booking;

    if (booking.paymentStatus === 'paid') {
      throw new BadRequestException('Payment already completed for this booking.');
    }

    if (!booking.cashPending && booking.paymentMethod !== 'cash') {
      throw new BadRequestException('No cash payment is pending for this booking.');
    }

    if (user.role === 'pilot' && booking.assignedPilot !== user.uid) {
      throw new ForbiddenException('Only the assigned pilot can confirm cash receipt.');
    }

    const finalPrice = booking.finalPrice || booking.priceEstimation || 0;

    if (!finalPrice) {
      throw new BadRequestException('Booking has no payable amount.');
    }

    const now = new Date().toISOString();

    const updated: FirestoreBookingDocument = {
      ...booking,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      cashPending: false,
      cashConfirmedAt: now,
      cashConfirmedBy: user.uid,
      paymentId: `pay_${id}`,
      invoiceId: `inv_${id}`,
      finalPrice,
      updatedAt: now,
    };

    await lookup.ref.set(this.sanitizeBookingDocument(updated), { merge: true });
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    await this.bookingHistoryService.recordHistory(
      updated,
      user.uid,
      'Cash received confirmed by pilot',
    );

    return this.applyPaidSideEffects(lookup, updated, finalPrice, now);
  }

  private async applyPaidSideEffects(
    lookup: BookingLookup,
    updated: FirestoreBookingDocument,
    finalPrice: number,
    now: string,
  ): Promise<FirestoreBookingDocument> {
    // Completion side effects only run when the service has actually ended.
    const wasCompleted = lookup.booking.status === 'completed';

    if (wasCompleted) {
      if (lookup.booking.assignedPilot) {
        await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.users)
          .doc(lookup.booking.assignedPilot)
          .update({ status: 'active', isAvailable: true, currentBookingId: null, updatedAt: now })
          .catch((err) => this.logger.warn(`Failed to reset pilot ${lookup.booking.assignedPilot} status: ${err.message}`));
      }

      if (lookup.booking.assignedDrone) {
        const droneSnapshot = await this.firebaseAdminService
          .firestore()
          .collectionGroup(USER_SUBCOLLECTIONS.drones)
          .where('id', '==', lookup.booking.assignedDrone)
          .limit(1)
          .get()
          .catch(() => null);

        if (droneSnapshot && !droneSnapshot.empty) {
          await droneSnapshot.docs[0].ref
            .update({ status: 'deployable', isAvailable: true, currentBookingId: null, updatedAt: now })
            .catch((err) => this.logger.warn(`Failed to reset drone ${lookup.booking.assignedDrone} status: ${err.message}`));
        }
      }

      // Credit earnings using the payout service (10% pilot, 5% FM of total booking amount)
      const bookingAmount = finalPrice || updated.priceEstimation || 0;
      const PILOT_COMMISSION_RATE = 0.10;
      const FM_COMMISSION_RATE = 0.05;
      const pilotEarningAmount = Math.round(bookingAmount * PILOT_COMMISSION_RATE * 100) / 100;
      const fmEarningAmount = Math.round(bookingAmount * FM_COMMISSION_RATE * 100) / 100;

      if (updated.assignedPilot && pilotEarningAmount > 0) {
        await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.userEarnings)
          .doc(updated.assignedPilot)
          .set(
            {
              userId: updated.assignedPilot,
              totalEarnings: FieldValue.increment(pilotEarningAmount),
              pendingEarnings: FieldValue.increment(pilotEarningAmount),
              lastServiceDate: now,
              updatedAt: now,
            },
            { merge: true },
          )
          .catch((err) => this.logger.warn(`Failed to credit pilot earnings for ${updated.assignedPilot}: ${err.message}`));
      }

      if (updated.fleetManagerUid && fmEarningAmount > 0) {
        await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.userEarnings)
          .doc(updated.fleetManagerUid)
          .set(
            {
              userId: updated.fleetManagerUid,
              totalEarnings: FieldValue.increment(fmEarningAmount),
              pendingEarnings: FieldValue.increment(fmEarningAmount),
              lastServiceDate: now,
              updatedAt: now,
            },
            { merge: true },
          )
          .catch((err) => this.logger.warn(`Failed to credit FM earnings for ${updated.fleetManagerUid}: ${err.message}`));
      }

      this.safeEmit(WS_EVENTS.BOOKING_COMPLETED, {
        bookingId: updated.id,
        customerUid: updated.customerUid,
        pilotUid: updated.assignedPilot,
        fleetManagerUid: updated.fleetManagerUid,
        timestamp: now,
      });
    }

    this.safeEmit(WS_EVENTS.PAYMENT_CONFIRMED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      pilotUid: updated.assignedPilot,
      fleetManagerUid: updated.fleetManagerUid,
      amount: finalPrice,
      timestamp: now,
    });

    // Refer & Earn (Case 2): first PAID booking triggers the customer reward.
    // This covers both gateway payments (marked paid immediately) and COD cash
    // (marked paid only when the assigned pilot confirms receipt via
    // confirmCashReceipt). Never fires for pending/cashPending bookings.
    if (updated.paymentStatus === 'paid' && updated.customerUid) {
      this.safeEmit('referral.booking.paid', {
        customerUid: updated.customerUid,
        bookingId: updated.id,
        amount: finalPrice,
        paymentMethod: updated.paymentMethod ?? null,
        timestamp: now,
      });
    }

    return updated;
  }

  async listIncomingVendorBookings(filter: BookingFilterDto) {
    return this.listBookings(
      { ...filter, status: filter.status ?? 'pending' },
      {
        uid: 'system',
        role: 'admin',
        status: 'active',
      },
    );
  }

  async findBookingLookup(id: string): Promise<BookingLookup> {
    // Query root bookings collection by document ID
    const docRef = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.bookings)
      .doc(id) as DocumentReference<FirestoreBookingDocument>;

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Booking ${id} not found.`);
    }

    const bookingData = doc.data() as FirestoreBookingDocument;
    const ownerUid = bookingData.customerUid;

    return {
      booking: bookingData,
      ref: docRef,
      ownerUid,
    };
  }

  private async transitionBookingStatus(
    lookup: BookingLookup,
    status: FirestoreBookingDocument['status'],
    updatedBy: string,
    remarks?: string,
  ): Promise<FirestoreBookingDocument> {
    // M-002 fix: Use Firestore transaction to prevent race conditions
    const firestore = this.firebaseAdminService.firestore();

    const updated = await firestore.runTransaction(async (transaction) => {
      // Re-read the booking within the transaction
      const snapshot = await transaction.get(lookup.ref);

      if (!snapshot.exists) {
        throw new NotFoundException(`Booking ${lookup.booking.id} not found.`);
      }

      const currentBooking = snapshot.data() as FirestoreBookingDocument;

      // Validate status transition with current state
      if (
        currentBooking.status !== status &&
        !canTransitionBookingStatus(currentBooking.status, status)
      ) {
        throw new BadRequestException(
          `Cannot transition booking from ${currentBooking.status} to ${status}.`,
        );
      }

      // Calculate new stage based on new status
      const newStage = this.calculateStageForStatus(status, currentBooking);

      const now = new Date().toISOString();

      const updatedBooking: FirestoreBookingDocument = {
        ...currentBooking,
        status,
        stage: newStage,
        updatedAt: now,
      };

      // Set lifecycle timestamps based on status transition
      if (status === 'confirmed' && !currentBooking.confirmedAt) {
        updatedBooking.confirmedAt = now;
      }

      if (status === 'in_progress' && !currentBooking.actualStartTime) {
        updatedBooking.actualStartTime = now;
      }

      if (status === 'completed') {
        if (!updatedBooking.completedAt) {
          updatedBooking.completedAt = now;
        }
        if (!updatedBooking.actualEndTime) {
          updatedBooking.actualEndTime = now;
        }
        // Calculate duration if both start and end times exist
        if (updatedBooking.actualStartTime && updatedBooking.actualEndTime) {
          const start = new Date(updatedBooking.actualStartTime).getTime();
          const end = new Date(updatedBooking.actualEndTime).getTime();
          updatedBooking.actualDuration = Math.round((end - start) / (1000 * 60)); // Duration in minutes
        }
      }

      // Perform write within transaction
      transaction.set(lookup.ref, updatedBooking, { merge: true });

      return { updatedBooking, previousStatus: currentBooking.status };
    });

    // Invalidate cache after successful transaction
    await this.cacheService.delete(`booking:${lookup.booking.id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    // Record history after transaction (non-critical operation)
    await this.bookingHistoryService.recordHistory(updated.updatedBooking, updatedBy, remarks);

    // Log status change event to events subcollection
    await this.bookingEventsService.logStatusChange(
      updated.updatedBooking.id,
      status,
      updated.previousStatus,
      updatedBy,
      'system', // Role will be derived from context
      {
        scheduledDate: updated.updatedBooking.scheduledDate,
        serviceType: updated.updatedBooking.serviceType,
      },
    );

    const eventName = status === 'cancelled'
      ? WS_EVENTS.BOOKING_CANCELLED
      : WS_EVENTS.BOOKING_STATUS_CHANGED;

    // M-001 fix: Use safe emit to prevent errors from propagating
    this.safeEmit(eventName, {
      bookingId: updated.updatedBooking.id,
      customerUid: updated.updatedBooking.customerUid,
      fleetManagerUid: updated.updatedBooking.fleetManagerUid,
      pilotUid: updated.updatedBooking.assignedPilot,
      status: updated.updatedBooking.status,
      stage: updated.updatedBooking.stage,
      previousStatus: updated.previousStatus,
      reason: remarks,
      timestamp: updated.updatedBooking.updatedAt,
    });

    return updated.updatedBooking;
  }

  /**
   * Calculate stage based on status transition
   */
  private calculateStageForStatus(
    status: BookingStatus,
    booking: FirestoreBookingDocument
  ): number {
    switch (status) {
      case 'pending':
        return 1; // SUBMITTED
      case 'confirmed':
        return booking.assignedPilot ? 2 : 1; // PILOT_ASSIGNED or SUBMITTED
      case 'in_progress':
        // Check if payment is set (indicating mission complete, awaiting payment)
        if (booking.finalPrice && booking.paymentStatus === 'pending') {
          return 6; // PAYMENT_PENDING
        }
        return 4; // MISSION_ACTIVE
      case 'completed':
        if (booking.paymentStatus !== 'paid') {
          return 6; // PAYMENT_PENDING
        }
        return 7; // COMPLETED
      case 'cancelled':
        return booking.stage || 1; // Keep current stage or default to 1
      default:
        return booking.stage || 1;
    }
  }

  private assertCanView(booking: FirestoreBookingDocument, user: CurrentUser): void {
    const canView =
      user.role === 'admin' ||
      user.role === 'subadmin' ||
      booking.customerUid === user.uid ||
      booking.createdBy === user.uid ||
      booking.aggregatorUid === user.uid ||
      booking.fleetManagerUid === user.uid ||
      booking.assignedPilot === user.uid;

    if (!canView) {
      throw new ForbiddenException('You cannot view this booking.');
    }
  }

  private assertCanManagePending(booking: FirestoreBookingDocument, user: CurrentUser): void {
    const canManage =
      user.role === 'admin' || booking.customerUid === user.uid || booking.createdBy === user.uid;

    if (!canManage) {
      throw new ForbiddenException('You cannot manage this booking.');
    }
  }

  /**
   * Calculate scheduled start and end times from date and optional time slot.
   * @param scheduledDate - ISO date string (e.g., "2026-07-15T00:00:00Z")
   * @param preferredTimeSlot - Optional time slot key (e.g., "MORNING", "AFTERNOON")
   * @returns Object with scheduledDate, scheduledStartTime, and scheduledEndTime
   */
  private calculateScheduledTimes(
    scheduledDate: string,
    preferredTimeSlot?: string,
  ): {
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
  } {
    const baseDate = new Date(scheduledDate);

    if (!preferredTimeSlot) {
      // Default: full day (9 AM - 5 PM)
      const startDate = new Date(baseDate);
      startDate.setHours(9, 0, 0, 0);
      const endDate = new Date(baseDate);
      endDate.setHours(17, 0, 0, 0);

      return {
        scheduledDate,
        scheduledStartTime: startDate.toISOString(),
        scheduledEndTime: endDate.toISOString(),
      };
    }

    // Validate time slot
    if (!isValidTimeSlot(preferredTimeSlot)) {
      this.logger.warn(
        `Invalid time slot "${preferredTimeSlot}" provided, using full day default`,
      );
      const startDate = new Date(baseDate);
      startDate.setHours(9, 0, 0, 0);
      const endDate = new Date(baseDate);
      endDate.setHours(17, 0, 0, 0);

      return {
        scheduledDate,
        scheduledStartTime: startDate.toISOString(),
        scheduledEndTime: endDate.toISOString(),
      };
    }

    const slot = TIME_SLOTS[preferredTimeSlot as TimeSlot];
    const [startHour, startMin] = slot.start.split(':').map(Number);
    const [endHour, endMin] = slot.end.split(':').map(Number);

    const startDate = new Date(baseDate);
    startDate.setHours(startHour, startMin, 0, 0);
    const endDate = new Date(baseDate);
    endDate.setHours(endHour, endMin, 0, 0);

    return {
      scheduledDate,
      scheduledStartTime: startDate.toISOString(),
      scheduledEndTime: endDate.toISOString(),
    };
  }

  /**
   * Map a preferred time-slot to a representative hour used for peak-hour pricing.
   * Falls back to the scheduled date hour when no slot is given.
   */
  private hourForTimeSlot(preferredTimeSlot?: string | null): string | undefined {
    if (!preferredTimeSlot) {
      return undefined;
    }
    switch (preferredTimeSlot) {
      case 'morning':
        return '08:00';
      case 'afternoon':
        return '14:00';
      case 'evening':
        return '18:00';
      default:
        return undefined;
    }
  }

  private assertScheduledWithinWindow(scheduledDate: string): void {
    const scheduledAt = new Date(scheduledDate).getTime();
    const now = Date.now();
    const max = now + 7 * 24 * 60 * 60 * 1000;

    if (Number.isNaN(scheduledAt) || scheduledAt < now || scheduledAt > max) {
      throw new BadRequestException('Booking scheduled date must be within the next 7 days.');
    }
  }

  /**
   * Enforce per-service required fields. The DTO keeps all service fields optional
   * (one shared bag); this is where each service type's mandatory inputs are checked.
   */
  private assertServiceDetails(
    serviceType: DroneServiceType,
    details: BookingServiceDetails | undefined,
    dropoffLocation: GeoPointValue | undefined,
  ): void {
    const d = details ?? {};

    switch (serviceType) {
      case 'spraying':
        // REQUIRED: sprayingSubType
        if (!d.sprayingSubType?.trim()) {
          throw new BadRequestException('spraying bookings require serviceDetails.sprayingSubType (e.g., fertilizer_spraying, pesticide_spraying).');
        }
        // RECOMMENDED: chemicalName for better tracking
        if (!d.chemicalName?.trim()) {
          this.logger.warn('Spraying booking created without chemicalName - recommended for tracking');
        }
        break;

      case 'seeding':
        // REQUIRED: seedingSubType
        if (!d.seedingSubType?.trim()) {
          throw new BadRequestException('seeding bookings require serviceDetails.seedingSubType (e.g., rice_seeding, wheat_seeding).');
        }
        // RECOMMENDED: seedType
        if (!d.seedType?.trim()) {
          this.logger.warn('Seeding booking created without seedType - recommended for tracking');
        }
        break;

      case 'monitoring':
        // REQUIRED: monitoringSubType
        if (!d.monitoringSubType?.trim()) {
          throw new BadRequestException('monitoring bookings require serviceDetails.monitoringSubType (e.g., crop_health_monitoring, pest_detection).');
        }
        break;

      case 'mapping':
        // Support both legacy mappingType and new mappingSubType
        if (!d.mappingType?.trim() && !d.mappingSubType?.trim()) {
          throw new BadRequestException('mapping bookings require serviceDetails.mappingSubType (e.g., topographic_mapping, orthomosaic_mapping).');
        }
        break;

      case 'surveillance':
        // Support both legacy surveillanceType and new surveillanceSubType
        if (!d.surveillanceType?.trim() && !d.surveillanceSubType?.trim()) {
          throw new BadRequestException('surveillance bookings require serviceDetails.surveillanceSubType (e.g., perimeter_border_surveillance, event_monitoring).');
        }
        break;

      case 'videography':
        // Support both legacy videographyType and new videographySubType
        if (!d.videographyType?.trim() && !d.videographySubType?.trim()) {
          throw new BadRequestException('videography bookings require serviceDetails.videographySubType (e.g., real_estate_photography, wedding_event_coverage).');
        }
        break;

      case 'delivery':
        // REQUIRED: deliverySubType, weightKg, contents
        if (!d.deliverySubType?.trim()) {
          throw new BadRequestException('delivery bookings require serviceDetails.deliverySubType (e.g., small_parcel, medical_supplies).');
        }
        if (typeof d.weightKg !== 'number' || d.weightKg <= 0) {
          throw new BadRequestException('delivery bookings require a positive serviceDetails.weightKg.');
        }
        if (!d.contents?.trim()) {
          throw new BadRequestException('delivery bookings require serviceDetails.contents.');
        }
        if (!dropoffLocation) {
          throw new BadRequestException(
            'delivery bookings require a dropoffLocation (destination).',
          );
        }

        // Validate package size constraints
        if (d.packageSize && d.dimensions) {
          this.validateDeliveryPackageSize(d.packageSize, d.dimensions, d.weightKg);
        }
        break;

      default:
        break;
    }

    // Guard against a drop-off being sent for a single-location service.
    if (serviceType !== 'delivery' && dropoffLocation) {
      throw new BadRequestException(
        `dropoffLocation is only valid for delivery bookings, not ${serviceType}.`,
      );
    }
  }

  /**
   * Validate delivery package dimensions and weight against size category limits
   */
  private validateDeliveryPackageSize(
    packageSize: string,
    dimensions: { length: number; width: number; height: number },
    weightKg: number,
  ): void {
    const limits: Record<string, { maxDimensions: { length: number; width: number; height: number }; maxWeight: number }> = {
      small_parcel: { maxDimensions: { length: 30, width: 25, height: 10 }, maxWeight: 2.5 },
      medium_parcel: { maxDimensions: { length: 45, width: 35, height: 20 }, maxWeight: 15 },
      large_parcel: { maxDimensions: { length: 80, width: 60, height: 50 }, maxWeight: 50 },
      heavy_cargo: { maxDimensions: { length: 150, width: 100, height: 80 }, maxWeight: 200 },
    };

    const limit = limits[packageSize];
    if (!limit) return; // Unknown package size, skip validation

    // Check weight
    if (weightKg > limit.maxWeight) {
      throw new BadRequestException(
        `Weight ${weightKg}kg exceeds maximum ${limit.maxWeight}kg for package size ${packageSize}.`,
      );
    }

    // Check dimensions
    const { length, width, height } = dimensions;
    const maxDims = limit.maxDimensions;

    if (length > maxDims.length || width > maxDims.width || height > maxDims.height) {
      throw new BadRequestException(
        `Dimensions ${length}×${width}×${height}cm exceed maximum ${maxDims.length}×${maxDims.width}×${maxDims.height}cm for package size ${packageSize}.`,
      );
    }
  }

  async getAnalytics(filter: BookingAnalyticsFilterDto) {
    const year = filter.year ?? new Date().getFullYear();
    let dateFrom: string;
    let dateTo: string;

    if (filter.quarter) {
      const quarterMonthStart = (filter.quarter - 1) * 3 + 1;
      dateFrom = `${year}-${String(quarterMonthStart).padStart(2, '0')}-01`;
      const quarterMonthEnd = quarterMonthStart + 2;
      const lastDay = new Date(year, quarterMonthEnd, 0).getDate();
      dateTo = `${year}-${String(quarterMonthEnd).padStart(2, '0')}-${lastDay}`;
    } else {
      dateFrom = `${year}-01-01`;
      dateTo = `${year}-12-31`;
    }

    let query: Query<FirestoreBookingDocument> = this.bookingCollectionGroup()
      .where('scheduledDate', '>=', dateFrom)
      .where('scheduledDate', '<=', dateTo + 'T23:59:59Z');

    if (filter.serviceType) {
      query = query.where('serviceType', '==', filter.serviceType.toLowerCase());
    }

    const snapshot = await query.get();
    const bookings = snapshot.docs.map((d) => d.data());

    // Apply state filter in memory (address.state or location.state is nested)
    const filtered = filter.state
      ? bookings.filter((b) => {
        const addr = b.address as any;
        const loc = (b as any).location;
        const addrState = typeof addr === 'object' && addr?.state ? addr.state.toLowerCase() : null;
        const locState = typeof loc === 'object' && loc?.state ? loc.state.toLowerCase() : null;
        const filterState = filter.state!.toLowerCase();
        return addrState === filterState || locState === filterState;
      })
      : bookings;

    // Stats
    const stats = { total: 0, completed: 0, upcoming: 0, active: 0, cancelled: 0 };
    const stateMap: Record<string, number> = {};
    const serviceMap: Record<string, number> = {};
    const timelineMap: Record<string, Record<string, number>> = {};

    for (const b of filtered) {
      stats.total++;
      const status = b.status || '';
      if (status === 'completed') stats.completed++;
      else if (status === 'pending' || status === 'confirmed') stats.upcoming++;
      else if (status === 'in_progress') stats.active++;
      else if (status === 'cancelled') stats.cancelled++;

      // By state - check both address and location fields
      const addr = b.address as any;
      const loc = (b as any).location;
      let stateName = 'Unknown';

      // Try to get state from address object
      if (typeof addr === 'object' && addr?.state) {
        stateName = addr.state;
      }
      // Try to get state from location object
      else if (typeof loc === 'object' && loc?.state) {
        stateName = loc.state;
      }

      stateMap[stateName] = (stateMap[stateName] ?? 0) + 1;

      // By service
      const svc = b.serviceType ?? 'unknown';
      serviceMap[svc] = (serviceMap[svc] ?? 0) + 1;

      // Timeline — group by month
      const bookingDate = b.scheduledDate || '';
      const month = bookingDate ? bookingDate.substring(0, 7) : 'unknown'; // YYYY-MM
      if (!timelineMap[month]) timelineMap[month] = {};
      timelineMap[month][svc] = (timelineMap[month][svc] ?? 0) + 1;
      timelineMap[month]['total'] = (timelineMap[month]['total'] ?? 0) + 1;
    }

    const byState = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const byService = Object.entries(serviceMap)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    const timeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({ month, ...counts }));

    return { stats, byState, byService, timeline };
  }

  /**
   * ⭐ MIGRATION: Fix all existing pilots/drones that are assigned to active bookings
   * but still show status='active' (pilots) or status='deployable' (drones).
   * Can be removed after running once in production.
   */
  async fixAssignedPilotDroneStatuses(): Promise<{ pilotsFixed: number; dronesFixed: number }> {
    const db = this.firebaseAdminService.firestore();
    let pilotsFixed = 0;
    let dronesFixed = 0;

    // Find all non-completed, non-cancelled bookings with assigned pilot or drone
    const snapshot = await db
      .collection(ROOT_COLLECTIONS.bookings)
      .where('status', 'not-in', ['completed', 'cancelled'])
      .get();

    const batch = db.batch();
    let ops = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data() as FirestoreBookingDocument;

      if (data.assignedPilot) {
        const pilotRef = db.collection(ROOT_COLLECTIONS.users).doc(data.assignedPilot);
        batch.update(pilotRef, { status: 'assigned', isAvailable: false, currentBookingId: doc.id });
        pilotsFixed++;
        ops++;
      }
      if (data.assignedDrone) {
        const dSnap = await db.collectionGroup(USER_SUBCOLLECTIONS.drones).where('id', '==', data.assignedDrone).limit(1).get();
        if (!dSnap.empty) {
          batch.update(dSnap.docs[0].ref, { status: 'assigned', isAvailable: false, currentBookingId: doc.id });
          dronesFixed++;
          ops++;
        }
      }

      // Commit in batches of 500 (Firestore limit)
      if (ops >= 400) {
        await batch.commit();
        this.logger.log(`Migrated ${pilotsFixed} pilots, ${dronesFixed} drones so far...`);
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    this.logger.log(`Migration complete: ${pilotsFixed} pilots, ${dronesFixed} drones fixed`);
    return { pilotsFixed, dronesFixed };
  }

  /**
   * Canonical bookings store. All bookings live in the ROOT `bookings` collection
   * (never a per-user subcollection) so that reads, updates and cross-role queries
   * all target one place. See findBookingLookup / bookingCollectionGroup.
   */
  private bookingsCollection(): CollectionReference<FirestoreBookingDocument> {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.bookings) as CollectionReference<FirestoreBookingDocument>;
  }

  private userBookingCollection(_uid: string): CollectionReference<FirestoreBookingDocument> {
    // Retained for signature compatibility; ownership is tracked via the
    // customerUid field, not collection nesting. Writes go to the root collection.
    return this.bookingsCollection();
  }

  private bookingCollectionGroup(): Query<FirestoreBookingDocument> {
    return this.bookingsCollection();
  }

  /**
   * M-001 fix: Safely emit events with error handling to prevent
   * listener errors from propagating into the calling service
   */
  private safeEmit(event: string, payload: unknown): void {
    try {
      this.eventEmitter.emit(event, payload);
    } catch (error) {
      this.logger.warn(
        `Event emission failed for ${event}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async adminApproveBooking(
    id: string,
    autoAssign: boolean,
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);

    if (lookup.booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be approved');
    }

    const now = new Date().toISOString();

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      adminApprovalStatus: 'approved',
      autoAssign,
      updatedAt: now,
    };

    if (autoAssign) {
      updated.status = 'confirmed';
      updated.confirmedAt = now;
      updated.stage = 2;
      this.triggerFleetManagerAutoAssignment(
        id,
        lookup.booking.location,
        lookup.booking.serviceType,
        lookup.booking.scheduledDate,
      ).catch((error) => {
        this.logger.error(`Auto-assignment failed for booking ${id}: ${error.message}`);
      });
    } else {
      updated.status = 'confirmed';
      updated.confirmedAt = now;
      updated.stage = 1;

      // Admin did NOT auto-assign → send the booking to every fleet
      // manager's "incoming requests" so any of them can claim it.
      this.safeEmit('booking.approved.manual-assign', {
        bookingId: id,
        location: lookup.booking.location,
        serviceType: lookup.booking.serviceType,
        scheduledDate: lookup.booking.scheduledDate,
        timestamp: now,
      });
    }

    await lookup.ref.set(this.sanitizeBookingDocument(updated), { merge: true });
    await this.bookingHistoryService.recordHistory(updated, user.uid, 'Booking approved by admin');
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    await this.bookingEventsService.logStatusChange(
      updated.id,
      'confirmed',
      'pending',
      user.uid,
      user.role,
      { scheduledDate: updated.scheduledDate, serviceType: updated.serviceType },
    );

    this.safeEmit(WS_EVENTS.BOOKING_ADMIN_APPROVED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      adminUid: user.uid,
      aggregatorUid: updated.aggregatorUid,
      fleetManagerUid: updated.fleetManagerUid,
      status: 'approved',
      timestamp: now,
    });

    this.safeEmit(WS_EVENTS.BOOKING_CONFIRMED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      fleetManagerUid: updated.fleetManagerUid,
      status: 'confirmed',
      autoAssign,
      timestamp: now,
    });

    return updated;
  }

  async adminRejectBooking(
    id: string,
    reason: string,
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);

    if (lookup.booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be rejected');
    }

    const now = new Date().toISOString();

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      adminApprovalStatus: 'rejected',
      status: 'cancelled',
      cancellationReason: reason || 'Booking rejected by admin',
      cancelledBy: user.uid,
      cancelledAt: now,
      updatedAt: now,
    };

    await lookup.ref.set(this.sanitizeBookingDocument(updated), { merge: true });
    await this.bookingHistoryService.recordHistory(updated, user.uid, `Booking rejected: ${reason}`);
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    await this.bookingEventsService.logCancellation(
      id,
      reason || 'Booking rejected by admin',
      user.uid,
      user.role,
      { scheduledDate: updated.scheduledDate, serviceType: updated.serviceType },
    );

    this.safeEmit(WS_EVENTS.BOOKING_ADMIN_REJECTED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      adminUid: user.uid,
      aggregatorUid: updated.aggregatorUid,
      status: 'rejected',
      reason: reason || 'Booking rejected by admin',
      timestamp: now,
    });

    return updated;
  }

  async adminAssignBooking(
    id: string,
    dto: {
      fleetManagerUid?: string;
      assignedPilot?: string;
      assignedDrone?: string;
    },
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);

    if (lookup.booking.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed bookings can be assigned manually');
    }

    if (lookup.booking.actualStartTime) {
      throw new BadRequestException('Cannot change assignments after mission has started');
    }

    const now = new Date().toISOString();

    const previousFleetManagerUid = lookup.booking.fleetManagerUid;
    const previousPilotUid = lookup.booking.assignedPilot;
    const previousDroneId = lookup.booking.assignedDrone;

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      ...(dto.fleetManagerUid !== undefined ? { fleetManagerUid: dto.fleetManagerUid } : {}),
      ...(dto.assignedPilot !== undefined ? { assignedPilot: dto.assignedPilot } : {}),
      ...(dto.assignedDrone !== undefined ? { assignedDrone: dto.assignedDrone } : {}),
      stage: dto.assignedPilot ? 2 : lookup.booking.stage,
      updatedAt: now,
    };

    if (dto.assignedPilot) {
      const pilotDoc = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(dto.assignedPilot)
        .get()
        .catch(() => null);

      if (pilotDoc?.exists) {
        const pilotData = pilotDoc.data();
        updated.assignedPilotName = pilotData?.name || pilotData?.profileData?.fullName || null;
      }

      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(dto.assignedPilot)
        .update({ status: 'assigned', isAvailable: false, updatedAt: now })
        .catch((err) => this.logger.warn(`Failed to update pilot ${dto.assignedPilot} status: ${err.message}`));
    }

    if (dto.assignedDrone) {
      const droneSnapshot = await this.firebaseAdminService
        .firestore()
        .collectionGroup(USER_SUBCOLLECTIONS.drones)
        .where('id', '==', dto.assignedDrone)
        .limit(1)
        .get()
        .catch((err) => {
          this.logger.warn(`Failed to query drone ${dto.assignedDrone}: ${err.message}`);
          return null;
        });

      if (droneSnapshot && !droneSnapshot.empty) {
        await droneSnapshot.docs[0].ref
          .update({ status: 'assigned', isAvailable: false, currentBookingId: id, updatedAt: now })
          .catch((err) => this.logger.warn(`Failed to update drone ${dto.assignedDrone} status: ${err.message}`));
      } else {
        this.logger.warn(`Drone ${dto.assignedDrone} not found via collectionGroup, skipping status update`);
      }
    }

    if (previousPilotUid && previousPilotUid !== dto.assignedPilot) {
      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(previousPilotUid)
        .update({ status: 'active', isAvailable: true, currentBookingId: null, updatedAt: now })
        .catch((err) => this.logger.warn(`Failed to reset previous pilot ${previousPilotUid} status: ${err.message}`));
    }

    if (previousDroneId && previousDroneId !== dto.assignedDrone) {
      const prevDroneSnapshot = await this.firebaseAdminService
        .firestore()
        .collectionGroup(USER_SUBCOLLECTIONS.drones)
        .where('id', '==', previousDroneId)
        .limit(1)
        .get()
        .catch(() => null);

      if (prevDroneSnapshot && !prevDroneSnapshot.empty) {
        await prevDroneSnapshot.docs[0].ref
          .update({ status: 'deployable', isAvailable: true, currentBookingId: null, updatedAt: now })
          .catch((err) => this.logger.warn(`Failed to reset previous drone ${previousDroneId} status: ${err.message}`));
      }
    }

    // Create mission if pilot and drone are both assigned and no mission exists yet
    if (dto.assignedPilot && dto.assignedDrone && !lookup.booking.missionId) {
      const mission: FirestoreMissionDocument = {
        requestId: id,
        bookingId: id,
        pilotUid: dto.assignedPilot,
        status: 'pending',
        startTime: null,
        endTime: null,
        geoTrack: [],
        reportSummary: {},
        createdAt: now,
        updatedAt: now,
      };

      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.missions)
        .doc(id)
        .set(mission, { merge: true });

      updated.missionId = id;
    }

    await lookup.ref.set(this.sanitizeBookingDocument(updated), { merge: true });
    await this.bookingHistoryService.recordHistory(updated, user.uid, 'Admin updated booking assignments');
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    this.safeEmit(WS_EVENTS.BOOKING_ADMIN_ASSIGNMENT_CHANGED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      adminUid: user.uid,
      previousFleetManagerUid,
      previousPilotUid,
      previousDroneId,
      newFleetManagerUid: updated.fleetManagerUid,
      newPilotUid: updated.assignedPilot,
      newDroneId: updated.assignedDrone,
      timestamp: now,
    });

    return updated;
  }

  /**
   * ⭐ NEW: Trigger fleet manager auto-assignment for booking
   * This is the entry point for the two-stage assignment system
   */
  private async triggerFleetManagerAutoAssignment(
    bookingId: string,
    location: GeoPointValue,
    serviceType: string,
    scheduledDate: string,
  ): Promise<void> {
    try {
      this.logger.log(`Triggering fleet manager auto-assignment for booking ${bookingId}`);

      // Emit event for FleetManagerRequestService to handle
      // The actual assignment logic is in FleetModule to avoid circular dependency
      this.eventEmitter.emit('booking.created.trigger-fleet-manager-assignment', {
        bookingId,
        location,
        serviceType,
        scheduledDate,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Fleet manager auto-assignment triggered for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to trigger fleet manager auto-assignment for booking ${bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
  private toFirestorePlain<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toFirestorePlain(item)) as T;
    }

    if (value instanceof Date) {
      return value.toISOString() as T;
    }

    if (typeof value === 'object') {
      const plain: Record<string, unknown> = {};

      for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        if (nestedValue !== undefined) {
          plain[key] = this.toFirestorePlain(nestedValue);
        }
      }

      return plain as T;
    }

    return value;
  }

  private sanitizeBookingDocument(
    booking: FirestoreBookingDocument,
  ): FirestoreBookingDocument {
    return this.toFirestorePlain(booking);
  }

  /**
   * Generate a sequential booking number like "0001".
   * Format: zero-padded numeric sequence (min 4 digits).
   *
   * The sequence is backed by an atomic Firestore counter document so numbers
   * are ALWAYS ascending and ALWAYS unique, even under concurrent booking
   * creation (Firestore transactions guarantee atomicity). Once the sequence
   * passes 9999 the number simply grows to 5+ digits ("10000", "10001", ...).
   */
  private async generateBookingNumber(): Promise<string> {
    interface BookingCounterDocument {
      value: number;
    }

    const firestore = this.firebaseAdminService.firestore();
    const counterRef = firestore
      .collection(ROOT_COLLECTIONS.counters)
      .doc('bookings') as DocumentReference<BookingCounterDocument>;

    // Seed the counter on first use so numbering continues above any existing
    // numeric bookings (e.g. after a partial deployment). Lexicographic order
    // cannot be trusted for zero-padded numbers, so parse the top docs.
    try {
      const counterSnap = await counterRef.get();
      if (!counterSnap.exists) {
        let seed = 0;
        const existing = await this.bookingsCollection()
          .orderBy('bookingNumber', 'desc')
          .limit(25)
          .get();
        for (const doc of existing.docs) {
          const value = doc.data()?.bookingNumber;
          const match = typeof value === 'string' ? value.match(/^(\d{4,})$/) : null;
          if (match) {
            seed = Math.max(seed, parseInt(match[1], 10));
          }
        }
        await counterRef.set({ value: seed }, { merge: true });
      }
    } catch (error) {
      this.logger.warn(
        `Booking counter seed skipped: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    const nextSequence = await firestore.runTransaction<number>(
      async (transaction) => {
        const snapshot = await transaction.get(counterRef);
        const current = snapshot.exists ? (snapshot.data()?.value ?? 0) : 0;
        const next = current + 1;
        transaction.set(counterRef, { value: next }, { merge: true });
        return next;
      },
    );

    return String(nextSequence).padStart(4, '0');
  }

  /**
   * Rate a completed booking with rating and feedback.
   * The customer OR the sales aggregator (who booked on behalf of the customer)
   * can rate the pilot. The rating directly updates the pilot's average rating,
   * and the pilot's fleet manager rating is auto-recalculated as the average of
   * all pilots under that fleet manager.
   */
  async rateBooking(
    id: string,
    rating: number,
    feedback: string | undefined,
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);

    // Only customer, sales aggregator or admin can rate
    if (!['customer', 'aggregator', 'admin'].includes(user.role)) {
      throw new ForbiddenException('Only customers or sales aggregators can rate bookings');
    }

    // Verify ownership
    if (user.role === 'customer' && lookup.booking.customerUid !== user.uid) {
      throw new ForbiddenException('You can only rate your own bookings');
    }
    if (user.role === 'aggregator' && lookup.booking.aggregatorUid !== user.uid) {
      throw new ForbiddenException('You can only rate bookings created by you');
    }

    // Can only rate completed bookings
    if (lookup.booking.status !== 'completed') {
      throw new BadRequestException('Only completed bookings can be rated');
    }

    // Check if already rated
    if (lookup.booking.customerRating) {
      throw new BadRequestException('This booking has already been rated');
    }

    const now = new Date().toISOString();
    const resolvedFeedback = feedback || null;

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      customerRating: rating,
      customerFeedback: resolvedFeedback,
      ratedBy: user.uid,
      ratedByRole: user.role,
      updatedAt: now,
    };

    await lookup.ref.set(updated, { merge: true });

    // Persist a rating record so pilot/FM averages can be recomputed reliably
    if (updated.assignedPilot) {
      await this.firebaseAdminService
        .firestore()
        .collection('booking_ratings')
        .doc(updated.id)
        .set({
          bookingId: updated.id,
          bookingNumber: updated.bookingNumber || null,
          pilotUid: updated.assignedPilot,
          fleetManagerUid: updated.fleetManagerUid || null,
          rating,
          feedback: resolvedFeedback,
          ratedBy: user.uid,
          ratedByRole: user.role,
          createdAt: now,
        });
    }

    await this.bookingHistoryService.recordHistory(
      updated,
      user.uid,
      `Booking rated: ${rating} stars`,
    );

    // Log rating event to events subcollection
    await this.bookingEventsService.logRatingAdded(
      updated.id,
      rating,
      feedback,
      user.uid,
      {
        scheduledDate: updated.scheduledDate,
        serviceType: updated.serviceType,
      },
    );

    // Recompute the pilot's average rating from all persisted ratings
    if (updated.assignedPilot) {
      await this.updatePilotRating(updated.assignedPilot);
    }

    // Recompute the fleet manager's rating (average of all pilots under them)
    if (updated.fleetManagerUid) {
      await this.updateFleetManagerRating(updated.fleetManagerUid);
    }

    // Emit rating event
    this.safeEmit(WS_EVENTS.BOOKING_RATED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      pilotUid: updated.assignedPilot,
      fleetManagerUid: updated.fleetManagerUid,
      rating,
      feedback: resolvedFeedback,
      timestamp: updated.updatedAt,
    });

    // Invalidate cache
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');
    if (updated.assignedPilot) {
      await this.cacheService.delete(`pilot:profile:${updated.assignedPilot}`);
    }
    if (updated.fleetManagerUid) {
      await this.cacheService.deletePattern(`fleet:.*${updated.fleetManagerUid}.*`);
    }

    this.logger.log(`Booking ${id} rated: ${rating} stars by ${user.role} ${user.uid}`);

    return updated;
  }

  /**
   * Set or update the preferred time slot for a pending booking
   */
  async setPreferredTimeSlot(
    id: string,
    timeSlot: 'morning' | 'afternoon' | 'evening',
    user: CurrentUser,
  ): Promise<FirestoreBookingDocument> {
    const lookup = await this.findBookingLookup(id);
    this.assertCanManagePending(lookup.booking, user);

    // Only pending bookings can have time slot changed
    if (lookup.booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can have time slot changed');
    }

    const updated: FirestoreBookingDocument = {
      ...lookup.booking,
      preferredTimeSlot: timeSlot,
      updatedAt: new Date().toISOString(),
    };

    await lookup.ref.set(updated, { merge: true });
    await this.bookingHistoryService.recordHistory(
      updated,
      user.uid,
      `Preferred time slot set to ${timeSlot}`,
    );

    // Log time slot updated event to events subcollection
    await this.bookingEventsService.logTimeSlotUpdated(
      updated.id,
      timeSlot,
      user.uid,
      user.role,
      {
        scheduledDate: updated.scheduledDate,
        serviceType: updated.serviceType,
      },
    );

    // Emit time slot update event
    this.safeEmit(WS_EVENTS.BOOKING_TIME_SLOT_UPDATED, {
      bookingId: updated.id,
      customerUid: updated.customerUid,
      preferredTimeSlot: timeSlot,
      timestamp: updated.updatedAt,
    });

    // Invalidate cache
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    this.logger.log(`Booking ${id} time slot set to ${timeSlot} by ${user.uid}`);

    return updated;
  }

  /**
   * Get detailed price breakdown for a booking
   * Returns the full breakdown including all line items
   */
  async getPriceBreakdown(id: string, user: CurrentUser): Promise<{
    bookingId: string;
    bookingNumber?: string;
    priceEstimation: number;
    priceBreakdown: {
      baseAmount: number;
      travelCharges: number;
      additionalCharges: number;
      discount: number;
      couponDiscount: number;
      taxAmount: number;
      totalAmount: number;
    };
    finalPrice: number | null;
    paymentStatus: string;
    status: string;
  }> {
    const booking = await this.getBooking(id, user);

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      priceEstimation: booking.priceEstimation || 0,
      priceBreakdown: booking.priceBreakdown || {
        baseAmount: 0,
        travelCharges: 0,
        additionalCharges: 0,
        discount: 0,
        couponDiscount: 0,
        taxAmount: 0,
        totalAmount: booking.priceEstimation || 0,
      },
      finalPrice: booking.finalPrice ?? null,
      paymentStatus: booking.paymentStatus || 'pending',
      status: booking.status,
    };
  }

  /**
   * Get booking progress tracking data
   */
  async getBookingProgress(bookingId: string): Promise<any> {
    try {
      const progressDoc = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.bookingProgress)
        .doc(bookingId)
        .get();

      if (!progressDoc.exists) {
        this.logger.warn(`No progress data found for booking: ${bookingId}`);
        return null;
      }

      return progressDoc.data();
    } catch (error) {
      this.logger.error(`Error fetching booking progress for ${bookingId}:`, error);
      return null;
    }
  }

  /**
   * Live weather forecast check for a booking's location.
   * Delegates to the shared WeatherService (Open-Meteo backed, tri-state result).
   */
  async getWeatherForecast(bookingId: string): Promise<any> {
    try {
      const lookup = await this.findBookingLookup(bookingId);
      const location = lookup.booking.location;
      if (!location) {
        this.logger.warn(`Booking ${bookingId} has no location for weather check`);
        return null;
      }
      return this.weatherService.checkWeather(
        { lat: location.lat, lng: location.lng },
        lookup.booking.scheduledDate ?? undefined,
      );
    } catch (error) {
      this.logger.error(`Error fetching weather forecast for ${bookingId}:`, error);
      return null;
    }
  }

  /**
   * Live flying-restriction (airspace) check for a booking's location.
   * Delegates to the shared AirspaceService (geofence / provider, tri-state result).
   */
  async getFlyingRestrictions(bookingId: string): Promise<any> {
    try {
      const lookup = await this.findBookingLookup(bookingId);
      const location = lookup.booking.location;
      if (!location) {
        this.logger.warn(`Booking ${bookingId} has no location for airspace check`);
        return null;
      }
      const source = { lat: location.lat, lng: location.lng };
      const dropoff = lookup.booking.dropoffLocation;
      // Delivery is only as clear as its most-restricted point → check the whole route.
      if (lookup.booking.serviceType === 'delivery' && dropoff) {
        return this.airspaceService.checkRoute(source, {
          lat: dropoff.lat,
          lng: dropoff.lng,
        });
      }
      return this.airspaceService.checkRestrictions(source);
    } catch (error) {
      this.logger.error(`Error fetching flying restrictions for ${bookingId}:`, error);
      return null;
    }
  }

  /**
   * Get all booking metadata (progress, weather, restrictions) in one call
   */
  async getBookingMetadata(bookingId: string): Promise<{
    progress: any;
    weather: any;
    restrictions: any;
  }> {
    const [progress, weather, restrictions] = await Promise.all([
      this.getBookingProgress(bookingId),
      this.getWeatherForecast(bookingId),
      this.getFlyingRestrictions(bookingId),
    ]);

    return {
      progress,
      weather,
      restrictions,
    };
  }

  /**
   * Calculate refund amount based on cancellation timing and booking status
   */
  calculateRefund(
    amount: number,
    scheduledDate: string,
    status: string
  ): { amount: number; percentage: number; reason: string } {
    // No refund if mission already started
    if (status === 'in_progress') {
      return { amount: 0, percentage: 0, reason: 'Mission already started - travel costs incurred' };
    }

    const now = Date.now();
    const scheduled = new Date(scheduledDate).getTime();
    const hoursUntil = (scheduled - now) / (1000 * 60 * 60);

    if (hoursUntil > 24) {
      return { amount, percentage: 100, reason: 'More than 24 hours notice - full refund' };
    } else if (hoursUntil >= 12) {
      const refundAmount = amount * 0.75;
      return { amount: refundAmount, percentage: 75, reason: '12-24 hours notice - 75% refund' };
    } else if (hoursUntil >= 6) {
      const refundAmount = amount * 0.50;
      return { amount: refundAmount, percentage: 50, reason: '6-12 hours notice - 50% refund' };
    } else {
      return { amount: 0, percentage: 0, reason: 'Less than 6 hours notice - no refund' };
    }
  }

  /**
   * Cancel booking with refund calculation.
   * Enforces the role-based cancellation matrix, marks the booking AND its mission
   * as cancelled, releases the assigned pilot/drone and notifies all parties.
   */
  async cancelBookingWithRefund(
    id: string,
    reason?: string,
    user?: CurrentUser,
  ): Promise<
    FirestoreBookingDocument & {
      refund: { amount: number; percentage: number; reason: string };
    }
  > {
    const lookup = await this.findBookingLookup(id);
    const mission = await this.getMissionForBooking(lookup.booking);

    if (user) {
      this.assertCanCancel(lookup.booking, mission, user);
    }

    const amount = lookup.booking.finalPrice || lookup.booking.priceEstimation || 0;

    // Conditional refund: 100% for admin/FM/pilot cancellation, tiered for customer/aggregator
    const cancelledByRole = user?.role || 'system';
    const isAdminOrFMOrPilot = [
      'admin', 'subadmin', 'super_admin',
      'fleet_manager', 'vendor',
      'pilot',
    ].includes(cancelledByRole);

    let refund: { amount: number; percentage: number; reason: string };
    if (isAdminOrFMOrPilot) {
      refund = {
        amount,
        percentage: 100,
        reason: `Cancelled by ${cancelledByRole} — full refund`,
      };
    } else {
      refund = this.calculateRefund(
        amount,
        lookup.booking.scheduledDate,
        lookup.booking.status,
      );
    }

    // Store refund info for admin processing
    if (refund.amount > 0) {
      const nowIso = new Date().toISOString();
      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.bookingRefunds)
        .doc(id)
        .set({
          id,
          bookingId: id,
          customerUid: lookup.booking.customerUid,
          pilotUid: lookup.booking.assignedPilot || null,
          fleetManagerUid: lookup.booking.fleetManagerUid || null,
          originalAmount: amount,
          refundAmount: refund.amount,
          refundPercentage: refund.percentage,
          refundReason: refund.reason,
          cancellationReason: reason || 'Not specified',
          status: 'pending',
          paymentMethod: lookup.booking.paymentMethod || null,
          razorpayPaymentId: lookup.booking.paymentId || null,
          requestedAt: nowIso,
          requestedBy: user?.uid || 'system',
          createdAt: nowIso,
          updatedAt: nowIso,
        });

      this.logger.log(`Refund request created for booking ${id}: ${refund.amount} (${refund.percentage}%)`);
    }

    const cancelled = await this.transitionBookingStatus(
      lookup,
      'cancelled',
      user?.uid || 'system',
      reason || 'Cancelled with refund calculation'
    );

    const now = new Date().toISOString();
    const cancelledBy = user?.uid || 'system';
    const cancellationReason = reason || 'Not specified';

    const withCancellationMeta: FirestoreBookingDocument = {
      ...cancelled,
      cancellationReason,
      cancelledBy,
      cancelledAt: now,
      refundAmount: refund.amount,
      updatedAt: now,
    };

    await lookup.ref.set(this.sanitizeBookingDocument(withCancellationMeta), { merge: true });

    // Cancel the associated mission document (if any) and release resources
    await this.cancelMissionDocument(lookup.booking, cancellationReason, cancelledBy);
    await this.releaseBookingResources(withCancellationMeta);

    // Invalidate cache
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    // Log cancellation event to events subcollection
    await this.bookingEventsService.logCancellation(
      id,
      cancellationReason,
      cancelledBy,
      user?.role || 'system',
      {
        scheduledDate: withCancellationMeta.scheduledDate,
        serviceType: withCancellationMeta.serviceType,
      },
    );

    // Notify all parties that the mission has been cancelled
    this.safeEmit(WS_EVENTS.MISSION_CANCELLED, {
      missionId: lookup.booking.missionId || id,
      bookingId: id,
      pilotUid: withCancellationMeta.assignedPilot,
      customerUid: withCancellationMeta.customerUid,
      fleetManagerUid: withCancellationMeta.fleetManagerUid,
      droneId: withCancellationMeta.assignedDrone,
      cancelledBy,
      cancelledByRole: user?.role || 'system',
      reason: cancellationReason,
      timestamp: now,
    });

    return {
      ...withCancellationMeta,
      refund,
    };
  }

  /**
   * System-initiated auto-cancellation for bookings whose service date has
   * passed without approval, assignment, start, or completion.
   *
   * Unlike {@link cancelBookingWithRefund} this path:
   *  - skips role-based `assertCanCancel` checks (runs as `system`), so it can
   *    also close `in_progress` bookings with started missions that clients can
   *    never cancel themselves;
   *  - always grants a FULL (100%) refund when an amount is due, instead of the
   *    tiered customer-initiated policy (which yields ₹0 past the service date);
   *  - tolerates legacy/non-enum statuses (`pilot_assigned`, `assigned`) that
   *    `transitionBookingStatus` cannot validate, via a direct merge write;
   *  - is idempotent: already `cancelled`/`completed` bookings are returned
   *    untouched so repeated cron sweeps are safe.
   */
  async autoCancelExpiredBooking(
    id: string,
    reason = 'Auto-cancelled: service date passed without completion',
  ): Promise<
    FirestoreBookingDocument & {
      refund: { amount: number; percentage: number; reason: string };
    }
  > {
    const lookup = await this.findBookingLookup(id);
    const currentStatus = String(lookup.booking.status || '').toLowerCase();

    const noRefund = { amount: 0, percentage: 0, reason: 'No amount due' };
    if (currentStatus === 'cancelled' || currentStatus === 'completed') {
      return { ...lookup.booking, refund: noRefund };
    }

    const amount = lookup.booking.finalPrice || lookup.booking.priceEstimation || 0;
    const refund = {
      amount,
      percentage: 100,
      reason: 'Auto-cancelled after the service date passed without completion — full refund',
    };

    // Store refund info for admin processing (only when money is actually due).
    if (refund.amount > 0) {
      const nowIso = new Date().toISOString();
      await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.bookingRefunds)
        .doc(id)
        .set({
          id,
          bookingId: id,
          customerUid: lookup.booking.customerUid,
          pilotUid: lookup.booking.assignedPilot || null,
          fleetManagerUid: lookup.booking.fleetManagerUid || null,
          originalAmount: amount,
          refundAmount: refund.amount,
          refundPercentage: refund.percentage,
          refundReason: refund.reason,
          cancellationReason: reason,
          status: 'pending',
          paymentMethod: lookup.booking.paymentMethod || null,
          razorpayPaymentId: lookup.booking.paymentId || null,
          requestedAt: nowIso,
          requestedBy: 'system',
          createdAt: nowIso,
          updatedAt: nowIso,
        });

      this.logger.log(`System refund request created for expired booking ${id}: ${refund.amount} (100%)`);
    }

    let cancelled: FirestoreBookingDocument;
    const cancellableViaTransition = (
      BOOKING_STATUS_TRANSITIONS[currentStatus as BookingStatus] || []
    ).includes('cancelled');

    if (cancellableViaTransition) {
      cancelled = await this.transitionBookingStatus(
        lookup,
        'cancelled',
        'system',
        reason,
      );
    } else {
      // Legacy/non-enum statuses (e.g. pilot_assigned, assigned) cannot pass
      // transition validation — close them with a direct merge write.
      const now = new Date().toISOString();
      const directUpdate: FirestoreBookingDocument = {
        ...lookup.booking,
        status: 'cancelled',
        stage: this.calculateStageForStatus('cancelled', lookup.booking),
        updatedAt: now,
      };
      await lookup.ref.set(this.sanitizeBookingDocument(directUpdate), { merge: true });
      await this.bookingHistoryService.recordHistory(directUpdate, 'system', reason).catch((err: unknown) =>
        this.logger.warn(`Failed to record history for auto-cancelled booking ${id}: ${err}`),
      );
      cancelled = directUpdate;
    }

    const now = new Date().toISOString();
    const withCancellationMeta: FirestoreBookingDocument = {
      ...cancelled,
      cancellationReason: reason,
      cancelledBy: 'system',
      cancelledAt: now,
      refundAmount: refund.amount,
      updatedAt: now,
    };

    await lookup.ref.set(this.sanitizeBookingDocument(withCancellationMeta), { merge: true });

    // Cancel the associated mission document (if any) and release resources
    await this.cancelMissionDocument(lookup.booking, reason, 'system');
    await this.releaseBookingResources(withCancellationMeta);

    // Invalidate cache
    await this.cacheService.delete(`booking:${id}`);
    await this.cacheService.deletePattern('bookings-list:.*');

    // Log cancellation event to events subcollection
    await this.bookingEventsService.logCancellation(
      id,
      reason,
      'system',
      'system',
      {
        scheduledDate: withCancellationMeta.scheduledDate,
        serviceType: withCancellationMeta.serviceType,
      },
    );

    // Notify all parties that the mission has been cancelled
    this.safeEmit(WS_EVENTS.MISSION_CANCELLED, {
      missionId: lookup.booking.missionId || id,
      bookingId: id,
      pilotUid: withCancellationMeta.assignedPilot,
      customerUid: withCancellationMeta.customerUid,
      fleetManagerUid: withCancellationMeta.fleetManagerUid,
      droneId: withCancellationMeta.assignedDrone,
      cancelledBy: 'system',
      cancelledByRole: 'system',
      reason,
      timestamp: now,
    });

    return {
      ...withCancellationMeta,
      refund,
    };
  }

  /**
   * Non-terminal statuses eligible for expiry sweeps. Includes legacy
   * frontend statuses (`pilot_assigned`, `assigned`, `scheduled`, `upcoming`)
   * that never appear in the enum transition map.
   */
  static readonly EXPIRY_SWEEP_STATUSES = [
    'pending',
    'confirmed',
    'in_progress',
    'pilot_assigned',
    'assigned',
    'scheduled',
    'upcoming',
  ];

  /**
   * Resolve a booking's service date from known fields (mirrors the mobile
   * `bookingLifecycle` helper).
   */
  static resolveExpiryServiceDate(booking: Record<string, unknown>): Date | null {
    const raw =
      booking.scheduledDate ||
      booking.date ||
      booking.preferredDate ||
      booking.scheduledStartTime ||
      booking.serviceDate;
    if (!raw) return null;
    const parsed = new Date(String(raw));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Start of "today" on the Asia/Kolkata wall clock, returned as a Date whose
   * local getters reflect IST (server TZ-independent).
   */
  static startOfTodayIST(now = new Date()): Date {
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    ist.setHours(0, 0, 0, 0);
    return ist;
  }

  /**
   * Classify WHY an expired booking must be auto-cancelled. Returns a reason
   * string, or null when the booking must be left alone (terminal, dateless,
   * or its service day has not fully passed yet). Mirrors the mobile
   * `getBookingExpiryReason` taxonomy:
   *  1. date passed + never approved (pending/rejected) by admin;
   *  2. date passed + approved but service never completed;
   *  3. date passed + FM/pilot/drone never assigned;
   *  4. pilot never started the service by end of the service day;
   *  5. service started (`in_progress`) but never completed past the day;
   *  6. assigned (`pilot_assigned`/`assigned`) without a start past the day.
   */
  static getExpiryReason(
    booking: Record<string, unknown>,
    now = new Date(),
  ): string | null {
    const status = String(booking.status || '').toLowerCase();
    if (status === 'cancelled' || status === 'completed') return null;

    const serviceDate = BookingService.resolveExpiryServiceDate(booking);
    if (!serviceDate) return null;

    // Expiry fires only after 23:59:59 IST of the service date.
    const endOfServiceDay = new Date(
      BookingService.startOfTodayIST(serviceDate).getTime() + 24 * 60 * 60 * 1000 - 1,
    );
    if (now.getTime() <= endOfServiceDay.getTime()) return null;

    const dayLabel = serviceDate.toLocaleDateString('en-IN');
    const approval = String(booking.adminApprovalStatus || '').toLowerCase();
    const started = Boolean(
      booking.actualStartTime || booking.startedAt || booking.missionStartedAt,
    );

    // Case 1: never approved (or rejected) and the date has passed.
    if (approval && approval !== 'approved') {
      return `Auto-cancelled: service date ${dayLabel} passed without admin approval`;
    }
    if (!approval && !started && ['pending', 'scheduled', 'upcoming'].includes(status)) {
      return `Auto-cancelled: service date ${dayLabel} passed without admin approval`;
    }

    // Case 3: approved but FM/pilot/drone never assigned by end of service day.
    const hasFm = Boolean(booking.fleetManagerUid || booking.fleetManagerId || booking.fmUid);
    const hasPilot = Boolean(booking.assignedPilot || booking.pilotUid || booking.pilotId);
    const hasDrone = Boolean(booking.assignedDrone || booking.droneId || booking.droneUid);
    if (approval === 'approved' && (status === 'pending' || status === 'confirmed') && !started) {
      if (!hasFm || !hasPilot || !hasDrone) {
        return `Auto-cancelled: FM/pilot/drone was not assigned by end of service day ${dayLabel}`;
      }
      // Case 2: assigned but service never done.
      return `Auto-cancelled: service scheduled on ${dayLabel} was not completed`;
    }

    // Case 4/6: assigned to a pilot but never started by end of day.
    if ((status === 'pilot_assigned' || status === 'assigned') && !started) {
      return `Auto-cancelled: pilot did not start the service by end of ${dayLabel}`;
    }

    // Case 5: started but never completed and the day has passed.
    if (status === 'in_progress') {
      return `Auto-cancelled: service started on ${dayLabel} was not completed by end of day`;
    }

    // Fallback: any other non-terminal booking whose service day fully passed.
    return `Auto-cancelled: service date ${dayLabel} has passed without completion`;
  }

  /**
   * Find all bookings due for system auto-cancellation. Queries by status
   * (`in` filter, no ordering — no new composite index required) and applies
   * the IST day-boundary + taxonomy filter in memory (same pattern as the
   * complaint SLA sweep).
   */
  async findExpiredBookings(now = new Date()): Promise<Array<{ id: string; reason: string }>> {
    const snapshot = await this.bookingsCollection()
      .where('status', 'in', BookingService.EXPIRY_SWEEP_STATUSES)
      .get();

    const expired: Array<{ id: string; reason: string }> = [];
    for (const doc of snapshot.docs) {
      const data = doc.data() as unknown as Record<string, unknown>;
      const reason = BookingService.getExpiryReason({ ...data, id: doc.id }, now);
      if (reason) expired.push({ id: doc.id, reason });
    }
    return expired;
  }

  /**
   * Batch-close every expired booking with a full-refund system cancellation.
   * Per-item failures are collected (never abort the sweep); already-terminal
   * bookings are no-ops inside `autoCancelExpiredBooking`, making this safe
   * under concurrent sweeps or client-initiated cancels.
   */
  async autoCancelExpiredBookings(now = new Date()): Promise<{
    checked: number;
    cancelled: Array<{ id: string; reason: string; refundAmount: number }>;
    failed: Array<{ id: string; reason: string; error: string }>;
  }> {
    const expired = await this.findExpiredBookings(now);
    const cancelled: Array<{ id: string; reason: string; refundAmount: number }> = [];
    const failed: Array<{ id: string; reason: string; error: string }> = [];

    for (const item of expired) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await this.autoCancelExpiredBooking(item.id, item.reason);
        cancelled.push({ id: item.id, reason: item.reason, refundAmount: result.refund.amount });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Auto-cancel failed for expired booking ${item.id}: ${message}`);
        failed.push({ id: item.id, reason: item.reason, error: message });
      }
    }

    return { checked: expired.length, cancelled, failed };
  }

  /**
   * Get real-time tracking information for a booking
   * Includes stage, pilot location, ETA, and progress
   */
  async getBookingTracking(bookingId: string, user?: CurrentUser) {
    const booking = await this.getBooking(bookingId, user);

    // Get mission data if pilot is assigned
    let missionData = null;
    let pilotLocation = null;
    let eta = null;

    if (booking.assignedPilot && booking.status === 'in_progress') {
      try {
        const missionDoc = await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.missions)
          .doc(bookingId)
          .get();

        if (missionDoc.exists) {
          missionData = missionDoc.data();

          // Get latest location from geoTrack (legacy trail)
          if (missionData?.geoTrack && missionData.geoTrack.length > 0) {
            const latestPoint = missionData.geoTrack[missionData.geoTrack.length - 1];
            pilotLocation = {
              lat: latestPoint.lat,
              lng: latestPoint.lng,
              timestamp: latestPoint.timestamp,
            };
          }
        }

        // ⭐ Fallback: read the pilot's LIVE location. This is updated in
        // real-time by the socket gateway (`mission:gps`) and the REST
        // `POST /pilots/location` endpoint, stored at
        // users/{pilotUid}/location/current and profileData.currentLocation.
        if (!pilotLocation) {
          const pilotLocationDoc = await this.firebaseAdminService
            .firestore()
            .collection(ROOT_COLLECTIONS.users)
            .doc(booking.assignedPilot)
            .collection('location')
            .doc('current')
            .get()
            .catch(() => null);

          if (pilotLocationDoc?.exists) {
            const liveData = pilotLocationDoc.data() as {
              location?: { lat: number; lng: number };
              timestamp?: string;
              updatedAt?: string;
            } | undefined;
            if (liveData?.location) {
              pilotLocation = {
                lat: liveData.location.lat,
                lng: liveData.location.lng,
                timestamp: liveData.timestamp || liveData.updatedAt || null,
              };
            }
          }
        }

        if (!pilotLocation) {
          const pilotProfile = await this.firebaseAdminService
            .firestore()
            .collection(ROOT_COLLECTIONS.users)
            .doc(booking.assignedPilot)
            .get()
            .catch(() => null);
          const profileData = pilotProfile?.data()?.profileData as
            | { currentLocation?: { lat: number; lng: number }; lastLocationUpdate?: string }
            | undefined;
          if (profileData?.currentLocation) {
            pilotLocation = {
              lat: profileData.currentLocation.lat,
              lng: profileData.currentLocation.lng,
              timestamp: profileData.lastLocationUpdate || null,
            };
          }
        }

        // Calculate ETA if pilot is en route
        if (pilotLocation && booking.location) {
          const distance = this.calculateDistance(
            pilotLocation.lat,
            pilotLocation.lng,
            booking.location.lat,
            booking.location.lng
          );
          // Assume average drone speed of 40 km/h
          const hoursRemaining = distance / 40;
          const minutesRemaining = Math.ceil(hoursRemaining * 60);
          eta = {
            minutes: minutesRemaining,
            estimatedArrival: new Date(Date.now() + minutesRemaining * 60 * 1000).toISOString(),
          };
        }
      } catch (error) {
        this.logger.error(`Error fetching mission data for ${bookingId}:`, error);
      }
    }

    // Calculate progress percentage based on stage
    const progressPercentage = this.calculateProgressPercentage(booking.stage || 1, booking.status);

    return {
      bookingId: booking.id,
      status: booking.status,
      stage: booking.stage || this.deriveBookingStage(booking),
      stageDescription: this.getStageDescription(booking.stage || this.deriveBookingStage(booking)),
      pilotLocation,
      eta,
      progress: {
        percentage: progressPercentage,
        currentStep: this.getProgressStep(booking.stage || 1),
        completedSteps: this.getCompletedSteps(booking.stage || 1),
      },
      assignedPilot: booking.assignedPilot ? {
        pilotUid: booking.assignedPilot,
        // Additional pilot info could be fetched here
      } : null,
      scheduledDate: booking.scheduledDate,
      location: booking.location,
      updatedAt: booking.updatedAt,
    };
  }

  /**
   * Calculate progress percentage based on stage
   */
  private calculateProgressPercentage(stage: number, status: string): number {
    if (status === 'cancelled') return 0;
    if (status === 'completed') return 100;

    // Map stage to percentage (7 stages)
    const stagePercentages: Record<number, number> = {
      1: 10,  // SUBMITTED
      2: 30,  // PILOT_ASSIGNED
      3: 50,  // EN_ROUTE
      4: 70,  // MISSION_ACTIVE
      5: 85,  // PROCESSING
      6: 95,  // PAYMENT_PENDING
      7: 100, // COMPLETED
    };

    return stagePercentages[stage] || 0;
  }

  /**
   * Get current progress step description
   */
  private getProgressStep(stage: number): string {
    const steps: Record<number, string> = {
      1: 'Booking submitted',
      2: 'Pilot assigned',
      3: 'Pilot en route',
      4: 'Mission in progress',
      5: 'Processing data',
      6: 'Awaiting payment',
      7: 'Completed',
    };
    return steps[stage] || 'Processing';
  }

  /**
   * Get list of completed steps
   */
  private getCompletedSteps(currentStage: number): string[] {
    const allSteps = [
      'Booking submitted',
      'Pilot assigned',
      'Pilot en route',
      'Mission in progress',
      'Processing data',
      'Awaiting payment',
      'Completed',
    ];

    return allSteps.slice(0, currentStage);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get booking with enriched stage information
   */
  async getBookingWithStage(id: string, user?: CurrentUser) {
    const booking = await this.getBooking(id, user);
    const stage = this.deriveBookingStage(booking);
    const stageDescription = this.getStageDescription(stage);

    return {
      ...booking,
      stage,
      stageDescription,
    };
  }

  /**
   * Derive booking stage from status and related fields (7-stage UI tracker)
   */
  private deriveBookingStage(booking: FirestoreBookingDocument): number {
    const status = booking.status.toLowerCase();

    // Cancelled bookings
    if (status === 'cancelled') {
      return 0; // Special case - could be shown separately in UI
    }

    // Completed = stage 7
    if (status === 'completed') {
      return 7;
    }

    // In progress flow
    if (status === 'in_progress') {
      // If payment is pending but mission done
      if (booking.finalPrice && booking.paymentStatus === 'pending') {
        return 6; // Payment pending
      }
      // Mission is active
      return 4; // Mission active
    }

    // Confirmed flow
    if (status === 'confirmed') {
      if (booking.assignedPilot) {
        // Could check mission status for more granularity (en route vs at location)
        return 3; // Pilot en route (assume once assigned)
      }
      return 2; // Pilot assigned
    }

    // Pending = stage 1
    return 1; // Submitted
  }

  /**
   * Get human-readable stage description
   */
  private getStageDescription(stage: number): string {
    switch (stage) {
      case 0:
        return 'Booking cancelled';
      case 1:
        return 'Booking submitted and awaiting confirmation';
      case 2:
        return 'Pilot has been assigned to your booking';
      case 3:
        return 'Pilot is en route to the location';
      case 4:
        return 'Mission is currently in progress';
      case 5:
        return 'Mission completed, processing media and data';
      case 6:
        return 'Awaiting payment confirmation';
      case 7:
        return 'Booking completed successfully';
      default:
        return 'Processing...';
    }
  }

  /**
   * Update pilot's average rating (called after new rating submitted)
   * Reads all persisted booking_ratings for the pilot and writes the rolling
   * average to both the pilot's `users` doc (profileData.stats) and the
   * `pilots` collection doc (rating/averageRating).
   */
  private async updatePilotRating(pilotUid: string) {
    const db = this.firebaseAdminService.firestore();

    const ratingsSnapshot = await db
      .collection('booking_ratings')
      .where('pilotUid', '==', pilotUid)
      .get();

    if (ratingsSnapshot.empty) {
      return;
    }

    const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating as number);
    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / totalRatings;
    const roundedAvg = Math.round(averageRating * 100) / 100;
    const now = new Date().toISOString();

    // Update users doc stats (used by auto-assignment scoring)
    try {
      await db
        .collection(ROOT_COLLECTIONS.users)
        .doc(pilotUid)
        .update({
          'profileData.stats.averageRating': roundedAvg,
          'profileData.stats.totalRatings': totalRatings,
          'profileData.stats.updatedAt': now,
          updatedAt: now,
        });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to update user stats for pilot ${pilotUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    // Update pilots collection doc (used by admin/FM views)
    await db
      .collection(ROOT_COLLECTIONS.pilots)
      .doc(pilotUid)
      .set(
        {
          rating: roundedAvg,
          averageRating: roundedAvg,
          ratingStats: {
            averageRating: roundedAvg,
            totalRatings,
            updatedAt: now,
          },
          updatedAt: now,
        },
        { merge: true },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `Failed to update pilots doc for ${pilotUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ),
      );

    // The pilot's rating changed, so refresh their fleet manager's aggregate rating
    await this.refreshFleetManagersForPilot(pilotUid);

    this.logger.log(`Updated pilot ${pilotUid} rating: ${roundedAvg}/5 (${totalRatings} reviews`);
  }

  /**
   * Recompute the average rating for a fleet manager = average of the average
   * ratings of every pilot under that fleet manager.
   */
  private async updateFleetManagerRating(fleetManagerUid: string) {
    const db = this.firebaseAdminService.firestore();

    const pilotUids = await this.getPilotUidsForFleetManager(fleetManagerUid);
    if (pilotUids.length === 0) {
      return;
    }

    const pilotsWithRatings: number[] = [];

    for (const pilotUid of pilotUids) {
      const ratingSnapshot = await db
        .collection('booking_ratings')
        .where('pilotUid', '==', pilotUid)
        .get();

      if (ratingSnapshot.empty) {
        continue;
      }

      const ratings = ratingSnapshot.docs.map(doc => doc.data().rating as number);
      const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      pilotsWithRatings.push(Math.round(avg * 100) / 100);
    }

    const totalRatedPilots = pilotsWithRatings.length;
    const averageRating =
      totalRatedPilots > 0
        ? Math.round((pilotsWithRatings.reduce((sum, r) => sum + r, 0) / totalRatedPilots) * 100) / 100
        : 0;
    const now = new Date().toISOString();

    // Update FM users doc stats (used by fleet-manager matching)
    try {
      await db
        .collection(ROOT_COLLECTIONS.users)
        .doc(fleetManagerUid)
        .update({
          'profileData.stats.averageRating': averageRating,
          'profileData.stats.totalRatings': totalRatedPilots,
          'profileData.stats.updatedAt': now,
          updatedAt: now,
        });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to update user stats for fleet manager ${fleetManagerUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    // Update fleet_managers doc rating for consistency
    await db
      .collection('fleet_managers')
      .doc(fleetManagerUid)
      .set(
        {
          rating: averageRating,
          averageRating,
          totalRatings: totalRatedPilots,
          updatedAt: now,
        },
        { merge: true },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `Failed to update fleet_managers doc for ${fleetManagerUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ),
      );

    this.logger.log(
      `Updated fleet manager ${fleetManagerUid} rating: ${averageRating}/5 (${totalRatedPilots} rated pilots)`,
    );
  }

  /**
   * Resolve the set of pilot UIDs that belong to a fleet manager using the same
   * conventions used elsewhere: profileData.assignedFleetManagerUid (primary),
   * profileData.assignedVendorUid (fallback), and pilots/managedByFleetManagerUid.
   */
  private async getPilotUidsForFleetManager(fleetManagerUid: string): Promise<string[]> {
    const db = this.firebaseAdminService.firestore();
    const pilotUids = new Set<string>();

    try {
      const byFmSnapshot = await db
        .collection(ROOT_COLLECTIONS.users)
        .where('role', '==', 'pilot')
        .where('profileData.assignedFleetManagerUid', '==', fleetManagerUid)
        .get();
      byFmSnapshot.docs.forEach(doc => pilotUids.add(doc.id));
    } catch (err: unknown) {
      this.logger.warn(
        `Failed querying pilots by assignedFleetManagerUid for ${fleetManagerUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    try {
      const byVendorSnapshot = await db
        .collection(ROOT_COLLECTIONS.users)
        .where('role', '==', 'pilot')
        .where('profileData.assignedVendorUid', '==', fleetManagerUid)
        .get();
      byVendorSnapshot.docs.forEach(doc => pilotUids.add(doc.id));
    } catch (err: unknown) {
      this.logger.warn(
        `Failed querying pilots by assignedVendorUid for ${fleetManagerUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    try {
      const byManagedSnapshot = await db
        .collection(ROOT_COLLECTIONS.pilots)
        .where('managedByFleetManagerUid', '==', fleetManagerUid)
        .get();
      byManagedSnapshot.docs.forEach(doc => pilotUids.add(doc.id));
    } catch (err: unknown) {
      this.logger.warn(
        `Failed querying pilots collection by managedByFleetManagerUid for ${fleetManagerUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    return Array.from(pilotUids);
  }

  /**
   * After a pilot's rating changes, refresh the aggregate rating for every fleet
   * manager that the pilot is currently assigned to.
   */
  private async refreshFleetManagersForPilot(pilotUid: string) {
    const db = this.firebaseAdminService.firestore();

    try {
      const pilotDoc = await db.collection(ROOT_COLLECTIONS.users).doc(pilotUid).get();
      const profileData = pilotDoc.exists
        ? (pilotDoc.data() as any)?.profileData || {}
        : {};

      const fmUids = new Set<string>();
      if (profileData.assignedFleetManagerUid) {
        fmUids.add(profileData.assignedFleetManagerUid);
      }
      if (profileData.assignedVendorUid) {
        fmUids.add(profileData.assignedVendorUid);
      }

      for (const fmUid of fmUids) {
        await this.updateFleetManagerRating(fmUid);
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Failed refreshing fleet managers for pilot ${pilotUid}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }
}

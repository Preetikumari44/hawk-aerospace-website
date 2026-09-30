import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { Query } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import { CacheService } from '../../common/cache/cache.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { paginateFirestoreQuery } from '../../common/utils/firestore-cursor-pagination.util';
import type {
    FirestoreDelegatedBookingDocument,
    FirestoreUserDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { OtpService } from '../auth/services/otp.service';
import { BookingService } from '../booking/booking.service';
import { BookingFilterDto } from '../booking/dto/booking-filter.dto';
import { UsersService } from '../users/users.service';
import { MapsService } from '../maps/maps.service';
import { IncidentService } from '../incident/incident.service';
import { AddCustomerDto } from './dto/add-customer.dto';
import { AggregatorOnboardDto } from './dto/aggregator-onboard.dto';
import { DelegatedBookingDto } from './dto/delegated-booking.dto';
import type { 
  AggregatorCommissionSummary, 
  AggregatorDashboard,
  CommissionTier,
  PendingCommission,
  SettledCommission,
  NotificationSettings,
  Refund,
  AccountDeletionRequest,
} from './interfaces/aggregator.interface';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { VerifyCustomerOtpDto } from './dto/verify-customer-otp.dto';

/**
 * Commission tiers based on monthly booking count
 * As per implementation_plan.md Section 6.4
 */
const COMMISSION_TIERS: CommissionTier[] = [
  { minBookings: 501, maxBookings: Number.MAX_SAFE_INTEGER, rate: 0.15, name: 'Elite' },
  { minBookings: 201, maxBookings: 500, rate: 0.12, name: 'Premium' },
  { minBookings: 51, maxBookings: 200, rate: 0.10, name: 'Advanced' },
  { minBookings: 0, maxBookings: 50, rate: 0.08, name: 'Standard' },
];

interface PendingCustomerData {
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  language: string;
  initiatedBy?: string;
  initiatedAt?: string;
}

@Injectable()
export class AggregatorService {
  private readonly logger = new Logger(AggregatorService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly bookingService: BookingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
    private readonly mapsService: MapsService,
    private readonly incidentService: IncidentService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Get aggregator profile
   */
  async getProfile(user: CurrentUser): Promise<FirestoreUserDocument> {
    return this.usersService.getByUid(user.uid);
  }

  /**
   * Get aggregator onboarding status
   */
  async getOnboardingStatus(user: CurrentUser) {
    const profile = await this.usersService.getByUid(user.uid);
    return {
      status: profile.status,
      isVerified: profile.verification?.isVerified ?? false,
      adminApproval: profile.adminApproval,
    };
  }

  async onboardAggregator(
    dto: AggregatorOnboardDto,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const updated: FirestoreUserDocument = {
      ...existing,
      role: 'aggregator',
      status: 'pending',
      adminApproval: false,
      profileData: {
        ...existing.profileData,
        businessName: dto.businessName,
        regions: dto.regions ?? [],
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

  async addCustomer(dto: AddCustomerDto, user: CurrentUser) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Customer phone or email is required.');
    }

    // M-005 fix: Check for existing user by phone or email
    if (dto.phone) {
      const existingByPhone = await this.usersService.findByPhone(dto.phone);
      if (existingByPhone) {
        throw new BadRequestException(`A user with phone ${dto.phone} already exists.`);
      }
    }

    if (dto.email) {
      const existingByEmail = await this.usersService.findByEmail(dto.email);
      if (existingByEmail) {
        throw new BadRequestException(`A user with email ${dto.email} already exists.`);
      }
    }

    const customer = await this.persistCustomer(
      {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        language: dto.language,
      },
      user.uid,
    );

    return customer;
  }

  /**
   * Start the OTP verification flow for onboarding a new customer.
   * The customer details are staged in cache, an OTP is sent to the given
   * mobile number, and the customer record is only persisted once the OTP
   * has been verified via verifyCustomerOtp.
   */
  async initiateCustomerOtp(dto: AddCustomerDto, user: CurrentUser) {
    const phone = this.normalizePhone(dto.phone);
    if (!phone) {
      throw new BadRequestException('Customer mobile number is required.');
    }
    if (!dto.name || !String(dto.name).trim()) {
      throw new BadRequestException('Customer name is required.');
    }

    const existingUser = await this.usersService.findByPhone(phone);
    if (existingUser) {
      throw new BadRequestException(`A user with phone ${phone} already exists.`);
    }

    if (dto.email) {
      const existingByEmail = await this.usersService.findByEmail(dto.email);
      if (existingByEmail) {
        throw new BadRequestException(`A user with email ${dto.email} already exists.`);
      }
    }

    // Stage the customer details so they can be re-sent and validated.
    const pendingKey = this.getPendingCustomerKey(phone);
    const pendingData = {
      name: String(dto.name).trim(),
      phone,
      email: dto.email || null,
      address: dto.address || null,
      language: dto.language || 'en',
      initiatedBy: user.uid,
      initiatedAt: new Date().toISOString(),
    };
    await this.cacheService.set(pendingKey, JSON.stringify(pendingData), 10 * 60 * 1000);

    // Generate and store OTP
    const otpCode = this.otpService.generateOtp();
    await this.otpService.storeOtp(phone, otpCode);

    // In production this is delivered via SMS/notification service.
    this.logger.log(`[DEV] OTP for aggregator customer onboarding (${phone}): ${otpCode}`);

    return {
      success: true,
      message: `OTP sent to ${phone}`,
      phone,
      devOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    };
  }

  /**
   * Complete the OTP verification flow for onboarding a new customer.
   * Verifies the OTP sent to the customer's mobile number, then persists
   * the staged customer details linked to the aggregator.
   */
  async verifyCustomerOtp(dto: VerifyCustomerOtpDto, user: CurrentUser) {
    const phone = this.normalizePhone(dto.phone);
    if (!phone || !dto.otp) {
      throw new BadRequestException('Phone and OTP are required.');
    }

    const verification = await this.otpService.verifyOtp(phone, dto.otp);
    if (!verification.valid) {
      const message =
        verification.error === 'OTP_EXPIRED'
          ? 'OTP has expired. Please request a new code.'
          : verification.error === 'OTP_NOT_FOUND'
            ? 'No OTP found. Please request a new code.'
            : 'Invalid or expired OTP. Please try again.';
      throw new BadRequestException(message);
    }

    const pendingKey = this.getPendingCustomerKey(phone);
    const pendingRaw = await this.cacheService.get<string>(pendingKey);
    if (!pendingRaw) {
      throw new BadRequestException('No pending customer found. Please start again.');
    }

    const pendingData: PendingCustomerData =
      typeof pendingRaw === 'string'
        ? (JSON.parse(pendingRaw) as PendingCustomerData)
        : (pendingRaw as PendingCustomerData);

    if (pendingData.initiatedBy && pendingData.initiatedBy !== user.uid) {
      throw new BadRequestException('This customer was initiated by a different aggregator.');
    }

    const customer = await this.persistCustomer(
      {
        name: pendingData.name,
        phone: pendingData.phone,
        email: pendingData.email || undefined,
        address: pendingData.address || undefined,
        language: pendingData.language || 'en',
      },
      user.uid,
    );

    await this.cacheService.delete(pendingKey);

    return {
      success: true,
      message: 'Customer verified and added successfully.',
      customer,
      customerUid: customer.uid,
    };
  }

  /**
   * Persist a customer user linked to the given aggregator.
   */
  private async persistCustomer(
    data: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      language?: string;
    },
    aggregatorUid: string,
  ): Promise<FirestoreUserDocument> {
    const phone = data.phone ? this.normalizePhone(data.phone) : undefined;
    const customer = await this.usersService.createUser({
      name: data.name,
      role: 'customer',
      status: 'active',
      phone,
      email: data.email,
      language: data.language,
      adminApproval: true,
      isVerified: true,
    });

    const updated: FirestoreUserDocument = {
      ...customer,
      profileData: {
        ...customer.profileData,
        managedByAggregatorId: aggregatorUid,
        ...(data.address ? { address: data.address } : {}),
      },
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(customer.uid)
      .set(updated, { merge: true });

    return updated;
  }

  /**
   * Normalize an Indian phone number to E.164 (+91XXXXXXXXXX) so it stays
   * consistent with how the auth module stores phone numbers.
   */
  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    let digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) {
      digits = `91${digits}`;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = `91${digits.slice(1)}`;
    } else if (digits.length === 12 && digits.startsWith('91')) {
      // already E.164 without the plus sign
    }
    return `+${digits}`;
  }

  private getPendingCustomerKey(phone: string): string {
    return `aggregator:customer:pending:${phone}`;
  }

  /**
   * Update customer details
   */
  async updateCustomer(
    customerId: string,
    dto: Partial<AddCustomerDto>,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    // Verify the customer belongs to this aggregator
    const customer = await this.usersService.getByUid(customerId);
    
    if (customer.profileData?.managedByAggregatorId !== user.uid) {
      throw new BadRequestException('Customer does not belong to this aggregator');
    }

    // If updating phone or email, check for conflicts
    if (dto.phone && dto.phone !== customer.phone) {
      const existingByPhone = await this.usersService.findByPhone(dto.phone);
      if (existingByPhone && existingByPhone.uid !== customerId) {
        throw new BadRequestException(`A user with phone ${dto.phone} already exists.`);
      }
    }

    if (dto.email && dto.email !== customer.email) {
      const existingByEmail = await this.usersService.findByEmail(dto.email);
      if (existingByEmail && existingByEmail.uid !== customerId) {
        throw new BadRequestException(`A user with email ${dto.email} already exists.`);
      }
    }

    // Build updated document
    const updated: FirestoreUserDocument = {
      ...customer,
      ...(dto.name && { name: dto.name }),
      ...(dto.phone && { phone: dto.phone }),
      ...(dto.email && { email: dto.email }),
      profileData: {
        ...customer.profileData,
        ...(dto.language && { language: dto.language }),
      },
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(customerId)
      .set(updated, { merge: true });

    return updated;
  }

  async listCustomers(filter: PaginationDto, user: CurrentUser) {
    const query = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where(
        'profileData.managedByAggregatorId',
        '==',
        user.uid,
      ) as unknown as Query<FirestoreUserDocument>;

    return paginateFirestoreQuery(query, {
      limit: filter.limit,
      cursor: filter.cursor,
      orderBy: [{ field: 'uid', direction: 'asc' }],
      getCursorValues: (customer) => [customer.uid],
      includeTotal: true,
    });
  }

  async createDelegatedBooking(dto: DelegatedBookingDto, user: CurrentUser) {
    const booking = await this.bookingService.createBooking(dto, user);
    const customerUid = dto.customerUid ?? booking.customerUid;

    // Resolve the customer's display name for the delegated record.
    let customerName = customerUid;
    if (customerUid) {
      try {
        const customer = await this.usersService.getByUid(customerUid);
        if (customer?.name) {
          customerName = customer.name;
        }
      } catch (error) {
        this.logger.warn(`Unable to resolve customer name for ${customerUid}`);
      }
    }

    const delegated: FirestoreDelegatedBookingDocument = {
      bookingId: booking.id,
      aggregatorUid: user.uid,
      customerUid,
      customerName,
      location: booking.location,
      area: booking.area.value,
      cropType: booking.cropType,
      preferredDate: booking.scheduledDate,
      serviceType: booking.serviceType,
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .doc(booking.id)
      .set(delegated, { merge: true });

    this.eventEmitter.emit(WS_EVENTS.DELEGATED_BOOKING_STATUS, {
      bookingId: booking.id,
      aggregatorUid: user.uid,
      status: 'created',
      timestamp: delegated.createdAt,
    });

    return {
      booking,
      delegated,
    };
  }

  /**
   * Keep the delegated booking record in sync with the underlying booking's
   * lifecycle so commission and dashboard metrics (which rely on
   * delegated_bookings.status === 'completed') stay accurate.
   */
  @OnEvent(WS_EVENTS.BOOKING_STATUS_CHANGED, { async: true })
  @OnEvent(WS_EVENTS.BOOKING_CANCELLED, { async: true })
  async syncDelegatedBookingFromStatus(payload: { bookingId?: string; status?: string }) {
    await this.syncDelegatedBookingStatus(payload?.bookingId, payload?.status);
  }

  @OnEvent(WS_EVENTS.BOOKING_COMPLETED, { async: true })
  async markDelegatedBookingCompleted(payload: { bookingId?: string }) {
    await this.syncDelegatedBookingStatus(payload?.bookingId, 'completed');
  }

  @OnEvent(WS_EVENTS.BOOKING_CONFIRMED, { async: true })
  @OnEvent(WS_EVENTS.BOOKING_ADMIN_APPROVED, { async: true })
  async markDelegatedBookingConfirmed(payload: { bookingId?: string }) {
    await this.syncDelegatedBookingStatus(payload?.bookingId, 'confirmed');
  }

  private async syncDelegatedBookingStatus(bookingId?: string, status?: string) {
    if (!bookingId) return;
    try {
      const db = this.firebaseAdminService.firestore();
      const delegatedRef = db
        .collection(ROOT_COLLECTIONS.delegatedBookings)
        .doc(bookingId);
      const snapshot = await delegatedRef.get();
      if (!snapshot.exists) return;

      let delegatedStatus: FirestoreDelegatedBookingDocument['status'] =
        snapshot.data()?.status ?? 'created';

      if (status) {
        const normalized = String(status).toLowerCase();
        if (normalized === 'completed') {
          delegatedStatus = 'completed';
        } else if (normalized === 'cancelled') {
          delegatedStatus = 'cancelled';
        } else if (
          ['confirmed', 'scheduled', 'in_progress', 'pilot_assigned', 'assigned'].includes(normalized)
        ) {
          delegatedStatus = 'confirmed';
        } else if (normalized === 'pending') {
          delegatedStatus = 'pending_approval';
        }
      }

      if (delegatedStatus !== snapshot.data()?.status) {
        const aggregatorUid = snapshot.data()?.aggregatorUid;
        await delegatedRef.update({
          status: delegatedStatus,
          updatedAt: new Date().toISOString(),
        });
        this.logger.log(
          `Synced delegated booking ${bookingId} status -> ${delegatedStatus}`,
        );

        // Invalidate cached commission/dashboard so the aggregator sees fresh numbers.
        if (aggregatorUid) {
          await this.cacheService
            .delete(`aggregator:commission:${aggregatorUid}`)
            .catch(() => undefined);
          await this.cacheService
            .delete(`aggregator:dashboard:${aggregatorUid}`)
            .catch(() => undefined);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync delegated booking status for ${bookingId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  listBookings(filter: BookingFilterDto, user: CurrentUser) {
    return this.bookingService.listBookings(filter, user);
  }

  /**
   * Get booking detail
   */
  async getBookingDetail(bookingId: string, user: CurrentUser) {
    return this.bookingService.getBooking(bookingId, user);
  }

  /**
   * Update booking
   */
  async updateBooking(
    bookingId: string,
    dto: Partial<DelegatedBookingDto>,
    user: CurrentUser,
  ) {
    // Verify the booking belongs to this aggregator's customer
    const booking = await this.bookingService.getBooking(bookingId, user);
    
    // Update the booking (only pending bookings can be updated)
    return this.bookingService.updatePendingBooking(bookingId, dto as any, user);
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason: string | undefined, user: CurrentUser) {
    return this.bookingService.cancelBookingWithRefund(bookingId, reason, user);
  }

  /**
   * Calculate commission tier based on monthly booking count
   * Implements performance-based commission tiers from implementation_plan.md
   */
  private calculateCommissionTier(monthlyBookings: number): CommissionTier {
    for (const tier of COMMISSION_TIERS) {
      if (monthlyBookings >= tier.minBookings && monthlyBookings <= tier.maxBookings) {
        return tier;
      }
    }
    return COMMISSION_TIERS[COMMISSION_TIERS.length - 1]; // Default to lowest tier
  }

  /**
   * Get comprehensive commission summary for aggregator
   * Includes: gross revenue, commission earned, pending, settled, tier info
   */
  async getCommission(user: CurrentUser): Promise<AggregatorCommissionSummary> {
    const cacheKey = `aggregator:commission:${user.uid}`;
    const cached = await this.cacheService.get<AggregatorCommissionSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all bookings for this aggregator
    const db = this.firebaseAdminService.firestore();
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid)
      .get();

    const allBookings = bookingsSnapshot.docs.map((doc) => doc.data() as FirestoreDelegatedBookingDocument);
    const completedBookings = allBookings.filter((b) => b.status === 'completed');

    // Calculate monthly booking count for tier determination
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyBookings = allBookings.filter((b) => {
      if (!b.createdAt) return false;
      return new Date(b.createdAt) >= firstDayOfMonth;
    }).length;

    // Get current tier
    const tier = this.calculateCommissionTier(monthlyBookings);

    // Calculate revenues and commissions
    let grossRevenue = 0;
    let totalCommissionEarned = 0;
    let pendingCommission = 0;
    let settledCommission = 0;

    for (const booking of completedBookings) {
      // Get actual booking to fetch final price
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(booking.bookingId).get();
      
      if (bookingDoc.exists) {
        const bookingData = bookingDoc.data();
        const revenue = bookingData?.finalPrice ?? bookingData?.priceEstimation ?? 0;
        
        if (revenue > 0) {
          grossRevenue += revenue;
          const commission = Math.round(revenue * tier.rate * 100) / 100;
          totalCommissionEarned += commission;

          // Check if commission is settled
          // In real implementation, check settlements collection
          // For now, assume all are pending
          pendingCommission += commission;
        }
      }
    }

    const summary: AggregatorCommissionSummary = {
      aggregatorUid: user.uid,
      completedBookings: completedBookings.length,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      commissionRate: tier.rate,
      commissionEarned: Math.round(totalCommissionEarned * 100) / 100,
      pendingCommission: Math.round(pendingCommission * 100) / 100,
      settledCommission: Math.round(settledCommission * 100) / 100,
      currentTier: tier.name,
      monthlyBookings,
      nextTierBookings: this.getNextTierBookings(monthlyBookings),
    };

    // Cache for 2 minutes
    await this.cacheService.set(cacheKey, summary, 2 * 60 * 1000);

    return summary;
  }

  /**
   * Get commission dashboard with chart data for visualization
   * Returns aggregated data by period (daily, weekly, monthly)
   */
  async getCommissionDashboard(user: CurrentUser, period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const summary = await this.getCommission(user);
    
    // Get bookings for chart data
    const db = this.firebaseAdminService.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid)
      .where('status', '==', 'completed')
      .where('createdAt', '>=', thirtyDaysAgo.toISOString())
      .get();

    const bookings = bookingsSnapshot.docs.map((doc) => doc.data() as FirestoreDelegatedBookingDocument);

    // Calculate chart data by period
    const chartData = await this.calculateCommissionChartData(bookings, period, db);

    return {
      totalCommission: summary.commissionEarned,
      pendingCommission: summary.pendingCommission,
      settledCommission: summary.settledCommission,
      currentTier: summary.currentTier,
      commissionRate: summary.commissionRate,
      monthlyBookings: summary.monthlyBookings,
      nextTierBookings: summary.nextTierBookings,
      chartData,
      period,
    };
  }

  /**
   * Get pending commission details with breakdown
   */
  async getPendingCommission(user: CurrentUser): Promise<PendingCommission[]> {
    const db = this.firebaseAdminService.firestore();
    
    // Get all completed bookings without settlement
    const delegatedBookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid)
      .where('status', '==', 'completed')
      .get();

    const pendingCommissions: PendingCommission[] = [];
    const tier = this.calculateCommissionTier(delegatedBookingsSnapshot.size);

    for (const doc of delegatedBookingsSnapshot.docs) {
      const delegatedBooking = doc.data() as FirestoreDelegatedBookingDocument;
      
      // Get actual booking
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(delegatedBooking.bookingId).get();
      
      if (bookingDoc.exists) {
        const booking = bookingDoc.data();
        const revenue = booking?.finalPrice ?? booking?.priceEstimation ?? 0;
        
        if (revenue > 0) {
          const commission = Math.round(revenue * tier.rate * 100) / 100;
          
          pendingCommissions.push({
            bookingId: delegatedBooking.bookingId,
            customerName: delegatedBooking.customerName,
            serviceType: delegatedBooking.serviceType,
            completedAt: booking?.updatedAt ?? delegatedBooking.updatedAt,
            bookingAmount: revenue,
            commissionRate: tier.rate,
            commissionAmount: commission,
            status: 'pending',
          });
        }
      }
    }

    return pendingCommissions;
  }

  /**
   * Get settlement history
   */
  async getCommissionHistory(user: CurrentUser, pagination: PaginationDto): Promise<{
    items: SettledCommission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const db = this.firebaseAdminService.firestore();
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;

    const snapshot = await db
      .collection(ROOT_COLLECTIONS.settlements)
      .where('recipientId', '==', user.uid)
      .where('recipientRole', '==', 'aggregator')
      .get();

    const items = snapshot.docs
      .map((doc) => doc.data() as SettledCommission)
      .sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? ''));

    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      total: items.length,
      page,
      limit,
    };
  }

  /**
   * Get aggregator dashboard with comprehensive stats
   */
  async getDashboard(user: CurrentUser): Promise<AggregatorDashboard> {
    const cacheKey = `aggregator:dashboard:${user.uid}`;
    const cached = await this.cacheService.get<AggregatorDashboard>(cacheKey);
    if (cached) {
      return cached;
    }

    const db = this.firebaseAdminService.firestore();
    const now = new Date();

    // Get date ranges
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get all bookings
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid)
      .get();

    const allBookings = bookingsSnapshot.docs.map((doc) => doc.data() as FirestoreDelegatedBookingDocument);

    // Calculate stats
    const todayBookings = allBookings.filter((b) => b.createdAt && b.createdAt >= todayStart);
    const weekBookings = allBookings.filter((b) => b.createdAt && b.createdAt >= weekStart);
    const monthBookings = allBookings.filter((b) => b.createdAt && b.createdAt >= monthStart);

    // Get customers count
    const customersSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('profileData.managedByAggregatorId', '==', user.uid)
      .get();

    // Get commission summary
    const commissionSummary = await this.getCommission(user);

    // Get recent bookings
    const recentBookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentBookings = recentBookingsSnapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreDelegatedBookingDocument;
      const createdAt = data.createdAt ?? new Date().toISOString();
      return {
        bookingId: data.bookingId,
        customerName: data.customerName,
        serviceType: data.serviceType as string,
        status: data.status as string,
        area: data.area,
        cropType: data.cropType,
        createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
      };
    });

    const dashboard: AggregatorDashboard = {
      todayBookings: todayBookings.length,
      weekBookings: weekBookings.length,
      monthBookings: monthBookings.length,
      totalBookings: allBookings.length,
      totalCustomers: customersSnapshot.size,
      totalEarnings: commissionSummary.commissionEarned,
      pendingEarnings: commissionSummary.pendingCommission,
      currentTier: commissionSummary.currentTier,
      commissionRate: commissionSummary.commissionRate,
      recentBookings,
      serviceBreakdown: this.calculateServiceBreakdown(allBookings),
    };

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, dashboard, 60 * 1000);

    return dashboard;
  }

  /**
   * Get analytics for aggregator
   */
  async getAnalytics(user: CurrentUser, filter: BookingFilterDto) {
    const db = this.firebaseAdminService.firestore();
    
    let query = db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid);

    // Apply date filters if provided
    if (filter.dateFrom) {
      query = query.where('createdAt', '>=', filter.dateFrom) as any;
    }
    if (filter.dateTo) {
      query = query.where('createdAt', '<=', filter.dateTo) as any;
    }

    const snapshot = await query.get();
    const bookings = snapshot.docs.map((doc) => doc.data() as FirestoreDelegatedBookingDocument);

    // Calculate trends
    const bookingTrends = this.calculateBookingTrends(bookings);
    const serviceBreakdown = this.calculateServiceBreakdown(bookings);
    const customerGrowth = this.calculateCustomerGrowth(bookings);

    return {
      bookingTrends,
      serviceBreakdown,
      customerGrowth,
      totalRevenue: await this.calculateTotalRevenue(bookings, db),
      averageBookingValue: await this.calculateAverageBookingValue(bookings, db),
    };
  }

  /**
   * Get customer details with booking history
   */
  async getCustomerDetail(user: CurrentUser, customerId: string) {
    // Verify customer belongs to this aggregator
    const customer = await this.usersService.getByUid(customerId);
    
    if (customer.profileData?.managedByAggregatorId !== user.uid) {
      throw new BadRequestException('Customer does not belong to this aggregator');
    }

    // Get customer's booking history
    const db = this.firebaseAdminService.firestore();
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid)
      .where('customerUid', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();

    const bookings = bookingsSnapshot.docs.map((doc) => doc.data());

    return {
      customer,
      bookingHistory: bookings,
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b) => b.status === 'completed').length,
    };
  }

  /**
   * Update payout method
   */
  async updatePayoutMethod(user: CurrentUser, payoutData: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    upiId?: string;
  }) {
    const userDoc = await this.usersService.getByUid(user.uid);
    
    const updated: FirestoreUserDocument = {
      ...userDoc,
      profileData: {
        ...userDoc.profileData,
        payoutMethod: payoutData,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    return { message: 'Payout method updated successfully', payoutMethod: payoutData };
  }

  // Helper methods

  private getNextTierBookings(currentMonthlyBookings: number): number | null {
    // Find current tier
    const currentTier = this.calculateCommissionTier(currentMonthlyBookings);
    
    // Find the next tier (reverse array since it's sorted highest to lowest)
    const reversedTiers = [...COMMISSION_TIERS].reverse();
    const currentIndex = reversedTiers.findIndex(t => t.name === currentTier.name);
    
    if (currentIndex === -1 || currentIndex === reversedTiers.length - 1) {
      return null; // Already at highest tier
    }
    
    return reversedTiers[currentIndex + 1].minBookings;
  }

  private calculateServiceBreakdown(bookings: FirestoreDelegatedBookingDocument[]) {
    const breakdown: Record<string, number> = {};
    
    for (const booking of bookings) {
      const service = booking.serviceType || 'unknown';
      breakdown[service] = (breakdown[service] || 0) + 1;
    }

    return Object.entries(breakdown).map(([serviceType, count]) => ({
      serviceType,
      count,
      percentage: Math.round((count / bookings.length) * 100),
    }));
  }

  private calculateBookingTrends(bookings: FirestoreDelegatedBookingDocument[]) {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trends: Record<string, number> = {};

    for (const booking of bookings) {
      if (!booking.createdAt) continue;
      const date = new Date(booking.createdAt);
      if (date >= last30Days) {
        const dateKey = date.toISOString().split('T')[0];
        trends[dateKey] = (trends[dateKey] || 0) + 1;
      }
    }

    return Object.entries(trends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  private calculateCustomerGrowth(bookings: FirestoreDelegatedBookingDocument[]) {
    const uniqueCustomers = new Set<string>();
    const growth: Record<string, number> = {};

    const sortedBookings = [...bookings]
      .filter((b) => b.createdAt)
      .sort((a, b) => {
        const dateA = typeof a.createdAt === 'string' ? a.createdAt : new Date(a.createdAt!).toISOString();
        const dateB = typeof b.createdAt === 'string' ? b.createdAt : new Date(b.createdAt!).toISOString();
        return dateA.localeCompare(dateB);
      });

    for (const booking of sortedBookings) {
      if (!booking.createdAt) continue;
      const createdAtStr = typeof booking.createdAt === 'string' 
        ? booking.createdAt 
        : new Date(booking.createdAt).toISOString();
      const monthKey = createdAtStr.substring(0, 7); // YYYY-MM
      uniqueCustomers.add(booking.customerName);
      growth[monthKey] = uniqueCustomers.size;
    }

    return Object.entries(growth).map(([month, count]) => ({ month, count }));
  }

  private async calculateTotalRevenue(bookings: FirestoreDelegatedBookingDocument[], db: any): Promise<number> {
    let totalRevenue = 0;

    for (const booking of bookings.filter((b) => b.status === 'completed')) {
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(booking.bookingId).get();
      if (bookingDoc.exists) {
        const bookingData = bookingDoc.data();
        totalRevenue += bookingData?.finalPrice ?? bookingData?.priceEstimation ?? 0;
      }
    }

    return Math.round(totalRevenue * 100) / 100;
  }

  private async calculateAverageBookingValue(bookings: FirestoreDelegatedBookingDocument[], db: any): Promise<number> {
    const completedBookings = bookings.filter((b) => b.status === 'completed');
    if (completedBookings.length === 0) return 0;

    const totalRevenue = await this.calculateTotalRevenue(completedBookings, db);
    return Math.round((totalRevenue / completedBookings.length) * 100) / 100;
  }

  /**
   * Get notifications for aggregator
   * Fetches from user's notifications subcollection
   */
  async getNotifications(user: CurrentUser, page: number = 1, limit: number = 20) {
    const db = this.firebaseAdminService.firestore();
    
    const offset = (page - 1) * limit;
    
    const notificationsSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const totalSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .collection('notifications')
      .count()
      .get();

    const notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      items: notifications,
      total: totalSnapshot.data().count,
      page,
      limit,
      hasMore: totalSnapshot.data().count > page * limit,
    };
  }

  /**
   * Get notification settings for aggregator
   */
  async getNotificationSettings(user: CurrentUser): Promise<NotificationSettings> {
    const userDoc = await this.usersService.getByUid(user.uid);
    
    const settings = userDoc.profileData?.notificationSettings as any;
    
    // Return defaults if not set
    return {
      pushNotifications: settings?.pushNotifications ?? true,
      smsNotifications: settings?.smsNotifications ?? true,
      emailNotifications: settings?.emailNotifications ?? true,
      bookingUpdates: settings?.bookingUpdates ?? true,
      commissionUpdates: settings?.commissionUpdates ?? true,
      customerUpdates: settings?.customerUpdates ?? true,
      settlementAlerts: settings?.settlementAlerts ?? true,
      marketingPromotions: settings?.marketingPromotions ?? false,
    };
  }

  /**
   * Update notification settings for aggregator
   */
  async updateNotificationSettings(
    dto: UpdateNotificationSettingsDto,
    user: CurrentUser,
  ): Promise<{ message: string; settings: NotificationSettings }> {
    const existing = await this.usersService.getByUid(user.uid);
    
    const currentSettings = (existing.profileData?.notificationSettings as any) || {};
    
    const updatedSettings: NotificationSettings = {
      pushNotifications: dto.pushNotifications ?? currentSettings.pushNotifications ?? true,
      smsNotifications: dto.smsNotifications ?? currentSettings.smsNotifications ?? true,
      emailNotifications: dto.emailNotifications ?? currentSettings.emailNotifications ?? true,
      bookingUpdates: dto.bookingUpdates ?? currentSettings.bookingUpdates ?? true,
      commissionUpdates: dto.commissionUpdates ?? currentSettings.commissionUpdates ?? true,
      customerUpdates: dto.customerUpdates ?? currentSettings.customerUpdates ?? true,
      settlementAlerts: dto.settlementAlerts ?? currentSettings.settlementAlerts ?? true,
      marketingPromotions: dto.marketingPromotions ?? currentSettings.marketingPromotions ?? false,
    };

    const updated: FirestoreUserDocument = {
      ...existing,
      profileData: {
        ...existing.profileData,
        notificationSettings: updatedSettings,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    // Invalidate cache
    await this.cacheService.delete(`aggregator:profile:${user.uid}`);

    this.logger.log(`Aggregator notification settings updated: ${user.uid}`);

    return {
      message: 'Notification settings updated successfully',
      settings: updatedSettings,
    };
  }

  /**
   * Get refunds for aggregator
   * Refunds impact commission calculations when customers request refunds
   */
  async getRefunds(user: CurrentUser, pagination: PaginationDto): Promise<{
    items: Refund[];
    total: number;
    page: number;
    limit: number;
  }> {
    const db = this.firebaseAdminService.firestore();
    
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const offset = (page - 1) * limit;

    // Query refunds collection for this aggregator's bookings
    const refundsSnapshot = await db
      .collection('refunds')
      .where('aggregatorUid', '==', user.uid)
      .orderBy('requestedAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const totalSnapshot = await db
      .collection('refunds')
      .where('aggregatorUid', '==', user.uid)
      .count()
      .get();

    const refunds: Refund[] = refundsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        refundId: doc.id,
        bookingId: data.bookingId,
        customerName: data.customerName || 'Unknown',
        serviceType: data.serviceType || 'Unknown',
        refundAmount: data.refundAmount || 0,
        commissionDeduction: data.commissionDeduction || 0,
        reason: data.reason || 'No reason provided',
        status: data.status || 'pending',
        requestedAt: data.requestedAt || new Date().toISOString(),
        processedAt: data.processedAt,
      };
    });

    return {
      items: refunds,
      total: totalSnapshot.data().count,
      page,
      limit,
    };
  }

  /**
   * Request account deletion
   * Creates a deletion request that needs admin approval
   */
  async requestAccountDeletion(
    dto: DeleteAccountDto,
    user: CurrentUser,
  ): Promise<AccountDeletionRequest> {
    const db = this.firebaseAdminService.firestore();
    
    // Check if there's already a pending request
    const existingSnapshot = await db
      .collection('account_deletion_requests')
      .where('aggregatorUid', '==', user.uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      throw new BadRequestException('You already have a pending account deletion request');
    }

    // Check for pending commissions
    const pendingCommissions = await this.getPendingCommission(user);
    if (pendingCommissions.length > 0) {
      const totalPending = pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      throw new BadRequestException(
        `Cannot delete account with pending commissions. Total pending: ₹${totalPending}. Please wait for settlement.`
      );
    }

    const now = new Date().toISOString();
    const scheduledDeletion = new Date();
    scheduledDeletion.setDate(scheduledDeletion.getDate() + 30); // 30 days grace period

    const deletionRequest: AccountDeletionRequest = {
      requestId: '',
      aggregatorUid: user.uid,
      reason: dto.reason,
      feedback: dto.feedback,
      status: 'pending',
      requestedAt: now,
      scheduledDeletionDate: scheduledDeletion.toISOString(),
    };

    const docRef = await db
      .collection('account_deletion_requests')
      .add(deletionRequest);

    deletionRequest.requestId = docRef.id;

    // Update user status to pending_deletion
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .update({
        status: 'pending_deletion',
        updatedAt: now,
      });

    // Emit event for admin notification
    this.eventEmitter.emit(WS_EVENTS.ACCOUNT_DELETION_REQUESTED, {
      aggregatorUid: user.uid,
      requestId: docRef.id,
      timestamp: now,
    });

    this.logger.log(`Account deletion requested by aggregator: ${user.uid}`);

    return deletionRequest;
  }

  /**
   * Switch the user's active role. Only non-privileged, self-service roles are
   * allowed — admin/super_admin/etc. can never be granted via this endpoint.
   */
  async switchRole(user: CurrentUser, role: string): Promise<{ role: string }> {
    const SWITCHABLE_ROLES = ['customer', 'aggregator', 'pilot', 'technician', 'vendor'];
    if (!SWITCHABLE_ROLES.includes(role)) {
      throw new BadRequestException(`Role '${role}' cannot be switched to.`);
    }

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set({ role, updatedAt: new Date().toISOString() }, { merge: true });

    this.logger.log(`User ${user.uid} switched active role to ${role}`);
    return { role };
  }

  /**
   * Check flying restrictions for a location
   * Integrates with MapsService for airspace compliance
   */
  async checkFlyingRestrictions(latitude: number, longitude: number, serviceType?: string) {
    return this.mapsService.checkFlyingRestrictions(latitude, longitude, serviceType);
  }

  /**
   * Check weather conditions for a location
   * Integrates with MapsService for weather data
   */
  async checkWeatherConditions(latitude: number, longitude: number, targetDate?: string) {
    return this.mapsService.checkWeatherConditions(latitude, longitude, targetDate);
  }

  /**
   * Get complaints/incidents for aggregator
   * Integrates with IncidentService
   */
  async getComplaints(user: CurrentUser) {
    // Get incidents reported by this aggregator or their managed customers
    const incidents = await this.incidentService.list({
      page: 1,
      limit: 50,
    });

    // Filter incidents related to this aggregator's bookings
    const db = this.firebaseAdminService.firestore();
    const delegatedBookings = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', user.uid)
      .get();

    const bookingIds = new Set(delegatedBookings.docs.map((doc) => doc.data().bookingId));

    return {
      items: incidents.items.filter((incident: any) => 
        incident.reportedBy === user.uid || 
        (incident.bookingId && bookingIds.has(incident.bookingId))
      ),
      total: incidents.meta.total,
    };
  }

  /**
   * Create a complaint/incident
   * Integrates with IncidentService
   */
  async createComplaint(user: CurrentUser, dto: any) {
    const incident = await this.incidentService.create(dto, user);
    return {
      message: 'Complaint created successfully',
      incident,
    };
  }

  /**
   * Get complaint/incident detail
   * Integrates with IncidentService
   */
  async getComplaintDetail(user: CurrentUser, complaintId: string) {
    return this.incidentService.get(complaintId, user);
  }

  /**
   * Calculate commission chart data for visualization
   */
  private async calculateCommissionChartData(
    bookings: FirestoreDelegatedBookingDocument[],
    period: 'daily' | 'weekly' | 'monthly',
    db: any,
  ) {
    const chartData: Array<{ date: string; commission: number; bookings: number }> = [];
    const groupedData: Record<string, { commission: number; bookings: number }> = {};

    const tier = this.calculateCommissionTier(bookings.length);

    for (const booking of bookings) {
      if (!booking.createdAt) continue;

      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(booking.bookingId).get();
      if (!bookingDoc.exists) continue;

      const bookingData = bookingDoc.data();
      const revenue = bookingData?.finalPrice ?? bookingData?.priceEstimation ?? 0;
      if (revenue <= 0) continue;

      const commission = Math.round(revenue * tier.rate * 100) / 100;
      const date = new Date(booking.createdAt);

      let key: string;
      if (period === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = date.toISOString().substring(0, 7); // YYYY-MM
      }

      if (!groupedData[key]) {
        groupedData[key] = { commission: 0, bookings: 0 };
      }

      groupedData[key].commission += commission;
      groupedData[key].bookings += 1;
    }

    // Convert to array and sort
    for (const [date, data] of Object.entries(groupedData)) {
      chartData.push({
        date,
        commission: Math.round(data.commission * 100) / 100,
        bookings: data.bookings,
      });
    }

    return chartData.sort((a, b) => a.date.localeCompare(b.date));
  }
}

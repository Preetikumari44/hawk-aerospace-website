import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference, Query } from 'firebase-admin/firestore';

import {
  ROOT_COLLECTIONS,
} from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { collectFirestoreQueryInBatches } from '../../common/utils/firestore-cursor-pagination.util';
import type {
  FirestoreBookingDocument,
  FirestorePaymentDocument,
  FirestoreRevenueSnapshotDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { CacheService } from '../../common/cache/cache.service';
import { RevenueFilterDto } from './dto/revenue-filter.dto';

const PLATFORM_COMMISSION_RATE = 0.1;
const AGGREGATOR_COMMISSION_RATE = 0.05;

interface AnalyticsBooking extends FirestoreBookingDocument {
  state?: string | null;
  addressState?: string | null;
  // Support alternate field names from existing data
  bookingId?: string;
  bookingStatus?: string;
  price?: number | { total?: number; basePrice?: number } | null;
  farmId?: string;
}

interface RevenueRecord {
  booking: AnalyticsBooking;
  payment: FirestorePaymentDocument | null;
  amount: number;
  revenueDate: string;
  state: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalBookings: number;
  paidBookings: number;
  avgRevenuePerBooking: number;
  totalCommission: number;
  byCrop: Record<string, number>;
  byState: Record<string, number>;
  byService: Record<string, number>;
  byFleetManager: Record<string, number>;
}

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async getDashboard(filter: RevenueFilterDto, user: CurrentUser) {
    this.assertRevenueAccess(user);
    
    // TEMPORARILY DISABLED CACHING FOR DEBUGGING
    // const cacheKey = `revenue-dashboard:${JSON.stringify(filter)}:${user.uid}:${user.role}`;
    // const cached = await this.cacheService.get<any>(cacheKey);
    // if (cached) {
    //   this.logger.log(`Cache hit for revenue dashboard: ${cacheKey}`);
    //   return cached;
    // }
    
    this.logger.log(`Getting filtered records with filter: ${JSON.stringify(filter)}`);
    const records = await this.getFilteredRecords(filter, user);
    this.logger.log(`Found ${records.length} filtered records`);
    
    const previousRecords = await this.getPreviousPeriodRecords(filter, user);
    const summary = this.summarize(records);
    const previousSummary = this.summarize(previousRecords);

    const result = {
      generatedAt: new Date().toISOString(),
      ...summary,
      growthPercent: this.calculateGrowth(summary.totalRevenue, previousSummary.totalRevenue),
      previousRevenue: previousSummary.totalRevenue,
    };
    
    // CACHING DISABLED
    // await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }

  async getTodaySnapshot(): Promise<FirestoreRevenueSnapshotDocument> {
    const today = new Date().toISOString().slice(0, 10);
    const records = await this.getFilteredRecords(
      { page: 1, limit: 100, dateFrom: `${today}T00:00:00.000Z`, dateTo: `${today}T23:59:59.999Z` },
      { uid: 'system', role: 'admin', status: 'active' },
    );
    const summary = this.summarize(records);
    const now = new Date().toISOString();
    const snapshot: FirestoreRevenueSnapshotDocument = {
      id: `daily:${today}`,
      period: 'daily',
      periodDate: today,
      totalRevenue: summary.totalRevenue,
      totalBookings: summary.totalBookings,
      avgRevenuePerBooking: summary.avgRevenuePerBooking,
      totalCommission: summary.totalCommission,
      byCrop: summary.byCrop,
      byState: summary.byState,
      byFleetManager: summary.byFleetManager,
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.revenueSnapshotsCollection().doc(snapshot.id).set(snapshot, { merge: true });
    this.eventEmitter.emit(WS_EVENTS.REVENUE_SNAPSHOT, {
      totalRevenue: snapshot.totalRevenue,
      totalBookings: snapshot.totalBookings,
      todayRevenue: snapshot.totalRevenue,
      todayBookings: snapshot.totalBookings,
      timestamp: now,
    });
    return snapshot;
  }

  async getSummary(filter: RevenueFilterDto, user: CurrentUser) {
    this.assertRevenueAccess(user);
    
    // CACHING DISABLED FOR DEBUGGING
    // const cacheKey = `revenue-summary:${JSON.stringify(filter)}:${user.uid}`;
    // const cached = await this.cacheService.get<RevenueSummary>(cacheKey);
    // if (cached) {
    //   this.logger.log(`Cache hit for revenue summary: ${cacheKey}`);
    //   return cached;
    // }
    
    const result = this.summarize(await this.getFilteredRecords(filter, user));
    
    // CACHING DISABLED
    // await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }

  async getBookingsByState(filter: RevenueFilterDto, user: CurrentUser) {
    const cacheKey = `revenue-chart-state:${JSON.stringify(filter)}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for bookings by state chart`);
      return cached;
    }
    
    const records = await this.getFilteredRecords(filter, user);
    const result = this.toChart(
      'Bookings by state',
      this.countRecords(records, (item) => item.state),
    );
    
    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  async getBookingsByService(filter: RevenueFilterDto, user: CurrentUser) {
    const cacheKey = `revenue-chart-service:${JSON.stringify(filter)}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for bookings by service chart`);
      return cached;
    }
    
    const records = await this.getFilteredRecords(filter, user);
    const result = this.toChart(
      'Bookings by service',
      this.countRecords(records, (item) => item.booking.serviceType),
    );
    
    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  async getBookingsByCrop(filter: RevenueFilterDto, user: CurrentUser) {
    const cacheKey = `revenue-chart-crop:${JSON.stringify(filter)}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for bookings by crop chart`);
      return cached;
    }
    
    const records = await this.getFilteredRecords(filter, user);
    const result = this.toChart(
      'Revenue by crop',
      this.sumRecords(records, (item) => item.booking.cropType),
    );
    
    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  async getTrend(filter: RevenueFilterDto, user: CurrentUser) {
    const period = filter.period ?? 'daily';
    const cacheKey = `revenue-chart-trend:${JSON.stringify(filter)}:${period}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for revenue trend chart`);
      return cached;
    }
    
    const records = await this.getFilteredRecords(filter, user);
    const result = this.toChart(
      'Revenue trend',
      this.sumRecords(records, (item) => this.bucketDate(item.revenueDate, period)),
    );
    
    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  async getVendorPerformance(filter: RevenueFilterDto, user: CurrentUser) {
    const cacheKey = `revenue-vendor-performance:${JSON.stringify(filter)}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for vendor performance`);
      return cached;
    }
    
    const records = await this.getFilteredRecords(filter, user);
    const grouped = records.reduce<
      Record<string, { fleetManagerUid: string; revenue: number; bookings: number; completed: number }>
    >((vendors, record) => {
      const fleetManagerUid = record.booking.fleetManagerUid ?? 'unassigned';
      vendors[fleetManagerUid] ??= { fleetManagerUid, revenue: 0, bookings: 0, completed: 0 };
      vendors[fleetManagerUid].revenue += record.amount;
      vendors[fleetManagerUid].bookings += 1;
      if (record.booking.status === 'completed') {
        vendors[fleetManagerUid].completed += 1;
      }
      return vendors;
    }, {});

    const result = Object.values(grouped).sort((left, right) => right.revenue - left.revenue);
    
    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  async getVendorRevenue(filter: RevenueFilterDto, user: CurrentUser) {
    const cacheKey = `revenue-vendor:${JSON.stringify(filter)}:${user.uid}`;
    const cached = await this.cacheService.get<RevenueSummary>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for vendor revenue`);
      return cached;
    }
    
    const records = await this.getFilteredRecords({ ...filter, fleetManagerUid: user.uid }, user);
    const result = this.summarize(records);
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }

  async getVendorCommission(filter: RevenueFilterDto, user: CurrentUser) {
    const cacheKey = `revenue-vendor-commission:${JSON.stringify(filter)}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for vendor commission`);
      return cached;
    }
    
    const summary = await this.getVendorRevenue(filter, user);
    const platformCommission = this.roundCurrency(summary.totalRevenue * PLATFORM_COMMISSION_RATE);
    const result = {
      grossRevenue: summary.totalRevenue,
      platformCommission,
      netPayout: this.roundCurrency(summary.totalRevenue - platformCommission),
      paidBookings: summary.paidBookings,
    };
    
    // Cache for 15 minutes
    await this.cacheService.set(cacheKey, result, 15 * 60 * 1000);
    
    return result;
  }

  async getAggregatorCommission(filter: RevenueFilterDto, user: CurrentUser) {
    const cacheKey = `revenue-aggregator-commission:${JSON.stringify(filter)}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for aggregator commission`);
      return cached;
    }
    
    const records = await this.getFilteredRecords({ ...filter, aggregatorUid: user.uid }, user);
    const summary = this.summarize(records);
    const earnedCommission = this.roundCurrency(summary.totalRevenue * AGGREGATOR_COMMISSION_RATE);

    const result = {
      aggregatorUid: user.uid,
      grossRevenue: summary.totalRevenue,
      commissionRate: AGGREGATOR_COMMISSION_RATE,
      earnedCommission,
      pendingCommission: 0,
      paidBookings: summary.paidBookings,
    };
    
    // Cache for 15 minutes
    await this.cacheService.set(cacheKey, result, 15 * 60 * 1000);
    
    return result;
  }

  async getDebugStats(user: CurrentUser) {
    this.assertRevenueAccess(user);
    const [bookings, payments] = await Promise.all([this.getBookings(), this.getPayments()]);
    
    const paidPayments = payments.filter((p) => p.status === 'paid');
    const bookingsWithPaidStatus = bookings.filter((b) => b.paymentStatus === 'paid');
    const bookingsWithPrice = bookings.filter((b) => (b.finalPrice ?? b.priceEstimation ?? 0) > 0);
    
    return {
      totalBookings: bookings.length,
      totalPayments: payments.length,
      paidPayments: paidPayments.length,
      bookingsWithPaidStatus: bookingsWithPaidStatus.length,
      bookingsWithPrice: bookingsWithPrice.length,
      sampleBookings: bookings.slice(0, 3).map((b) => ({
        id: b.id,
        paymentStatus: b.paymentStatus,
        finalPrice: b.finalPrice,
        priceEstimation: b.priceEstimation,
        status: b.status,
      })),
      samplePayments: payments.slice(0, 3).map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        status: p.status,
        amount: p.amount,
      })),
    };
  }

  async getDebugSampleRecords(filter: RevenueFilterDto, user: CurrentUser) {
    this.assertRevenueAccess(user);
    const records = await this.getFilteredRecords(filter, user);
    
    return {
      totalRecords: records.length,
      sampleRecords: records.slice(0, 5).map((r) => ({
        bookingId: r.booking.id,
        amount: r.amount,
        state: r.state,
        cropType: r.booking.cropType,
        serviceType: r.booking.serviceType,
        paymentStatus: r.booking.paymentStatus,
      })),
      amountTypes: records.slice(0, 10).map((r) => ({
        amount: r.amount,
        type: typeof r.amount,
        isNaN: isNaN(r.amount as any),
      })),
    };
  }

  async exportCsv(filter: RevenueFilterDto, user: CurrentUser) {
    const records = await this.getFilteredRecords(filter, user);
    const rows = [
      [
        'booking_id',
        'date',
        'state',
        'crop',
        'service',
        'fleet_manager_uid',
        'aggregator_uid',
        'amount',
      ].join(','),
      ...records.map((record) =>
        [
          record.booking.id,
          record.revenueDate,
          this.csvCell(record.state),
          this.csvCell(record.booking.cropType),
          record.booking.serviceType,
          record.booking.fleetManagerUid ?? '',
          record.booking.aggregatorUid ?? '',
          record.amount,
        ].join(','),
      ),
    ];

    return {
      filename: `revenue-${new Date().toISOString().slice(0, 10)}.csv`,
      mimeType: 'text/csv',
      content: rows.join('\n'),
    };
  }

  async exportPdf(filter: RevenueFilterDto, user: CurrentUser) {
    const summary = await this.getSummary(filter, user);
    const lines = [
      'Hawk Aerosystem Revenue Report',
      `Generated: ${new Date().toISOString()}`,
      `Total revenue: ${summary.totalRevenue}`,
      `Paid bookings: ${summary.paidBookings}`,
      `Average revenue per booking: ${summary.avgRevenuePerBooking}`,
      `Platform commission: ${summary.totalCommission}`,
    ];

    return {
      filename: `revenue-${new Date().toISOString().slice(0, 10)}.pdf`,
      mimeType: 'application/pdf',
      contentBase64: this.buildSimplePdf(lines).toString('base64'),
    };
  }

  private async getPreviousPeriodRecords(filter: RevenueFilterDto, user: CurrentUser) {
    const { dateFrom, dateTo } = this.resolveDateWindow(filter);
    const duration = dateTo.getTime() - dateFrom.getTime();
    const previousTo = new Date(dateFrom.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration);

    return this.getFilteredRecords(
      {
        ...filter,
        dateFrom: previousFrom.toISOString(),
        dateTo: previousTo.toISOString(),
      },
      user,
    );
  }

  private async getFilteredRecords(
    filter: RevenueFilterDto,
    user: CurrentUser,
  ): Promise<RevenueRecord[]> {
    this.assertRevenueAccess(user);
    
    this.logger.log(`getFilteredRecords called with filter: ${JSON.stringify(filter)}`);
    
    const [bookings, payments] = await Promise.all([this.getBookings(), this.getPayments()]);
    
    this.logger.log(`Retrieved ${bookings.length} bookings and ${payments.length} payments`);
    
    const paidPaymentsByBooking = payments
      .filter((payment) => {
        const status = payment.status as string;
        return status === 'paid' || status === 'SUCCESS';
      })
      .reduce<Record<string, FirestorePaymentDocument>>((index, payment) => {
        index[payment.bookingId] = payment;
        return index;
      }, {});

    this.logger.log(`Indexed ${Object.keys(paidPaymentsByBooking).length} paid payments`);

    const allRecords = bookings
      .map<RevenueRecord>((booking) => {
        // Normalize booking ID (support both 'id' and 'bookingId')
        const bookingId = booking.id || booking.bookingId || '';
        
        // Normalize payment status (support both lowercase and uppercase)
        const paymentStatus = booking.paymentStatus as string | undefined;
        const normalizedPaymentStatus = (paymentStatus || '').toLowerCase();
        const isPaid = normalizedPaymentStatus === 'paid' || paymentStatus === 'PAID';
        
        // Extract price - handle multiple formats
        let bookingPrice: number | undefined;
        
        // Format 1: price as number
        if (typeof booking.price === 'number') {
          bookingPrice = booking.price;
        } 
        // Format 2: price as object with total
        else if (booking.price && typeof booking.price === 'object' && 'total' in booking.price) {
          const total = booking.price.total;
          if (typeof total === 'number' && !isNaN(total)) {
            bookingPrice = total;
          }
        }
        // Format 3: Use finalPrice or priceEstimation directly
        else if (isPaid) {
          const price = booking.finalPrice ?? booking.priceEstimation;
          if (typeof price === 'number') {
            bookingPrice = price;
          }
        }
        
        const payment = paidPaymentsByBooking[bookingId] ?? null;
        let amount =
          payment?.amount ??
          bookingPrice ??
          (isPaid ? (booking.finalPrice ?? booking.priceEstimation ?? 0) : 0);
        
        // Ensure amount is a valid number
        if (typeof amount !== 'number' || isNaN(amount)) {
          amount = 0;
        }
          
        return {
          booking: { ...booking, id: bookingId },
          payment,
          amount,
          revenueDate: this.resolveRevenueDate(booking, payment),
          state: this.resolveBookingState(booking),
        };
      });
    
    this.logger.log(`Created ${allRecords.length} revenue records`);
    const recordsWithAmount = allRecords.filter(r => r.amount > 0).length;
    this.logger.log(`Records with amount > 0: ${recordsWithAmount}`);
    
    const filteredRecords = allRecords.filter((record) => this.recordMatchesFilter(record, filter, user));
    this.logger.log(`After filtering: ${filteredRecords.length} records`);
    
    return filteredRecords;
  }

  private recordMatchesFilter(
    record: RevenueRecord,
    filter: RevenueFilterDto,
    user: CurrentUser,
  ): boolean {
    if (record.amount <= 0) {
      return false;
    }

    if (user.role === 'fleet_manager' && record.booking.fleetManagerUid !== user.uid) {
      return false;
    }

    if (user.role === 'aggregator' && record.booking.aggregatorUid !== user.uid) {
      return false;
    }

    if (filter.fleetManagerUid && record.booking.fleetManagerUid !== filter.fleetManagerUid) {
      return false;
    }

    if (filter.aggregatorUid && record.booking.aggregatorUid !== filter.aggregatorUid) {
      return false;
    }

    if (filter.cropType && record.booking.cropType !== filter.cropType) {
      return false;
    }

    if (filter.serviceType && record.booking.serviceType !== filter.serviceType) {
      return false;
    }

    if (filter.state && record.state.toLowerCase() !== filter.state.toLowerCase()) {
      return false;
    }

    if (filter.dateFrom && record.revenueDate < filter.dateFrom) {
      return false;
    }

    if (filter.dateTo && record.revenueDate > filter.dateTo) {
      return false;
    }

    return true;
  }

  private summarize(records: RevenueRecord[]): RevenueSummary {
    const totalRevenue = this.roundCurrency(
      records.reduce((sum, record) => sum + record.amount, 0),
    );
    const paidBookings = records.length;

    return {
      totalRevenue,
      totalBookings: records.length,
      paidBookings,
      avgRevenuePerBooking:
        paidBookings === 0 ? 0 : this.roundCurrency(totalRevenue / paidBookings),
      totalCommission: this.roundCurrency(totalRevenue * PLATFORM_COMMISSION_RATE),
      byCrop: this.sumRecords(records, (item) => (item.booking.cropType ?? 'unknown').toLowerCase()),
      byState: this.sumRecords(records, (item) => (item.state ?? 'unknown').toLowerCase()),
      byService: this.sumRecords(records, (item) => (item.booking.serviceType ?? 'unknown').toLowerCase()),
      byFleetManager: this.sumRecords(records, (item) => item.booking.fleetManagerUid ?? 'unassigned'),
    };
  }

  private async getBookings(): Promise<AnalyticsBooking[]> {
    this.logger.log('Fetching all bookings via collectionGroup (direct query)...');
    this.logger.log(`Bookings collection: ${ROOT_COLLECTIONS.bookings}`);
    
    const firestoreInstance = this.firebaseAdminService.firestore();
    
    // Direct query without batching - simpler approach
    const snapshot = await firestoreInstance
      .collection(ROOT_COLLECTIONS.bookings)
      .get();
    
    this.logger.log(`Fetched ${snapshot.docs.length} total bookings`);
    this.logger.log(`Snapshot size: ${snapshot.size}, empty: ${snapshot.empty}`);
    
    return snapshot.docs.map(doc => doc.data() as AnalyticsBooking);
  }

  private async getPayments(): Promise<FirestorePaymentDocument[]> {
    return collectFirestoreQueryInBatches<FirestorePaymentDocument>(
      this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.payments) as unknown as Query<FirestorePaymentDocument>,
      {
        orderBy: [{ field: 'id', direction: 'asc' }],
        getCursorValues: (payment) => [payment.id],
      },
    );
  }

  private assertRevenueAccess(user: CurrentUser): void {
    if (user.role === 'subadmin' && user.permissions?.view_revenue !== true) {
      throw new ForbiddenException('Sub-admin does not have revenue access.');
    }
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Math.round(((current - previous) / previous) * 10_000) / 100;
  }

  private resolveDateWindow(filter: RevenueFilterDto): { dateFrom: Date; dateTo: Date } {
    const dateTo = filter.dateTo ? new Date(filter.dateTo) : new Date();
    const dateFrom = filter.dateFrom
      ? new Date(filter.dateFrom)
      : new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { dateFrom, dateTo };
  }

  private resolveRevenueDate(
    booking: FirestoreBookingDocument,
    payment: FirestorePaymentDocument | null,
  ): string {
    return String(
      payment?.confirmedAt ??
        payment?.updatedAt ??
        payment?.createdAt ??
        booking.updatedAt ??
        booking.scheduledDate,
    );
  }

  private resolveBookingState(booking: AnalyticsBooking): string {
    // Try direct state fields first
    if (booking.state) return booking.state;
    if (booking.addressState) return booking.addressState;
    
    // Try extracting from address
    const stateFromAddress = this.extractStateFromAddress(booking.address);
    if (stateFromAddress !== 'unknown') return stateFromAddress;
    
    // For bookings without address, return 'unknown'
    // (In future, could lookup state from farmId or location)
    return 'unknown';
  }

  private extractStateFromAddress(address: string | undefined | null): string {
    if (!address || typeof address !== 'string') {
      return 'unknown';
    }
    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 2].toLowerCase() : 'unknown';
  }

  private bucketDate(dateValue: string, period: 'daily' | 'weekly' | 'monthly'): string {
    const date = new Date(dateValue);
    if (period === 'monthly') {
      return date.toISOString().slice(0, 7);
    }

    if (period === 'weekly') {
      const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const dayOffset = Math.floor((date.getTime() - firstDay.getTime()) / 86_400_000);
      const week = Math.ceil((dayOffset + firstDay.getUTCDay() + 1) / 7);
      return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    return date.toISOString().slice(0, 10);
  }

  private countRecords(
    records: RevenueRecord[],
    selector: (record: RevenueRecord) => string,
  ): Record<string, number> {
    return records.reduce<Record<string, number>>((totals, record) => {
      const key = selector(record);
      totals[key] = (totals[key] ?? 0) + 1;
      return totals;
    }, {});
  }

  private sumRecords(
    records: RevenueRecord[],
    selector: (record: RevenueRecord) => string,
  ): Record<string, number> {
    return records.reduce<Record<string, number>>((totals, record) => {
      const key = selector(record);
      totals[key] = this.roundCurrency((totals[key] ?? 0) + record.amount);
      return totals;
    }, {});
  }

  private toChart(label: string, dataByLabel: Record<string, number>) {
    const labels = Object.keys(dataByLabel).sort();
    return {
      labels,
      datasets: [
        {
          label,
          data: labels.map((item) => dataByLabel[item]),
        },
      ],
    };
  }

  private roundCurrency(value: number): number {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }

  private csvCell(value: string): string {
    if (!/[",\n]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  private buildSimplePdf(lines: string[]): Buffer {
    const escapedLines = lines.map((line, index) => {
      const y = 760 - index * 24;
      return `BT /F1 12 Tf 72 ${y} Td (${this.escapePdfText(line)}) Tj ET`;
    });
    const stream = escapedLines.join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
    ];
    let offset = '%PDF-1.4\n'.length;
    const xref = ['0000000000 65535 f '];
    const body = objects
      .map((object) => {
        xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
        offset += object.length + 1;
        return object;
      })
      .join('\n');
    const xrefOffset = offset;
    const pdf = `%PDF-1.4\n${body}\nxref\n0 ${xref.length}\n${xref.join(
      '\n',
    )}\ntrailer << /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf);
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private revenueSnapshotsCollection(): CollectionReference<FirestoreRevenueSnapshotDocument> {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.revenueSnapshots) as CollectionReference<FirestoreRevenueSnapshotDocument>;
  }
}


import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { CacheService } from '../../common/cache/cache.service';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { AirspaceService } from '../flight-conditions/airspace.service';
import { WeatherService } from '../flight-conditions/weather.service';
import { FarmService } from '../farm/farm.service';
import { CouponService } from '../coupon/coupon.service';
import { RazorpayService } from '../payment/razorpay.service';
import { PricingService } from '../pricing/pricing.service';
import { BookingService } from './booking.service';
import { BookingExpiryListener } from './listeners/booking-expiry.listener';
import { BookingHistoryService } from './history/booking-history.service';
import { BookingEventsService } from './services/booking-events.service';

const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const isoDaysAhead = (days: number): string =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

describe('Booking expiry taxonomy (static)', () => {
  const base = {
    id: 'b1',
    status: 'confirmed',
    adminApprovalStatus: 'approved',
    paymentStatus: 'paid',
    finalPrice: 1000,
  };

  it('returns null for terminal bookings', () => {
    expect(
      BookingService.getExpiryReason({ ...base, status: 'cancelled', scheduledDate: isoDaysAgo(2) }),
    ).toBeNull();
    expect(
      BookingService.getExpiryReason({ ...base, status: 'completed', scheduledDate: isoDaysAgo(2) }),
    ).toBeNull();
  });

  it('returns null when the service day has not fully passed', () => {
    expect(BookingService.getExpiryReason({ ...base, scheduledDate: new Date().toISOString() })).toBeNull();
    expect(BookingService.getExpiryReason({ ...base, scheduledDate: isoDaysAhead(2) })).toBeNull();
  });

  it('returns null when no service date can be resolved', () => {
    expect(BookingService.getExpiryReason({ ...base })).toBeNull();
    expect(BookingService.getExpiryReason({ ...base, scheduledDate: 'not-a-date' })).toBeNull();
  });

  it('expires unapproved bookings past the service date (case 1)', () => {
    const reason = BookingService.getExpiryReason({
      ...base,
      status: 'pending',
      adminApprovalStatus: 'pending',
      scheduledDate: isoDaysAgo(2),
    });
    expect(reason).toMatch(/without admin approval/);
  });

  it('expires approved-but-never-completed bookings (case 2)', () => {
    const reason = BookingService.getExpiryReason({
      ...base,
      fleetManagerUid: 'fm1',
      assignedPilot: 'p1',
      assignedDrone: 'd1',
      scheduledDate: isoDaysAgo(2),
    });
    expect(reason).toMatch(/was not completed/);
  });

  it('expires bookings with missing FM/pilot/drone assignment (case 3)', () => {
    const reason = BookingService.getExpiryReason({ ...base, scheduledDate: isoDaysAgo(2) });
    expect(reason).toMatch(/not assigned/);
  });

  it('expires assigned-but-never-started bookings (case 4/6)', () => {
    const reason = BookingService.getExpiryReason({
      ...base,
      status: 'pilot_assigned',
      assignedPilot: 'p1',
      fleetManagerUid: 'fm1',
      assignedDrone: 'd1',
      scheduledDate: isoDaysAgo(2),
    });
    expect(reason).toMatch(/did not start/);
  });

  it('expires started-but-never-completed bookings (case 5)', () => {
    const reason = BookingService.getExpiryReason({
      ...base,
      status: 'in_progress',
      actualStartTime: isoDaysAgo(2),
      assignedPilot: 'p1',
      fleetManagerUid: 'fm1',
      assignedDrone: 'd1',
      scheduledDate: isoDaysAgo(2),
    });
    expect(reason).toMatch(/not completed by end of day/);
  });

  it('resolves the service date from fallback fields', () => {
    expect(BookingService.resolveExpiryServiceDate({ date: isoDaysAgo(1) })).toBeInstanceOf(Date);
    expect(BookingService.resolveExpiryServiceDate({ preferredDate: isoDaysAgo(1) })).toBeInstanceOf(Date);
    expect(BookingService.resolveExpiryServiceDate({})).toBeNull();
  });

  it('computes start-of-today on the IST wall clock', () => {
    const start = BookingService.startOfTodayIST(new Date());
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    // IST midnight of "today" is always within the last 24h
    expect(Date.now() - start.getTime()).toBeGreaterThanOrEqual(0);
    expect(Date.now() - start.getTime()).toBeLessThan(24 * 60 * 60 * 1000);
  });
});

describe('BookingService.autoCancelExpiredBooking', () => {
  let service: BookingService;
  let activeMockBooking: any = null;

  const refundSets: any[] = [];
  const bookingSets: any[] = [];

  const mockBookingDoc = {
    set: jest.fn().mockImplementation(async (data: any) => {
      bookingSets.push(data);
    }),
    update: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation(async () => ({ exists: true, data: () => activeMockBooking })),
  };

  const mockRefundDoc = {
    set: jest.fn().mockImplementation(async (data: any) => {
      refundSets.push(data);
    }),
  };

  const mockCollection = {
    doc: jest.fn((id: string) => (id === 'refund-doc' ? mockRefundDoc : mockBookingDoc)),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  };

  const mockFirestore = {
    collection: jest.fn().mockImplementation((path: string) => {
      if (path === 'booking_refunds') {
        return { doc: jest.fn().mockReturnValue(mockRefundDoc) };
      }
      return mockCollection;
    }),
    collectionGroup: jest.fn().mockReturnValue(mockCollection),
    runTransaction: jest.fn().mockImplementation(async (callback: any) =>
      callback({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => activeMockBooking }),
        set: jest.fn().mockResolvedValue(undefined),
      }),
    ),
  };

  const logCancellation = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    activeMockBooking = null;
    refundSets.length = 0;
    bookingSets.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: FirebaseAdminService, useValue: { firestore: () => mockFirestore } },
        { provide: PricingService, useValue: {} },
        { provide: BookingHistoryService, useValue: { recordHistory: jest.fn().mockResolvedValue(undefined) } },
        { provide: CacheService, useValue: { delete: jest.fn(), deletePattern: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: WeatherService, useValue: {} },
        { provide: AirspaceService, useValue: {} },
        { provide: FarmService, useValue: {} },
        {
          provide: BookingEventsService,
          useValue: {
            logCancellation,
            logStatusChange: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: CouponService, useValue: {} },
        { provide: RazorpayService, useValue: {} },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    jest.clearAllMocks();
  });

  const pastApprovedBooking = () => {
    activeMockBooking = {
      id: 'booking123',
      customerUid: 'customer123',
      status: 'confirmed',
      adminApprovalStatus: 'approved',
      paymentStatus: 'paid',
      finalPrice: 1200,
      scheduledDate: isoDaysAgo(2),
      missionId: 'booking123',
    };
  };

  it('is a no-op for already terminal bookings and creates no refund', async () => {
    activeMockBooking = { id: 'b1', status: 'cancelled', scheduledDate: isoDaysAgo(2) };
    const result = await service.autoCancelExpiredBooking('b1', 'reason');
    expect(result.status).toBe('cancelled');
    expect(result.refund.amount).toBe(0);
    expect(refundSets.length).toBe(0);
  });

  it('cancels an expired booking with a FULL (100%) refund doc', async () => {
    pastApprovedBooking();
    const result = await service.autoCancelExpiredBooking('booking123', 'Auto-cancelled: test');

    expect(result.status).toBe('cancelled');
    expect(result.cancelledBy).toBe('system');
    expect(result.refund.amount).toBe(1200);
    expect(result.refund.percentage).toBe(100);
    expect(refundSets.length).toBe(1);
    expect(refundSets[0]).toMatchObject({
      bookingId: 'booking123',
      refundAmount: 1200,
      refundPercentage: 100,
      status: 'pending',
      requestedBy: 'system',
    });
    expect(logCancellation).toHaveBeenCalledWith(
      'booking123',
      'Auto-cancelled: test',
      'system',
      'system',
      expect.anything(),
    );
  });

  it('closes legacy pilot_assigned bookings without transition validation errors', async () => {
    activeMockBooking = {
      id: 'booking123',
      customerUid: 'customer123',
      status: 'pilot_assigned',
      adminApprovalStatus: 'approved',
      paymentStatus: 'paid',
      finalPrice: 500,
      assignedPilot: 'pilot1',
      fleetManagerUid: 'fm1',
      assignedDrone: 'drone1',
      scheduledDate: isoDaysAgo(3),
      missionId: 'booking123',
    };
    const result = await service.autoCancelExpiredBooking('booking123', 'reason');
    expect(result.status).toBe('cancelled');
    expect(result.refund.percentage).toBe(100);
  });

  it('findExpiredBookings returns only bookings past end-of-day IST', async () => {
    const docs = [
      { id: 'past', data: () => ({ status: 'confirmed', adminApprovalStatus: 'approved', scheduledDate: isoDaysAgo(2) }) },
      { id: 'future', data: () => ({ status: 'confirmed', adminApprovalStatus: 'approved', scheduledDate: isoDaysAhead(2) }) },
      { id: 'dateless', data: () => ({ status: 'confirmed', adminApprovalStatus: 'approved' }) },
    ];
    mockCollection.get.mockResolvedValueOnce({ docs, empty: false });
    const expired = await service.findExpiredBookings();
    expect(expired.map((e) => e.id)).toEqual(['past']);
    expect(expired[0].reason).toMatch(/Auto-cancelled/);
  });

  it('autoCancelExpiredBookings collects per-item failures without aborting', async () => {
    const spy = jest
      .spyOn(service, 'autoCancelExpiredBooking')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ refund: { amount: 10, percentage: 100, reason: 'r' } } as any);
    jest.spyOn(service, 'findExpiredBookings').mockResolvedValue([
      { id: 'a', reason: 'r1' },
      { id: 'b', reason: 'r2' },
    ]);
    const result = await service.autoCancelExpiredBookings();
    expect(result.checked).toBe(2);
    expect(result.cancelled.map((c) => c.id)).toEqual(['b']);
    expect(result.failed.map((f) => f.id)).toEqual(['a']);
    spy.mockRestore();
  });
});

describe('BookingExpiryListener', () => {
  it('skips the sweep when disabled or in test env', async () => {
    const bookingService = { autoCancelExpiredBookings: jest.fn() };
    const configService = { get: jest.fn((key: string, fallback: any) => fallback) };

    const disabled = new BookingExpiryListener(
      bookingService as any,
      { get: () => false } as any,
    );
    await disabled.sweepExpiredBookings();
    expect(bookingService.autoCancelExpiredBookings).not.toHaveBeenCalled();

    const testEnv = new BookingExpiryListener(bookingService as any, {
      get: (key: string) => (key === 'NODE_ENV' ? 'test' : true),
    } as any);
    await testEnv.sweepExpiredBookings();
    expect(bookingService.autoCancelExpiredBookings).not.toHaveBeenCalled();

    const enabled = new BookingExpiryListener(
      bookingService as any,
      configService as any,
    );
    (bookingService.autoCancelExpiredBookings as jest.Mock).mockResolvedValue({
      checked: 1,
      cancelled: [],
      failed: [],
    });
    await enabled.sweepExpiredBookings();
    expect(bookingService.autoCancelExpiredBookings).toHaveBeenCalledTimes(1);
  });
});

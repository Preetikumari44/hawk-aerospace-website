import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import type { CacheService } from '../../common/cache/cache.service';
import type { RevenueSnapshotPayload } from '../../gateway/events/event.interfaces';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { RevenueService } from './revenue.service';

describe('RevenueService', () => {
  const mockSnapshotSet = jest.fn().mockResolvedValue(undefined);
  const mockSnapshotDoc = {
    id: 'daily:2026-06-24',
    set: mockSnapshotSet,
  };
  const mockSnapshotCollection = {
    doc: jest.fn().mockReturnValue(mockSnapshotDoc),
  };

  const mockFirebaseService = {
    firestore: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined),
  };

  let service: RevenueService;

  beforeEach(() => {
    service = new RevenueService(
      mockFirebaseService as unknown as FirebaseAdminService,
      mockEventEmitter as unknown as EventEmitter2,
      mockCacheService as unknown as CacheService,
    );

    const serviceHarness = service as unknown as {
      getFilteredRecords: jest.Mock;
      revenueSnapshotsCollection: jest.Mock;
    };

    serviceHarness.getFilteredRecords = jest.fn().mockResolvedValue([
      {
        booking: {
          id: 'booking123',
          cropType: 'wheat',
          serviceType: 'spraying',
          vendorId: 'vendor123',
          aggregatorId: null,
          status: 'completed',
          paymentStatus: 'paid',
          priceEstimation: 100,
          finalPrice: 125,
          updatedAt: '2026-06-24T09:00:00.000Z',
          scheduledDate: '2026-06-24T08:00:00.000Z',
          address: 'Test, Punjab',
        },
        payment: null,
        amount: 125,
        revenueDate: '2026-06-24T09:00:00.000Z',
        state: 'punjab',
      },
    ]);

    serviceHarness.revenueSnapshotsCollection = jest.fn().mockReturnValue(mockSnapshotCollection);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('emits a revenue snapshot event after persisting today snapshot', async () => {
    const snapshot = await service.getTodaySnapshot();

    expect(snapshot.id).toContain('daily:');
    expect(mockSnapshotSet).toHaveBeenCalledWith(snapshot, { merge: true });

    const [, payload] = mockEventEmitter.emit.mock.calls[0] as [
      string,
      RevenueSnapshotPayload,
    ];

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(WS_EVENTS.REVENUE_SNAPSHOT, payload);
    expect(payload).toMatchObject({
      totalRevenue: 125,
      totalBookings: 1,
      todayRevenue: 125,
      todayBookings: 1,
    });
    expect(typeof payload.timestamp).toBe('string');
  });
});

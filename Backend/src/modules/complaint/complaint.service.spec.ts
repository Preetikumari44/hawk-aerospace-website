import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ComplaintService } from './complaint.service';
import { ComplaintSlaService } from './services/complaint-sla.service';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { NotificationService } from '../notification/notification.service';
import {
  ComplaintType,
  ComplaintRelatedEntityType,
  ComplaintPriority,
  ComplaintStatus,
  CreateComplaintDto,
} from './dto/complaint.dto';

describe('ComplaintService', () => {
  let service: ComplaintService;
  let firebaseAdminService: jest.Mocked<FirebaseAdminService>;
  let notificationService: jest.Mocked<NotificationService>;
  let complaintSlaService: jest.Mocked<ComplaintSlaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser = {
    uid: 'user123',
    role: 'customer',
    email: 'user@test.com',
  };

  const mockFirestoreDoc = {
    id: 'complaint123',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockFirestoreCollection),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintService,
        {
          provide: FirebaseAdminService,
          useValue: {
            firestore: jest.fn().mockReturnValue(mockFirestore),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            dispatch: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ComplaintSlaService,
          useValue: {
            calculateSlaDeadline: jest.fn().mockReturnValue('2026-07-08T00:00:00Z'),
            isSlaBreached: jest.fn().mockReturnValue(false),
            calculateAverageResolutionTime: jest.fn().mockReturnValue(12.5),
            getComplaintsNearingBreach: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ComplaintService>(ComplaintService);
    firebaseAdminService = module.get(FirebaseAdminService) as jest.Mocked<FirebaseAdminService>;
    notificationService = module.get(NotificationService) as jest.Mocked<NotificationService>;
    complaintSlaService = module.get(ComplaintSlaService) as jest.Mocked<ComplaintSlaService>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new complaint successfully', async () => {
      const dto: CreateComplaintDto = {
        type: ComplaintType.SERVICE_QUALITY,
        description: 'Service was delayed by 2 hours',
        relatedEntityType: ComplaintRelatedEntityType.BOOKING,
        relatedEntityId: 'booking123',
        priority: ComplaintPriority.HIGH,
      };

      const result = await service.create(dto, mockUser as any);

      expect(result).toMatchObject({
        complaintId: 'complaint123',
        userId: 'user123',
        userRole: 'customer',
        type: ComplaintType.SERVICE_QUALITY,
        status: ComplaintStatus.OPEN,
        priority: ComplaintPriority.HIGH,
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('complaint.created', expect.any(Object));
      expect(notificationService.dispatch).toHaveBeenCalled();
    });

    it('should auto-assign MEDIUM priority if not provided', async () => {
      const dto: CreateComplaintDto = {
        type: ComplaintType.PAYMENT,
        description: 'Payment not received',
        relatedEntityType: ComplaintRelatedEntityType.GENERAL,
      };

      const result = await service.create(dto, mockUser as any);

      expect(result.priority).toBe(ComplaintPriority.MEDIUM);
    });
  });

  describe('getMyComplaints', () => {
    it('should retrieve user complaints with filters', async () => {
      const mockComplaints = [
        {
          complaintId: 'complaint1',
          userId: 'user123',
          status: ComplaintStatus.OPEN,
          createdAt: '2026-07-01T00:00:00Z',
          slaDeadline: '2026-07-08T00:00:00Z',
        },
      ];

      mockFirestoreCollection.get.mockResolvedValueOnce({
        docs: mockComplaints.map((c) => ({ data: () => c })),
      });

      const result = await service.getMyComplaints(mockUser as any, { status: ComplaintStatus.OPEN, page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('userId', '==', 'user123');
    });
  });

  describe('updateStatus', () => {
    it('should allow admin to update complaint status', async () => {
      const adminUser = { uid: 'admin1', role: 'admin', email: 'admin@test.com' };
      
      mockFirestoreDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          complaintId: 'complaint123',
          userId: 'user123',
          status: ComplaintStatus.OPEN,
        }),
      });

      await service.updateStatus(
        'complaint123',
        { status: ComplaintStatus.RESOLVED, resolution: 'Issue resolved' },
        adminUser as any,
      );

      expect(mockFirestoreDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ComplaintStatus.RESOLVED,
          resolution: 'Issue resolved',
          resolvedAt: expect.any(String),
        }),
      );
    });

    it('should throw error if non-admin tries to update status', async () => {
      await expect(
        service.updateStatus(
          'complaint123',
          { status: ComplaintStatus.RESOLVED },
          mockUser as any,
        ),
      ).rejects.toThrow('Only admins can update complaint status');
    });
  });

  describe('getComplaintStats', () => {
    it('should calculate complaint statistics correctly', async () => {
      const mockComplaints = [
        {
          status: ComplaintStatus.OPEN,
          priority: ComplaintPriority.HIGH,
          slaDeadline: '2026-07-10T00:00:00Z',
        },
        {
          status: ComplaintStatus.RESOLVED,
          priority: ComplaintPriority.LOW,
          slaDeadline: '2026-07-05T00:00:00Z',
          resolvedAt: '2026-07-04T00:00:00Z',
          createdAt: '2026-07-01T00:00:00Z',
        },
      ];

      mockFirestoreCollection.get.mockResolvedValueOnce({
        docs: mockComplaints.map((c) => ({ data: () => c })),
      });

      const stats = await service.getComplaintStats(mockUser as any);

      expect(stats.total).toBe(2);
      expect(stats.byStatus.open).toBe(1);
      expect(stats.byStatus.resolved).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });
});

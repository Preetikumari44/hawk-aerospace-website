import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreNotificationDocument, FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { NotificationService } from './notification.service';
import { FcmProvider } from './providers/fcm.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { SendGridProvider } from './providers/sendgrid.provider';

describe('NotificationService - Unit Tests', () => {
  let service: NotificationService;

  const mockFirestoreDoc = {
    id: 'notification123',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockFirestoreCollection),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue(mockFirestore),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: FcmProvider,
          useValue: { send: jest.fn() },
        },
        {
          provide: WhatsAppCloudProvider,
          useValue: { send: jest.fn() },
        },
        {
          provide: SendGridProvider,
          useValue: { send: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    // Setup collection chain
    mockFirestore.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(mockFirestoreCollection),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            uid: 'user123',
            fcmTokens: ['token123'],
            phone: '+1234567890',
            email: 'user@test.com',
            notificationSettings: { push: true, sms: true, email: true },
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should list notifications for user', async () => {
      const user: CurrentUser = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
      };

      const mockNotifications: FirestoreNotificationDocument[] = [
        {
          id: 'notif1',
          uid: 'user123',
          messages: [
            { message: 'Booking confirmed', timestamp: '2024-01-01T00:00:00.000Z', read: false },
          ],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockFirestoreCollection.get.mockResolvedValue({
        docs: mockNotifications.map((notif) => ({ data: () => notif })),
      });

      const result = await service.list(user);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'notif1',
        uid: 'user123',
      });
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      const user: CurrentUser = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
      };

      const mockNotification: FirestoreNotificationDocument = {
        id: 'notif1',
        uid: 'user123',
        messages: [
          { message: 'Booking confirmed', timestamp: '2024-01-01T00:00:00.000Z', read: false },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockNotification,
      });

      const result = await service.markRead('notif1', user);

      expect(result.messages[0].read).toBe(true);
      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException when notification not found', async () => {
      const user: CurrentUser = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      await expect(service.markRead('invalid-id', user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete notification', async () => {
      const user: CurrentUser = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
      };

      const result = await service.remove('notif1', user);

      expect(result).toEqual({ deleted: true });
      expect(mockFirestoreDoc.delete).toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('should broadcast to specific user IDs', async () => {
      const dto = {
        title: 'System Update',
        message: 'Scheduled maintenance tonight',
        userIds: ['user1', 'user2', 'user3'],
      };

      await service.broadcast(dto);

      expect(mockFirestoreDoc.set).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WS_EVENTS.NOTIFICATION_NEW,
        expect.objectContaining({
          uid: expect.any(String),
          title: 'System Update',
          message: 'Scheduled maintenance tonight',
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WS_EVENTS.NOTIFICATION_BROADCAST,
        expect.objectContaining({
          title: 'System Update',
          message: 'Scheduled maintenance tonight',
        }),
      );
    });

    it('should broadcast to all users with specific role', async () => {
      const dto = {
        title: 'Pilot Update',
        message: 'New mission guidelines',
        role: 'pilot' as const,
      };

      const mockUsers: FirestoreUserDocument[] = [
        {
          uid: 'pilot1',
          role: 'pilot',
          status: 'active',
          name: 'Pilot One',
          email: 'pilot1@test.com',
          phone: null,
          authProvider: 'email',
          profileData: { name: 'Pilot One' },
          verification: { isVerified: true, documents: [] },
          adminApproval: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastLogin: null,
        },
        {
          uid: 'pilot2',
          role: 'pilot',
          status: 'active',
          name: 'Pilot Two',
          email: 'pilot2@test.com',
          phone: null,
          authProvider: 'email',
          profileData: { name: 'Pilot Two' },
          verification: { isVerified: true, documents: [] },
          adminApproval: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastLogin: null,
        },
      ];

      const mockNotificationDoc = {
        id: 'notif123',
        set: jest.fn().mockResolvedValue(undefined),
      };

      const mockNotificationCollection = {
        doc: jest.fn().mockReturnValue(mockNotificationDoc),
      };

      const mockUsersCollection = {
        where: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue(mockNotificationCollection),
        }),
        get: jest.fn().mockResolvedValue({
          docs: mockUsers.map((user) => ({ id: user.uid, data: () => user })),
        }),
      };

      mockFirestore.collection.mockReturnValue(mockUsersCollection);

      const result = await service.broadcast(dto);

      expect(result[0].sent).toBe(2);
      expect(mockUsersCollection.where).toHaveBeenCalledWith('role', '==', 'pilot');
    });

    it('should return zero when no role and no userIds provided (M-007)', async () => {
      const dto = {
        title: 'Test',
        message: 'Test message',
      };

      const result = await service.broadcast(dto);

      expect(result).toHaveLength(0);
      expect(mockFirestoreDoc.set).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should return zero when role filter returns empty results (M-007)', async () => {
      const dto = {
        title: 'Test',
        message: 'Test message',
        role: 'pilot' as const,
      };

      const mockUsersCollection = {
        where: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({ set: jest.fn() }),
          }),
        }),
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
      };

      mockFirestore.collection.mockReturnValue(mockUsersCollection);

      const result = await service.broadcast(dto);

      expect(result).toHaveLength(0);
      expect(mockFirestoreDoc.set).not.toHaveBeenCalled();
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { BookingService } from '../booking/booking.service';
import { UsersService } from '../users/users.service';
import { CacheService } from '../../common/cache/cache.service';
import { AggregatorService } from './aggregator.service';

import { MapsService } from '../maps/maps.service';
import { IncidentService } from '../incident/incident.service';
import { OtpService } from '../auth/services/otp.service';

describe('AggregatorService - Unit Tests', () => {
  let service: AggregatorService;

  const mockFirestoreDoc = {
    id: 'doc123',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
  };

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    count: jest.fn(),
    get: jest.fn(),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockFirestoreCollection),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue(mockFirestore),
  };

  const mockUsersService = {
    getByUid: jest.fn(),
    createUser: jest.fn(),
    findByPhone: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockBookingService = {
    createBooking: jest.fn(),
    listBookings: jest.fn(),
    getBooking: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregatorService,
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MapsService,
          useValue: { getDistance: jest.fn() },
        },
        {
          provide: IncidentService,
          useValue: { create: jest.fn() },
        },
        {
          provide: OtpService,
          useValue: {
            generateOtp: jest.fn().mockReturnValue('123456'),
            storeOtp: jest.fn().mockResolvedValue(undefined),
            verifyOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AggregatorService>(AggregatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onboardAggregator', () => {
    it('should onboard aggregator successfully', async () => {
      const user: CurrentUser = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
      };

      const existingUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Test User',
        email: 'test@test.com',
        phone: '+911234567890',
        authProvider: 'phone',
        profileData: { name: 'Test User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: '2024-01-01T00:00:00.000Z',
      };

      const dto = {
        businessName: 'Agri Services Ltd',
        regions: ['Punjab', 'Haryana'],
        documents: [
          { type: 'business_license', url: 'https://example.com/license.pdf' },
        ],
      };

      mockUsersService.getByUid.mockResolvedValue(existingUser);

      const result = await service.onboardAggregator(dto, user);

      expect(result).toMatchObject({
        uid: 'user123',
        role: 'aggregator',
        status: 'pending',
        adminApproval: false,
        profileData: expect.objectContaining({
          businessName: 'Agri Services Ltd',
          regions: ['Punjab', 'Haryana'],
        }),
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });
  });

  describe('addCustomer', () => {
    it('should add customer successfully', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const dto = {
        name: 'New Customer',
        phone: '+919876543210',
        email: 'newcustomer@test.com',
        language: 'en',
      };

      const createdCustomer: FirestoreUserDocument = {
        uid: 'phone:+919876543210',
        role: 'customer',
        status: 'active',
        name: 'New Customer',
        email: 'newcustomer@test.com',
        phone: '+919876543210',
        authProvider: 'phone',
        profileData: { name: 'New Customer' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockUsersService.findByPhone.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createUser.mockResolvedValue(createdCustomer);

      const result = await service.addCustomer(dto, aggregatorUser);

      expect(result).toMatchObject({
        profileData: expect.objectContaining({
          managedByAggregatorId: 'aggregator123',
        }),
      });

      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        name: 'New Customer',
        role: 'customer',
        status: 'active',
        phone: '+919876543210',
        email: 'newcustomer@test.com',
        language: 'en',
        adminApproval: true,
        isVerified: true,
      });
    });

    it('should throw BadRequestException when no phone or email provided', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const dto = {
        name: 'New Customer',
      };

      await expect(service.addCustomer(dto, aggregatorUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when phone already exists (M-005)', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const dto = {
        name: 'New Customer',
        phone: '+919876543210',
      };

      mockUsersService.findByPhone.mockResolvedValue({
        uid: 'existing',
        phone: '+919876543210',
      });

      await expect(service.addCustomer(dto, aggregatorUser)).rejects.toThrow(
        'A user with phone +919876543210 already exists.',
      );
    });

    it('should throw BadRequestException when email already exists (M-005)', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const dto = {
        name: 'New Customer',
        email: 'existing@test.com',
      };

      mockUsersService.findByPhone.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue({
        uid: 'existing',
        email: 'existing@test.com',
      });

      await expect(service.addCustomer(dto, aggregatorUser)).rejects.toThrow(
        'A user with email existing@test.com already exists.',
      );
    });
  });

  describe('listCustomers', () => {
    it('should list customers managed by aggregator', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const mockCustomers: FirestoreUserDocument[] = [
        {
          uid: 'customer1',
          role: 'customer',
          status: 'active',
          name: 'Customer One',
          email: 'customer1@test.com',
          phone: '+911111111111',
          authProvider: 'phone',
          profileData: {
            name: 'Customer One',
            managedByAggregatorId: 'aggregator123',
          },
          verification: { isVerified: true, documents: [] },
          adminApproval: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastLogin: null,
        },
      ];

      mockFirestoreCollection.get.mockResolvedValue({
        docs: mockCustomers.map((customer) => ({ data: () => customer })),
      });
      mockFirestoreCollection.count.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: () => ({ count: mockCustomers.length }) }),
      });

      const result = await service.listCustomers({ page: 1, limit: 20 }, aggregatorUser);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        uid: 'customer1',
        profileData: expect.objectContaining({
          managedByAggregatorId: 'aggregator123',
        }),
      });
      expect(result.meta.total).toBe(1);

      expect(mockFirestoreCollection.where).toHaveBeenCalledWith(
        'profileData.managedByAggregatorId',
        '==',
        'aggregator123',
      );
    });
  });

  describe('createDelegatedBooking', () => {
    it('should create delegated booking successfully', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const dto = {
        address: '123 Farm Road, Punjab',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectare' as const,
        droneTier: 'standard' as const,
        serviceType: 'spraying' as const,
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
        customerUid: 'customer123',
      };

      const mockBooking = {
        id: 'booking123',
        customerUid: 'customer123',
        aggregatorId: 'aggregator123',
        address: '123 Farm Road, Punjab',
        cropType: 'wheat',
        area: { unit: 'hectare', value: 10 },
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: dto.scheduledDate,
        priceEstimation: 5000,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockBookingService.createBooking.mockResolvedValue(mockBooking);

      const result = await service.createDelegatedBooking(dto, aggregatorUser);

      expect(result.booking).toEqual(mockBooking);
      expect(result.delegated).toMatchObject({
        bookingId: 'booking123',
        aggregatorId: 'aggregator123',
        cropType: 'wheat',
        serviceType: 'spraying',
        status: 'created',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WS_EVENTS.DELEGATED_BOOKING_STATUS,
        expect.objectContaining({
          bookingId: 'booking123',
          aggregatorId: 'aggregator123',
          status: 'created',
        }),
      );
    });
  });

  describe('getCommission', () => {
    it('should calculate commission for completed bookings', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      // Mock delegated bookings collection
      const mockDelegatedBookings = [
        { aggregatorId: 'aggregator123', status: 'completed', bookingId: 'booking1', createdAt: new Date().toISOString() },
        { aggregatorId: 'aggregator123', status: 'completed', bookingId: 'booking2', createdAt: new Date().toISOString() },
        { aggregatorId: 'aggregator123', status: 'pending', bookingId: 'booking3', createdAt: new Date().toISOString() },
      ];

      mockFirestoreCollection.get.mockResolvedValue({
        docs: mockDelegatedBookings.map((doc) => ({
          data: () => doc,
        })),
      });

      // Mock individual booking docs
      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ finalPrice: 10000 }),
      });

      const result = await service.getCommission(aggregatorUser);

      expect(result).toMatchObject({
        aggregatorId: 'aggregator123',
        completedBookings: 2,
        commissionEarned: expect.any(Number),
        currentTier: expect.any(String),
        monthlyBookings: expect.any(Number),
      });
      expect(result.commissionEarned).toBeGreaterThan(0);
    });

    it('should return zero commission when no completed bookings', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      mockFirestoreCollection.get.mockResolvedValue({
        docs: [],
      });

      const result = await service.getCommission(aggregatorUser);

      expect(result).toMatchObject({
        aggregatorId: 'aggregator123',
        completedBookings: 0,
        grossRevenue: 0,
        commissionEarned: 0,
        currentTier: 'Standard',
        monthlyBookings: 0,
        nextTierBookings: 51,
        pendingCommission: 0,
        settledCommission: 0,
      });
    });
  });

  describe('getNotifications', () => {
    it('should get paginated notifications for aggregator', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const mockNotifications = [
        {
          id: 'notif1',
          uid: 'aggregator123',
          messages: [{ message: 'Booking confirmed', timestamp: '2024-01-01T10:00:00.000Z', read: false }],
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
        },
      ];

      const mockSubcollection = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockNotifications.map((notif) => ({
            id: notif.id,
            data: () => notif,
          })),
        }),
        count: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ data: () => ({ count: 10 }) }),
        }),
      };

      (mockFirestoreDoc as any).collection = jest.fn().mockReturnValue(mockSubcollection);

      const result = await service.getNotifications(aggregatorUser, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings successfully', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const mockUser: FirestoreUserDocument = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
        name: 'Test Aggregator',
        email: 'agg@test.com',
        phone: '+911234567890',
        authProvider: 'phone',
        profileData: {},
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: '2024-01-01T00:00:00.000Z',
      };

      mockUsersService.getByUid.mockResolvedValue(mockUser);

      const dto = {
        pushNotifications: false,
        emailNotifications: true,
      };

      const result = await service.updateNotificationSettings(dto, aggregatorUser);

      expect(result.message).toBe('Notification settings updated successfully');
      expect(mockCacheService.delete).toHaveBeenCalled();
    });
  });

  describe('requestAccountDeletion', () => {
    it('should throw error when pending commissions exist', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const dto = {
        reason: 'Business closure - moving to different platform',
      };

      mockFirestoreCollection.get.mockResolvedValue({ empty: true });

      const mockPendingCommissions = [
        {
          bookingId: 'booking1',
          commissionAmount: 500,
          status: 'pending' as const,
          customerName: 'Customer One',
          serviceType: 'spraying',
          completedAt: '2024-01-01T00:00:00.000Z',
          bookingAmount: 5000,
          commissionRate: 0.1,
        },
      ];
      jest.spyOn(service, 'getPendingCommission').mockResolvedValue(mockPendingCommissions);

      await expect(service.requestAccountDeletion(dto, aggregatorUser)).rejects.toThrow(
        'Cannot delete account with pending commissions',
      );
    });
  });
});
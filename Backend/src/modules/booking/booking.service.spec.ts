import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreBookingDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { PricingService } from '../pricing/pricing.service';
import { BookingService } from './booking.service';
import { BookingHistoryService } from './history/booking-history.service';
import { CacheService } from '../../common/cache/cache.service';
import { WeatherService } from '../flight-conditions/weather.service';
import { AirspaceService } from '../flight-conditions/airspace.service';
import { FarmService } from '../farm/farm.service';
import { BookingEventsService } from './services/booking-events.service';
import { CouponService } from '../coupon/coupon.service';
import { RazorpayService } from '../payment/razorpay.service';

describe('BookingService - Unit Tests', () => {
  let service: BookingService;

  let activeMockBooking: any = null;

  const mockFirestoreDoc = {
    id: 'booking123',
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation(async () => {
      if (activeMockBooking === null) {
        return {
          exists: true,
          id: 'booking123',
          data: () => ({
            id: 'booking123',
            customerUid: 'customer123',
            createdBy: 'customer123',
            status: 'pending',
            updatedAt: new Date().toISOString(),
          }),
        };
      }
      return activeMockBooking;
    }),
    collection: jest.fn(),
  };

  const mockCountGet = jest.fn().mockResolvedValue({
    data: () => ({ count: 0 }),
  });

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnValue({ get: mockCountGet }),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  };

  mockFirestoreDoc.collection.mockReturnValue(mockFirestoreCollection);

  const mockFirestoreCollectionGroup = jest.fn().mockReturnValue(mockFirestoreCollection);

  const mockMissionDoc = {
    get: jest.fn().mockResolvedValue({ exists: false }),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockMissionsCollection = {
    doc: jest.fn().mockReturnValue(mockMissionDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [] }),
  };

  const mockFirestore = {
    collection: jest.fn((path: string) => {
      if (path === 'missions') return mockMissionsCollection;
      return mockFirestoreCollection;
    }),
    collectionGroup: mockFirestoreCollectionGroup,
    runTransaction: jest.fn().mockImplementation(async (callback) => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            id: 'booking123',
            customerUid: 'customer123',
            createdBy: 'customer123',
            status: 'pending',
            updatedAt: new Date().toISOString(),
          }),
        }),
        set: jest.fn().mockResolvedValue(undefined),
      };
      return callback(mockTransaction);
    }),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue(mockFirestore),
  };

  const mockPricingService = {
    estimatePrice: jest.fn(),
    lockPrice: jest.fn(),
    estimateBookingPriceForService: jest.fn().mockReturnValue(null),
  };

  const mockHistoryService = {
    recordHistory: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseService,
        },
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
        {
          provide: BookingHistoryService,
          useValue: mockHistoryService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
        {
          provide: WeatherService,
          useValue: {
            checkConditions: jest.fn().mockResolvedValue({ status: 'GREEN' }),
            checkWeather: jest.fn().mockResolvedValue({
              status: 'GREEN',
              summary: 'Clear',
              metrics: { temperatureC: 25, windSpeedKmh: 5 },
            }),
          },
        },
        {
          provide: AirspaceService,
          useValue: {
            checkAirspace: jest.fn().mockResolvedValue({ status: 'GREEN' }),
            checkRestrictions: jest.fn().mockResolvedValue({
              status: 'GREEN',
              summary: 'OK',
              reasons: [],
              nearestZone: null,
            }),
            checkRoute: jest.fn().mockResolvedValue({
              status: 'GREEN',
              summary: 'OK',
              reasons: [],
              nearestZone: null,
            }),
          },
        },
        {
          provide: FarmService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: BookingEventsService,
          useValue: {
            logBookingCreated: jest.fn().mockResolvedValue(undefined),
            logCancellation: jest.fn().mockResolvedValue(undefined),
            logStatusChange: jest.fn().mockResolvedValue(undefined),
            logPilotAssigned: jest.fn().mockResolvedValue(undefined),
            logRatingAdded: jest.fn().mockResolvedValue(undefined),
            logTimeSlotUpdated: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CouponService,
          useValue: {
            apply: jest.fn().mockResolvedValue({
              coupon: { code: 'WELCOME10' },
              discount: 0,
              finalAmount: 0,
            }),
          },
        },
        {
          provide: RazorpayService,
          useValue: {
            isConfigured: true,
            createLinkedOrder: jest.fn(),
            verifyAndConsume: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    activeMockBooking = null;
    mockMissionDoc.get.mockResolvedValue({ exists: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    const mockUser: CurrentUser = {
      uid: 'user123',
      role: 'customer',
      status: 'active',
    };

    const mockDto = {
      address: '123 Farm Road, Punjab',
      cropType: 'wheat',
      areaValue: 10,
      areaUnit: 'hectare' as const,
      droneTier: 'standard' as const,
      serviceType: 'spraying' as const,
      serviceDetails: { sprayingSubType: 'fertilizer_spraying' as const },
      location: { lat: 30.7333, lng: 76.7794 },
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      distanceKm: 5,
    };

    it('should create a booking successfully', async () => {
      const mockEstimate = {
        estimatedAmount: 5000,
        baseRate: 4000,
        lineItems: [],
      };

      mockPricingService.estimatePrice.mockResolvedValue(mockEstimate);

      const result = await service.createBooking(mockDto, mockUser);

      expect(result).toMatchObject({
        customerUid: mockUser.uid,
        createdBy: mockUser.uid,
        address: mockDto.address,
        cropType: mockDto.cropType,
        priceEstimation: 5000,
        status: 'pending',
      });

      expect(mockPricingService.estimatePrice).toHaveBeenCalledWith({
        cropType: mockDto.cropType,
        areaValue: mockDto.areaValue,
        areaUnit: mockDto.areaUnit,
        droneTier: mockDto.droneTier,
        distanceKm: mockDto.distanceKm,
        chemicalRequired: true,
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalled();
      expect(mockHistoryService.recordHistory).toHaveBeenCalled();
    });

    it('should assign a sequential numeric booking id/number used as document id', async () => {
      mockPricingService.estimatePrice.mockResolvedValue({
        estimatedAmount: 5000,
        baseRate: 4000,
        lineItems: [],
      });

      const result = await service.createBooking(mockDto, mockUser);

      expect(result.bookingNumber).toMatch(/^\d{4,}$/);
      expect(result.id).toBe(result.bookingNumber);
      expect(mockFirestoreCollection.doc).toHaveBeenCalledWith(result.bookingNumber);
    });

    it('should throw BadRequestException for past scheduled date', async () => {
      const invalidDto = {
        ...mockDto,
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      };

      await expect(service.createBooking(invalidDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for scheduled date beyond 7 days', async () => {
      const invalidDto = {
        ...mockDto,
        scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days
      };

      await expect(service.createBooking(invalidDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create booking with aggregator when role is aggregator', async () => {
      const aggregatorUser: CurrentUser = {
        uid: 'aggregator123',
        role: 'aggregator',
        status: 'active',
      };

      const dtoWithCustomer = {
        ...mockDto,
        customerUid: 'customer456',
      };

      mockPricingService.estimatePrice.mockResolvedValue({
        estimatedAmount: 5000,
        baseRate: 4000,
        lineItems: [],
      });

      const result = await service.createBooking(dtoWithCustomer, aggregatorUser);

      expect(result.aggregatorUid).toBe(aggregatorUser.uid);
      expect(result.customerUid).toBe('customer456');
      expect(result.createdBy).toBe(aggregatorUser.uid);
    });
  });

  describe('listBookings', () => {
    it('should filter bookings by customer role', async () => {
      const customerUser: CurrentUser = {
        uid: 'customer123',
        role: 'customer',
        status: 'active',
      };

      const mockBookings = [
        { id: 'b1', customerUid: 'customer123', status: 'pending' },
        { id: 'b2', customerUid: 'customer456', status: 'completed' },
      ];

      mockFirestoreCollection.get.mockResolvedValue({
        docs: mockBookings.map((b) => ({ data: () => b })),
      });

      await service.listBookings({ page: 1, limit: 10 }, customerUser);

      expect(mockFirestoreCollection.where).toHaveBeenCalledWith(
        'customerUid',
        '==',
        'customer123',
      );
    });

    it('should filter bookings by pilot role', async () => {
      const pilotUser: CurrentUser = {
        uid: 'pilot123',
        role: 'pilot',
        status: 'active',
      };

      mockFirestoreCollection.get.mockResolvedValue({ docs: [] });

      await service.listBookings({ page: 1, limit: 10 }, pilotUser);

      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('assignedPilot', '==', 'pilot123');
    });

    it('should return empty array for technician role', async () => {
      const technicianUser: CurrentUser = {
        uid: 'tech123',
        role: 'technician',
        status: 'active',
      };

      const result = await service.listBookings({ page: 1, limit: 10 }, technicianUser);

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getBooking', () => {
    it('should throw NotFoundException when booking not found', async () => {
      activeMockBooking = { exists: false };

      await expect(service.getBooking('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should return booking when found', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        status: 'pending',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
      };

      const result = await service.getBooking('booking123');

      expect(result.id).toBe('booking123');
    });
  });

  describe('cancelBooking', () => {
    it('should throw ForbiddenException when user cannot manage booking', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        createdBy: 'customer123',
        status: 'pending',
      };

      const unauthorizedUser: CurrentUser = {
        uid: 'otheruser',
        role: 'customer',
        status: 'active',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: {
          parent: { parent: { id: 'customer123' } },
        },
      };

      await expect(service.cancelBooking('booking123', unauthorizedUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should successfully cancel booking', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        createdBy: 'customer123',
        status: 'pending',
        updatedAt: new Date().toISOString(),
      };

      const mockRef = {
        set: jest.fn().mockResolvedValue(undefined),
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: {
          ...mockRef,
          parent: { parent: { id: 'customer123' } },
        },
      };

      const authorizedUser: CurrentUser = {
        uid: 'customer123',
        role: 'customer',
        status: 'active',
      };

      const result = await service.cancelBooking('booking123', authorizedUser);

      expect(result.status).toBe('cancelled');
      // Verify transaction was used (M-002 fix)
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
      expect(mockHistoryService.recordHistory).toHaveBeenCalled();
    });

    it('should throw BadRequestException when mission already started', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        createdBy: 'customer123',
        status: 'confirmed',
        missionId: 'mission123',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: mockFirestoreDoc,
      };

      mockMissionDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ id: 'mission123', status: 'started' }),
      });

      const user: CurrentUser = { uid: 'customer123', role: 'customer', status: 'active' };

      await expect(service.cancelBooking('booking123', user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow assigned fleet manager to cancel booking', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        createdBy: 'customer123',
        fleetManagerUid: 'fm123',
        status: 'confirmed',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: mockFirestoreDoc,
      };

      const user: CurrentUser = { uid: 'fm123', role: 'fleet_manager', status: 'active' };

      const result = await service.cancelBooking('booking123', user);

      expect(result.status).toBe('cancelled');
    });

    it('should allow admin to cancel booking after service started', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        createdBy: 'customer123',
        status: 'in_progress',
        missionId: 'mission123',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: mockFirestoreDoc,
      };

      mockMissionDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ id: 'mission123', status: 'started' }),
      });

      const user: CurrentUser = { uid: 'admin1', role: 'admin', status: 'active' };

      const result = await service.cancelBooking('booking123', user);

      expect(result.status).toBe('cancelled');
    });

    it('should throw BadRequestException for already cancelled booking', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        createdBy: 'customer123',
        status: 'cancelled',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: mockFirestoreDoc,
      };

      const user: CurrentUser = { uid: 'admin1', role: 'admin', status: 'active' };

      await expect(service.cancelBooking('booking123', user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for completed booking', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        createdBy: 'customer123',
        status: 'completed',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: mockFirestoreDoc,
      };

      const user: CurrentUser = { uid: 'admin1', role: 'admin', status: 'active' };

      await expect(service.cancelBooking('booking123', user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assignBooking', () => {
    it('should assign pilot and drone to booking', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        status: 'pending',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: mockFirestoreDoc,
      };

      const dto = {
        pilotUid: 'pilot123',
        droneId: 'drone456',
      };

      mockFirestoreCollection.get.mockResolvedValue({ docs: [], empty: true });

      const result = await service.assignBooking('booking123', dto, 'vendor123');

      expect(result.assignedPilot).toBe('pilot123');
      expect(result.assignedDrone).toBe('drone456');
      expect(result.fleetManagerUid).toBe('vendor123');
      expect(result.status).toBe('confirmed');
      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });

    it('should throw BadRequestException when booking is not pending or confirmed', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        status: 'completed',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: mockFirestoreDoc,
      };

      const dto = {
        pilotUid: 'pilot123',
        droneId: 'drone456',
      };

      await expect(service.assignBooking('booking123', dto, 'vendor123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('applyPriceLock', () => {
    it('should update booking with final price and payment status', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        priceEstimation: 5000,
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: {
          set: jest.fn().mockResolvedValue(undefined),
          parent: { parent: { id: 'customer123' } },
        },
      };

      const result = await service.applyPriceLock('booking123', 5200, 'cash', 'pilot123', 'paid');

      expect(result.finalPrice).toBe(5200);
      expect(result.paymentMethod).toBe('cash');
      expect(result.paymentStatus).toBe('paid');
      expect(mockHistoryService.recordHistory).toHaveBeenCalledWith(
        expect.any(Object),
        'pilot123',
        'Payment confirmed',
      );
    });
  });

  describe('cash payment flow', () => {
    it('completePayment with cash should mark cashPending and not mark paid', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        adminApprovalStatus: 'approved',
        paymentStatus: 'pending',
        status: 'confirmed',
        priceEstimation: 5000,
        finalPrice: 5000,
        assignedPilot: 'pilot123',
        assignedDrone: null,
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: { set: jest.fn().mockResolvedValue(undefined) },
      };

      const user: CurrentUser = { uid: 'customer123', role: 'customer', status: 'active' };
      const result = await service.completePayment('booking123', user, { method: 'cash' });

      expect(result.cashPending).toBe(true);
      expect(result.paymentMethod).toBe('cash');
      expect(result.paymentStatus).toBe('pending');
    });

    it('confirmCashReceipt by assigned pilot should mark payment paid', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        adminApprovalStatus: 'approved',
        paymentStatus: 'pending',
        status: 'completed',
        priceEstimation: 5000,
        finalPrice: 5000,
        assignedPilot: 'pilot123',
        assignedDrone: null,
        cashPending: true,
        paymentMethod: 'cash',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: { set: jest.fn().mockResolvedValue(undefined) },
      };

      const user: CurrentUser = { uid: 'pilot123', role: 'pilot', status: 'active' };
      const result = await service.confirmCashReceipt('booking123', user);

      expect(result.paymentStatus).toBe('paid');
      expect(result.cashPending).toBe(false);
      expect(result.cashConfirmedBy).toBe('pilot123');
    });

    it('should reject cash confirmation when pilot is not assigned', async () => {
      const mockBooking: Partial<FirestoreBookingDocument> = {
        id: 'booking123',
        customerUid: 'customer123',
        adminApprovalStatus: 'approved',
        paymentStatus: 'pending',
        status: 'confirmed',
        priceEstimation: 5000,
        assignedPilot: 'otherPilot',
        cashPending: true,
        paymentMethod: 'cash',
      };

      activeMockBooking = {
        exists: true,
        id: 'booking123',
        data: () => mockBooking,
        ref: { set: jest.fn().mockResolvedValue(undefined) },
      };

      const user: CurrentUser = { uid: 'pilot123', role: 'pilot', status: 'active' };
      await expect(service.confirmCashReceipt('booking123', user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

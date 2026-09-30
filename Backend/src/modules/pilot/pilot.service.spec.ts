import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { BookingService } from '../booking/booking.service';
import { PricingService } from '../pricing/pricing.service';
import { UsersService } from '../users/users.service';
import { PilotService } from './pilot.service';
import { CacheService } from '../../common/cache/cache.service';

describe('PilotService - Unit Tests', () => {
  let service: PilotService;

  const mockFirestoreDoc = {
    id: 'pilot123',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
  };

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
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
    update: jest.fn(),
  };

  const mockPricingService = {
    estimatePrice: jest.fn(),
    lockPrice: jest.fn(),
  };

  const mockBookingService = {
    getBooking: jest.fn(),
    applyPriceLock: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PilotService,
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PricingService,
          useValue: mockPricingService,
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
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PilotService>(PilotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onboardPilot', () => {
    it('should onboard pilot successfully', async () => {
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
        phone: '+919876543210',
        authProvider: 'phone',
        profileData: { name: 'Test User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      const dto = {
        vendorId: 'vendor123',
        serviceTypes: ['spraying', 'monitoring'],
        documents: [
          { type: 'pilot_license', url: 'https://example.com/license.pdf' },
          { type: 'insurance', url: 'https://example.com/insurance.pdf' },
        ],
      };

      mockUsersService.getByUid.mockResolvedValue(existingUser);

      const result = await service.onboardPilot(dto, user);

      expect(result).toMatchObject({
        uid: 'user123',
        role: 'pilot',
        status: 'pending',
        adminApproval: false,
        profileData: expect.objectContaining({
          vendorId: 'vendor123',
          serviceTypes: ['spraying', 'monitoring'],
        }),
        verification: expect.objectContaining({
          isVerified: false,
          documents: dto.documents,
        }),
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });
  });

  describe('lockPrice', () => {
    it('should lock price and update booking', async () => {
      const pilotUser: CurrentUser = {
        uid: 'pilot123',
        role: 'pilot',
        status: 'active',
      };

      const mockBooking = {
        id: 'booking123',
        customerUid: 'customer123',
        priceEstimation: 5000,
        finalPrice: null,
        status: 'in_progress',
      };

      const dto = {
        cropType: 'wheat',
        actualAreaValue: 10.5,
        actualAreaUnit: 'hectare' as const,
        paymentMethod: 'upi' as const,
        additionalCharges: 500,
      };

      const mockPricingLock = {
        pricingId: 'pricing123',
        bookingId: 'booking123',
        customerUid: 'customer123',
        pilotId: 'pilot123',
        finalAmount: 5500,
        paymentMethod: 'upi',
        paymentStatus: 'pending',
        createdAt: '2024-01-05T00:00:00.000Z',
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        finalPrice: 5500,
        paymentMethod: 'upi',
        paymentStatus: 'pending',
      };

      mockBookingService.getBooking.mockResolvedValue(mockBooking);
      mockPricingService.lockPrice.mockResolvedValue(mockPricingLock);
      mockBookingService.applyPriceLock.mockResolvedValue(mockUpdatedBooking);

      const result = await service.lockPrice('booking123', dto, pilotUser);

      expect(result).toMatchObject({
        booking: mockUpdatedBooking,
        previousEstimate: 5000,
        pricing: mockPricingLock,
      });

      expect(mockPricingService.lockPrice).toHaveBeenCalledWith(
        {
          ...dto,
          bookingId: 'booking123',
          customerUid: 'customer123',
        },
        'pilot123',
      );

      expect(mockBookingService.applyPriceLock).toHaveBeenCalledWith(
        'booking123',
        5500,
        'upi',
        'pilot123',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WS_EVENTS.PRICE_LOCKED,
        expect.objectContaining({
          bookingId: 'booking123',
          pilotId: 'pilot123',
          customerUid: 'customer123',
          lockedAmount: 5500,
          paymentMethod: 'upi',
        }),
      );
    });
  });

  describe('getRewards', () => {
    it('should return pilot rewards summary', () => {
      const pilotUser: CurrentUser = {
        uid: 'pilot123',
        role: 'pilot',
        status: 'active',
      };

      const result = service.getRewards(pilotUser);

      expect(result).toEqual({
        pilotId: 'pilot123',
        points: 0,
        badges: [],
      });
    });
  });
});

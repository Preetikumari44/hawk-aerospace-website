import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreCouponDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { CouponService } from './coupon.service';

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const makeCoupon = (overrides: Partial<FirestoreCouponDocument> = {}): FirestoreCouponDocument => ({
  id: 'WELCOME10',
  code: 'WELCOME10',
  createdBy: 'admin123',
  discountType: 'percentage',
  discountValue: 10,
  applicableRoles: [],
  validFrom: null,
  validUntil: daysFromNow(30),
  minOrderAmount: null,
  maxDiscountAmount: null,
  usageLimit: null,
  usedCount: 0,
  description: null,
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('CouponService - Unit Tests', () => {
  let service: CouponService;

  const mockFirestoreDoc = {
    id: 'WELCOME10',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    get: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockFirestoreCollection),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue(mockFirestore),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
    mockFirestoreCollection.get.mockResolvedValue({ docs: [] });
  });

  describe('create', () => {
    it('should create coupon with new schema and uppercase code', async () => {
      const adminUser: CurrentUser = { uid: 'admin123', role: 'admin', status: 'active' };

      const result = await service.create(
        {
          code: 'welcome10',
          discountType: 'percentage',
          discountValue: 10,
          applicableRoles: ['customer'],
          validUntil: daysFromNow(30),
          description: '10% off for customers',
        },
        adminUser,
      );

      expect(result).toMatchObject({
        id: 'WELCOME10',
        code: 'WELCOME10',
        createdBy: 'admin123',
        discountType: 'percentage',
        discountValue: 10,
        applicableRoles: ['customer'],
        usedCount: 0,
        status: 'active',
      });
      expect(mockFirestoreCollection.doc).toHaveBeenCalledWith('WELCOME10');
      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list all coupons ordered by createdAt desc', async () => {
      mockFirestoreCollection.get.mockResolvedValue({
        docs: [
          { data: () => makeCoupon({ id: 'A', code: 'A' }) },
          { data: () => makeCoupon({ id: 'B', code: 'B' }) },
        ],
      });

      const result = await service.list();
      expect(mockFirestoreCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result).toHaveLength(2);
    });
  });

  describe('listAvailable', () => {
    it('should return universal coupons to any role', async () => {
      const customer: CurrentUser = { uid: 'u1', role: 'customer', status: 'active' };
      mockFirestoreCollection.get.mockResolvedValue({
        docs: [{ data: () => makeCoupon({ applicableRoles: [] }) }],
      });

      const result = await service.listAvailable(customer);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('10% OFF');
    });

    it('should return role-specific coupons only for that role', async () => {
      const pilot: CurrentUser = { uid: 'u1', role: 'pilot', status: 'active' };
      const customerCoupon = makeCoupon({ id: 'CUST', code: 'CUST', applicableRoles: ['customer'] });
      const pilotCoupon = makeCoupon({ id: 'PILOT', code: 'PILOT', applicableRoles: ['pilot'] });
      mockFirestoreCollection.get.mockResolvedValue({
        docs: [{ data: () => customerCoupon }, { data: () => pilotCoupon }],
      });

      const result = await service.listAvailable(pilot);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('PILOT');
    });

    it('should hide expired, inactive and usage-limited coupons', async () => {
      const customer: CurrentUser = { uid: 'u1', role: 'customer', status: 'active' };
      mockFirestoreCollection.get.mockResolvedValue({
        docs: [
          { data: () => makeCoupon({ id: 'EXP', code: 'EXP', validUntil: daysFromNow(-1) }) },
          { data: () => makeCoupon({ id: 'OFF', code: 'OFF', status: 'inactive' }) },
          { data: () => makeCoupon({ id: 'LIM', code: 'LIM', usageLimit: 5, usedCount: 5 }) },
          { data: () => makeCoupon({ id: 'OK', code: 'OK' }) },
        ],
      });

      const result = await service.listAvailable(customer);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('OK');
    });
  });

  describe('validate', () => {
    const customer: CurrentUser = { uid: 'customer123', role: 'customer', status: 'active' };
    const mockDocExists = (coupon: FirestoreCouponDocument) =>
      mockFirestoreDoc.get.mockResolvedValue({ exists: true, data: () => coupon });

    it('should validate active universal coupon and compute discount', async () => {
      mockDocExists(makeCoupon({ discountType: 'percentage', discountValue: 10 }));
      const result = await service.validate({ code: 'WELCOME10', baseAmount: 1000 }, customer);
      expect(result).toMatchObject({ valid: true, discount: 100, finalAmount: 900 });
    });

    it('should compute fixed discount capped at base amount', async () => {
      mockDocExists(makeCoupon({ discountType: 'fixed', discountValue: 500 }));
      const result = await service.validate({ code: 'FIXED', baseAmount: 300 }, customer);
      expect(result.discount).toBe(300);
      expect(result.finalAmount).toBe(0);
    });

    it('should cap percentage discount by maxDiscountAmount', async () => {
      mockDocExists(
        makeCoupon({ discountType: 'percentage', discountValue: 50, maxDiscountAmount: 200 }),
      );
      const result = await service.validate({ code: 'CAP', baseAmount: 1000 }, customer);
      expect(result.discount).toBe(200);
    });

    it('should throw NotFoundException for unknown code', async () => {
      mockFirestoreDoc.get.mockResolvedValue({ exists: false, data: () => null });
      await expect(service.validate({ code: 'INVALID' }, customer)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw for inactive coupon', async () => {
      mockDocExists(makeCoupon({ status: 'inactive' }));
      await expect(service.validate({ code: 'OFF' }, customer)).rejects.toThrow(
        'Coupon is not active.',
      );
    });

    it('should throw for expired coupon', async () => {
      mockDocExists(makeCoupon({ validUntil: daysFromNow(-1) }));
      await expect(service.validate({ code: 'EXP' }, customer)).rejects.toThrow(
        'Coupon has expired.',
      );
    });

    it('should throw role-mismatch message when coupon is not for this role', async () => {
      mockDocExists(makeCoupon({ applicableRoles: ['pilot'] }));
      await expect(service.validate({ code: 'PILOT' }, customer)).rejects.toThrow(
        'Coupon is not valid for your role.',
      );
    });

    it('should throw when min order amount not met', async () => {
      mockDocExists(makeCoupon({ minOrderAmount: 1000 }));
      await expect(service.validate({ code: 'MIN', baseAmount: 500 }, customer)).rejects.toThrow(
        'Minimum order amount',
      );
    });

    it('should throw when usage limit reached', async () => {
      mockDocExists(makeCoupon({ usageLimit: 5, usedCount: 5 }));
      await expect(service.validate({ code: 'LIM' }, customer)).rejects.toThrow(
        'Coupon usage limit reached.',
      );
    });

    it('should allow a role-specific coupon for a matching role', async () => {
      mockDocExists(makeCoupon({ applicableRoles: ['customer'] }));
      const result = await service.validate({ code: 'CUST' }, customer);
      expect(result.valid).toBe(true);
    });
  });

  describe('apply', () => {
    it('should validate and consume usage on the coupon', async () => {
      const customer: CurrentUser = { uid: 'u1', role: 'customer', status: 'active' };
      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => makeCoupon({ discountType: 'fixed', discountValue: 200 }),
      });

      const result = await service.apply('WELCOME10', 1000, customer);
      expect(result.discount).toBe(200);
      expect(result.finalAmount).toBe(800);
      const [updateArg] = mockFirestoreDoc.update.mock.calls[0] as [Record<string, unknown>];
      expect(updateArg).toHaveProperty('usedCount');
    });

    it('should not consume usage when validation fails', async () => {
      const pilot: CurrentUser = { uid: 'u1', role: 'pilot', status: 'active' };
      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => makeCoupon({ applicableRoles: ['customer'] }),
      });

      await expect(service.apply('CUST', 1000, pilot)).rejects.toThrow(BadRequestException);
      expect(mockFirestoreDoc.update).not.toHaveBeenCalled();
    });
  });

  describe('update & deactivate', () => {
    it('should merge update fields', async () => {
      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => makeCoupon({ discountValue: 15 }),
      });
      const result = await service.update('welcome10', { discountValue: 15, status: 'inactive' });
      expect(mockFirestoreCollection.doc).toHaveBeenCalledWith('WELCOME10');
      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ discountValue: 15, status: 'inactive' }),
        { merge: true },
      );
      expect(result).toMatchObject({ discountValue: 15 });
    });

    it('should set status to inactive on deactivate', async () => {
      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => makeCoupon({ status: 'inactive' }),
      });
      const result = await service.deactivate('welcome10');
      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inactive' }),
        { merge: true },
      );
      expect(result).toMatchObject({ status: 'inactive' });
    });
  });
});

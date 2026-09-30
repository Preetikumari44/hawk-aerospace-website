import type { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestorePaymentDocument } from '../../database/firestore/contracts';
import type { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import type { BookingService } from '../booking/booking.service';
import type { CouponService } from '../coupon/coupon.service';
import type { PaymentConfirmedPayload, PaymentFailedPayload } from '../../gateway/events/event.interfaces';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { RazorpayService } from './razorpay.service';
import { PaymentService } from './payment.service';

describe('PaymentService - Unit Tests', () => {
  let service: PaymentService;

  const mockFirestoreDoc = {
    id: 'payment123',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
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
    get: jest.fn(),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue(mockFirestoreCollection),
    }),
  };

  const mockBookingService = {
    getBooking: jest.fn(),
    applyPriceLock: jest.fn(),
  };

  const mockInvoiceService = {
    generateInvoice: jest.fn(),
  };

  const mockRazorpayService = {
    isConfigured: true,
    createLinkedOrder: jest.fn(),
    verifyAndConsume: jest.fn(),
  };

  const mockCouponService = {
    validate: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  function expectPaymentEvent<T extends { timestamp: string }>(
    expectedEvent: string,
    expectedPayload: Omit<T, 'timestamp'>,
  ): void {
    const [, payload] = mockEventEmitter.emit.mock.calls[0] as [string, T];
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(expectedEvent, payload);
    expect(payload).toMatchObject(expectedPayload);
    expect(typeof payload.timestamp).toBe('string');
  }

  beforeEach(() => {
    service = new PaymentService(
      mockFirebaseService as unknown as FirebaseAdminService,
      mockBookingService as unknown as BookingService,
      mockInvoiceService,
      mockRazorpayService as unknown as RazorpayService,
      mockCouponService as unknown as CouponService,
      mockEventEmitter as unknown as EventEmitter2,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiate', () => {
    const mockUser: CurrentUser = {
      uid: 'pilot123',
      role: 'pilot',
      status: 'active',
    };

    const mockDto = {
      bookingId: 'booking123',
      method: 'upi' as const,
    };

    it('should initiate payment successfully with UPI QR code', async () => {
      const mockBooking = {
        id: 'booking123',
        customerUid: 'customer123',
        finalPrice: 5000,
        priceEstimation: 4500,
      };

      mockBookingService.getBooking.mockResolvedValue(mockBooking);

      const result = await service.initiate(mockDto, mockUser);

      expect(result.payment).toMatchObject({
        bookingId: 'booking123',
        pilotUid: 'pilot123',
        customerUid: 'customer123',
        amount: 5000,
        method: 'upi',
        status: 'pending',
      });

      expect(result.qrPayload).toContain('upi://pay?pa=hawk@upi');
      expect(result.qrPayload).toContain('am=5000');
      expect(result.qrPayload).toContain('tn=booking123');
      expect(mockFirestoreDoc.set).toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should use priceEstimation when finalPrice is null', async () => {
      const mockBooking = {
        id: 'booking123',
        customerUid: 'customer123',
        finalPrice: null,
        priceEstimation: 4500,
      };

      mockBookingService.getBooking.mockResolvedValue(mockBooking);

      const result = await service.initiate(mockDto, mockUser);

      expect(result.payment.amount).toBe(4500);
    });

    it('should not generate QR code for cash payment', async () => {
      const mockBooking = {
        id: 'booking123',
        customerUid: 'customer123',
        finalPrice: 5000,
      };

      const cashDto = { ...mockDto, method: 'cash' as const };
      mockBookingService.getBooking.mockResolvedValue(mockBooking);

      const result = await service.initiate(cashDto, mockUser);

      expect(result.qrPayload).toBeNull();
    });

    it('should emit payment failed when booking has no payable amount', async () => {
      const mockBooking = {
        id: 'booking123',
        customerUid: 'customer123',
        finalPrice: null,
        priceEstimation: null,
      };

      mockBookingService.getBooking.mockResolvedValue(mockBooking);

      await expect(service.initiate(mockDto, mockUser)).rejects.toThrow(BadRequestException);
      expectPaymentEvent<PaymentFailedPayload>(WS_EVENTS.PAYMENT_FAILED, {
        bookingId: 'booking123',
        customerUid: 'customer123',
        reason: 'Booking has no payable amount.',
      });
    });
  });

  describe('confirm', () => {
    const mockUser: CurrentUser = {
      uid: 'pilot123',
      role: 'pilot',
      status: 'active',
    };

    const mockDto = {
      referenceId: 'UPI123456',
    };

    it('should confirm payment successfully', async () => {
      const mockPayment: FirestorePaymentDocument = {
        id: 'payment123',
        bookingId: 'booking123',
        pilotUid: 'pilot123',
        customerUid: 'customer123',
        amount: 5000,
        method: 'upi',
        status: 'pending',
        invoiceId: null,
        referenceId: null,
        confirmedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockPayment,
      });

      mockBookingService.applyPriceLock.mockResolvedValue({});

      const result = await service.confirm('payment123', mockDto, mockUser);

      expect(result.status).toBe('paid');
      expect(result.referenceId).toBe('UPI123456');
      expect(result.invoiceId).toBe('inv_payment123');
      expect(result.confirmedAt).toBeDefined();
      expectPaymentEvent<PaymentConfirmedPayload>(WS_EVENTS.PAYMENT_CONFIRMED, {
        bookingId: 'booking123',
        paymentId: 'payment123',
        customerUid: 'customer123',
        pilotUid: 'pilot123',
        amount: 5000,
        method: 'upi',
      });

      expect(mockBookingService.applyPriceLock).toHaveBeenCalledWith(
        'booking123',
        5000,
        'upi',
        'pilot123',
        'paid',
      );
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockFirestoreDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      await expect(service.confirm('invalid-id', mockDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should confirm payment without reference ID', async () => {
      const mockPayment: FirestorePaymentDocument = {
        id: 'payment123',
        bookingId: 'booking123',
        pilotUid: 'pilot123',
        customerUid: 'customer123',
        amount: 5000,
        method: 'cash',
        status: 'pending',
        invoiceId: null,
        referenceId: null,
        confirmedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockPayment,
      });

      mockBookingService.applyPriceLock.mockResolvedValue({});

      const result = await service.confirm('payment123', {}, mockUser);

      expect(result.referenceId).toBeNull();
    });
  });

  describe('invoice', () => {
    it('should generate invoice for payment', async () => {
      const mockPayment: FirestorePaymentDocument = {
        id: 'payment123',
        bookingId: 'booking123',
        pilotUid: 'pilot123',
        customerUid: 'customer123',
        amount: 5000,
        method: 'upi',
        status: 'paid',
        invoiceId: 'inv_payment123',
        referenceId: 'UPI123',
        confirmedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockInvoice = {
        id: 'inv_payment123',
        invoiceId: 'HAWK-payment123',
        amount: 5000,
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockPayment,
      });

      mockInvoiceService.generateInvoice.mockReturnValue(mockInvoice);

      const result = await service.invoice('payment123');

      expect(result).toEqual(mockInvoice);
      expect(mockInvoiceService.generateInvoice).toHaveBeenCalledWith(mockPayment);
    });
  });

  describe('transactions', () => {
    it('should filter transactions for pilot role', async () => {
      const pilotUser: CurrentUser = {
        uid: 'pilot123',
        role: 'pilot',
        status: 'active',
      };

      const mockTransactions = [
        { id: 'pay1', pilotUid: 'pilot123', amount: 5000 },
        { id: 'pay2', pilotUid: 'pilot456', amount: 6000 },
      ];

      mockFirestoreCollection.get.mockResolvedValue({
        docs: mockTransactions.map((transaction) => ({ data: () => transaction })),
      });

      await service.transactions(pilotUser);

      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('pilotUid', '==', 'pilot123');
    });

    it('should filter transactions for customer role', async () => {
      const customerUser: CurrentUser = {
        uid: 'customer123',
        role: 'customer',
        status: 'active',
      };

      mockFirestoreCollection.get.mockResolvedValue({ docs: [] });

      await service.transactions(customerUser);

      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('customerUid', '==', 'customer123');
    });

    it('should order transactions by creation date descending', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin123',
        role: 'admin',
        status: 'active',
      };

      mockFirestoreCollection.get.mockResolvedValue({ docs: [] });

      await service.transactions(adminUser);

      expect(mockFirestoreCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });
});

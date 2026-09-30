import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference, Query } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { paginateFirestoreQuery } from '../../common/utils/firestore-cursor-pagination.util';
import type { FirestorePaymentDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { BookingService } from '../booking/booking.service';
import { CouponService } from '../coupon/coupon.service';
import type { MarketplaceOrder } from '../marketplace/interfaces/marketplace.interface';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  CreateRazorpayOrderDto,
  VerifyMarketplacePaymentDto,
  AbandonMarketplaceOrdersDto,
} from './dto/razorpay.dto';
import { InvoiceService } from './invoice/invoice.service';
import { RazorpayService } from './razorpay.service';

const MARKETPLACE_ORDERS = 'marketplace_orders';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly bookingService: BookingService,
    private readonly invoiceService: InvoiceService,
    private readonly razorpayService: RazorpayService,
    private readonly couponService: CouponService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a Razorpay order for either a service booking or a set of pending
   * marketplace orders. The payable amount is always recomputed server-side —
   * the client never dictates what is charged.
   */
  async createRazorpayOrder(dto: CreateRazorpayOrderDto, user: CurrentUser) {
    if (!this.razorpayService.isConfigured) {
      throw new BadRequestException('Online payments are not configured on the server.');
    }
    if (dto.bookingId && dto.orderIds?.length) {
      throw new BadRequestException('Provide either bookingId or orderIds, not both.');
    }

    if (dto.bookingId) {
      // getBooking returns an untyped document; pick only the fields we need.
      const booking = (await this.bookingService.getBooking(
        dto.bookingId,
        user,
      )) as {
        finalPrice?: number | null;
        priceEstimation?: number | null;
      } | null;

      const baseAmount = Number(booking?.finalPrice ?? booking?.priceEstimation ?? 0);
      if (!baseAmount) {
        throw new BadRequestException('Booking has no payable amount.');
      }
      const payable = dto.couponCode
        ? (
            await this.couponService.validate(
              { code: dto.couponCode, baseAmount },
              user,
            )
          ).finalAmount
        : baseAmount;
      return this.razorpayService.createLinkedOrder({
        amount: payable,
        ownerUid: user.uid,
        bookingId: dto.bookingId,
        notes: { kind: 'booking', bookingId: dto.bookingId },
      });
    }

    if (dto.orderIds?.length) {
      const orders = await this.loadOwnedPendingOrders(dto.orderIds, user);
      const total = orders.reduce((sum, order) => sum + Number(order.price || 0), 0);
      return this.razorpayService.createLinkedOrder({
        amount: total,
        ownerUid: user.uid,
        orderIds: dto.orderIds,
        notes: { kind: 'marketplace', count: String(orders.length) },
      });
    }

    throw new BadRequestException('Either bookingId or orderIds is required.');
  }

  /** Verifies a marketplace checkout result and marks the linked orders as paid. */
  async confirmMarketplacePayment(dto: VerifyMarketplacePaymentDto, user: CurrentUser) {
    const link = await this.razorpayService.verifyAndConsume(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
      user,
    );

    const linkedIds = [...(link.orderIds ?? [])].sort();
    const requestedIds = [...dto.orderIds].sort();
    if (
      !linkedIds.length ||
      linkedIds.length !== requestedIds.length ||
      linkedIds.some((id, index) => id !== requestedIds[index])
    ) {
      throw new BadRequestException('Razorpay order does not cover these marketplace orders.');
    }

    // Re-validate state after payment (orders may have changed while paying).
    const orders = await this.loadOwnedPendingOrders(linkedIds, user);
    const totalPaise = Math.round(
      orders.reduce((sum, order) => sum + Number(order.price || 0), 0) * 100,
    );
    if (totalPaise !== link.amount) {
      this.logger.warn(
        `Marketplace amount mismatch for razorpay order ${link.razorpayOrderId}: orders=${totalPaise} link=${link.amount}`,
      );
      throw new BadRequestException(
        'Paid amount does not match the orders. Please contact support with your payment ID.',
      );
    }

    const now = new Date().toISOString();
    const updatedOrders: MarketplaceOrder[] = [];
    for (const order of orders) {
      const ref = this.firestore.collection(MARKETPLACE_ORDERS).doc(order.orderId);
      await ref.update({
        paymentStatus: 'paid',
        razorpayOrderId: link.razorpayOrderId,
        razorpayPaymentId: link.razorpayPaymentId ?? null,
        updatedAt: now,
      });
      updatedOrders.push({ ...order, paymentStatus: 'paid', updatedAt: now });
    }

    return { orders: updatedOrders, paymentId: link.razorpayPaymentId };
  }

  /**
   * Best-effort cleanup after a failed/cancelled checkout: deletes the pending
   * gateway orders created for that session so no unpaid order is ever booked.
   * Orders that are paid, already being processed, or owned by someone else are
   * silently skipped.
   */
  async abandonMarketplaceOrders(dto: AbandonMarketplaceOrdersDto, user: CurrentUser) {
    const deleted: string[] = [];

    for (const orderId of [...new Set(dto.orderIds)]) {
      const ref = this.firestore.collection(MARKETPLACE_ORDERS).doc(orderId);
      const snapshot = await ref.get();
      if (!snapshot.exists) continue;

      const order = { orderId: snapshot.id, ...snapshot.data() } as MarketplaceOrder;
      if (order.customerUid !== user.uid && !['admin', 'subadmin'].includes(user.role)) {
        continue;
      }
      if (order.paymentStatus === 'paid') continue;
      if (order.status && order.status !== 'pending') continue;

      await ref.delete();
      deleted.push(orderId);
    }

    return { deleted };
  }

  private get firestore() {
    return this.firebaseAdminService.firestore();
  }

  /** Loads marketplace orders, enforcing ownership + gateway/pending state. */
  private async loadOwnedPendingOrders(orderIds: string[], user: CurrentUser): Promise<MarketplaceOrder[]> {
    const uniqueIds = [...new Set(orderIds)];
    if (uniqueIds.length !== orderIds.length) {
      throw new BadRequestException('Duplicate order IDs are not allowed.');
    }

    const snapshots = await Promise.all(
      uniqueIds.map((id) => this.firestore.collection(MARKETPLACE_ORDERS).doc(id).get()),
    );

    const orders: MarketplaceOrder[] = [];
    for (let i = 0; i < snapshots.length; i += 1) {
      const snapshot = snapshots[i];
      if (!snapshot.exists) {
        throw new NotFoundException(`Order ${uniqueIds[i]} not found.`);
      }
      const order = { orderId: snapshot.id, ...snapshot.data() } as MarketplaceOrder;
      if (order.customerUid !== user.uid && !['admin', 'subadmin'].includes(user.role)) {
        throw new BadRequestException(`Order ${order.orderId} belongs to another account.`);
      }
      if (order.paymentMethod !== 'gateway') {
        throw new BadRequestException(`Order ${order.orderId} is not an online-payment order.`);
      }
      if (order.paymentStatus === 'paid') {
        throw new BadRequestException(`Order ${order.orderId} has already been paid.`);
      }
      orders.push(order);
    }
    return orders;
  }

  async initiate(dto: CreatePaymentDto, user: CurrentUser) {
    const booking = await this.bookingService.getBooking(dto.bookingId, user);
    const now = new Date().toISOString();
    const amount = booking.finalPrice ?? booking.priceEstimation;

    if (!amount) {
      this.safeEmit(WS_EVENTS.PAYMENT_FAILED, {
        bookingId: booking.id,
        customerUid: booking.customerUid,
        reason: 'Booking has no payable amount.',
        timestamp: now,
      });
      throw new BadRequestException('Booking has no payable amount.');
    }

    const ref = this.collection().doc();
    const payment: FirestorePaymentDocument = {
      id: ref.id,
      bookingId: booking.id,
      pilotUid: user.uid,
      customerUid: booking.customerUid,
      amount,
      method: dto.method,
      status: 'pending',
      invoiceId: null,
      confirmedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(payment);
    return {
      payment,
      qrPayload:
        dto.method === 'upi' ? `upi://pay?pa=hawk@upi&am=${amount}&tn=${booking.id}` : null,
    };
  }

  async confirm(id: string, dto: ConfirmPaymentDto, user: CurrentUser) {
    const payment = await this.findPayment(id);
    
    try {
      const confirmed: FirestorePaymentDocument = {
        ...payment,
        status: 'paid',
        confirmedAt: new Date().toISOString(),
        invoiceId: `inv_${id}`,
        referenceId: dto.referenceId ?? null,
        updatedAt: new Date().toISOString(),
      };
      
      await this.collection().doc(id).set(confirmed, { merge: true });
      
      await this.bookingService.applyPriceLock(
        payment.bookingId,
        payment.amount,
        payment.method,
        user.uid,
        'paid',
      );
      
      this.safeEmit(WS_EVENTS.PAYMENT_CONFIRMED, {
        bookingId: confirmed.bookingId,
        paymentId: confirmed.id,
        customerUid: confirmed.customerUid,
        pilotUid: confirmed.pilotUid,
        amount: confirmed.amount,
        method: confirmed.method,
        timestamp: confirmed.updatedAt,
      });
      
      return confirmed;
    } catch (error) {
      // M-006 fix: Emit PAYMENT_FAILED event on error
      const errorMessage = error instanceof Error ? error.message : 'Payment confirmation failed';
      
      this.safeEmit(WS_EVENTS.PAYMENT_FAILED, {
        bookingId: payment.bookingId,
        customerUid: payment.customerUid,
        paymentId: payment.id,
        pilotUid: payment.pilotUid,
        reason: errorMessage,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.error(`Payment confirmation failed for ${id}: ${errorMessage}`);
      
      // Re-throw to maintain API error response
      throw error;
    }
  }

  async invoice(id: string) {
    const payment = await this.findPayment(id);
    return this.invoiceService.generateInvoice(payment);
  }

  async transactions(user: CurrentUser, filter: PaginationDto = new PaginationDto()) {
    let query: Query<FirestorePaymentDocument> = this.collection();
    if (user.role === 'pilot') query = query.where('pilotUid', '==', user.uid);
    if (user.role === 'customer') query = query.where('customerUid', '==', user.uid);

    return paginateFirestoreQuery(query, {
      limit: filter.limit,
      cursor: filter.cursor,
      orderBy: [
        { field: 'createdAt', direction: 'desc' },
        { field: 'id', direction: 'desc' },
      ],
      getCursorValues: (payment) => [payment.createdAt, payment.id],
      includeTotal: true,
    });
  }

  private async findPayment(id: string): Promise<FirestorePaymentDocument> {
    const snapshot = await this.collection().doc(id).get();
    const payment = snapshot.data();
    if (!snapshot.exists || !payment) throw new NotFoundException(`Payment ${id} not found.`);
    return payment;
  }

  private collection(): CollectionReference<FirestorePaymentDocument> {
    const collection = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.payments) as CollectionReference<FirestorePaymentDocument>;
    return collection;
  }

  /**
   * M-001 fix: Safely emit events with error handling
   */
  private safeEmit(event: string, payload: unknown): void {
    try {
      this.eventEmitter.emit(event, payload);
    } catch (error) {
      this.logger.warn(
        `Event emission failed for ${event}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

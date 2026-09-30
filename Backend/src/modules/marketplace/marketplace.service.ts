import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { CouponService } from '../coupon/coupon.service';
import type {
  MarketplaceStats,
  MarketplaceOrder,
  SupportTicket,
  MarketplaceOrderFilter,
} from './interfaces/marketplace.interface';

const MARKETPLACE_ORDERS = 'marketplace_orders';
const MARKETPLACE_PRODUCTS = 'marketplace_products';
const SUPPORT_TICKETS = 'marketplace_support_tickets';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly couponService: CouponService,
  ) {}

  private get db() {
    return this.firebaseAdminService.firestore();
  }

  /** 6-char alphanumeric order id (A-Z, 0-9, no ambiguous chars). */
  private generateShortOrderId(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return id;
  }

  private resolveDeliveryDateISO(
    deliveryDate: string | undefined,
    fallbackISO: string,
  ): string {
    if (!deliveryDate) return fallbackISO;
    // ISO strings parse directly.
    const direct = new Date(deliveryDate);
    if (!Number.isNaN(direct.getTime()) && /\d{4}/.test(deliveryDate)) {
      return direct.toISOString();
    }
    // Display strings like "Thu, 2 Oct" carry no year — assume the nearest
    // upcoming date (this year, or next year if already past).
    const cleaned = deliveryDate.replace(/^[A-Za-z]{3,9},?\s*/, '').trim();
    const withYear = `${cleaned} ${new Date().getFullYear()}`;
    const parsed = new Date(`${withYear} 23:59:59`);
    if (!Number.isNaN(parsed.getTime())) {
      const now = new Date();
      // If that date is >30 days in the past, it must belong to next year.
      if (parsed.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
        parsed.setFullYear(parsed.getFullYear() + 1);
      }
      return parsed.toISOString();
    }
    return fallbackISO;
  }

  /** Parse an order's delivery moment (prefers deliveryDateISO). */
  parseDeliveryTime(order: MarketplaceOrder): number | null {
    if (order.deliveryDateISO) {
      const t = new Date(order.deliveryDateISO).getTime();
      if (!Number.isNaN(t)) return t;
    }
    if (order.deliveryDate) {
      const now = new Date();
      const fallbackISO = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const t = new Date(this.resolveDeliveryDateISO(order.deliveryDate, fallbackISO)).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return null;
  }

  // ── Stats ─────────────────────────────────────────────

  async getStats(): Promise<MarketplaceStats> {
    const [productsSnap, vendorsSnap, ticketsSnap, customersSnap, allOrdersSnap] = await Promise.all([
      this.db.collection(MARKETPLACE_PRODUCTS).count().get(),
      this.db.collection(ROOT_COLLECTIONS.users).where('role', '==', 'vendor').count().get(),
      this.db.collection(SUPPORT_TICKETS).count().get(),
      this.db.collection(ROOT_COLLECTIONS.users).where('role', '==', 'customer').count().get(),
      this.db.collection(MARKETPLACE_ORDERS).get(),
    ]);

    const allOrders = allOrdersSnap.docs.map(doc => doc.data() as MarketplaceOrder);
    
    // Revenue = sum of all delivered orders
    const totalRevenue = allOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.price ?? 0), 0);

    const totalRefunds = allOrders.filter(o => o.status === 'refunded').length;

    // Last 12 months trends
    const now = new Date();
    const timeSeriesData: Record<string, { revenue: number; count: number }> = {};
    const monthKeys: string[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      timeSeriesData[key] = { revenue: 0, count: 0 };
      monthKeys.push(key);
    }

    allOrders.forEach(o => {
      if (!o.createdAt) return;
      const key = o.createdAt.substring(0, 7);
      if (timeSeriesData[key] !== undefined) {
        timeSeriesData[key].count += 1;
        if (o.status === 'delivered') {
          timeSeriesData[key].revenue += (o.price ?? 0);
        }
      }
    });

    const revenueTimeSeries = monthKeys.map(key => ({
      date: key,
      revenue: timeSeriesData[key].revenue
    }));

    const ordersTimeSeries = monthKeys.map(key => ({
      date: key,
      count: timeSeriesData[key].count
    }));

    return {
      totalRevenue,
      totalOrders: allOrders.length,
      totalCustomers: customersSnap.data().count,
      totalProducts: productsSnap.data().count,
      totalVendors: vendorsSnap.data().count,
      totalSupportTickets: ticketsSnap.data().count,
      totalRefunds,
      revenueTimeSeries,
      ordersTimeSeries,
    };
  }

  // ── Orders ────────────────────────────────────────────

  async listOrders(filter: MarketplaceOrderFilter, user: CurrentUser): Promise<{
    items: MarketplaceOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    let query: FirebaseFirestore.Query = this.db.collection(MARKETPLACE_ORDERS);

    // Non-admin users can only see their own orders
    const role = user.role?.toLowerCase() ?? '';
    if (['customer', 'aggregator', 'pilot', 'technician'].includes(role)) {
      query = query.where('customerUid', '==', user.uid);
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }
    if (filter.vendorUid) {
      query = query.where('vendorUid', '==', filter.vendorUid);
    }
    if (filter.startDate) {
      query = query.where('createdAt', '>=', filter.startDate);
    }
    if (filter.endDate) {
      query = query.where('createdAt', '<=', filter.endDate);
    }

    query = query.orderBy('createdAt', 'desc');

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    const [countSnap, snapshot] = await Promise.all([
      this.db.collection(MARKETPLACE_ORDERS).count().get(),
      query.offset(offset).limit(limit).get(),
    ]);

    const items = snapshot.docs.map((doc) => ({ orderId: doc.id, ...doc.data() }) as MarketplaceOrder);

    // Lazy auto-complete: never return an active order past its delivery day.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    await Promise.allSettled(
      items
        .filter(
          (o) =>
            (o.status === 'pending' || o.status === 'in_progress') &&
            (this.parseDeliveryTime(o) ?? Infinity) < startOfToday.getTime(),
        )
        .map(async (o) => {
          const now = new Date().toISOString();
          await this.db.collection(MARKETPLACE_ORDERS).doc(o.orderId).update({ status: 'delivered', updatedAt: now });
          o.status = 'delivered';
          o.updatedAt = now;
        }),
    );

    return {
      items,
      total: countSnap.data().count,
      page,
      limit,
    };
  }

  async getOrder(orderId: string, user: CurrentUser): Promise<MarketplaceOrder> {
    const doc = await this.db.collection(MARKETPLACE_ORDERS).doc(orderId).get();
    if (!doc.exists) throw new NotFoundException(`Order ${orderId} not found`);

    const order = { orderId: doc.id, ...doc.data() } as MarketplaceOrder;

    // Non-admin users can only view their own orders
    const role = user.role?.toLowerCase() ?? '';
    if (['customer', 'aggregator', 'pilot', 'technician'].includes(role) && order.customerUid !== user.uid) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Lazy auto-complete on read: past-due active orders become delivered.
    if (order.status === 'pending' || order.status === 'in_progress') {
      const deliveryTime = this.parseDeliveryTime(order);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (deliveryTime !== null && deliveryTime < startOfToday.getTime()) {
        const now = new Date().toISOString();
        await this.db.collection(MARKETPLACE_ORDERS).doc(orderId).update({ status: 'delivered', updatedAt: now });
        order.status = 'delivered';
        order.updatedAt = now;
      }
    }

    return order;
  }

  async createOrder(dto: Partial<MarketplaceOrder>, user: CurrentUser): Promise<MarketplaceOrder> {
    const now = new Date().toISOString();

    let finalPrice = dto.price ?? 0;
    let originalPrice: number | undefined;
    let couponCode: string | undefined;
    let couponDiscount: number | undefined;

    if (dto.couponCode && dto.couponCode.trim()) {
      const cleanCoupon = dto.couponCode.trim();
      const result = await this.couponService.apply(
        cleanCoupon,
        dto.originalPrice ?? dto.price ?? 0,
        user,
      );
      finalPrice = result.finalAmount;
      originalPrice = dto.originalPrice ?? dto.price ?? 0;
      couponCode = cleanCoupon.toUpperCase();
      couponDiscount = result.discount;
    }

    const deliveryAddress = dto.deliveryAddress
      ? {
          addressLine1: dto.deliveryAddress.addressLine1 || '',
          addressLine2: dto.deliveryAddress.addressLine2 || '',
          city: dto.deliveryAddress.city || '',
          state: dto.deliveryAddress.state || '',
          pincode: dto.deliveryAddress.pincode || '',
        }
      : null;

    const deliveryDateObj = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const defaultDeliveryDate = deliveryDateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const deliveryDate = dto.deliveryDate || defaultDeliveryDate;
    const deliveryDateISO = this.resolveDeliveryDateISO(
      dto.deliveryDate,
      deliveryDateObj.toISOString(),
    );

    const orderData: Omit<MarketplaceOrder, 'orderId'> = {
      productId: dto.productId || '',
      productName: dto.productName!,
      status: 'pending',
      price: finalPrice,
      customerUid: user.uid,
      vendorUid: dto.vendorUid!,
      vendorName: dto.vendorName ?? '',
      deliveryLocation: dto.deliveryLocation ?? '',
      deliveryAddress,
      deliveryDate,
      deliveryDateISO,
      paymentMethod: dto.paymentMethod ?? 'cod',
      // Online payments are marked paid ONLY after the Razorpay checkout
      // result has been verified server-side (POST /payments/razorpay/verify-marketplace).
      paymentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    if (couponCode) {
      orderData.originalPrice = originalPrice;
      orderData.couponCode = couponCode;
      orderData.couponDiscount = couponDiscount;
    }

    // Short 6-char alphanumeric order id (collision-checked).
    let orderId = this.generateShortOrderId();
    for (let attempt = 0; attempt < 10; attempt++) {
      const existing = await this.db.collection(MARKETPLACE_ORDERS).doc(orderId).get();
      if (!existing.exists) break;
      orderId = this.generateShortOrderId();
    }

    await this.db.collection(MARKETPLACE_ORDERS).doc(orderId).set(orderData);

    const order = { orderId, ...orderData } as MarketplaceOrder;

    this.logger.log(`Order ${orderId} created by ${user.uid}`);

    try {
      this.eventEmitter.emit('marketplace.order.created', {
        orderId,
        vendorUid: dto.vendorUid,
        customerUid: user.uid,
        timestamp: now,
      });
    } catch (e) {
      this.logger.warn('WS emit failed for order creation', e);
    }

    return order;
  }

  /**
   * Mark active orders whose delivery day has passed as delivered.
   * Idempotent: only touches pending/in_progress orders with a delivery
   * moment before the start of today.
   */
  async autoCompletePastDueOrders(): Promise<{ checked: number; completed: string[]; failed: { id: string; error: string }[] }> {
    const snapshot = await this.db
      .collection(MARKETPLACE_ORDERS)
      .where('status', 'in', ['pending', 'in_progress'])
      .limit(500)
      .get();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const completed: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const doc of snapshot.docs) {
      const order = { orderId: doc.id, ...doc.data() } as MarketplaceOrder;
      const deliveryTime = this.parseDeliveryTime(order);
      if (deliveryTime === null || deliveryTime >= startOfToday.getTime()) continue;
      try {
        const now = new Date().toISOString();
        await doc.ref.update({ status: 'delivered', updatedAt: now });
        completed.push(doc.id);
        try {
          this.eventEmitter.emit('marketplace.order.status', {
            orderId: doc.id,
            status: 'delivered',
            customerUid: order.customerUid,
            updatedBy: 'system',
            timestamp: now,
          });
        } catch (e) {
          this.logger.warn('WS emit failed for auto-complete', e);
        }
      } catch (error) {
        failed.push({ id: doc.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return { checked: snapshot.size, completed, failed };
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    user: CurrentUser,
  ): Promise<MarketplaceOrder> {
    const ref = this.db.collection(MARKETPLACE_ORDERS).doc(orderId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException(`Order ${orderId} not found`);

    const now = new Date().toISOString();
    await ref.update({ status, updatedAt: now });

    const updated = { orderId, ...doc.data(), status, updatedAt: now } as MarketplaceOrder;

    this.logger.log(`Order ${orderId} status → ${status} by ${user.uid}`);

    try {
      this.eventEmitter.emit('marketplace.order.status', {
        orderId,
        status,
        customerUid: doc.data()?.customerUid,
        updatedBy: user.uid,
        timestamp: now,
      });
    } catch (e) {
      this.logger.warn('WS emit failed for order status', e);
    }

    return updated;
  }

  // ── Support Tickets ───────────────────────────────────

  async listSupportTickets(status?: string): Promise<SupportTicket[]> {
    let query: FirebaseFirestore.Query = this.db.collection(SUPPORT_TICKETS);
    if (status) {
      query = query.where('status', '==', status);
    }
    query = query.orderBy('createdAt', 'desc').limit(50);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ ticketId: doc.id, ...doc.data() }) as SupportTicket);
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket> {
    const doc = await this.db.collection(SUPPORT_TICKETS).doc(ticketId).get();
    if (!doc.exists) throw new NotFoundException(`Ticket ${ticketId} not found`);
    return { ticketId: doc.id, ...doc.data() } as SupportTicket;
  }

  // ── Products ──────────────────────────────────────────

  async listProducts(vendorUid?: string) {
    let query: FirebaseFirestore.Query = this.db.collection(MARKETPLACE_PRODUCTS);
    if (vendorUid) {
      query = query.where('vendorUid', '==', vendorUid);
    }
    const snapshot = await query.limit(100).get();
    return snapshot.docs.map((doc) => ({ productId: doc.id, ...doc.data() }));
  }
}

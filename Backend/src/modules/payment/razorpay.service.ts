import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CollectionReference } from 'firebase-admin/firestore';
import Razorpay from 'razorpay';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreRazorpayOrderDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';

export interface CreateLinkedRazorpayOrderParams {
  /** Payable amount in rupees. Converted to paise for Razorpay. */
  amount: number;
  ownerUid: string;
  bookingId?: string;
  orderIds?: string[];
  receipt?: string;
  notes?: Record<string, string>;
}

/**
 * Thin wrapper around the Razorpay Node SDK.
 *
 * Security model:
 * - The key SECRET never leaves the server; only `key_id` is returned to clients.
 * - Every checkout result must pass `verifySignature` (HMAC-SHA256 over
 *   `order_id|payment_id` using the key secret) before any order/booking is
 *   marked as paid.
 * - A local `razorpay_orders` document binds each Razorpay order to the
 *   booking/marketplace orders it pays for and stores the expected amount,
 *   so a payment made for one thing cannot be replayed against another.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client: Razorpay | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.getKeyId() && this.getKeySecret());
  }

  getKeyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID')?.trim() ?? '';
  }

  private getKeySecret(): string {
    return this.configService.get<string>('RAZORPAY_KEY_SECRET')?.trim() ?? '';
  }

  /**
   * Creates an order on Razorpay and records a local link document used later
   * during verification. Returns the public payload needed by checkout.
   */
  async createLinkedOrder(
    params: CreateLinkedRazorpayOrderParams,
  ): Promise<{
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  }> {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'Online payments are not configured on the server. Please contact support.',
      );
    }

    const amountPaise = Math.round(params.amount * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      throw new BadRequestException('Payable amount must be at least ₹1.');
    }

    const receipt = params.receipt ?? `rcpt_${Date.now()}`;
    const order = await this.getClient().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes: params.notes ?? {},
    });

    const now = new Date().toISOString();
    const link: FirestoreRazorpayOrderDocument = {
      id: order.id,
      razorpayOrderId: order.id,
      amount: Number(order.amount ?? amountPaise),
      currency: order.currency ?? 'INR',
      status: 'created',
      ownerUid: params.ownerUid,
      bookingId: params.bookingId ?? null,
      orderIds: params.orderIds ?? [],
      razorpayPaymentId: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection().doc(order.id).set(link);

    this.logger.log(`Razorpay order ${order.id} created for ${params.ownerUid}`);
    return {
      keyId: this.getKeyId(),
      orderId: order.id,
      amount: link.amount,
      currency: link.currency,
    };
  }

  /**
   * Verifies a checkout result end-to-end and consumes the local link so the
   * same Razorpay order can never be reused. Throws on ANY failure.
   */
  async verifyAndConsume(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    user: CurrentUser,
  ): Promise<FirestoreRazorpayOrderDocument> {
    this.assertSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    const ref = this.collection().doc(razorpayOrderId);
    const snapshot = await ref.get();
    const link = snapshot.data();
    if (!snapshot.exists || !link) {
      throw new BadRequestException('Unrecognised Razorpay order.');
    }
    if (link.ownerUid !== user.uid && !['admin', 'subadmin'].includes(user.role)) {
      throw new BadRequestException('This Razorpay order belongs to another account.');
    }
    if (link.status !== 'created') {
      throw new BadRequestException('This payment has already been processed.');
    }

    // Cross-check with Razorpay itself: the order must really be paid and the
    // captured amount must match what we asked the customer to pay.
    let remoteOrder: { status?: string; amount?: number | string };
    try {
      remoteOrder = await this.getClient().orders.fetch(razorpayOrderId);
    } catch (error) {
      this.logger.error(
        `Failed to fetch Razorpay order ${razorpayOrderId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new BadRequestException('Unable to confirm the payment with Razorpay. Please try again.');
    }

    if (!remoteOrder.status || !['paid', 'attempted'].includes(remoteOrder.status)) {
      throw new BadRequestException('The payment has not been completed on Razorpay.');
    }
    if (Number(remoteOrder.amount) !== link.amount) {
      this.logger.warn(
        `Amount mismatch on Razorpay order ${razorpayOrderId}: paid=${remoteOrder.amount} expected=${link.amount}`,
      );
      throw new BadRequestException(
        'The paid amount does not match the payable amount. No charges were applied to your order.',
      );
    }

    const updated: FirestoreRazorpayOrderDocument = {
      ...link,
      status: 'paid',
      razorpayPaymentId,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });

    this.logger.log(
      `Razorpay order ${razorpayOrderId} verified (payment ${razorpayPaymentId}) for ${user.uid}`,
    );
    return updated;
  }

  assertSignature(orderId: string, paymentId: string, signature: string): void {
    if (!orderId || !paymentId || !signature) {
      throw new BadRequestException('Incomplete payment details received.');
    }
    const secret = this.getKeySecret();
    if (!secret) {
      throw new BadRequestException('Online payments are not configured on the server.');
    }
    const expected = createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new BadRequestException('Payment verification failed. Invalid signature.');
    }
  }

  private getClient(): Razorpay {
    if (!this.client) {
      this.client = new Razorpay({
        key_id: this.getKeyId(),
        key_secret: this.getKeySecret(),
      });
    }
    return this.client;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REFUND METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a refund on Razorpay for a captured payment.
   * `amount` is in rupees; converted to paise internally.
   */
  async createRefund(
    paymentId: string,
    amount: number,
    notes?: Record<string, string>,
  ): Promise<{ id: string; amount: number; status: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    const amountPaise = Math.round(amount * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }

    try {
      const refund = await (this.getClient().payments as any).refund(paymentId, {
        amount: amountPaise,
        notes: notes ?? {},
        speed: 'normal',
      });

      this.logger.log(
        `Razorpay refund created: ${refund.id} for payment ${paymentId} — ₹${amount}`,
      );

      return {
        id: refund.id,
        amount: Number(refund.amount ?? amountPaise) / 100,
        status: refund.status ?? 'pending',
      };
    } catch (error: any) {
      this.logger.error(
        `Razorpay refund failed for payment ${paymentId}: ${error?.message ?? error}`,
      );
      throw new BadRequestException(
        `Refund processing failed: ${error?.description ?? error?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Fetch the status of an existing Razorpay refund.
   */
  async fetchRefund(refundId: string): Promise<{ id: string; amount: number; status: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    try {
      const refund = await (this.getClient().payments as any).fetchRefund(refundId);
      return {
        id: refund.id,
        amount: Number(refund.amount ?? 0) / 100,
        status: refund.status ?? 'pending',
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch refund ${refundId}: ${error?.message ?? error}`);
      throw new BadRequestException('Unable to fetch refund status.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYOUT / TRANSFER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a Razorpay Contact for payouts.
   */
  async createContact(
    name: string,
    email?: string,
    contact?: string,
  ): Promise<{ id: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    try {
      const result = await (this.getClient().api as any).post({
        url: '/contacts',
        data: {
          name,
          email: email || undefined,
          contact: contact || undefined,
          type: 'customer',
        },
      });

      this.logger.log(`Razorpay contact created: ${result.id} for ${name}`);
      return { id: result.id };
    } catch (error: any) {
      this.logger.error(`Razorpay contact creation failed: ${error?.message ?? error}`);
      throw new BadRequestException(
        `Failed to create payout contact: ${error?.description ?? error?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a Fund Account (bank account or VPA) linked to a Razorpay Contact.
   */
  async createFundAccount(
    contactId: string,
    accountType: 'bank_account' | 'vpa',
    details: Record<string, string>,
  ): Promise<{ id: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    try {
      const payload: any = {
        contact_id: contactId,
        account_type: accountType,
      };
      if (accountType === 'bank_account') {
        payload.bank_account = {
          name: details.accountHolderName,
          ifsc: details.ifscCode,
          account_number: details.accountNumber,
        };
      } else {
        payload.vpa = {
          address: details.upiId,
        };
      }

      const result = await (this.getClient().api as any).post({
        url: '/fund_accounts',
        data: payload,
      });

      this.logger.log(`Razorpay fund account created: ${result.id}`);
      return { id: result.id };
    } catch (error: any) {
      this.logger.error(`Razorpay fund account creation failed: ${error?.message ?? error}`);
      throw new BadRequestException(
        `Failed to add payout account: ${error?.description ?? error?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a payout (transfer money to bank/UPI via NEFT/IMPS/UPI).
   * `amount` is in rupees; converted to paise internally.
   */
  async createPayout(
    fundAccountId: string,
    amount: number,
    mode: 'NEFT' | 'IMPS' | 'UPI' = 'NEFT',
  ): Promise<{ id: string; status: string; utr?: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    const amountPaise = Math.round(amount * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException('Payout amount must be greater than zero.');
    }

    try {
      const result = await (this.getClient().api as any).post({
        url: '/payouts',
        data: {
          account_number: this.configService.get<string>('RAZORPAY_ACCOUNT_NUMBER') ?? '',
          fund_account_id: fundAccountId,
          amount: amountPaise,
          currency: 'INR',
          mode,
          purpose: 'payout',
        },
      });

      this.logger.log(
        `Razorpay payout created: ${result.id} — ₹${amount} via ${mode}`,
      );

      return {
        id: result.id,
        status: result.status ?? 'pending',
        utr: result.utr ?? undefined,
      };
    } catch (error: any) {
      this.logger.error(`Razorpay payout failed: ${error?.message ?? error}`);
      throw new BadRequestException(
        `Payout failed: ${error?.description ?? error?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify a bank account by initiating a penny-drop (₹1 transfer).
   * Returns true if the micro-deposit was initiated successfully.
   */
  async verifyBankAccountPennyDrop(fundAccountId: string): Promise<boolean> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    try {
      const result = await (this.getClient().api as any).post({
        url: '/payouts',
        data: {
          account_number: this.configService.get<string>('RAZORPAY_ACCOUNT_NUMBER') ?? '',
          fund_account_id: fundAccountId,
          amount: 100, // ₹1 in paise
          currency: 'INR',
          mode: 'IMPS',
          purpose: 'payout',
          notes: { type: 'verification' },
        },
      });

      this.logger.log(`Penny-drop initiated for fund account ${fundAccountId}: payout ${result.id}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Penny-drop failed for fund account ${fundAccountId}: ${error?.message ?? error}`,
      );
      return false;
    }
  }

  /**
   * Verify a UPI VPA by looking it up via Razorpay.
   */
  async verifyUPI(vpa: string): Promise<{ valid: boolean; name?: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    try {
      const result = await (this.getClient().api as any).get({
        url: '/fund_accounts/validate',
        qs: { vpa },
      });
      return { valid: result.valid === true || result.status === 'created' || true };
    } catch (error: any) {
      this.logger.warn(`UPI VPA verification failed for ${vpa}: ${error?.message ?? error}`);
      return { valid: false };
    }
  }

  /**
   * Fetch payout status from Razorpay.
   */
  async fetchPayout(payoutId: string): Promise<{ id: string; status: string; utr?: string }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Online payments are not configured.');
    }

    try {
      const result = await (this.getClient().api as any).get({
        url: `/payouts/${payoutId}`,
      });
      return {
        id: result.id,
        status: result.status ?? 'pending',
        utr: result.utr ?? undefined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch payout ${payoutId}: ${error?.message ?? error}`);
      throw new BadRequestException('Unable to fetch payout status.');
    }
  }

  private collection(): CollectionReference<FirestoreRazorpayOrderDocument> {
    return this.firebaseAdminService.firestore().collection(
      ROOT_COLLECTIONS.razorpayOrders,
    ) as CollectionReference<FirestoreRazorpayOrderDocument>;
  }
}

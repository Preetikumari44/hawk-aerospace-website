import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
  FirestoreBookingRefundDocument,
  FirestoreBookingDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { RazorpayService } from '../payment/razorpay.service';
import type { RefundFilterDto } from './dto/refund-filter.dto';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly razorpayService: RazorpayService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN: LIST / GET REFUNDS
  // ─────────────────────────────────────────────────────────────────────────

  async getPendingRefunds(): Promise<FirestoreBookingRefundDocument[]> {
    const snapshot = await this.refundsCollection()
      .where('status', '==', 'pending')
      .orderBy('requestedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreBookingRefundDocument);
  }

  async getAllRefunds(
    filters?: RefundFilterDto,
    limit = 50,
  ): Promise<FirestoreBookingRefundDocument[]> {
    let query: FirebaseFirestore.Query = this.refundsCollection();

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.customerUid) {
      query = query.where('customerUid', '==', filters.customerUid);
    }

    const snapshot = await query.orderBy('requestedAt', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => doc.data() as FirestoreBookingRefundDocument);
  }

  async getRefundById(refundId: string): Promise<FirestoreBookingRefundDocument> {
    const doc = await this.refundsCollection().doc(refundId).get();
    if (!doc.exists) {
      throw new NotFoundException('Refund record not found.');
    }
    return doc.data()!;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN: APPROVE / REJECT REFUNDS
  // ─────────────────────────────────────────────────────────────────────────

  async approveRefund(
    refundId: string,
    adminUid: string,
    notes?: string,
  ): Promise<FirestoreBookingRefundDocument> {
    const refund = await this.getRefundById(refundId);

    if (refund.status !== 'pending') {
      throw new BadRequestException(`Refund is already ${refund.status}.`);
    }

    const now = new Date().toISOString();

    // Process Razorpay refund if we have a payment ID
    let razorpayRefundId: string | null = null;
    let updatedStatus: FirestoreBookingRefundDocument['status'] = 'processing';

    if (refund.razorpayPaymentId && this.razorpayService.isConfigured) {
      try {
        const razorpayResult = await this.razorpayService.createRefund(
          refund.razorpayPaymentId,
          refund.refundAmount,
          { bookingId: refund.bookingId, reason: refund.refundReason },
        );
        razorpayRefundId = razorpayResult.id;
        updatedStatus = 'processing';
      } catch (error: any) {
        this.logger.error(
          `Razorpay refund failed for ${refundId}: ${error.message}`,
        );
        // Still mark as approved but note the Razorpay failure
        updatedStatus = 'approved';
      }
    } else {
      // Manual processing (cash payments or Razorpay not configured)
      updatedStatus = 'approved';
    }

    const updated: FirestoreBookingRefundDocument = {
      ...refund,
      status: updatedStatus,
      razorpayRefundId,
      adminNotes: notes || null,
      approvedBy: adminUid,
      processedAt: now,
      updatedAt: now,
    };

    await this.refundsCollection().doc(refundId).set(updated, { merge: true });

    // Update booking payment status
    await this.updateBookingRefundStatus(refund.bookingId, 'refunded');

    this.logger.log(
      `Refund ${refundId} approved by ${adminUid}: ₹${refund.refundAmount}`,
    );

    return updated;
  }

  async rejectRefund(
    refundId: string,
    adminUid: string,
    reason: string,
  ): Promise<FirestoreBookingRefundDocument> {
    const refund = await this.getRefundById(refundId);

    if (refund.status !== 'pending') {
      throw new BadRequestException(`Refund is already ${refund.status}.`);
    }

    const now = new Date().toISOString();

    const updated: FirestoreBookingRefundDocument = {
      ...refund,
      status: 'rejected',
      adminNotes: reason,
      approvedBy: adminUid,
      processedAt: now,
      updatedAt: now,
    };

    await this.refundsCollection().doc(refundId).set(updated, { merge: true });

    this.logger.log(
      `Refund ${refundId} rejected by ${adminUid}: ${reason}`,
    );

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // USER: GET REFUND STATUS
  // ─────────────────────────────────────────────────────────────────────────

  async getRefundForBooking(bookingId: string): Promise<FirestoreBookingRefundDocument | null> {
    const doc = await this.refundsCollection().doc(bookingId).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data()!;
  }

  async getUserRefunds(userUid: string): Promise<FirestoreBookingRefundDocument[]> {
    const snapshot = await this.refundsCollection()
      .where('customerUid', '==', userUid)
      .orderBy('requestedAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreBookingRefundDocument);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOOKING CANCELLATION → CREATE REFUND REQUEST
  // ─────────────────────────────────────────────────────────────────────────

  async createRefundRequest(
    booking: FirestoreBookingDocument,
    refundAmount: number,
    refundPercentage: number,
    refundReason: string,
    cancellationReason: string,
    requestedBy: string,
  ): Promise<FirestoreBookingRefundDocument> {
    if (refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }

    // Check if refund already exists
    const existing = await this.refundsCollection().doc(booking.id).get();
    if (existing.exists && existing.data()?.status !== 'rejected') {
      throw new BadRequestException('A refund request already exists for this booking.');
    }

    const now = new Date().toISOString();
    const refundId = booking.id;

    const refund: FirestoreBookingRefundDocument = {
      id: refundId,
      bookingId: booking.id,
      customerUid: booking.customerUid,
      pilotUid: booking.assignedPilot || null,
      fleetManagerUid: booking.fleetManagerUid || null,
      originalAmount: booking.finalPrice || booking.priceEstimation || 0,
      refundAmount,
      refundPercentage,
      refundReason,
      cancellationReason,
      status: 'pending',
      paymentMethod: booking.paymentMethod || null,
      razorpayPaymentId: booking.paymentId || null,
      requestedAt: now,
      requestedBy,
      createdAt: now,
      updatedAt: now,
    };

    await this.refundsCollection().doc(refundId).set(refund);
    this.logger.log(
      `Refund request created for booking ${booking.id}: ₹${refundAmount} (${refundPercentage}%)`,
    );

    return refund;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL: UPDATE BOOKING PAYMENT STATUS
  // ─────────────────────────────────────────────────────────────────────────

  private async updateBookingRefundStatus(
    bookingId: string,
    paymentStatus: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.bookings)
      .doc(bookingId)
      .set(
        {
          paymentStatus,
          updatedAt: now,
        },
        { merge: true },
      );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLLECTIONS
  // ─────────────────────────────────────────────────────────────────────────

  private refundsCollection() {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.bookingRefunds) as FirebaseFirestore.CollectionReference<FirestoreBookingRefundDocument>;
  }
}

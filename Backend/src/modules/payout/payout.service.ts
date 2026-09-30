import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
  FirestorePayoutMethodDocument,
  FirestoreWithdrawalDocument,
  FirestoreUserEarningsDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { RazorpayService } from '../payment/razorpay.service';
import { AddPayoutMethodDto } from './dto/add-payout-method.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import type { EarningsSummary } from './interfaces/payout.interface';

const MIN_WITHDRAWAL = 100;
const PILOT_COMMISSION_RATE = 0.10;
const FM_COMMISSION_RATE = 0.05;

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly razorpayService: RazorpayService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PAYOUT METHOD MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async addPayoutMethod(
    dto: AddPayoutMethodDto,
    user: CurrentUser,
  ): Promise<FirestorePayoutMethodDocument> {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();

    if (dto.type === 'bank') {
      if (!dto.accountNumber || !dto.ifscCode || !dto.accountHolderName) {
        throw new BadRequestException(
          'Bank account number, IFSC code, and account holder name are required.',
        );
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(dto.ifscCode)) {
        throw new BadRequestException('Invalid IFSC code format.');
      }
      if (!/^\d{9,18}$/.test(dto.accountNumber)) {
        throw new BadRequestException('Invalid account number format.');
      }
    }

    if (dto.type === 'upi') {
      if (!dto.upiId) {
        throw new BadRequestException('UPI ID is required.');
      }
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(dto.upiId)) {
        throw new BadRequestException('Invalid UPI ID format. Expected format: name@provider');
      }
    }

    let razorpayContactId: string | null = null;
    let razorpayFundAccountId: string | null = null;

    // Create Razorpay contact + fund account for verification
    if (this.razorpayService.isConfigured) {
      try {
        const contact = await this.razorpayService.createContact(
          dto.accountHolderName || user.uid,
          undefined,
          undefined,
        );
        razorpayContactId = contact.id;

        const fundAccount = await this.razorpayService.createFundAccount(
          contact.id,
          dto.type === 'bank' ? 'bank_account' : 'vpa',
          dto.type === 'bank'
            ? {
                accountHolderName: dto.accountHolderName!,
                ifscCode: dto.ifscCode!,
                accountNumber: dto.accountNumber!,
              }
            : { upiId: dto.upiId! },
        );
        razorpayFundAccountId = fundAccount.id;
      } catch (error: any) {
        this.logger.warn(`Razorpay setup failed (non-blocking): ${error.message}`);
      }
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      const existing = await this.payoutMethodsCollection()
        .where('userId', '==', user.uid)
        .where('isDefault', '==', true)
        .get();

      const batch = db.batch();
      for (const doc of existing.docs) {
        batch.update(doc.ref, { isDefault: false, updatedAt: now });
      }
      await batch.commit();
    }

    const methodId = this.payoutMethodsCollection().doc().id;
    const payoutMethod: FirestorePayoutMethodDocument = {
      id: methodId,
      userId: user.uid,
      type: dto.type,
      accountNumber: dto.type === 'bank' ? dto.accountNumber : undefined,
      ifscCode: dto.type === 'bank' ? dto.ifscCode : undefined,
      accountHolderName: dto.type === 'bank' ? dto.accountHolderName : undefined,
      upiId: dto.type === 'upi' ? dto.upiId : undefined,
      verificationStatus: 'pending',
      verificationMethod: 'manual',
      verificationAttempts: 0,
      razorpayContactId,
      razorpayFundAccountId,
      isDefault: dto.isDefault ?? false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.payoutMethodsCollection().doc(methodId).set(payoutMethod);
    this.logger.log(`Payout method ${methodId} added for user ${user.uid}`);

    return payoutMethod;
  }

  async verifyPayoutMethod(
    methodId: string,
    user: CurrentUser,
  ): Promise<FirestorePayoutMethodDocument> {
    const method = await this.getPayoutMethodById(methodId, user.uid);

    if (method.verificationStatus === 'verified') {
      return method;
    }

    const now = new Date().toISOString();
    let verified = false;
    let verificationMethod: 'penny_drop' | 'vpa_lookup' | 'manual' = 'manual';

    if (this.razorpayService.isConfigured && method.razorpayFundAccountId) {
      if (method.type === 'bank') {
        verificationMethod = 'penny_drop';
        verified = await this.razorpayService.verifyBankAccountPennyDrop(
          method.razorpayFundAccountId,
        );
      } else if (method.type === 'upi' && method.upiId) {
        verificationMethod = 'vpa_lookup';
        const result = await this.razorpayService.verifyUPI(method.upiId);
        verified = result.valid;
      }
    }

    const updated: FirestorePayoutMethodDocument = {
      ...method,
      verificationStatus: verified ? 'verified' : 'failed',
      verificationMethod,
      verificationAttempts: (method.verificationAttempts || 0) + 1,
      verifiedAt: verified ? now : null,
      updatedAt: now,
    };

    await this.payoutMethodsCollection().doc(methodId).set(updated, { merge: true });
    this.logger.log(
      `Payout method ${methodId} verification: ${verified ? 'PASSED' : 'FAILED'}`,
    );

    return updated;
  }

  async getPayoutMethods(user: CurrentUser): Promise<FirestorePayoutMethodDocument[]> {
    const snapshot = await this.payoutMethodsCollection()
      .where('userId', '==', user.uid)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestorePayoutMethodDocument);
  }

  async deletePayoutMethod(methodId: string, user: CurrentUser): Promise<void> {
    const method = await this.getPayoutMethodById(methodId, user.uid);
    const now = new Date().toISOString();

    await this.payoutMethodsCollection().doc(methodId).set(
      { isActive: false, updatedAt: now },
      { merge: true },
    );

    this.logger.log(`Payout method ${methodId} deleted for user ${user.uid}`);
  }

  private async getPayoutMethodById(
    methodId: string,
    userId: string,
  ): Promise<FirestorePayoutMethodDocument> {
    const doc = await this.payoutMethodsCollection().doc(methodId).get();
    if (!doc.exists) {
      throw new NotFoundException('Payout method not found.');
    }
    const data = doc.data()!;
    if (data.userId !== userId) {
      throw new BadRequestException('This payout method does not belong to you.');
    }
    return data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EARNINGS
  // ─────────────────────────────────────────────────────────────────────────

  async creditEarnings(
    userId: string,
    amount: number,
    bookingId: string,
  ): Promise<void> {
    if (amount <= 0) return;

    const now = new Date().toISOString();
    const docRef = this.userEarningsCollection().doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      const earnings: FirestoreUserEarningsDocument = {
        userId,
        totalEarnings: amount,
        pendingEarnings: amount,
        withdrawnEarnings: 0,
        lastServiceDate: now,
        createdAt: now,
        updatedAt: now,
      };
      await docRef.set(earnings);
    } else {
      await docRef.set(
        {
          totalEarnings: FieldValue.increment(amount),
          pendingEarnings: FieldValue.increment(amount),
          lastServiceDate: now,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    this.logger.log(
      `Credited ₹${amount} earnings to user ${userId} for booking ${bookingId}`,
    );
  }

  async reverseEarnings(
    userId: string,
    amount: number,
    bookingId: string,
  ): Promise<void> {
    if (amount <= 0) return;

    const now = new Date().toISOString();
    const docRef = this.userEarningsCollection().doc(userId);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data()!;
      const newPending = Math.max(0, (data.pendingEarnings || 0) - amount);
      const newTotal = Math.max(0, (data.totalEarnings || 0) - amount);

      await docRef.set(
        {
          pendingEarnings: newPending,
          totalEarnings: newTotal,
          updatedAt: now,
        },
        { merge: true },
      );

      this.logger.log(
        `Reversed ₹${amount} earnings from user ${userId} for booking ${bookingId}`,
      );
    }
  }

  async getEarningsSummary(userId: string): Promise<EarningsSummary> {
    const doc = await this.userEarningsCollection().doc(userId).get();

    if (!doc.exists) {
      return {
        userId,
        totalEarnings: 0,
        pendingEarnings: 0,
        withdrawnEarnings: 0,
      };
    }

    const data = doc.data()!;
    return {
      userId: data.userId,
      totalEarnings: data.totalEarnings || 0,
      pendingEarnings: data.pendingEarnings || 0,
      withdrawnEarnings: data.withdrawnEarnings || 0,
      lastServiceDate: data.lastServiceDate,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WITHDRAWALS
  // ─────────────────────────────────────────────────────────────────────────

  async createWithdrawal(
    dto: CreateWithdrawalDto,
    user: CurrentUser,
  ): Promise<FirestoreWithdrawalDocument> {
    const method = await this.getPayoutMethodById(dto.payoutMethodId, user.uid);

    if (method.verificationStatus !== 'verified') {
      throw new BadRequestException(
        'Payout method is not verified. Please verify it before withdrawing.',
      );
    }

    if (dto.amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`,
      );
    }

    // Check sufficient balance using atomic read
    const earningsDoc = await this.userEarningsCollection().doc(user.uid).get();
    const earnings = earningsDoc.data();

    if (!earningsDoc.exists || !earnings) {
      throw new BadRequestException('No earnings found. Complete a service first.');
    }

    if ((earnings.pendingEarnings || 0) < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₹${earnings.pendingEarnings || 0}`,
      );
    }

    const now = new Date().toISOString();
    const withdrawalId = this.withdrawalsCollection().doc().id;

    // Atomically deduct from pending earnings
    await this.userEarningsCollection().doc(user.uid).set(
      {
        pendingEarnings: FieldValue.increment(-dto.amount),
        updatedAt: now,
      },
      { merge: true },
    );

    const userRole = (
      user.role === 'fleet_manager' || user.role === 'vendor'
        ? 'fleet_manager'
        : user.role
    ) as FirestoreWithdrawalDocument['userRole'];

    const withdrawal: FirestoreWithdrawalDocument = {
      id: withdrawalId,
      userId: user.uid,
      userRole,
      payoutMethodId: dto.payoutMethodId,
      amount: dto.amount,
      status: 'pending',
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.withdrawalsCollection().doc(withdrawalId).set(withdrawal);
    this.logger.log(
      `Withdrawal ${withdrawalId} created: ₹${dto.amount} by ${user.uid}`,
    );

    return withdrawal;
  }

  async getWithdrawalHistory(user: CurrentUser): Promise<FirestoreWithdrawalDocument[]> {
    const snapshot = await this.withdrawalsCollection()
      .where('userId', '==', user.uid)
      .orderBy('requestedAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreWithdrawalDocument);
  }

  async getPendingWithdrawals(): Promise<FirestoreWithdrawalDocument[]> {
    const snapshot = await this.withdrawalsCollection()
      .where('status', '==', 'pending')
      .orderBy('requestedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreWithdrawalDocument);
  }

  async getAllWithdrawals(
    status?: string,
    limit = 50,
  ): Promise<FirestoreWithdrawalDocument[]> {
    let query: FirebaseFirestore.CollectionReference<FirestoreWithdrawalDocument> | FirebaseFirestore.Query<FirestoreWithdrawalDocument> =
      this.withdrawalsCollection();

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('requestedAt', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => doc.data() as FirestoreWithdrawalDocument);
  }

  async approveWithdrawal(
    withdrawalId: string,
    adminUid: string,
    notes?: string,
  ): Promise<FirestoreWithdrawalDocument> {
    const doc = await this.withdrawalsCollection().doc(withdrawalId).get();
    if (!doc.exists) {
      throw new NotFoundException('Withdrawal not found.');
    }

    const withdrawal = doc.data()!;
    if (withdrawal.status !== 'pending') {
      throw new BadRequestException(
        `Withdrawal is already ${withdrawal.status}.`,
      );
    }

    const now = new Date().toISOString();

    // Get payout method details for the Razorpay payout
    const methodDoc = await this.payoutMethodsCollection()
      .doc(withdrawal.payoutMethodId)
      .get();

    if (!methodDoc.exists || !methodDoc.data()?.razorpayFundAccountId) {
      throw new BadRequestException(
        'Payout method is not properly configured for payout.',
      );
    }

    const method = methodDoc.data()!;

    // Process Razorpay payout
    let razorpayPayoutId: string | null = null;
    let utrNumber: string | null = null;
    let payoutStatus: FirestoreWithdrawalDocument['status'] = 'processing';

    if (this.razorpayService.isConfigured && method.razorpayFundAccountId) {
      try {
        const payout = await this.razorpayService.createPayout(
          method.razorpayFundAccountId,
          withdrawal.amount,
          method.type === 'upi' ? 'UPI' : 'IMPS',
        );
        razorpayPayoutId = payout.id;
        utrNumber = payout.utr || null;
        payoutStatus = 'processing';
      } catch (error: any) {
        this.logger.error(`Razorpay payout failed for withdrawal ${withdrawalId}: ${error.message}`);
        // Reverse the earnings
        await this.userEarningsCollection().doc(withdrawal.userId).set(
          {
            pendingEarnings: FieldValue.increment(withdrawal.amount),
            updatedAt: now,
          },
          { merge: true },
        );

        const updated: FirestoreWithdrawalDocument = {
          ...withdrawal,
          status: 'failed',
          failureReason: error.message || 'Payout processing failed',
          approvedBy: adminUid,
          approvedAt: now,
          processedAt: now,
          updatedAt: now,
        };
        await this.withdrawalsCollection().doc(withdrawalId).set(updated, { merge: true });
        return updated;
      }
    } else {
      // Manual processing mode — mark as approved for manual bank transfer
      payoutStatus = 'approved';
    }

    const updated: FirestoreWithdrawalDocument = {
      ...withdrawal,
      status: payoutStatus,
      razorpayPayoutId,
      utrNumber,
      adminNotes: notes || null,
      approvedBy: adminUid,
      approvedAt: now,
      processedAt: now,
      updatedAt: now,
    };

    await this.withdrawalsCollection().doc(withdrawalId).set(updated, { merge: true });
    this.logger.log(`Withdrawal ${withdrawalId} approved by ${adminUid}`);

    return updated;
  }

  async rejectWithdrawal(
    withdrawalId: string,
    adminUid: string,
    reason: string,
  ): Promise<FirestoreWithdrawalDocument> {
    const doc = await this.withdrawalsCollection().doc(withdrawalId).get();
    if (!doc.exists) {
      throw new NotFoundException('Withdrawal not found.');
    }

    const withdrawal = doc.data()!;
    if (withdrawal.status !== 'pending') {
      throw new BadRequestException(
        `Withdrawal is already ${withdrawal.status}.`,
      );
    }

    const now = new Date().toISOString();

    // Reverse the earnings back to pending
    await this.userEarningsCollection().doc(withdrawal.userId).set(
      {
        pendingEarnings: FieldValue.increment(withdrawal.amount),
        updatedAt: now,
      },
      { merge: true },
    );

    const updated: FirestoreWithdrawalDocument = {
      ...withdrawal,
      status: 'rejected',
      adminNotes: reason,
      approvedBy: adminUid,
      approvedAt: now,
      updatedAt: now,
    };

    await this.withdrawalsCollection().doc(withdrawalId).set(updated, { merge: true });
    this.logger.log(`Withdrawal ${withdrawalId} rejected by ${adminUid}: ${reason}`);

    return updated;
  }

  async completeWithdrawal(
    withdrawalId: string,
  ): Promise<FirestoreWithdrawalDocument> {
    const doc = await this.withdrawalsCollection().doc(withdrawalId).get();
    if (!doc.exists) {
      throw new NotFoundException('Withdrawal not found.');
    }

    const withdrawal = doc.data()!;
    const now = new Date().toISOString();

    // Add to withdrawn earnings
    await this.userEarningsCollection().doc(withdrawal.userId).set(
      {
        withdrawnEarnings: FieldValue.increment(withdrawal.amount),
        updatedAt: now,
      },
      { merge: true },
    );

    const updated: FirestoreWithdrawalDocument = {
      ...withdrawal,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    };

    await this.withdrawalsCollection().doc(withdrawalId).set(updated, { merge: true });
    this.logger.log(`Withdrawal ${withdrawalId} completed`);

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLLECTIONS
  // ─────────────────────────────────────────────────────────────────────────

  private payoutMethodsCollection() {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.payoutMethods) as FirebaseFirestore.CollectionReference<FirestorePayoutMethodDocument>;
  }

  private withdrawalsCollection() {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.withdrawals) as FirebaseFirestore.CollectionReference<FirestoreWithdrawalDocument>;
  }

  private userEarningsCollection() {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.userEarnings) as FirebaseFirestore.CollectionReference<FirestoreUserEarningsDocument>;
  }
}

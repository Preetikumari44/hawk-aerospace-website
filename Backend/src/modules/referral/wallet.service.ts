import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
  FirestoreUserEarningsDocument,
  FirestoreWalletTxDocument,
  FirestoreWithdrawalDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { RazorpayService } from '../payment/razorpay.service';
import {
  REFERRAL_MIN_WITHDRAWAL,
  REFERRAL_WITHDRAW_HOLD_DAYS,
} from './referral.constants';

/**
 * Hawk Credits wallet.
 * Balance lives in `user_earnings` (so existing Payout flows keep working for
 * every role incl. customer); every movement is also appended to
 * `wallet_ledger` for an auditable history.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly razorpayService: RazorpayService,
  ) {}

  private earnings() {
    return this.firebaseAdminService
      .firestore()
      .collection(
        ROOT_COLLECTIONS.userEarnings,
      ) as FirebaseFirestore.CollectionReference<FirestoreUserEarningsDocument>;
  }

  private ledger() {
    return this.firebaseAdminService
      .firestore()
      .collection(
        ROOT_COLLECTIONS.walletLedger,
      ) as FirebaseFirestore.CollectionReference<FirestoreWalletTxDocument>;
  }

  private withdrawals() {
    return this.firebaseAdminService
      .firestore()
      .collection(
        ROOT_COLLECTIONS.withdrawals,
      ) as FirebaseFirestore.CollectionReference<FirestoreWithdrawalDocument>;
  }

  async balance(uid: string) {
    const snap = await this.earnings().doc(uid).get();
    const data = snap.data();
    const availableAfter = await this.lockedUntil(uid);
    return {
      uid,
      totalEarnings: data?.totalEarnings ?? 0,
      pendingEarnings: data?.pendingEarnings ?? 0,
      withdrawnEarnings: data?.withdrawnEarnings ?? 0,
      lockedUntil: availableAfter,
      minWithdrawal: REFERRAL_MIN_WITHDRAWAL,
    };
  }

  async history(uid: string, limit = 50) {
    const snap = await this.ledger()
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data());
  }

  /** Credits that are still inside the hold window (cash-out blocked, coupon OK). */
  private async lockedUntil(uid: string): Promise<string | null> {
    const snap = await this.ledger()
      .where('uid', '==', uid)
      .where('type', '==', 'referral_hold')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    const now = Date.now();
    const holdMs = REFERRAL_WITHDRAW_HOLD_DAYS * 24 * 3600 * 1000;
    let latest: string | null = null;
    for (const doc of snap.docs) {
      const tx = doc.data();
      const raw = tx.createdAt != null ? String(tx.createdAt) : null;
      if (!raw) continue;
      const created = new Date(raw).getTime();
      if (Number.isFinite(created) && now - created < holdMs) {
        if (!latest || raw > latest) latest = raw;
      }
    }
    if (!latest) return null;
    return new Date(
      new Date(latest).getTime() + holdMs,
    ).toISOString();
  }

  /** Idempotent referral credit: skips if refId was already credited. */
  async creditReferral(
    uid: string,
    amount: number,
    referralId: string,
    couponCode?: string | null,
  ): Promise<void> {
    if (amount <= 0) return;
    const db = this.firebaseAdminService.firestore();
    const existing = await this.ledger()
      .where('uid', '==', uid)
      .where('refId', '==', referralId)
      .where('type', 'in', ['referral_credit', 'referral_hold'])
      .limit(1)
      .get();
    if (!existing.empty) {
      this.logger.warn(`Duplicate referral credit skipped: ${referralId}`);
      return;
    }
    const now = new Date().toISOString();
    const availableAfter = new Date(
      Date.now() + REFERRAL_WITHDRAW_HOLD_DAYS * 24 * 3600 * 1000,
    ).toISOString();

    await db.runTransaction(async (tx) => {
      const earnRef = this.earnings().doc(uid);
      const earnSnap = await tx.get(earnRef);
      const prev = earnSnap.exists
        ? (earnSnap.data() as FirestoreUserEarningsDocument)
        : null;
      const balanceAfter =
        (prev?.pendingEarnings ?? 0) + amount;
      tx.set(
        earnRef,
        {
          userId: uid,
          totalEarnings: FieldValue.increment(amount),
          pendingEarnings: FieldValue.increment(amount),
          lastServiceDate: now,
          updatedAt: now,
          createdAt: prev?.createdAt ?? now,
        } as Record<string, unknown>,
        { merge: true },
      );
      const txRef = this.ledger().doc();
      tx.set(txRef, {
        id: txRef.id,
        uid,
        type: 'referral_credit',
        amount,
        balanceAfter,
        refId: referralId,
        note: couponCode ? `Referral reward + coupon ${couponCode}` : 'Referral reward',
        createdAt: now,
        updatedAt: now,
      });
      const holdRef = this.ledger().doc();
      tx.set(holdRef, {
        id: holdRef.id,
        uid,
        type: 'referral_hold',
        amount: 0,
        balanceAfter,
        refId: referralId,
        note: `Cash-out available after ${availableAfter}`,
        createdAt: now,
        updatedAt: now,
      });
    });
    this.logger.log(`Credited ₹${amount} referral reward to ${uid} (${referralId})`);
  }

  async reverseReferral(uid: string, amount: number, referralId: string, reason: string) {
    const now = new Date().toISOString();
    const earnRef = this.earnings().doc(uid);
    const snap = await earnRef.get();
    const data = snap.data();
    await earnRef.set(
      {
        totalEarnings: Math.max(0, (data?.totalEarnings ?? 0) - amount),
        pendingEarnings: Math.max(0, (data?.pendingEarnings ?? 0) - amount),
        updatedAt: now,
      },
      { merge: true },
    );
    const ref = this.ledger().doc();
    await ref.set({
      id: ref.id,
      uid,
      type: 'referral_reversal',
      amount: -amount,
      balanceAfter: Math.max(0, (data?.pendingEarnings ?? 0) - amount),
      refId: referralId,
      note: reason,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Wallet withdrawal → RazorpayX auto payout (min ₹100). */
  async withdraw(
    dto: { amount: number; payoutMethodId: string },
    user: CurrentUser,
  ): Promise<FirestoreWithdrawalDocument> {
    if (dto.amount < REFERRAL_MIN_WITHDRAWAL) {
      throw new BadRequestException(
        `Minimum withdrawal is ₹${REFERRAL_MIN_WITHDRAWAL}.`,
      );
    }
    const locked = await this.lockedUntil(user.uid);
    if (locked && new Date(locked).getTime() > Date.now()) {
      throw new BadRequestException(
        `Reward cash-out unlocks after ${REFERRAL_WITHDRAW_HOLD_DAYS} days (${locked}). You can still use coupons right away.`,
      );
    }
    const db = this.firebaseAdminService.firestore();
    const methodSnap = await db
      .collection(ROOT_COLLECTIONS.payoutMethods)
      .doc(dto.payoutMethodId)
      .get();
    if (!methodSnap.exists) throw new NotFoundException('Payout method not found.');
    const method = methodSnap.data() as Record<string, unknown>;
    if (method['userId'] !== user.uid) {
      throw new BadRequestException('This payout method does not belong to you.');
    }
    if (method['verificationStatus'] !== 'verified') {
      throw new BadRequestException('Verify your UPI/bank method first.');
    }
    const earnSnap = await this.earnings().doc(user.uid).get();
    const pending = earnSnap.data()?.pendingEarnings ?? 0;
    if (pending < dto.amount) {
      throw new BadRequestException(`Insufficient balance. Available: ₹${pending}`);
    }

    const now = new Date().toISOString();
    await this.earnings().doc(user.uid).set(
      { pendingEarnings: FieldValue.increment(-dto.amount), updatedAt: now },
      { merge: true },
    );
    const wRef = this.withdrawals().doc();
    const base: FirestoreWithdrawalDocument = {
      id: wRef.id,
      userId: user.uid,
      userRole: (user.role ?? 'customer') as FirestoreWithdrawalDocument['userRole'],
      payoutMethodId: dto.payoutMethodId,
      amount: dto.amount,
      status: 'pending',
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await wRef.set(base);

    // RazorpayX auto-disburse when configured and fund account exists.
    const fundAccountId = method['razorpayFundAccountId'] as string | undefined;
    if (this.razorpayService.isConfigured && fundAccountId) {
      try {
        const mode = method['type'] === 'upi' ? 'UPI' : 'IMPS';
        const payout = await this.razorpayService.createPayout(
          fundAccountId,
          dto.amount,
          mode as 'UPI' | 'IMPS',
        );
        const updated: FirestoreWithdrawalDocument = {
          ...base,
          status: 'processing',
          razorpayPayoutId: payout.id,
          utrNumber: payout.utr ?? null,
          approvedBy: 'system-razorpayx',
          approvedAt: now,
          processedAt: now,
          updatedAt: now,
        };
        await wRef.set(updated, { merge: true });
        return updated;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Payout failed';
        this.logger.error(`RazorpayX payout failed: ${message}`);
        await this.earnings().doc(user.uid).set(
          { pendingEarnings: FieldValue.increment(dto.amount), updatedAt: now },
          { merge: true },
        );
        const failed: FirestoreWithdrawalDocument = {
          ...base,
          status: 'failed',
          failureReason: message,
          processedAt: now,
          updatedAt: now,
        };
        await wRef.set(failed, { merge: true });
        return failed;
      }
    }
    return base;
  }
}

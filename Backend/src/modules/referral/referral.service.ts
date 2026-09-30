import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
  FirestoreReferralCodeDocument,
  FirestoreReferralDocument,
  FirestoreUserDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { CouponService } from '../coupon/coupon.service';
import { NotificationService } from '../notification/notification.service';
import {
  NotificationChannel,
  NotificationPriority,
} from '../notification/interfaces/notification-provider.interface';
import {
  REFERRAL_CODE_TTL_DAYS,
  REFERRAL_LINK_BASE,
  REFERRAL_MAX_INVITES_PER_DAY,
  allowedInviteeRoles,
  canInvite,
  generateReferralCode,
  isReferralCode,
  normalizeReferralRole,
  ruleIdFor,
} from './referral.constants';
import { ReferralRulesService } from './referral-rules.service';
import { WalletService } from './wallet.service';

/** Reward-coupon suffix (distinct namespace from 6-char referral codes). */
function randomCouponSuffix(): string {
  return generateReferralCode();
}

function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, '');
  const trimmed = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return trimmed.length === 10 ? `+91${trimmed}` : `+${digits}`;
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly rulesService: ReferralRulesService,
    private readonly walletService: WalletService,
    private readonly couponService: CouponService,
    private readonly notificationService: NotificationService,
  ) {}

  private codes() {
    return this.firebaseAdminService
      .firestore()
      .collection(
        ROOT_COLLECTIONS.referralCodes,
      ) as FirebaseFirestore.CollectionReference<FirestoreReferralCodeDocument>;
  }

  private referrals() {
    return this.firebaseAdminService
      .firestore()
      .collection(
        ROOT_COLLECTIONS.referrals,
      ) as FirebaseFirestore.CollectionReference<FirestoreReferralDocument>;
  }

  // ── CODES ──────────────────────────────────────────────────────────

  async getOrCreateCode(user: CurrentUser, targetRole: string) {
    const target = normalizeReferralRole(targetRole);
    if (!target) throw new BadRequestException('targetRole is required.');
    if (!canInvite(user.role, target)) {
      throw new ForbiddenException(
        `Your role (${user.role}) cannot invite ${target}. Allowed: ${allowedInviteeRoles(user.role).join(', ') || 'none'}.`,
      );
    }
    const existing = await this.codes()
      .where('ownerUid', '==', user.uid)
      .where('isActive', '==', true)
      .get();
    const now = Date.now();
    for (const doc of existing.docs) {
      const c = doc.data();
      if (
        c.targetRoles.includes(target) &&
        new Date(c.expiresAt).getTime() > now
      ) {
        return c;
      }
    }
    const rule = await this.rulesService.ruleFor(user.role ?? 'customer', target);
    const ttlDays = rule?.codeExpiryDays ?? REFERRAL_CODE_TTL_DAYS;
    // 6-char codes live in a smaller space — check Firestore for collisions.
    let code = generateReferralCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const clash = await this.codes().doc(code).get();
      if (!clash.exists) break;
      if (attempt === 7) {
        throw new BadRequestException('Could not generate a unique referral code. Try again.');
      }
      code = generateReferralCode();
    }
    const nowIso = new Date().toISOString();
    const profile = await this.profileOf(user.uid);
    const doc: FirestoreReferralCodeDocument = {
      id: code,
      code,
      ownerUid: user.uid,
      ownerRole: normalizeReferralRole(user.role ?? 'customer'),
      ownerName: profile?.name ?? null,
      targetRoles: [target],
      link: `${REFERRAL_LINK_BASE}/${encodeURIComponent(code)}?role=${encodeURIComponent(target)}`,
      isActive: true,
      expiresAt: new Date(Date.now() + ttlDays * 24 * 3600 * 1000).toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await this.codes().doc(code).set(doc);
    return doc;
  }

  async myCodes(user: CurrentUser) {
    const snap = await this.codes().where('ownerUid', '==', user.uid).get();
    const invites = await this.referrals().where('inviterUid', '==', user.uid).get();
    const byStatus: Record<string, number> = {};
    for (const d of invites.docs) {
      const s = d.data().status;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }
    const wallet = await this.walletService.balance(user.uid);
    return {
      codes: snap.docs.map((d) => d.data()),
      stats: { total: invites.size, byStatus },
      wallet,
      allowedTargets: allowedInviteeRoles(user.role),
    };
  }

  /** Public resolver for /r/:code landing + app deep link. */
  async resolve(code: string) {
    const id = decodeURIComponent(String(code ?? '')).toUpperCase().trim();
    if (!isReferralCode(id)) throw new NotFoundException('Invalid referral code.');
    const snap = await this.codes().doc(id).get();
    if (!snap.exists) throw new NotFoundException('Invalid referral code.');
    const c = snap.data()!;
    if (!c.isActive || new Date(c.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('This referral link has expired.');
    }
    const masked = c.ownerName
      ? `${c.ownerName.slice(0, 1).toUpperCase()}***`
      : 'A Hawk user';
    return {
      valid: true,
      code: c.code,
      link: c.link,
      inviter: masked,
      inviterRole: c.ownerRole,
      targetRoles: c.targetRoles,
      nextAction: c.targetRoles.includes('customer') ? 'install_app' : 'apply_form',
    };
  }

  // ── INVITES (Case 1: phone list → SMS/WhatsApp via Share or server) ──

  async createInvites(
    user: CurrentUser,
    dto: { code: string; phones: string[]; targetRole: string; channel?: string },
  ) {
    const target = normalizeReferralRole(dto.targetRole);
    if (!canInvite(user.role, target)) {
      throw new ForbiddenException(`Your role cannot invite ${target}.`);
    }
    const codeDoc = await this.codes().doc(dto.code.toUpperCase()).get();
    if (!codeDoc.exists || codeDoc.data()?.ownerUid !== user.uid) {
      throw new NotFoundException('Referral code not found for your account.');
    }
    const phones = [...new Set((dto.phones ?? []).map(normalizePhone).filter(Boolean))] as string[];
    if (!phones.length) throw new BadRequestException('Add at least one valid 10-digit number.');
    if (phones.length > REFERRAL_MAX_INVITES_PER_DAY) {
      throw new BadRequestException(`Max ${REFERRAL_MAX_INVITES_PER_DAY} invites per request.`);
    }
    // Daily rate limit.
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const recent = await this.referrals()
      .where('inviterUid', '==', user.uid)
      .where('createdAt', '>=', dayAgo)
      .get();
    if (recent.size + phones.length > REFERRAL_MAX_INVITES_PER_DAY) {
      throw new BadRequestException('Daily invite limit reached. Try again tomorrow.');
    }
    const selfPhone = (await this.profileOf(user.uid))?.phone ?? null;
    const now = new Date().toISOString();
    const created: FirestoreReferralDocument[] = [];
    for (const phone of phones) {
      if (selfPhone && normalizePhone(selfPhone) === phone) continue; // no self-refer
      const dup = await this.referrals()
        .where('inviteePhone', '==', phone)
        .where('targetRole', '==', target)
        .where('status', 'in', ['invited', 'signed_up', 'applied', 'approved', 'first_booking_done', 'rewarded'])
        .limit(1)
        .get();
      if (!dup.empty) continue;
      const ref = this.referrals().doc();
      const doc: FirestoreReferralDocument = {
        id: ref.id,
        code: dto.code.toUpperCase(),
        inviterUid: user.uid,
        inviterRole: normalizeReferralRole(user.role ?? 'customer'),
        inviteePhone: phone,
        inviteeUid: null,
        targetRole: target,
        channel: (dto.channel as FirestoreReferralDocument['channel']) ?? 'share',
        status: 'invited',
        roleApplicationId: null,
        bookingId: null,
        createdAt: now,
        updatedAt: now,
      };
      await ref.set(doc);
      created.push(doc);
    }
    // Server-side WhatsApp/push nudge is best-effort; primary path is the
    // inviter's own Share sheet (free forever). We still send FCM if the
    // invitee already has an account, plus a WhatsApp template when configured.
    void this.nudgeInvitees(created, codeDoc.data()!.link, target).catch((e) =>
      this.logger.warn(`Invite nudge failed: ${(e as Error).message}`),
    );
    return { created: created.length, skipped: phones.length - created.length, invites: created };
  }

  private async nudgeInvitees(
    invites: FirestoreReferralDocument[],
    link: string,
    targetRole: string,
  ) {
    for (const inv of invites) {
      if (!inv.inviteePhone) continue;
      const existing = await this.findUserByPhone(inv.inviteePhone);
      const body =
        `You were invited to join Hawk Aerosystem as ${targetRole}. ` +
        `Use this link to apply: ${link}`;
      await this.notificationService
        .dispatch({
          channels: existing
            ? [NotificationChannel.PUSH, NotificationChannel.IN_APP]
            : [NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
          targets: existing
            ? { userIds: [existing.uid] }
            : { phones: [inv.inviteePhone] },
          priority: NotificationPriority.NORMAL,
          subject: 'You are invited to Hawk Aerosystem',
          body,
          data: { kind: 'referral_invite', code: inv.code, targetRole },
        })
        .catch(() => undefined);
    }
  }

  // ── EVENT TRANSITIONS ──────────────────────────────────────────────

  /**
   * New signup with referralCode (customer viral loop).
   * ONE reward per phone number, ever: the first code attached wins. Re-entering
   * the same code, or entering another user's code afterwards, is ignored.
   */
  async handleSignedUp(inviteeUid: string, inviteePhone: string | undefined, code: string) {
    const codeId = code.toUpperCase().trim();
    const codeSnap = await this.codes().doc(codeId).get();
    if (!codeSnap.exists) return;
    const c = codeSnap.data()!;
    if (inviteeUid === c.ownerUid) return; // self-refer
    const dupUid = await this.referrals()
      .where('inviteeUid', '==', inviteeUid)
      .limit(1)
      .get();
    if (!dupUid.empty) return;
    const phone = normalizePhone(inviteePhone);
    if (phone) {
      const dupPhone = await this.referrals()
        .where('inviteePhone', '==', phone)
        .where('status', 'in', ['invited', 'signed_up', 'applied', 'approved', 'first_booking_done', 'rewarded'])
        .limit(1)
        .get();
      if (!dupPhone.empty) {
        // First code wins — link the uid to the existing record, ignore the new code.
        const first = dupPhone.docs[0];
        if (!first.data().inviteeUid) {
          await first.ref.set(
            { inviteeUid, updatedAt: new Date().toISOString() },
            { merge: true },
          );
        }
        return;
      }
    }
    const now = new Date().toISOString();
    // Attach to an existing phone invite if present, else create a link record.
    let attached = false;
    if (inviteePhone) {
      const byPhone = await this.referrals()
        .where('inviteePhone', '==', normalizePhone(inviteePhone))
        .where('code', '==', codeId)
        .limit(1)
        .get();
      if (!byPhone.empty) {
        await byPhone.docs[0].ref.set(
          { inviteeUid, status: 'signed_up', updatedAt: now },
          { merge: true },
        );
        attached = true;
      }
    }
    if (!attached) {
      const ref = this.referrals().doc();
      await ref.set({
        id: ref.id,
        code: codeId,
        inviterUid: c.ownerUid,
        inviterRole: c.ownerRole,
        inviteePhone: normalizePhone(inviteePhone) ?? null,
        inviteeUid,
        targetRole: c.targetRoles[0] ?? 'customer',
        channel: 'link',
        status: 'signed_up',
        roleApplicationId: null,
        bookingId: null,
        createdAt: now,
        updatedAt: now,
      } as FirestoreReferralDocument);
    }
  }

  /** Restricted-role application submitted with referralCode. */
  async handleApplied(inviteeUid: string, applicationId: string, code: string) {
    const list = await this.referrals().where('inviteeUid', '==', inviteeUid).get();
    const now = new Date().toISOString();
    for (const d of list.docs) {
      const r = d.data();
      if (r.code === code.toUpperCase() && ['invited', 'signed_up'].includes(r.status)) {
        await d.ref.set(
          { status: 'applied', roleApplicationId: applicationId, updatedAt: now },
          { merge: true },
        );
      }
    }
  }

  /** Admin approved role application → reward if rule trigger matches. */
  async handleRoleApproved(inviteeUid: string, role: string) {
    const list = await this.referrals()
      .where('inviteeUid', '==', inviteeUid)
      .where('status', 'in', ['applied', 'approved', 'signed_up', 'invited'])
      .get();
    for (const d of list.docs) {
      const r = d.data();
      if (normalizeReferralRole(r.targetRole) !== normalizeReferralRole(role)) continue;
      const rule = await this.rulesService.ruleFor(r.inviterRole, r.targetRole);
      if (!rule?.isActive || rule.trigger !== 'role_approved') continue;
      await d.ref.set({ status: 'approved', updatedAt: new Date().toISOString() }, { merge: true });
      await this.grantReward(d.id);
    }
  }

  /**
   * First PAID booking → reward if rule trigger matches.
   * Called for gateway payments AND pilot-confirmed cash (confirmCashReceipt),
   * never for pending/cashPending bookings.
   */
  async handleBookingPaid(customerUid: string, bookingId: string) {
    const paidCount = await this.countPaidBookings(customerUid);
    if (paidCount !== 1) return; // only the very first paid booking counts
    const list = await this.referrals()
      .where('inviteeUid', '==', customerUid)
      .where('status', 'in', ['signed_up', 'invited', 'applied'])
      .get();
    if (list.empty) {
      // Invitee never attached a code at signup — allow late attach? No:
      // prevents gaming. Require code at signup/apply time.
      return;
    }
    for (const d of list.docs) {
      const r = d.data();
      const rule = await this.rulesService.ruleFor(r.inviterRole, r.targetRole);
      if (!rule?.isActive || rule.trigger !== 'first_paid_booking') continue;
      await d.ref.set(
        { status: 'first_booking_done', bookingId, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      await this.grantReward(d.id);
    }
  }

  /** True when this phone/uid already earned a referral reward (any code). */
  async hasBeenRewarded(
    inviteeUid?: string | null,
    inviteePhone?: string | null,
    excludeId?: string,
  ): Promise<boolean> {
    if (inviteeUid) {
      const byUid = await this.referrals()
        .where('inviteeUid', '==', inviteeUid)
        .where('status', '==', 'rewarded')
        .limit(1)
        .get();
      if (!byUid.empty && byUid.docs[0].id !== excludeId) return true;
    }
    const phone = normalizePhone(inviteePhone);
    if (phone) {
      const byPhone = await this.referrals()
        .where('inviteePhone', '==', phone)
        .where('status', '==', 'rewarded')
        .limit(1)
        .get();
      if (!byPhone.empty && byPhone.docs[0].id !== excludeId) return true;
    }
    return false;
  }

  private async countPaidBookings(customerUid: string): Promise<number> {
    // Bookings are stored per-user + mirrored at top level; count via users col.
    const db = this.firebaseAdminService.firestore();
    const top = await db
      .collection(ROOT_COLLECTIONS.bookings)
      .where('customerUid', '==', customerUid)
      .where('paymentStatus', '==', 'paid')
      .get()
      .catch(() => null);
    if (top && !top.empty) return top.size;
    const sub = await db
      .collection(`${ROOT_COLLECTIONS.users}/${customerUid}/bookings`)
      .where('paymentStatus', '==', 'paid')
      .get()
      .catch(() => null);
    return sub?.size ?? 1; // fall back to 1 so the current paid booking still rewards
  }

  // ── REWARD ─────────────────────────────────────────────────────────

  async grantReward(referralId: string) {
    const ref = this.referrals().doc(referralId);
    const snap = await ref.get();
    if (!snap.exists) return;
    const r = snap.data()!;
    if (r.status === 'rewarded' || r.status === 'voided') return;
    // Central backstop for one-reward-per-phone: if this invitee already earned
    // a reward (any code, any inviter), this referral can never pay out.
    if (await this.hasBeenRewarded(r.inviteeUid, r.inviteePhone, r.id)) {
      await ref.set(
        {
          failureReason: 'Phone number already earned a referral reward.',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return;
    }
    const rule = await this.rulesService.ruleFor(r.inviterRole, r.targetRole);
    if (!rule?.isActive) return;

    // Monthly cap per inviter for this pair.
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthRewards = await this.referrals()
      .where('inviterUid', '==', r.inviterUid)
      .where('status', '==', 'rewarded')
      .where('updatedAt', '>=', monthStart.toISOString())
      .get();
    const pairCount = monthRewards.docs.filter(
      (d) =>
        d.data().inviterRole === r.inviterRole && d.data().targetRole === r.targetRole,
    ).length;
    if (pairCount >= (rule.maxPerUserPerMonth ?? 20)) {
      await ref.set(
        { failureReason: 'Monthly reward cap reached', updatedAt: new Date().toISOString() },
        { merge: true },
      );
      return;
    }

    const total = (rule.walletAmount ?? 0) + (rule.couponAmount ?? 0);
    let couponCode: string | null = null;
    if (rule.couponAmount > 0) {
      couponCode = `REFER-${randomCouponSuffix()}`;
      try {
        await this.couponService.create(
          {
            code: couponCode,
            discountType: 'fixed',
            discountValue: rule.couponAmount,
            applicableRoles: [],
            validUntil: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
            usageLimit: 1,
            description: `Refer & Earn reward (${r.inviterRole} → ${r.targetRole})`,
          } as never,
          { uid: 'system-referral', role: 'admin' } as never,
        );
      } catch (e) {
        this.logger.warn(`Reward coupon mint failed: ${(e as Error).message}`);
        couponCode = null;
      }
    }
    if (rule.walletAmount > 0) {
      await this.walletService.creditReferral(r.inviterUid, rule.walletAmount, r.id, couponCode);
    }
    await ref.set(
      {
        status: 'rewarded',
        rewardAmount: total,
        rewardCouponCode: couponCode,
        rewardAvailableAfter: new Date(
          Date.now() + 7 * 24 * 3600 * 1000,
        ).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    await this.notifyReward(r.inviterUid, total, couponCode);
  }

  private async notifyReward(inviterUid: string, amount: number, coupon: string | null) {
    await this.notificationService
      .dispatch({
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        targets: { userIds: [inviterUid] },
        priority: NotificationPriority.HIGH,
        subject: 'Referral reward earned',
        body:
          `You earned ₹${amount} Hawk Credits for your referral!` +
          (coupon ? ` Coupon ${coupon} is ready to use on marketplace/bookings.` : ''),
        data: { kind: 'referral_reward', amount, coupon },
      })
      .catch(() => undefined);
  }

  // ── ADMIN ──────────────────────────────────────────────────────────

  async adminList(status?: string, limit = 50) {
    let q: FirebaseFirestore.Query<FirestoreReferralDocument> = this.referrals();
    if (status) q = q.where('status', '==', status);
    const snap = await q.orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data());
  }

  async voidReferral(id: string, reason?: string) {
    const ref = this.referrals().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Referral not found.');
    const r = snap.data()!;
    if (r.status === 'rewarded' && r.rewardAmount) {
      await this.walletService.reverseReferral(
        r.inviterUid,
        r.rewardAmount - (r.rewardCouponCode ? 0 : 0),
        r.id,
        reason ?? 'Admin void',
      );
      if (r.rewardCouponCode) {
        await this.couponService.deactivate(r.rewardCouponCode).catch(() => undefined);
      }
    }
    await ref.set(
      { status: 'voided', failureReason: reason ?? 'Voided by admin', updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return (await ref.get()).data();
  }

  // ── helpers ────────────────────────────────────────────────────────

  private async profileOf(uid: string) {
    const snap = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(uid)
      .get();
    return (snap.data() as FirestoreUserDocument | undefined) ?? undefined;
  }

  private async findUserByPhone(phone: string) {
    const db = this.firebaseAdminService.firestore();
    const normalized = normalizePhone(phone);
    const snap = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('phone', '==', normalized)
      .limit(1)
      .get()
      .catch(() => null);
    if (snap && !snap.empty) {
      return { uid: snap.docs[0].id };
    }
    const snap2 = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('phone', '==', phone)
      .limit(1)
      .get()
      .catch(() => null);
    if (snap2 && !snap2.empty) return { uid: snap2.docs[0].id };
    return null;
  }

  ruleKey(inviterRole: string, inviteeRole: string) {
    return ruleIdFor(inviterRole, inviteeRole);
  }
}

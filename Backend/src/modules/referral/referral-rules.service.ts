import { Injectable, Logger } from '@nestjs/common';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { FirestoreReferralRuleDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import {
  DEFAULT_REFERRAL_RULES,
  normalizeReferralRole,
  ruleIdFor,
} from './referral.constants';

@Injectable()
export class ReferralRulesService {
  private readonly logger = new Logger(ReferralRulesService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private collection() {
    return this.firebaseAdminService
      .firestore()
      .collection(
        ROOT_COLLECTIONS.referralRules,
      ) as FirebaseFirestore.CollectionReference<FirestoreReferralRuleDocument>;
  }

  async ruleFor(
    inviterRole: string,
    inviteeRole: string,
  ): Promise<FirestoreReferralRuleDocument | null> {
    const id = ruleIdFor(inviterRole, inviteeRole);
    const snap = await this.collection().doc(id).get();
    if (snap.exists) return snap.data() ?? null;
    const seed = DEFAULT_REFERRAL_RULES.find(
      (r) =>
        normalizeReferralRole(r.inviterRole) === normalizeReferralRole(inviterRole) &&
        normalizeReferralRole(r.inviteeRole) === normalizeReferralRole(inviteeRole),
    );
    if (!seed) return null;
    return {
      id,
      inviterRole: normalizeReferralRole(seed.inviterRole),
      inviteeRole: normalizeReferralRole(seed.inviteeRole),
      trigger: seed.trigger,
      walletAmount: seed.walletAmount,
      couponAmount: seed.couponAmount,
      maxPerUserPerMonth: seed.maxPerUserPerMonth,
      codeExpiryDays: seed.codeExpiryDays,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async list(): Promise<FirestoreReferralRuleDocument[]> {
    const snap = await this.collection().get();
    const stored = new Map(snap.docs.map((d) => [d.id, d.data()]));
    const now = new Date().toISOString();
    // Overlay defaults so Admin always sees the full matrix even before first save.
    for (const seed of DEFAULT_REFERRAL_RULES) {
      const id = ruleIdFor(seed.inviterRole, seed.inviteeRole);
      if (!stored.has(id)) {
        stored.set(id, {
          id,
          inviterRole: normalizeReferralRole(seed.inviterRole),
          inviteeRole: normalizeReferralRole(seed.inviteeRole),
          trigger: seed.trigger,
          walletAmount: seed.walletAmount,
          couponAmount: seed.couponAmount,
          maxPerUserPerMonth: seed.maxPerUserPerMonth,
          codeExpiryDays: seed.codeExpiryDays,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    return [...stored.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  async upsert(
    dto: Partial<FirestoreReferralRuleDocument> & { inviterRole: string; inviteeRole: string },
  ): Promise<FirestoreReferralRuleDocument> {
    const id = ruleIdFor(dto.inviterRole, dto.inviteeRole);
    const now = new Date().toISOString();
    const existing = await this.collection().doc(id).get();
    const base = existing.exists
      ? (existing.data() as FirestoreReferralRuleDocument)
      : ({
          id,
          inviterRole: normalizeReferralRole(dto.inviterRole),
          inviteeRole: normalizeReferralRole(dto.inviteeRole),
          trigger: 'first_paid_booking',
          walletAmount: 100,
          couponAmount: 100,
          maxPerUserPerMonth: 20,
          codeExpiryDays: 60,
          isActive: true,
          createdAt: now,
        } as FirestoreReferralRuleDocument);
    const merged: FirestoreReferralRuleDocument = {
      ...base,
      ...dto,
      id,
      inviterRole: normalizeReferralRole(dto.inviterRole),
      inviteeRole: normalizeReferralRole(dto.inviteeRole),
      updatedAt: now,
    };
    await this.collection().doc(id).set(merged, { merge: true });
    this.logger.log(`Referral rule upserted: ${id}`);
    return merged;
  }
}

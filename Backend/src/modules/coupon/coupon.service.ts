import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FieldValue, type CollectionReference } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreCouponDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';

export interface CouponValidationResult {
  valid: boolean;
  coupon: FirestoreCouponDocument;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discount: number;
  finalAmount: number;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async create(dto: CreateCouponDto, user: CurrentUser): Promise<FirestoreCouponDocument> {
    const ref = this.collection().doc(dto.code.toUpperCase());
    const now = new Date().toISOString();
    const coupon: FirestoreCouponDocument = {
      id: ref.id,
      code: dto.code.toUpperCase(),
      createdBy: user.uid,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      applicableRoles: dto.applicableRoles ?? [],
      validFrom: dto.validFrom ?? null,
      validUntil: dto.validUntil,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      usageLimit: dto.usageLimit ?? null,
      usedCount: 0,
      description: dto.description ?? null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(coupon);
    return coupon;
  }

  async list() {
    const snapshot = await this.collection().orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => doc.data());
  }

  /** Coupons visible to the current user's role (universal + role-specific), active & unexpired. */
  async listAvailable(user: CurrentUser) {
    const now = Date.now();
    const snapshot = await this.collection().get();
    return snapshot.docs
      .map((doc) => doc.data())
      .filter((coupon) => this.isActiveAndUnexpired(coupon, now))
      .filter((coupon) => this.isRoleEligible(coupon, user.role))
      .filter((coupon) => !this.isLimitReached(coupon))
      .map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderAmount: coupon.minOrderAmount,
        validUntil: coupon.validUntil,
        description: coupon.description,
        label: this.label(coupon),
      }));
  }

  /** Preview-only validation (used by POST /coupons/validate). Does not consume usage. */
  async validate(dto: ApplyCouponDto, user: CurrentUser): Promise<CouponValidationResult> {
    const baseAmount = dto.baseAmount ?? 0;
    const { coupon, discount } = await this.applyInternal(dto.code, baseAmount, user, false);
    return this.toResult(coupon, baseAmount, discount);
  }

  /** Validate + compute discount against a real order/booking, consuming coupon usage. */
  async apply(code: string, baseAmount: number, user: CurrentUser): Promise<CouponValidationResult> {
    const { coupon, discount } = await this.applyInternal(code, baseAmount, user, true);
    return this.toResult(coupon, baseAmount, discount);
  }

  async update(
    id: string,
    dto: Partial<CreateCouponDto & { status: FirestoreCouponDocument['status'] }>,
  ) {
    await this.collection()
      .doc(id.toUpperCase())
      .set({ ...dto, updatedAt: new Date().toISOString() }, { merge: true });
    const snapshot = await this.collection().doc(id.toUpperCase()).get();
    return snapshot.data();
  }

  async deactivate(id: string) {
    await this.collection()
      .doc(id.toUpperCase())
      .set({ status: 'inactive', updatedAt: new Date().toISOString() }, { merge: true });
    const snapshot = await this.collection().doc(id.toUpperCase()).get();
    return snapshot.data();
  }

  private async applyInternal(
    code: string,
    baseAmount: number,
    user: CurrentUser,
    consume: boolean,
  ) {
    const id = code.toUpperCase();
    const ref = this.collection().doc(id);
    const snapshot = await ref.get();
    const coupon = snapshot.data();
    if (!snapshot.exists || !coupon) {
      throw new NotFoundException('Invalid coupon code.');
    }

    const now = Date.now();

    if (coupon.status !== 'active') {
      throw new BadRequestException('Coupon is not active.');
    }
    if (!this.isActiveAndUnexpired(coupon, now)) {
      throw new BadRequestException('Coupon has expired.');
    }
    if (!this.isRoleEligible(coupon, user.role)) {
      throw new BadRequestException('Coupon is not valid for your role.');
    }
    if (coupon.minOrderAmount && baseAmount < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount ₹${coupon.minOrderAmount} required for this coupon.`,
      );
    }
    if (this.isLimitReached(coupon)) {
      throw new BadRequestException('Coupon usage limit reached.');
    }

    const discount = this.computeDiscount(coupon, baseAmount);

    if (consume) {
      await ref.update({
        usedCount: FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      });
    }

    return { coupon, discount };
  }

  private computeDiscount(coupon: FirestoreCouponDocument, baseAmount: number): number {
    if (coupon.discountType === 'percentage') {
      let discount = Math.round((baseAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
      return Math.max(0, Math.min(discount, baseAmount));
    }
    return Math.max(0, Math.min(coupon.discountValue, baseAmount));
  }

  private toResult(
    coupon: FirestoreCouponDocument,
    baseAmount: number,
    discount: number,
  ): CouponValidationResult {
    return {
      valid: true,
      coupon,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      finalAmount: Math.max(0, Math.round(baseAmount - discount)),
    };
  }

  private isActiveAndUnexpired(coupon: FirestoreCouponDocument, now: number): boolean {
    if (coupon.status !== 'active') return false;
    if (coupon.validUntil && new Date(coupon.validUntil).getTime() < now) return false;
    if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) return false;
    return true;
  }

  private isRoleEligible(coupon: FirestoreCouponDocument, role?: string): boolean {
    const roles = coupon.applicableRoles ?? [];
    if (!roles.length) return true;
    if (roles.includes('*')) return true;
    if (!role) return false;
    return roles.includes(role.toLowerCase().trim());
  }

  private isLimitReached(coupon: FirestoreCouponDocument): boolean {
    if (!coupon.usageLimit) return false;
    return (coupon.usedCount ?? 0) >= coupon.usageLimit;
  }

  private label(coupon: FirestoreCouponDocument): string {
    return coupon.discountType === 'percentage'
      ? `${coupon.discountValue}% OFF`
      : `₹${coupon.discountValue} OFF`;
  }

  private collection(): CollectionReference<FirestoreCouponDocument> {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.coupons);
  }
}

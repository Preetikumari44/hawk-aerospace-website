import { api as apiClient } from './client';

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applicableRoles: string[];
  validFrom?: string | null;
  validUntil: string;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  description?: string | null;
  status: 'active' | 'inactive' | 'expired';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCouponPayload {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applicableRoles?: string[];
  validUntil: string;
  validFrom?: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  description?: string;
}

export const couponApi = {
  create: (payload: CreateCouponPayload) => apiClient.post('/coupons', payload),
  list: () => apiClient.get<Coupon[]>('/coupons'),
  update: (id: string, payload: Partial<CreateCouponPayload>) =>
    apiClient.patch(`/coupons/${id}`, payload),
  deactivate: (id: string) => apiClient.patch(`/coupons/${id}/deactivate`, {}),
};

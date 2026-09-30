import { api as apiClient } from './client';

export interface ReferralRule {
  id: string;
  inviterRole: string;
  inviteeRole: string;
  trigger: 'role_approved' | 'first_paid_booking';
  walletAmount: number;
  couponAmount: number;
  maxPerUserPerMonth: number;
  codeExpiryDays: number;
  isActive: boolean;
}

export interface ReferralRecord {
  id: string;
  code: string;
  inviterUid: string;
  inviterRole: string;
  inviteePhone?: string | null;
  inviteeUid?: string | null;
  targetRole: string;
  channel: string;
  status: string;
  roleApplicationId?: string | null;
  bookingId?: string | null;
  rewardAmount?: number | null;
  rewardCouponCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const referralApi = {
  rules: () => apiClient.get<ReferralRule[]>('/referrals/admin/rules'),
  upsertRule: (payload: Partial<ReferralRule> & { inviterRole: string; inviteeRole: string }) =>
    apiClient.post('/referrals/admin/rules', payload),
  list: (status?: string, limit = 50) =>
    apiClient.get<ReferralRecord[]>(
      `/referrals/admin/list?limit=${limit}${status ? `&status=${encodeURIComponent(status)}` : ''}`,
    ),
  void: (id: string, reason?: string) =>
    apiClient.patch(`/referrals/admin/${id}`, { status: 'voided', reason }),
};

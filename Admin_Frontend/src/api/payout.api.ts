/** Payout / Withdrawal API — Admin */

import { api } from './client';

export interface Withdrawal {
  id: string;
  userId: string;
  userRole: 'pilot' | 'fleet_manager' | 'aggregator';
  payoutMethodId: string;
  amount: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';
  razorpayPayoutId?: string | null;
  utrNumber?: string | null;
  failureReason?: string | null;
  adminNotes?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
  approvedBy?: string | null;
}

export interface PayoutMethod {
  id: string;
  userId: string;
  type: 'bank' | 'upi';
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  bankName?: string;
  upiId?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  isDefault?: boolean;
  isActive: boolean;
  createdAt: string;
}

export const payoutApi = {
  getPendingWithdrawals: async (): Promise<Withdrawal[]> => {
    const res = await api.get<Withdrawal[]>('/payouts/admin/withdrawals');
    return res.data;
  },

  getAllWithdrawals: async (status?: string): Promise<Withdrawal[]> => {
    const query = status ? `?status=${status}` : '';
    const res = await api.get<Withdrawal[]>(`/payouts/admin/withdrawals/all${query}`);
    return res.data;
  },

  approveWithdrawal: async (id: string, notes?: string): Promise<Withdrawal> => {
    const res = await api.patch<Withdrawal>(`/payouts/admin/withdrawals/${id}/approve`, { notes });
    return res.data;
  },

  rejectWithdrawal: async (id: string, reason: string): Promise<Withdrawal> => {
    const res = await api.patch<Withdrawal>(`/payouts/admin/withdrawals/${id}/reject`, { reason });
    return res.data;
  },
};

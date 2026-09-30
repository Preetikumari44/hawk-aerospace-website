/** Refund API — Admin */

import { api } from './client';

export interface Refund {
  id: string;
  bookingId: string;
  customerUid: string;
  pilotUid?: string | null;
  fleetManagerUid?: string | null;
  originalAmount: number;
  refundAmount: number;
  refundPercentage: number;
  refundReason: string;
  cancellationReason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  paymentMethod?: string | null;
  razorpayPaymentId?: string | null;
  razorpayRefundId?: string | null;
  adminNotes?: string | null;
  requestedAt: string;
  requestedBy: string;
  approvedBy?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
}

export interface RefundFilter {
  status?: string;
  customerUid?: string;
  bookingId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const refundApi = {
  getPending: async (): Promise<Refund[]> => {
    const res = await api.get<Refund[]>('/refunds');
    return res.data;
  },

  getAll: async (filters?: RefundFilter): Promise<Refund[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerUid) params.append('customerUid', filters.customerUid);
    if (filters?.bookingId) params.append('bookingId', filters.bookingId);
    const query = params.toString();
    const res = await api.get<Refund[]>(`/refunds/all${query ? `?${query}` : ''}`);
    return res.data;
  },

  getById: async (id: string): Promise<Refund> => {
    const res = await api.get<Refund>(`/refunds/${id}`);
    return res.data;
  },

  approve: async (id: string, notes?: string): Promise<Refund> => {
    const res = await api.patch<Refund>(`/refunds/${id}/approve`, { notes });
    return res.data;
  },

  reject: async (id: string, reason: string): Promise<Refund> => {
    const res = await api.patch<Refund>(`/refunds/${id}/reject`, { reason });
    return res.data;
  },
};

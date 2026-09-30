/** Role Application API — admin review of self-service role applications. */

import { api } from './client';

export type RoleApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface RoleApplicationDocumentFieldName {
  name?: string;
}

export interface RoleApplicationSummary {
  applicationId: string;
  uid: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  roleLabel?: string | null;
  currentRole?: string | null;
  status: RoleApplicationStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  remarks?: string | null;
  documentCount: number;
}

export interface RoleApplicationDetail extends RoleApplicationSummary {
  formData: Record<string, unknown>;
  documents: Array<{
    type: string;
    name?: string;
    number?: string;
    storagePath?: string;
    downloadUrl?: string;
  }>;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  updatedAt: string;
}

export interface RoleApplicationListResponse {
  applications: RoleApplicationSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface RoleApplicationQuery {
  status?: RoleApplicationStatus;
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class RoleApplicationAPI {
  private buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    const filtered = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
  }

  async list(params?: RoleApplicationQuery): Promise<RoleApplicationListResponse> {
    const queryString = this.buildQueryString(params);
    const response = await api.get<any>(`/role-applications${queryString}`);
    const data = response.data?.data || response.data;
    return data || { applications: [], total: 0, page: 1, limit: 20 };
  }

  async getById(applicationId: string): Promise<RoleApplicationDetail> {
    const response = await api.get<any>(`/role-applications/${applicationId}`);
    return (response.data?.data || response.data) as RoleApplicationDetail;
  }

  async review(
    applicationId: string,
    body: { approved: boolean; remarks?: string; rejectionReason?: string },
  ): Promise<RoleApplicationDetail> {
    const response = await api.patch<any>(`/role-applications/${applicationId}/review`, body);
    return (response.data?.data || response.data) as RoleApplicationDetail;
  }
}

export const roleApplicationApi = new RoleApplicationAPI();
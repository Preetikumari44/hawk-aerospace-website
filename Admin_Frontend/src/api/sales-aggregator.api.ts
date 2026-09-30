import { api, API_BASE } from './client';

export interface SACustomer {
  uid: string;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  state?: string;
  region?: string;
  occupation?: string;
  totalBookings?: number;
  totalRevenue?: number;
  createdAt: string;
}

export interface SalesAggregator {
  uid: string;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  businessName?: string;
  regions: string[];
  state?: string;
  documents: Array<{ type: string; url: string; name?: string }>;
  isVerified: boolean;
  totalCustomers?: number;
  totalBookings?: number;
  totalRevenue?: number;
  commissionEarned?: number;
  createdAt: string;
  updatedAt: string;
  customers?: SACustomer[];
  bookings?: any[]; // Add bookings array
}

export interface SARequest {
  id: string;
  aggregatorId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  state?: string;
  region?: string;
  status: 'pending' | 'approved' | 'rejected';
  documents: Array<{ type: string; url: string; name?: string }>;
  notes?: string;
  rejectionReason?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SAListResponse {
  items: SalesAggregator[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SARequestListResponse {
  items: SARequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SAFilter {
  search?: string;
  status?: string;
  state?: string;
  region?: string;
  page?: number;
  limit?: number;
}

export interface SARequestFilter {
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateSARequestData {
  aggregatorId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  state?: string;
  region?: string;
  documents?: Array<{ type: string; url: string; name?: string }>;
  notes?: string;
}

export interface RejectSARequestData {
  status: 'rejected';
  rejectionReason?: string;
}

/**
 * Build query params from filter object
 */
function buildQueryParams(filter?: Record<string, any>): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const salesAggregatorAPI = {
  /**
   * Get list of current (approved) Sales Aggregators
   * Backend: GET /sa-management/current
   * Collection: sa_requests (where status = "approved")
   */
  getCurrentSAList: (filter?: SAFilter) =>
    api.get<SAListResponse>(`/sa-management/current${buildQueryParams(filter)}`),

  /**
   * Get detailed information about a specific Sales Aggregator
   * Backend: GET /sa-management/current/:id
   * Collection: sa_requests (where aggregatorId = id AND status = "approved")
   */
  getSADetails: (id: string) =>
    api.get<SalesAggregator>(`/sa-management/current/${id}`),

  /**
   * Get customers associated with a Sales Aggregator
   * This fetches customers where profileData.managedByAggregatorId = id
   */
  getSACustomers: (id: string, page?: number, limit?: number) => {
    // The customers are already included in getSADetails response
    // But we can add a dedicated endpoint if needed
    const params = buildQueryParams({ page, limit });
    return api.get<{ items: SACustomer[]; total: number }>(`/sa-management/current/${id}/customers${params}`);
  },

  /**
   * Get bookings associated with a Sales Aggregator
   * This fetches bookings from delegated_bookings where aggregatorId = id
   */
  getSABookings: (id: string, page?: number, limit?: number) => {
    const params = buildQueryParams({ page, limit });
    return api.get<{ items: any[]; total: number }>(`/sa-management/current/${id}/bookings${params}`);
  },

  /**
   * Get list of SA requests
   * Backend: GET /sa-management/requests
   * Collection: sa_requests
   */
  getSARequestList: (filter?: SARequestFilter) =>
    api.get<SARequestListResponse>(`/sa-management/requests${buildQueryParams(filter)}`),

  /**
   * Get SA request details
   * Backend: GET /sa-management/requests/:id
   * Collection: sa_requests
   */
  getSARequestDetails: (id: string) =>
    api.get<SARequest>(`/sa-management/requests/${id}`),

  /**
   * Create a new SA request
   * Backend: POST /sa-management/requests
   * Collection: sa_requests
   */
  createSARequest: (data: CreateSARequestData) =>
    api.post<SARequest>('/sa-management/requests', data),

  /**
   * Accept an SA request
   * Backend: PATCH /sa-management/requests/:id/accept
   * Updates sa_requests status to "approved"
   */
  acceptSARequest: (id: string) => {
    console.log(`📡 API Call: PATCH /sa-management/requests/${id}/accept`);
    console.log(`📡 Full URL: ${API_BASE}/sa-management/requests/${id}/accept`);
    return api.patch<{ request: SARequest; aggregator: SalesAggregator }>(
      `/sa-management/requests/${id}/accept`,
    );
  },

  /**
   * Reject an SA request
   * Backend: PATCH /sa-management/requests/:id/reject
   * Updates sa_requests status to "rejected"
   */
  rejectSARequest: (id: string, data: RejectSARequestData) =>
    api.patch<SARequest>(`/sa-management/requests/${id}/reject`, data),

  /**
   * Update status of an SA (e.g. ban/unban)
   * Backend: PATCH /sa-management/current/:id/status
   */
  updateSAStatus: (id: string, status: string) =>
    api.patch<SalesAggregator>(`/sa-management/current/${id}/status`, { status }),
};

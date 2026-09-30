/** Customer API */

import { api } from './client';

export interface Customer {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'customer';
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  profileData: {
    displayName: string;
    managedByAggregatorId?: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
    occupation?: string;
    region?: string;
    state?: string;
  };
  verification: {
    isVerified: boolean;
    documents: Array<{
      type: string;
      url: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  totalBookings?: number;
  totalRevenue?: number;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  language?: string;
  profileData?: {
    occupation?: string;
    region?: string;
    state?: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  };
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  totalBookings: number;
}

export interface FilterOptions {
  states: string[];
  regions: string[];
  occupations: string[];
  regionsByState: Record<string, string[]>;
}

export const customerApi = {
  // Get all customers (for admin/aggregator)
  getAll: (page: number = 1, limit: number = 20, search?: string, filters?: { status?: string; state?: string; region?: string; occupation?: string }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.state) params.append('state', filters.state);
    if (filters?.region) params.append('region', filters.region);
    if (filters?.occupation) params.append('occupation', filters.occupation);
    return api.get<Customer[]>(`/customers?${params.toString()}`);
  },

  // Get customer by ID
  getById: (uid: string) =>
    api.get<Customer>(`/customers/${uid}`),

  // Create a new customer
  create: (dto: CreateCustomerDto) =>
    api.post<Customer>('/customers', dto),

  // Update customer profile
  update: (uid: string, dto: Partial<CreateCustomerDto>) =>
    api.patch<Customer>(`/customers/${uid}`, dto),

  // Get customer statistics
  getStats: () =>
    api.get<CustomerStats>('/customers/stats'),

  // Get filter options for dropdowns
  getFilterOptions: () =>
    api.get<FilterOptions>('/customers/filter-options'),

  // Get customers managed by aggregator
  getByAggregator: (aggregatorId: string) =>
    api.get<Customer[]>(`/aggregators/${aggregatorId}/customers`),

  // Add customer to aggregator
  addToAggregator: (aggregatorId: string, dto: CreateCustomerDto) =>
    api.post<Customer>(`/aggregators/${aggregatorId}/customers`, dto),

  // Get customer bookings
  getBookings: (uid: string, page: number = 1, limit: number = 10) =>
    api.get(`/customers/${uid}/bookings?page=${page}&limit=${limit}`),

  // Get customer farms/collections
  getFarms: (uid: string, page: number = 1, limit: number = 10) =>
    api.get(`/customers/${uid}/farms?page=${page}&limit=${limit}`),

  // Get customer support tickets
  getSupportTickets: (uid: string, page: number = 1, limit: number = 10) =>
    api.get(`/customers/${uid}/support-tickets?page=${page}&limit=${limit}`),

  // Ban/unban customer
  banCustomer: (uid: string, banned: boolean) =>
    api.patch<Customer>(`/customers/${uid}/ban`, { banned }),

  // Delete customer
  delete: (uid: string) =>
    api.delete<void>(`/customers/${uid}`),
};
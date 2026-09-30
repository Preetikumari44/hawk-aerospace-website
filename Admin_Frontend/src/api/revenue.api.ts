/** Revenue API */

import { api } from './client';

export interface RevenueSummary {
  totalRevenue: number;
  totalBookings: number;
  paidBookings: number;
  avgRevenuePerBooking: number;
  totalCommission: number;
  byCrop: Record<string, number>;
  byState: Record<string, number>;
  byService: Record<string, number>;
  byVendor: Record<string, number>;
}

export interface RevenueDashboard extends RevenueSummary {
  generatedAt: string;
  growthPercent: number;
  previousRevenue: number;
}

export interface RevenueChart {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface VendorPerformance {
  vendorId: string;
  revenue: number;
  bookings: number;
  completed: number;
}

export interface RevenueFilterParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  cropType?: string;
  serviceType?: 'spraying' | 'seeding' | 'monitoring';
  vendorId?: string;
  aggregatorId?: string;
  state?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

const buildQueryString = (params?: RevenueFilterParams): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : '';
};

export const revenueApi = {
  // Get dashboard with summary and growth metrics
  getDashboard: (params?: RevenueFilterParams) =>
    api.get<RevenueDashboard>(`/revenue/dashboard${buildQueryString(params)}`),

  // Get revenue summary
  getSummary: (params?: RevenueFilterParams) =>
    api.get<RevenueSummary>(`/revenue/summary${buildQueryString(params)}`),

  // Get today's snapshot
  getTodaySnapshot: () =>
    api.get<{
      totalRevenue: number;
      totalBookings: number;
      todayRevenue: number;
      todayBookings: number;
      timestamp: string;
    }>('/revenue/today'),

  // Get bookings by state
  getBookingsByState: (params?: RevenueFilterParams) =>
    api.get<RevenueChart>(`/revenue/charts/bookings-by-state${buildQueryString(params)}`),

  // Get bookings by service
  getBookingsByService: (params?: RevenueFilterParams) =>
    api.get<RevenueChart>(`/revenue/charts/bookings-by-service${buildQueryString(params)}`),

  // Get bookings by crop
  getBookingsByCrop: (params?: RevenueFilterParams) =>
    api.get<RevenueChart>(`/revenue/charts/bookings-by-crop${buildQueryString(params)}`),

  // Get revenue trend over time
  getTrend: (params?: RevenueFilterParams) =>
    api.get<RevenueChart>(`/revenue/charts/trend${buildQueryString(params)}`),

  // Get vendor performance
  getVendorPerformance: (params?: RevenueFilterParams) =>
    api.get<VendorPerformance[]>(`/revenue/charts/vendor-performance${buildQueryString(params)}`),

  // Export CSV
  exportCsv: (params?: RevenueFilterParams) =>
    api.get<{ filename: string; mimeType: string; content: string }>(`/revenue/export/csv${buildQueryString(params)}`),

  // Export PDF
  exportPdf: (params?: RevenueFilterParams) =>
    api.get<{ filename: string; mimeType: string; contentBase64: string }>(`/revenue/export/pdf${buildQueryString(params)}`),

  // Vendor specific
  getVendorRevenue: (params?: RevenueFilterParams) =>
    api.get<RevenueSummary>(`/revenue/vendor${buildQueryString(params)}`),

  getVendorCommission: (params?: RevenueFilterParams) =>
    api.get<{
      grossRevenue: number;
      platformCommission: number;
      netPayout: number;
      paidBookings: number;
    }>(`/revenue/vendor/commission${buildQueryString(params)}`),

  // Aggregator specific
  getAggregatorCommission: (params?: RevenueFilterParams) =>
    api.get<{
      aggregatorId: string;
      grossRevenue: number;
      commissionRate: number;
      earnedCommission: number;
      pendingCommission: number;
      paidBookings: number;
    }>(`/revenue/aggregator/commission${buildQueryString(params)}`),
};

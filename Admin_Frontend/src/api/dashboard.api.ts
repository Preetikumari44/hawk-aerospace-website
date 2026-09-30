import { api as apiClient } from './client';

export type TimeFilter = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DashboardFilterParams {
  timeFilter?: TimeFilter;
  dateFrom?: string;
  dateTo?: string;
  state?: string;
  serviceType?: string;
  year?: number;
  quarter?: number;
}

export interface DashboardMetrics {
  totalActiveBookings: number;
  totalCompletedBookings: number;
  totalUpcomingBookings: number;
  totalRevenue: number;
  totalCancelledBookings: number;
  revenueGrowth: number;
  bookingsGrowth: number;
}

export interface UserCategoryMetrics {
  customers: number;
  pilots: number;
  fleetManagers: number;
  technicians: number;
  salesAggregators: number;
  marketplaceVendors: number;
}

export interface ServiceDistribution {
  service: string;
  count: number;
  percentage: number;
}

export interface StateDistribution {
  state: string;
  count: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface TimeSeriesData {
  date: string;
  customers: number;
  pilots: number;
  fleetManagers: number;
  technicians: number;
  salesAggregators: number;
  marketplaceVendors: number;
}

export interface TaskMetrics {
  pendingFleetManagerApprovals: number;
  pendingPilotApprovals: number;
  pendingTechnicianApprovals: number;
  totalOpenComplaintTickets: number;
}

export interface MarketplaceMetrics {
  totalActiveOrders: number;
  totalCompletedOrders: number;
  totalRevenue: number;
  revenueGrowth: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  userCategoryMetrics: UserCategoryMetrics;
  serviceDistribution: ServiceDistribution[];
  stateDistribution: StateDistribution[];
  timeSeriesData: TimeSeriesData[];
  taskMetrics: TaskMetrics;
  marketplaceMetrics: MarketplaceMetrics;
  revenueTimeSeries: Array<{ date: string; revenue: number }>;
  generatedAt: string;
}

const buildQueryString = (params?: DashboardFilterParams): string => {
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

export const dashboardApi = {
  /**
   * Get comprehensive dashboard data
   */
  getDashboard: (params?: DashboardFilterParams) => {
    return apiClient.get<DashboardData>(`/dashboard${buildQueryString(params)}`);
  },
};

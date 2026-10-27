import type { SalesPerformance, SalesSummary } from '@/lib/sales/types';

export const salesSummary: SalesSummary = {
  status: 'Active',
  thisMonth: 42500,
  totalSales: 128400,
  totalBookings: 36,
  activeBookings: 4,
  upcomingBookings: 6,
  completedBookings: 24,
  cancelledBookings: 2,
  totalCommission: 12840,
  pendingCommission: 2100,
  earnedCommission: 10740,
  customers: 18,
};

export const salesPerformance: SalesPerformance = {
  weekly: [12, 18, 9, 22, 15, 20, 25],
  monthly: [60, 72, 55, 90, 84, 96],
  completed: 24,
};

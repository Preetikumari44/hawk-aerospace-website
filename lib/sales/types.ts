// Types mirror the data shapes the original app already used (src/data/*.js).
// Amounts and dates are pre-formatted strings in the source data, so they stay strings here.

export type BookingStatus = 'Active' | 'Upcoming' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  customer: string;
  service: string;
  date: string;
  amount: string;
  status: BookingStatus;
  pilot: string;
}

export type CommissionStatus = 'Completed' | 'Pending';

export interface CommissionEntry {
  id: string;
  booking: string;
  amount: string;
  date: string;
  status: CommissionStatus;
}

export interface SalesSummary {
  status: string;
  thisMonth: number;
  totalSales: number;
  totalBookings: number;
  activeBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalCommission: number;
  pendingCommission: number;
  earnedCommission: number;
  customers: number;
}

export interface SalesPerformance {
  weekly: number[];
  monthly: number[];
  completed: number;
}

export type ProductCategory = 'Fertilizers' | 'Farming Equipments';

export interface Product {
  id: string;
  name: string;
  price: string;
  category: ProductCategory;
  image?: string;
}

export interface Promotion {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  tone: 'green' | 'amber';
}

export interface SalesNotification {
  id: string;
  title: string;
  message: string;
  time: string;
}

export interface SupportInfo {
  title: string;
  subtitle: string;
  ctaLabel: string;
  phone: string;
  email: string;
}

export interface Profile {
  fullName: string;
  role: string;
  phone: string;
  email: string;
  notifications: string;
  payoutMethod: string;
}

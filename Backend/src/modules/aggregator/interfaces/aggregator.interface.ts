export interface CommissionTier {
  minBookings: number;
  maxBookings: number;
  rate: number;
  name: string;
}

export interface AggregatorCommissionSummary {
  aggregatorUid: string;
  completedBookings: number;
  grossRevenue: number;
  commissionRate: number;
  commissionEarned: number;
  pendingCommission: number;
  settledCommission: number;
  currentTier: string;
  monthlyBookings: number;
  nextTierBookings: number | null;
}

export interface PendingCommission {
  bookingId: string;
  customerName: string;
  serviceType: string;
  completedAt: string;
  bookingAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending';
}

export interface SettledCommission {
  settlementId: string;
  bookingIds: string[];
  totalAmount: number;
  commissionRate: number;
  settledAt: string;
  paymentMethod: string;
  transactionId?: string;
}

export interface AggregatorDashboard {
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  totalBookings: number;
  totalCustomers: number;
  totalEarnings: number;
  pendingEarnings: number;
  currentTier: string;
  commissionRate: number;
  recentBookings: Array<{
    bookingId: string;
    customerName: string;
    serviceType: string;
    status: string;
    area: number;
    cropType: string;
    createdAt: string;
  }>;
  serviceBreakdown: Array<{
    serviceType: string;
    count: number;
    percentage: number;
  }>;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  smsNotifications: boolean;
  emailNotifications: boolean;
  bookingUpdates: boolean;
  commissionUpdates: boolean;
  customerUpdates: boolean;
  settlementAlerts: boolean;
  marketingPromotions: boolean;
}

export interface Refund {
  refundId: string;
  bookingId: string;
  customerName: string;
  serviceType: string;
  refundAmount: number;
  commissionDeduction: number;
  reason: string;
  status: 'pending' | 'processed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

export interface AccountDeletionRequest {
  requestId: string;
  aggregatorUid: string;
  reason: string;
  feedback?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  scheduledDeletionDate?: string;
}

export const ROOT_COLLECTIONS = {
  users: 'users',
  bookings: 'bookings',
  coupons: 'coupons',
  missions: 'missions',
  pricingLocks: 'pricing_locks',
  pricingConfigs: 'pricing_configs',
  serviceTickets: 'service_tickets',
  incidents: 'incidents',
  subadmins: 'subadmins',
  revenueSnapshots: 'revenue_snapshots',
  adminSettings: 'admin_settings',
  bookingHistory: 'booking_history',
  rewardPoints: 'reward_points',
  rewardRedemptions: 'reward_redemptions',
  delegatedBookings: 'delegated_bookings',
  settlements: 'settlements',
  payments: 'payments',
  razorpayOrders: 'razorpay_orders',
  maintenanceLogs: 'maintenance_logs',
  // Additional collections used across services
  maintenanceTickets: 'maintenanceTickets',
  pilots: 'pilots',
  pilotApplications: 'pilotApplications',
  roleApplications: 'role_applications',
  fleetManagers: 'fleetManagers',
  pilotRequests: 'pilotRequests',
  fleetManagerRequests: 'fleetManagerRequests',
  fleetManagerRequestTimeouts: 'fleetManagerRequestTimeouts',
  supportTickets: 'supportTickets',
  bookingProgress: 'booking_progress',
  weatherForecasts: 'weather_forecasts',
  flyingRestrictions: 'flying_restrictions',
  conversations: 'conversations',
  counters: 'counters',
  bookingRefunds: 'booking_refunds',
  payoutMethods: 'payout_methods',
  withdrawals: 'withdrawals',
  userEarnings: 'user_earnings',
  referralCodes: 'referral_codes',
  referrals: 'referrals',
  referralRules: 'referral_rules',
  walletLedger: 'wallet_ledger',
} as const;

export const USER_SUBCOLLECTIONS = {
  bookings: 'bookings',  // Fixed: was 'booking', should be 'bookings'
  transactions: 'transactions',
  notifications: 'notifications',
  invoices: 'invoice',
  drones: 'drones',
  adminActions: 'admin_actions',
} as const;

export type UserSubcollectionKey = keyof typeof USER_SUBCOLLECTIONS;

export function buildUserSubcollectionPath(
  uid: string,
  subcollection: UserSubcollectionKey,
): string {
  return `${ROOT_COLLECTIONS.users}/${uid}/${USER_SUBCOLLECTIONS[subcollection]}`;
}

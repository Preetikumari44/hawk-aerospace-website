export const APP_ROLES = [
  'customer',
  'aggregator',
  'vendor', // Legacy - same as fleet_manager
  'fleet_manager',
  'pilot',
  'technician',
  'admin',
  'subadmin',
  'super_admin',
  'state_admin',
  'dept_admin',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const USER_STATUSES = ['active', 'pending', 'blocked', 'suspended', 'rejected'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const ADMINISTRATIVE_ROLES = ['admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin'] as const;

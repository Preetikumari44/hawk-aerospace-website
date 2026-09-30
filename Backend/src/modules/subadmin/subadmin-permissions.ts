export const SUB_ADMIN_PERMISSION_KEYS = [
  'manage_pilots',
  'manage_vendors',
  'manage_customers',
  'manage_bookings',
  'manage_aggregators',
  'view_revenue',
  'manage_incidents',
  'manage_service_centre',
  'manage_fleet',
  'manage_coupons',
] as const;

export type SubAdminPermissionKey = (typeof SUB_ADMIN_PERMISSION_KEYS)[number];

export type SubAdminPermissionMap = Record<SubAdminPermissionKey, boolean>;

export const SUB_ADMIN_PERMISSION_MATRIX: Record<
  SubAdminPermissionKey,
  { label: string; description: string }
> = {
  manage_pilots: {
    label: 'Manage pilots',
    description: 'Review pilot onboarding, status, and operational access.',
  },
  manage_vendors: {
    label: 'Manage vendors',
    description: 'Review DSP/vendor profiles, onboarding, and verification state.',
  },
  manage_customers: {
    label: 'Manage customers',
    description: 'View and moderate customer profiles in the assigned scope.',
  },
  manage_bookings: {
    label: 'Manage bookings',
    description: 'View and coordinate booking lifecycle records.',
  },
  manage_aggregators: {
    label: 'Manage aggregators',
    description: 'Review sales aggregator profiles and delegated activity.',
  },
  view_revenue: {
    label: 'View revenue',
    description: 'Access revenue KPIs, charts, and scoped analytics.',
  },
  manage_incidents: {
    label: 'Manage incidents',
    description: 'Review incident queues, escalation state, and resolution records.',
  },
  manage_service_centre: {
    label: 'Manage service centre',
    description: 'View service tickets, technician queues, and SLA status.',
  },
  manage_fleet: {
    label: 'Manage fleet',
    description: 'View fleet managers, drones, maintenance, and availability.',
  },
  manage_coupons: {
    label: 'Manage coupons',
    description: 'Create and update coupon campaigns.',
  },
};

export function normalizeSubAdminPermissions(
  permissions?: Partial<Record<string, boolean>>,
): SubAdminPermissionMap {
  return SUB_ADMIN_PERMISSION_KEYS.reduce<SubAdminPermissionMap>((normalized, permission) => {
    normalized[permission] = permissions?.[permission] === true;
    return normalized;
  }, {} as SubAdminPermissionMap);
}

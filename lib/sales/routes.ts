// Replaces the original state-based router (NavigationContext/Router.js) with real URLs.
export const ROUTES = {
  dashboard: '/sales/dashboard',
  bookings: '/sales/bookings',
  commission: '/sales/commission',
  marketplace: '/sales/marketplace',
  account: '/sales/account',
} as const;

export const SIDEBAR_ITEMS = [
  { key: 'home', label: 'Home', href: ROUTES.dashboard, icon: 'home' },
  { key: 'bookings', label: 'Bookings', href: ROUTES.bookings, icon: 'bookings' },
  { key: 'commission', label: 'Commission', href: ROUTES.commission, icon: 'commission' },
] as const;

import {
  Pilot,
  Mission,
  FleetManager,
  TeamRequest,
  EarningsSummary,
  EarningsPoint,
  PayoutMethod,
  MarketplaceProduct,
  AppNotification,
  PromoOffer,
} from '../types';

/**
 * Mock/demo data — fallback ONLY.
 * Every screen reads through src/api (pilotApi/teamApi/etc). When a real
 * Hawk backend is wired up, these fixtures are never imported and can be
 * deleted without touching any screen code.
 */

export const mockPilot: Pilot = {
  id: 'pilot_1001',
  name: 'Arjun Mehta',
  phone: '+91 98765 43210',
  email: 'arjun.mehta@hawkaerospace.com',
  availability: 'active',
  role: 'Drone Pilot',
};

export const mockActiveMissions: Mission[] = [
  {
    id: 'MSN-7841',
    serviceType: 'Crop Health Survey',
    status: 'active',
    scheduledDate: new Date().toISOString(),
    preferredTimeSlot: '9:00 AM – 11:00 AM',
    estimatedEarnings: '₹3,200',
    address: 'Plot 14, Whitefield Agri Belt, Bengaluru',
    customerName: 'Greenfield Farms',
    eta: '28 min',
    nextStep: 'Collect drone from Fleet Manager',
    fleetManagerName: 'Kavya Fleet Services',
    drone: { model: 'Hawk Surveyor X2', registrationNumber: 'HK-DR-2291' },
    paymentStatus: 'pending',
  },
];

export const mockAssignedMissions: Mission[] = [
  {
    id: 'MSN-7855',
    serviceType: 'Site Mapping — Construction',
    status: 'assigned',
    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    preferredTimeSlot: '2:00 PM – 4:00 PM',
    estimatedEarnings: '₹4,750',
    address: 'Devanahalli Industrial Corridor, Bengaluru',
    customerName: 'Orion Infra Ltd.',
    eta: '45 min',
    fleetManagerName: 'Kavya Fleet Services',
  },
  {
    id: 'MSN-7860',
    serviceType: 'Real Estate Aerial Shoot',
    status: 'assigned',
    scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    preferredTimeSlot: '7:00 AM – 8:30 AM',
    estimatedEarnings: '₹2,100',
    address: 'Sarjapur Road, Bengaluru',
    customerName: 'Meridian Realty',
    eta: '32 min',
  },
];

export const mockUpcomingMissions: Mission[] = mockAssignedMissions.map((m) => ({
  ...m,
  status: 'upcoming',
}));

export const mockCompletedMissions: Mission[] = [
  {
    id: 'MSN-7710',
    serviceType: 'Crop Health Survey',
    status: 'completed',
    completedDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    estimatedEarnings: '₹3,000',
    address: 'Hoskote, Bengaluru',
    customerName: 'Greenfield Farms',
    paymentStatus: 'paid',
  },
  {
    id: 'MSN-7699',
    serviceType: 'Infrastructure Inspection',
    status: 'completed',
    completedDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    estimatedEarnings: '₹5,400',
    address: 'Electronic City, Bengaluru',
    customerName: 'Orion Infra Ltd.',
    paymentStatus: 'paid',
  },
];

export const mockFleetManagers: FleetManager[] = [
  { id: 'fm_1', name: 'Kavya Fleet Services', dronesCount: 12, address: 'Whitefield, Bengaluru', phone: '+91 90000 11111' },
  { id: 'fm_2', name: 'Deccan Aerial Fleet', dronesCount: 7, address: 'Yelahanka, Bengaluru', phone: '+91 90000 22222' },
];

export const mockSuggestedFleetManagers: FleetManager[] = [
  { id: 'fm_3', name: 'Nandi Sky Fleet', dronesCount: 9, address: 'Hebbal, Bengaluru' },
];

export const mockTeamRequests: TeamRequest[] = [
  { id: 'tr_1', type: 'pending', name: 'Deccan Aerial Fleet', managerOrPilotName: 'Deccan Aerial Fleet', createdAt: new Date().toISOString() },
  { id: 'tr_2', type: 'invite', name: 'Nandi Sky Fleet', managerOrPilotName: 'Nandi Sky Fleet', createdAt: new Date().toISOString() },
];

export const mockEarningsSummary: EarningsSummary = {
  totalEarnings: 84250,
  pendingEarnings: 6300,
  currency: '₹',
};

export const mockEarningsSeries: EarningsPoint[] = [
  { label: 'Apr', value: 5200 },
  { label: 'May', value: 7100 },
  { label: 'Jun', value: 6400 },
  { label: 'Jul', value: 8900 },
  { label: 'Aug', value: 7600 },
  { label: 'Sep', value: 9200 },
];

export const mockPayoutMethods: PayoutMethod[] = [
  {
    id: 'pm_1',
    type: 'bank',
    label: 'HDFC Bank •••• 4821',
    isPrimary: true,
    verificationStatus: 'verified',
    accountHolderName: 'Arjun Mehta',
    accountNumberMasked: '•••• •••• 4821',
    ifsc: 'HDFC0001234',
  },
];

export const mockPromotions: PromoOffer[] = [
  {
    id: 'promo_1',
    badge: 'AGRI OFFER',
    title: '10% OFF',
    subtitle: 'Your First Spray Mission',
    ctaLabel: 'Redeem Now',
    tone: 'green',
  },
  {
    id: 'promo_2',
    badge: 'FLEET BONUS',
    title: '₹500 Credit',
    subtitle: 'On completing 5 missions this month',
    ctaLabel: 'View Details',
    tone: 'amber',
  },
];

export const mockMarketplaceProducts: MarketplaceProduct[] = [
  { id: 'prod_1', name: 'Spare Propeller Set (4x)', price: 1200, category: 'Parts' },
  { id: 'prod_2', name: 'High-Capacity Flight Battery', price: 6800, category: 'Batteries' },
  { id: 'prod_3', name: 'Pilot Gloves — All Weather', price: 950, category: 'Gear' },
  { id: 'prod_4', name: 'Landing Pad — 1.5m', price: 2400, category: 'Accessories' },
];

export const mockNotifications: AppNotification[] = [
  { id: 'n1', title: 'New mission assigned', body: 'Site Mapping — Devanahalli', createdAt: new Date().toISOString(), read: false, type: 'mission' },
  { id: 'n2', title: 'Payout processed', body: '₹3,000 credited to HDFC •••• 4821', createdAt: new Date(Date.now() - 86400000).toISOString(), read: false, type: 'payout' },
  { id: 'n3', title: 'Fleet manager request accepted', body: 'Kavya Fleet Services', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), read: true, type: 'team' },
];

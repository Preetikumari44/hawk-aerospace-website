export type AvailabilityStatus = 'active' | 'offDuty';

export interface Pilot {
  id: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  availability: AvailabilityStatus;
  role: 'Drone Pilot';
}

export type MissionStatus =
  | 'assigned'
  | 'active'
  | 'upcoming'
  | 'completed'
  | 'rejected';

export interface MissionAddress {
  line1?: string;
  address?: string;
  location?: { address?: string };
}

export interface DroneInfo {
  id?: string;
  model?: string;
  registrationNumber?: string;
}

export interface Mission {
  id: string;
  serviceType: string;
  status: MissionStatus;
  scheduledDate?: string;
  preferredTimeSlot?: string;
  estimatedEarnings?: string;
  address?: string;
  location?: { address?: string };
  customerName?: string;
  eta?: string;
  nextStep?: string;
  fleetManagerName?: string;
  drone?: DroneInfo;
  paymentStatus?: 'paid' | 'pending' | 'unpaid';
  completedDate?: string;
}

export interface FleetManager {
  id: string;
  name: string;
  dronesCount?: number;
  address?: string;
  phone?: string;
}

export interface TeamRequest {
  id: string;
  name: string;
  type: 'join' | 'pending' | 'invite';
  managerOrPilotName?: string;
  createdAt?: string;
}

export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  currency: string;
}

export interface EarningsPoint {
  label: string;
  value: number;
}

export type PayoutMethodType = 'bank' | 'upi';

export interface PayoutMethod {
  id: string;
  type: PayoutMethodType;
  label: string;
  isPrimary?: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  accountHolderName?: string;
  accountNumberMasked?: string;
  ifsc?: string;
  upiId?: string;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export type NotificationType = 'mission' | 'team' | 'payout' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  type: NotificationType;
}

export interface PromoOffer {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  tone: 'green' | 'amber' | 'blue';
}

export type HawkRole = 'Customer' | 'Pilot' | 'Fleet Manager' | 'Sales Aggregator' | 'Technician';

export interface AsyncState<T> {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  data: T | null;
  error?: string;
}

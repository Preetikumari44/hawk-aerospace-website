/** Vendor/DSP API — marketplace management endpoints */

import { api } from './client';

export interface VendorProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  role: 'vendor';
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  adminApproval: boolean;
  profileData: {
    businessName: string;
    gstNumber: string;
    serviceRegions: string[];
  };
  verification: {
    isVerified: boolean;
    documents: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface VendorDashboard {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  revenue: number;
}

export interface FleetManager {
  uid: string;
  displayName: string;
  businessName: string;
  status: string;
  totalDrones: number;
  activePilots: number;
  serviceRegions: string[];
}

export interface CropRate {
  cropType: string;
  baseRate: number;
  unit: string;
  vendorId?: string;
}

export const vendorApi = {
  /** Admin: list all vendor/DSP profiles */
  getAll: () =>
    api.get<VendorProfile[]>('/admin/users?role=vendor'),

  /** Admin: get single vendor profile */
  getById: (uid: string) =>
    api.get<VendorProfile>(`/admin/users/${uid}`),

  /** Admin: verify vendor */
  verify: (uid: string) =>
    api.patch<VendorProfile>(`/admin/users/${uid}/verify`, {}),

  /** Admin: ban vendor */
  ban: (uid: string, reason: string) =>
    api.patch<VendorProfile>(`/admin/users/${uid}/ban`, { reason }),

  /** Admin: unban vendor */
  unban: (uid: string) =>
    api.patch<VendorProfile>(`/admin/users/${uid}/unban`, {}),

  /** Admin: list fleet managers (vendor view) */
  getManagers: () =>
    api.get<FleetManager[]>('/fleet/managers'),

  /** Admin: get manager profile */
  getManagerProfile: (id: string) =>
    api.get<FleetManager>(`/fleet/managers/${id}`),

  /** Admin: incoming vendor onboard requests */
  getIncomingRequests: () =>
    api.get<VendorProfile[]>('/fleet/incoming-requests'),

  /** Public: get crop rates (marketplace pricing) */
  getCropRates: (vendorId?: string) =>
    api.get<CropRate[]>(`/pricing/crop-rates${vendorId ? `?vendorId=${vendorId}` : ''}`),

  /** Admin/Vendor: update crop rate */
  updateCropRate: (dto: { cropType: string; baseRate: number }) =>
    api.patch<CropRate>('/pricing/crop-rates', dto),

  /** Admin: get fleet dashboard for a vendor */
  getFleetDashboard: (vendorId?: string) =>
    api.get<VendorDashboard>('/fleet/dashboard'),
};

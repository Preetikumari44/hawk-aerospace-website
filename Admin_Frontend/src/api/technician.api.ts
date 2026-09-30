import { api as client, type ApiResponse } from './client';

export interface TechnicianDocument {
  type: string;
  url: string;
}

export interface TechnicianVerification {
  isVerified: boolean;
  documents: TechnicianDocument[];
}

export interface TechnicianProfile {
  specializations?: string[];
  serviceRegion?: string;
  [key: string]: any;
}

export interface Technician {
  uid: string;
  email: string;
  fullName: string;
  mobile?: string;
  role: 'technician';
  status: 'active' | 'pending' | 'blocked' | 'suspended' | 'rejected';
  adminApproval: boolean;
  profileData: TechnicianProfile;
  verification: TechnicianVerification;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  totalRepairs?: number;
  rating?: number;
  state?: string;
  region?: string;
}

export interface MaintenanceTicket {
  ticketId: string;
  ticketNumber: string;
  category: string;
  droneId: string;
  fleetManagerId: string;
  title: string;
  description: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reportedBy: string;
  assignedTo: string;
  assignedTechnician: string;
  estimatedCost: number;
  actualCost?: number;
  estimatedDuration: number;
  actualDuration?: number;
  partsReplaced: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  resolution?: string;
  cancellationReason?: string;
}

export interface Drone {
  droneId: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  status: string;
  assignedFleetManagerId: string;
  batteryHealth: number;
  flightHours: number;
  missions: number;
  lastMaintenance: string;
  nextMaintenance: string;
  overallCondition: string;
  [key: string]: any;
}

export interface TechnicianDetail extends Technician {
  repairedDrones?: Drone[];
  maintenanceTickets?: MaintenanceTicket[];
  supportDocuments?: TechnicianDocument[];
}

export interface TechnicianListResponse {
  items: Technician[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface TechnicianFilter {
  page?: number;
  limit?: number;
  status?: 'active' | 'pending' | 'blocked' | 'suspended' | 'rejected';
  specialization?: string;
  search?: string;
}

export const technicianApi = {
  /**
   * Get list of technicians with optional filters
   */
  async list(filter?: TechnicianFilter): Promise<ApiResponse<TechnicianListResponse>> {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.status) params.append('status', filter.status);
      if (filter.specialization) params.append('specialization', filter.specialization);
      if (filter.search) params.append('search', filter.search);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return client.get<TechnicianListResponse>(`/technicians${queryString}`);
  },

  /**
   * Get technician by ID with detailed information
   */
  async getById(id: string): Promise<ApiResponse<TechnicianDetail>> {
    return client.get<TechnicianDetail>(`/technicians/${id}`);
  },

  /**
   * Get maintenance tickets assigned to a technician
   */
  async getMaintenanceTickets(technicianId: string): Promise<ApiResponse<MaintenanceTicket[]>> {
    return client.get<MaintenanceTicket[]>(`/technicians/${technicianId}/maintenance-tickets`);
  },

  /**
   * Get drones repaired by a technician
   */
  async getRepairedDrones(technicianId: string): Promise<ApiResponse<Drone[]>> {
    return client.get<Drone[]>(`/technicians/${technicianId}/repaired-drones`);
  },

  /**
   * Get support documents for a technician
   */
  async getSupportDocuments(technicianId: string): Promise<ApiResponse<TechnicianDocument[]>> {
    return client.get<TechnicianDocument[]>(`/technicians/${technicianId}/support-documents`);
  },

  /**
   * Update technician profile
   */
  async updateProfile(data: TechnicianProfile): Promise<ApiResponse<Technician>> {
    return client.patch<Technician>('/technicians/me', data);
  },

  /**
   * Onboard new technician
   */
  async onboard(data: {
    specializations: string[];
    serviceRegion?: string;
    documents: TechnicianDocument[];
  }): Promise<ApiResponse<Technician>> {
    return client.post<Technician>('/technicians/onboard', data);
  },

  /**
   * Update technician status (approve/reject/suspend)
   */
  async updateStatus(
    id: string,
    status: 'active' | 'pending' | 'blocked' | 'suspended' | 'rejected',
  ): Promise<ApiResponse<Technician>> {
    return client.patch<Technician>(`/technicians/${id}/status`, { status });
  },

  /**
   * Remove/Delete a technician
   */
  async remove(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return client.delete<{ deleted: boolean }>(`/technicians/${id}`);
  },
};

export default technicianApi;

import { api } from './client';

export interface ServiceTicket {
  ticketId: string;
  ticketNumber: string;
  droneId: string;
  pilotId: string | null;
  fleetManagerId: string | null;
  technicianId: string | null;
  vendorId: string | null;
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  serviceDetails: {
    diagnosis?: string | null;
    parts?: string[];
    estimatedCost?: number | null;
    actualCost?: number | null;
    estimatedDuration?: number | null;
    actualDuration?: number | null;
    assignedTechnician?: string | null;
  };
  mediaUrls: string[];
  scheduledDate: string | null;
  slaDeadline: string;
  resolvedAt: string | null;
  resolution: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ServiceCentreDashboard {
  totalAgents: number;
  totalOpenTickets: number;
  totalPendingTickets: number;
  totalCompletedTickets: number;
  slaBreachCount: number;
  ticketEscalations: number;
  ticketsByStatus: {
    open: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    closed: number;
    cancelled: number;
  };
  ticketsByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  avgResolutionTime: number;
  ticketsOverTime: {
    labels: string[];
    open: number[];
    inProgress: number[];
    closed: number[];
  };
}

export interface TicketFilter {
  status?: string;
  droneId?: string;
  technicianId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTickets {
  items: ServiceTicket[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface Technician {
  uid: string;
  email: string;
  fullName: string;
  mobile: string;
  role: string;
  status: string;
  adminApproval: boolean;
  verification: {
    isVerified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const serviceCentreApi = {
  /**
   * Get service centre dashboard statistics
   */
  async getDashboard(): Promise<ServiceCentreDashboard> {
    const { data } = await api.get<ServiceCentreDashboard>('/service-centre/dashboard');
    return data;
  },

  /**
   * Get list of service tickets with optional filters
   */
  async getTickets(filter?: TicketFilter): Promise<PaginatedTickets> {
    const params = new URLSearchParams();
    if (filter?.status) params.append('status', filter.status);
    if (filter?.droneId) params.append('droneId', filter.droneId);
    if (filter?.technicianId) params.append('technicianId', filter.technicianId);
    if (filter?.dateFrom) params.append('dateFrom', filter.dateFrom);
    if (filter?.dateTo) params.append('dateTo', filter.dateTo);
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    
    const queryString = params.toString();
    const { data } = await api.get<PaginatedTickets>(`/service-centre/tickets${queryString ? `?${queryString}` : ''}`);
    return data;
  },

  /**
   * Get a single ticket by ID
   */
  async getTicket(ticketId: string): Promise<ServiceTicket> {
    const { data } = await api.get<ServiceTicket>(`/service-centre/tickets/${ticketId}`);
    return data;
  },

  /**
   * Get service history for a specific drone
   */
  async getDroneServiceHistory(droneId: string): Promise<ServiceTicket[]> {
    const { data } = await api.get<ServiceTicket[]>(`/service-centre/drones/${droneId}/history`);
    return data;
  },

  /**
   * Get SLA breaches
   */
  async getSlaBreaches(): Promise<ServiceTicket[]> {
    const { data } = await api.get<ServiceTicket[]>('/service-centre/sla/breaches');
    return data;
  },

  /**
   * Get list of technicians
   */
  async getTechnicians(): Promise<Technician[]> {
    const { data } = await api.get<Technician[]>('/service-centre/technicians');
    return data;
  },

  /**
   * Get technician details with assigned tickets
   */
  async getTechnician(technicianId: string): Promise<{ profile: Technician; tickets: ServiceTicket[] }> {
    const { data } = await api.get<{ profile: Technician; tickets: ServiceTicket[] }>(`/service-centre/technicians/${technicianId}`);
    return data;
  },

  /**
   * Create a new service ticket
   */
  async createTicket(ticketData: {
    droneId: string;
    category: string;
    description: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    mediaUrls?: string[];
  }): Promise<ServiceTicket> {
    const { data } = await api.post<ServiceTicket>('/service-centre/tickets', ticketData);
    return data;
  },

  /**
   * Assign a technician to a ticket
   */
  async assignTechnician(
    ticketId: string,
    technicianId: string,
    priority: 'critical' | 'high' | 'medium' | 'low',
  ): Promise<ServiceTicket> {
    const { data } = await api.patch<ServiceTicket>(`/service-centre/tickets/${ticketId}/assign`, {
      technicianId,
      priority,
    });
    return data;
  },

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'cancelled',
  ): Promise<ServiceTicket> {
    const { data } = await api.patch<ServiceTicket>(`/service-centre/tickets/${ticketId}/status`, {
      status,
    });
    return data;
  },

  /**
   * Update ticket service details
   */
  async updateTicketDetails(
    ticketId: string,
    details: {
      diagnosis?: string;
      parts?: string[];
      time?: number;
    },
  ): Promise<ServiceTicket> {
    const { data } = await api.patch<ServiceTicket>(`/service-centre/tickets/${ticketId}/details`, details);
    return data;
  },

  /**
   * Schedule a service appointment
   */
  async scheduleService(ticketId: string, technicianId: string, date: string): Promise<ServiceTicket> {
    const { data } = await api.post<ServiceTicket>('/service-centre/schedule', {
      ticketId,
      technicianId,
      date,
    });
    return data;
  },

  /**
   * Verify/approve a technician
   */
  async verifyTechnician(technicianId: string, approved: boolean): Promise<{ profile: Technician; tickets: ServiceTicket[] }> {
    const { data } = await api.patch<{ profile: Technician; tickets: ServiceTicket[] }>(`/service-centre/technicians/${technicianId}/verify`, {
      approved,
    });
    return data;
  },
};

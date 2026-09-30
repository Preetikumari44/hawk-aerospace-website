/** Incident API */

import { api } from './client';

export interface Incident {
  incidentId: string;
  bookingId: string | null;
  droneId: string | null;
  pilotId: string | null;
  fleetManagerId?: string;
  customerId?: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'SAFETY';
  category: 'TECHNICAL' | 'WEATHER' | 'CUSTOMER_ISSUE' | 'SAFETY' | 'OTHER';
  status: 'PENDING' | 'UNDER_INVESTIGATION' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  currentEscalation: 'FLEET_MANAGER' | 'DISTRICT_ADMIN' | 'DEPARTMENT_ADMIN' | 'STATE_ADMIN' | 'SUPER_ADMIN';
  assignedAdmin?: string;
  escalationHistory: Array<{
    level: string;
    adminId: string;
    escalatedAt?: string;
    resolvedAt?: string;
    notes?: string;
    resolution?: string;
  }>;
  location: {
    state: string;
    district: string;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  mediaUrls?: string[];
  resolutionNotes?: string | null;
  escalatedTo?: string | null;
}

export interface IncidentListResponse {
  items: Incident[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface IncidentSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface IncidentFilter {
  type?: string;
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const incidentApi = {
  getAll: (filter?: IncidentFilter) =>
    api.get<IncidentListResponse>('/incidents', { params: filter }),

  getById: (id: string) =>
    api.get<Incident>(`/incidents/${id}`),

  getSummary: () =>
    api.get<IncidentSummary>('/incidents/summary'),

  create: (dto: Partial<Incident>) =>
    api.post<Incident>('/incidents', dto),

  escalate: (id: string, escalateTo: string, reason: string) =>
    api.patch<Incident>(`/incidents/${id}/escalate`, { escalateTo, reason }),

  updateStatus: (id: string, status: string, resolutionNotes?: string) =>
    api.patch<Incident>(`/incidents/${id}/status`, { status, resolutionNotes }),

  followUp: (id: string, note: string) =>
    api.post<Incident>(`/incidents/${id}/follow-up`, { note }),

  exportCsv: (filter?: IncidentFilter) =>
    api.get<string>('/incidents/export', { params: filter }),

  getDroneMalfunctions: () =>
    api.get<Incident[]>('/incidents/types/drone-malfunction'),

  getPilotEmergencies: () =>
    api.get<Incident[]>('/incidents/types/pilot-emergency'),
};

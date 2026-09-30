/** Fleet (Vendor/DSP) API */

import { api } from './client';

export interface Drone {
  id: string;
  vendorId: string;
  model: string;
  serialNumber: string;
  status: 'active' | 'inactive' | 'maintenance' | 'grounded';
  batteryHealth: number;
  totalFlightHours: number;
  lastMaintenanceDate: string;
  assignedPilotId?: string;
  createdAt: string;
}

export interface FleetStats {
  totalDrones: number;
  active: number;
  maintenance: number;
  grounded: number;
}

export interface MaintenanceLog {
  id: string;
  droneId: string;
  type: string;
  description: string;
  performedBy: string;
  date: string;
}

export const fleetApi = {
  getStats: () =>
    api.get<FleetStats>('/fleet/stats'),

  getFleetManagers: () =>
    api.get<any[]>('/fleet-managers'),

  getDrones: (vendorId?: string) =>
    api.get<Drone[]>(`/fleet/drones${vendorId ? `?vendorId=${vendorId}` : ''}`),

  getDrone: (id: string) =>
    api.get<Drone>(`/fleet/drones/${id}`),

  addDrone: (dto: Partial<Drone>) =>
    api.post<Drone>('/fleet/drones', dto),

  updateStatus: (id: string, status: string) =>
    api.patch<Drone>(`/fleet/drones/${id}/status`, { status }),

  assignPilot: (droneId: string, pilotId: string) =>
    api.patch<Drone>(`/fleet/drones/${droneId}/assign`, { pilotId }),

  getMaintenanceLogs: (droneId: string) =>
    api.get<MaintenanceLog[]>(`/fleet/drones/${droneId}/maintenance`),

  logMaintenance: (droneId: string, dto: Partial<MaintenanceLog>) =>
    api.post<MaintenanceLog>(`/fleet/drones/${droneId}/maintenance`, dto),
};

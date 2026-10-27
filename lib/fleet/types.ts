// Fleet workspace types — verbatim port of the teammate's types/index.ts
// (new-origin/fleet-manager-dashboard-new), so every ported component keeps
// its exact shape.

export type PilotStatus = "Available" | "Assigned" | "Off-Duty";
export interface FleetPilot {
  id: string;
  name: string;
  phone: string;
  skills: string[];
  serviceTags: string[];
  status: PilotStatus;
  rating: number;
  avatarInitial: string;
}

export type DroneStatus = "Deployable" | "Assigned" | "Maintenance";
export interface FleetDrone {
  id: string;
  model: string;
  code: string;
  status: DroneStatus;
  flightHours: number;
  lastServiced: string;
}

export type MissionStatus =
  | "Awaiting Approval"
  | "Booking Confirmed"
  | "Pilot Assigned"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Rejected";
export type MissionTab = "Active" | "Upcoming" | "Completed";
export interface FleetMission {
  id: string;
  type: string;
  client: string;
  location: string;
  date: string;
  time: string;
  pilot: string | null;
  drone: string | null;
  status: MissionStatus;
  tab: MissionTab;
}

export type TicketPriority = "Low" | "Medium" | "High" | "Critical";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export interface FleetTicket {
  id: string;
  resource: string;
  raisedBy: string;
  issue: string;
  priority: TicketPriority;
  date: string;
  status: TicketStatus;
}

export interface FleetProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

export interface FleetNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export interface FleetUser {
  name: string;
  phone: string;
  email: string;
  role: string;
  id: string;
  address: string;
}

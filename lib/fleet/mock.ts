// Fleet workspace fallback data — verbatim port of the teammate's
// data/mockFleetData.ts. Used ONLY when the backend is unreachable or returns
// nothing; live backend data always wins (see lib/fleet/data.ts).

import type {
  FleetDrone,
  FleetMission,
  FleetNotification,
  FleetPilot,
  FleetProduct,
  FleetTicket,
  FleetUser,
} from "./types";

export const mockFleetUser: FleetUser = {
  name: "Arjun Mehta",
  phone: "+91 98450 12233",
  email: "arjun.mehta@hawkaerospace.com",
  role: "Fleet Manager",
  id: "HA-FM-1042",
  address: "Whitefield, Bangalore, Karnataka",
};

export const mockFleetPilots: FleetPilot[] = [
  { id: "PLT-101", name: "Rahul Nair", phone: "+91 98765 43210", skills: ["Monitoring", "Videography"], serviceTags: ["Agriculture", "Media"], status: "Available", rating: 4.8, avatarInitial: "R" },
  { id: "PLT-102", name: "Sneha Kulkarni", phone: "+91 91234 56789", skills: ["Seeding", "Monitoring"], serviceTags: ["Agriculture"], status: "Assigned", rating: 4.6, avatarInitial: "S" },
  { id: "PLT-103", name: "Vikram Rao", phone: "+91 99887 66554", skills: ["Videography", "Surveying"], serviceTags: ["Media", "Survey"], status: "Available", rating: 4.9, avatarInitial: "V" },
  { id: "PLT-104", name: "Ananya Iyer", phone: "+91 90909 80808", skills: ["Monitoring"], serviceTags: ["Security"], status: "Off-Duty", rating: 4.5, avatarInitial: "A" },
  { id: "PLT-105", name: "Karthik Reddy", phone: "+91 93456 12378", skills: ["Seeding", "Spraying"], serviceTags: ["Agriculture"], status: "Assigned", rating: 4.7, avatarInitial: "K" },
  { id: "PLT-106", name: "Divya Menon", phone: "+91 97012 34567", skills: ["Videography"], serviceTags: ["Media", "Events"], status: "Available", rating: 4.9, avatarInitial: "D" },
];

export const mockFleetDrones: FleetDrone[] = [
  { id: "DRN-01", model: "Hawk AgriX 4", code: "AGX-004", status: "Deployable", flightHours: 210, lastServiced: "02 Sep 2026" },
  { id: "DRN-02", model: "Hawk SkyCam Pro", code: "SCP-011", status: "Assigned", flightHours: 340, lastServiced: "18 Aug 2026" },
  { id: "DRN-03", model: "Hawk Surveyor X2", code: "SVX-022", status: "Maintenance", flightHours: 512, lastServiced: "30 Jul 2026" },
  { id: "DRN-04", model: "Hawk AgriX 4", code: "AGX-005", status: "Deployable", flightHours: 98, lastServiced: "10 Sep 2026" },
  { id: "DRN-05", model: "Hawk SkyCam Pro", code: "SCP-012", status: "Assigned", flightHours: 276, lastServiced: "05 Sep 2026" },
];

export const mockFleetMissions: FleetMission[] = [
  { id: "MSN-2201", type: "Crop Monitoring", client: "Green Valley Farms", location: "Mandya, Karnataka", date: "22 Sep 2026", time: "09:00 AM", pilot: "Sneha Kulkarni", drone: "AGX-004", status: "In Progress", tab: "Active" },
  { id: "MSN-2202", type: "Aerial Videography", client: "Studio Nine Films", location: "Indiranagar, Bangalore", date: "22 Sep 2026", time: "02:30 PM", pilot: "Divya Menon", drone: "SCP-011", status: "Pilot Assigned", tab: "Active" },
  { id: "MSN-2203", type: "Land Survey", client: "Prestige Constructions", location: "Devanahalli, Bangalore", date: "24 Sep 2026", time: "11:00 AM", pilot: "Vikram Rao", drone: null, status: "Booking Confirmed", tab: "Upcoming" },
  { id: "MSN-2204", type: "Seed Spraying", client: "Karnataka Agro Co-op", location: "Mysuru, Karnataka", date: "26 Sep 2026", time: "07:30 AM", pilot: "Karthik Reddy", drone: null, status: "Awaiting Approval", tab: "Upcoming" },
  { id: "MSN-2205", type: "Security Patrol", client: "Manyata Tech Park", location: "Nagavara, Bangalore", date: "15 Sep 2026", time: "10:00 PM", pilot: "Ananya Iyer", drone: "SVX-022", status: "Completed", tab: "Completed" },
  { id: "MSN-2206", type: "Event Coverage", client: "WeddingWorks India", location: "Nandi Hills, Karnataka", date: "10 Sep 2026", time: "05:00 PM", pilot: "Divya Menon", drone: "SCP-012", status: "Completed", tab: "Completed" },
  { id: "MSN-2207", type: "Crop Monitoring", client: "Sunrise Plantations", location: "Hassan, Karnataka", date: "05 Sep 2026", time: "08:00 AM", pilot: "Rahul Nair", drone: "AGX-005", status: "Completed", tab: "Completed" },
];

export const mockFleetTickets: FleetTicket[] = [
  { id: "TKT-501", resource: "Hawk Surveyor X2 (SVX-022)", raisedBy: "Vikram Rao", issue: "Gimbal calibration drift during flight", priority: "High", date: "20 Sep 2026", status: "In Progress" },
  { id: "TKT-502", resource: "Hawk SkyCam Pro (SCP-011)", raisedBy: "Divya Menon", issue: "Battery draining faster than expected", priority: "Medium", date: "18 Sep 2026", status: "Open" },
  { id: "TKT-503", resource: "Hawk AgriX 4 (AGX-004)", raisedBy: "Sneha Kulkarni", issue: "Nozzle clog on spray module", priority: "Low", date: "12 Sep 2026", status: "Resolved" },
  { id: "TKT-504", resource: "Hawk SkyCam Pro (SCP-012)", raisedBy: "Karthik Reddy", issue: "Propeller replacement after minor collision", priority: "Critical", date: "08 Sep 2026", status: "Closed" },
];

export const mockFleetProducts: FleetProduct[] = [
  { id: "PRD-01", name: "Propeller Set (4x)", description: "High-durability carbon fiber propellers", price: 1499, category: "Spare Parts", image: "🛩️" },
  { id: "PRD-02", name: "Smart Battery Pack", description: "6200mAh, fast-charge compatible", price: 8999, category: "Batteries", image: "🔋" },
  { id: "PRD-03", name: "Gimbal Stabilizer", description: "3-axis precision gimbal module", price: 5499, category: "Spare Parts", image: "🎥" },
  { id: "PRD-04", name: "Agri Spray Nozzle Kit", description: "Anti-clog nozzles for AgriX series", price: 2199, category: "Agriculture", image: "🌾" },
  { id: "PRD-05", name: "Pilot Safety Kit", description: "Gloves, vest, and signal beacon", price: 1899, category: "Safety", image: "🦺" },
  { id: "PRD-06", name: "Field Charging Station", description: "Portable solar-assisted charger", price: 14999, category: "Batteries", image: "🔌" },
];

export const mockFleetNotifications: FleetNotification[] = [
  { id: "N1", title: "New mission request", description: "Sunrise Plantations requested a crop monitoring mission", time: "10 min ago", read: false },
  { id: "N2", title: "Pilot invitation accepted", description: "Divya Menon accepted your invitation to join the fleet", time: "1 hr ago", read: false },
  { id: "N3", title: "Drone maintenance alert", description: "Hawk Surveyor X2 (SVX-022) flagged for gimbal service", time: "3 hr ago", read: false },
  { id: "N4", title: "Pilot availability change", description: "Ananya Iyer marked herself Off-Duty", time: "Yesterday", read: true },
  { id: "N5", title: "Mission completed", description: "MSN-2206 Event Coverage marked as completed", time: "Yesterday", read: true },
  { id: "N6", title: "Maintenance ticket update", description: "TKT-503 has been resolved", time: "2 days ago", read: true },
];

export const mockMissionOverview = {
  totalEarnings: 124500,
  completedMissions: 24,
  upcomingMissions: 6,
  rejectedMissions: 2,
};

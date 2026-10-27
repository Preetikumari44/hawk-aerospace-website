import type { FleetDrone, FleetPilot, FleetTechnician, Vendor } from "./types";

// ---------------------------------------------------------------------------
// Deterministic DEMO fleet for the Raider System's FlightRadar24-style live
// map. Every entry is fixed (no per-render randomness) so the fleet reads
// the same way across reloads/tabs — only each drone's *position along its
// route* changes, driven by wall-clock time in lib/booking/drone-simulation.ts.
//
// "flying" drones loop forever: start -> destination -> back to start, so
// movement is continuous and never teleports. "grounded" drones sit at their
// base with the given groundStatus.
//
// DISTRIBUTED RESOURCE MODEL (§5): a drone does NOT permanently belong to one
// pilot. Vendors own drones and pilots as independent pools; technicians are
// their own independent pool. lib/booking/resource-assignment.ts is what
// actually matches the nearest/most-suitable pilot or technician to a drone
// at dispatch/incident time — vendorId here only groups ownership, it is
// never treated as a hard drone -> pilot dependency.
//
// This is demo/simulation data only — NOT real GPS. See
// lib/booking/drone-simulation.ts for the "real telemetry ready" notes.
// ---------------------------------------------------------------------------

export const DEMO_VENDORS: Vendor[] = [
  { id: "vendor-a", name: "Bengaluru Air Ops" },
  { id: "vendor-b", name: "Deccan Skyworks" },
  { id: "vendor-c", name: "Coastal Raider Co." },
];

export const DEMO_FLEET: FleetDrone[] = [
  {
    id: "raider-03",
    callsign: "RAIDER-03",
    pilot: "Captain Arjun",
    mission: "Standing By",
    mode: "grounded",
    groundStatus: "available",
    start: { latitude: 12.9716, longitude: 77.5946, label: "Bengaluru HQ" },
    destination: { latitude: 12.9716, longitude: 77.5946, label: "Bengaluru HQ" },
    cruiseSpeedKmh: 0,
    cruiseAltitudeM: 0,
    loopDurationMinutes: 60,
    phaseOffsetMinutes: 0,
    serviceKey: "videography",
    capabilities: ["videography", "mapping"],
    vendorId: "vendor-a",
  },
  {
    id: "raider-07",
    callsign: "RAIDER-07",
    pilot: "Captain Rahul",
    mission: "Road & Highway Inspection",
    mode: "flying",
    groundStatus: "ready",
    start: { latitude: 12.9716, longitude: 77.5946, label: "Bengaluru HQ" },
    destination: { latitude: 12.9698, longitude: 77.75, label: "Whitefield, Bengaluru" },
    cruiseSpeedKmh: 42,
    cruiseAltitudeM: 120,
    loopDurationMinutes: 26,
    phaseOffsetMinutes: 3,
    serviceKey: "surveillance",
    capabilities: ["surveillance"],
    vendorId: "vendor-a",
  },
  {
    id: "raider-09",
    callsign: "RAIDER-09",
    pilot: "Captain Vikram",
    mission: "Mining Site Inspection",
    mode: "flying",
    groundStatus: "ready",
    start: { latitude: 12.2958, longitude: 76.6394, label: "Mysuru Base" },
    destination: { latitude: 12.4194, longitude: 76.6939, label: "Srirangapatna" },
    cruiseSpeedKmh: 36,
    cruiseAltitudeM: 95,
    loopDurationMinutes: 22,
    phaseOffsetMinutes: 9,
    serviceKey: "surveillance",
    capabilities: ["surveillance", "mapping"],
    vendorId: "vendor-b",
  },
  {
    id: "raider-12",
    callsign: "RAIDER-12",
    pilot: "Captain Aman",
    mission: "Traffic Management Monitoring",
    mode: "flying",
    groundStatus: "ready",
    start: { latitude: 13.3409, longitude: 77.1017, label: "Tumakuru Base" },
    destination: { latitude: 13.0827, longitude: 77.35, label: "Nelamangala, Bengaluru" },
    cruiseSpeedKmh: 48,
    cruiseAltitudeM: 140,
    loopDurationMinutes: 20,
    phaseOffsetMinutes: 14,
    serviceKey: "surveillance",
    capabilities: ["surveillance"],
    vendorId: "vendor-b",
  },
  {
    id: "raider-18",
    callsign: "RAIDER-18",
    pilot: "Captain Divya",
    mission: "Offline for Maintenance",
    mode: "grounded",
    // Demo breakdown scenario for §11: this airframe is the one shown under
    // maintenance with a technician already dispatched — see
    // lib/booking/resource-assignment.ts:DEMO_INCIDENT.
    groundStatus: "maintenance",
    start: { latitude: 12.9141, longitude: 74.856, label: "Mangaluru Base" },
    destination: { latitude: 12.9141, longitude: 74.856, label: "Mangaluru Base" },
    cruiseSpeedKmh: 0,
    cruiseAltitudeM: 0,
    loopDurationMinutes: 60,
    phaseOffsetMinutes: 0,
    serviceKey: "spraying",
    capabilities: ["spraying"],
    vendorId: "vendor-c",
  },
  {
    id: "raider-24",
    callsign: "RAIDER-24",
    pilot: "Captain Sanjay",
    mission: "Site Progress Mapping",
    mode: "flying",
    groundStatus: "ready",
    start: { latitude: 15.3647, longitude: 75.124, label: "Hubballi Base" },
    destination: { latitude: 15.4589, longitude: 75.0078, label: "Dharwad" },
    cruiseSpeedKmh: 39,
    cruiseAltitudeM: 110,
    loopDurationMinutes: 18,
    phaseOffsetMinutes: 5,
    serviceKey: "mapping",
    capabilities: ["mapping", "surveillance"],
    vendorId: "vendor-a",
  },
  {
    id: "raider-31",
    callsign: "RAIDER-31",
    pilot: "Captain Priya",
    mission: "Standing By",
    mode: "grounded",
    groundStatus: "available",
    start: { latitude: 15.8497, longitude: 74.4977, label: "Belagavi Base" },
    destination: { latitude: 15.8497, longitude: 74.4977, label: "Belagavi Base" },
    cruiseSpeedKmh: 0,
    cruiseAltitudeM: 0,
    loopDurationMinutes: 60,
    phaseOffsetMinutes: 0,
    serviceKey: "spraying",
    capabilities: ["spraying"],
    vendorId: "vendor-b",
  },
  {
    id: "raider-42",
    callsign: "RAIDER-42",
    pilot: "Captain Karthik",
    mission: "360° Property Tour",
    mode: "flying",
    groundStatus: "ready",
    start: { latitude: 15.1394, longitude: 76.9214, label: "Ballari Base" },
    destination: { latitude: 15.2693, longitude: 76.3871, label: "Hospet" },
    cruiseSpeedKmh: 45,
    cruiseAltitudeM: 130,
    loopDurationMinutes: 24,
    phaseOffsetMinutes: 18,
    serviceKey: "videography",
    capabilities: ["videography"],
    vendorId: "vendor-c",
  },
];

export function getFleetDrone(id: string): FleetDrone | undefined {
  return DEMO_FLEET.find((d) => d.id === id);
}

// ---------------------------------------------------------------------------
// Independent pilot & technician resource pools (§5/§7). Deliberately NOT
// keyed one-to-one against DEMO_FLEET — the whole point of the distributed
// model is that any available, qualified pilot/technician can be matched to
// any drone/incident regardless of vendor.
// ---------------------------------------------------------------------------

export const DEMO_PILOTS: FleetPilot[] = [
  {
    id: "pilot-arjun",
    name: "Captain Arjun",
    vendorId: "vendor-a",
    location: { latitude: 12.9716, longitude: 77.5946, label: "Bengaluru HQ" },
    status: "available",
    qualifications: ["videography", "mapping", "surveillance"],
  },
  {
    id: "pilot-rahul",
    name: "Captain Rahul",
    vendorId: "vendor-a",
    location: { latitude: 12.9698, longitude: 77.75, label: "Whitefield, Bengaluru" },
    status: "assigned",
    qualifications: ["surveillance"],
  },
  {
    id: "pilot-vikram",
    name: "Captain Vikram",
    vendorId: "vendor-b",
    location: { latitude: 12.2958, longitude: 76.6394, label: "Mysuru Base" },
    status: "assigned",
    qualifications: ["surveillance", "mapping"],
  },
  {
    id: "pilot-priya",
    name: "Captain Priya",
    vendorId: "vendor-b",
    location: { latitude: 15.8497, longitude: 74.4977, label: "Belagavi Base" },
    status: "available",
    qualifications: ["spraying", "mapping"],
  },
  {
    id: "pilot-karthik",
    name: "Captain Karthik",
    vendorId: "vendor-c",
    location: { latitude: 15.1394, longitude: 76.9214, label: "Ballari Base" },
    status: "assigned",
    qualifications: ["videography"],
  },
  {
    id: "pilot-neha",
    name: "Captain Neha",
    vendorId: null,
    location: { latitude: 13.0827, longitude: 77.35, label: "Nelamangala, Bengaluru" },
    status: "available",
    qualifications: ["spraying", "videography", "surveillance", "mapping"],
  },
];

export const DEMO_TECHNICIANS: FleetTechnician[] = [
  {
    id: "tech-suresh",
    name: "Suresh K.",
    vendorId: "vendor-c",
    location: { latitude: 12.87, longitude: 74.84, label: "Mangaluru South" },
    status: "available",
    repairCapability: ["motor", "battery", "frame"],
  },
  {
    id: "tech-lakshmi",
    name: "Lakshmi R.",
    vendorId: "vendor-c",
    location: { latitude: 12.95, longitude: 74.87, label: "Mangaluru North" },
    status: "busy",
    repairCapability: ["battery", "firmware"],
  },
  {
    id: "tech-manoj",
    name: "Manoj P.",
    vendorId: null,
    location: { latitude: 13.35, longitude: 74.79, label: "Udupi" },
    status: "available",
    repairCapability: ["motor", "sensor"],
  },
  {
    id: "tech-farah",
    name: "Farah S.",
    vendorId: "vendor-a",
    location: { latitude: 12.97, longitude: 77.6, label: "Bengaluru HQ" },
    status: "available",
    repairCapability: ["motor", "battery", "sensor", "firmware"],
  },
];

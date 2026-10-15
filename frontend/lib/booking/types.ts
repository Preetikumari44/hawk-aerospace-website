// ---------------------------------------------------------------------------
// Live Drone Booking / Raider dispatch — data types.
// Kept separate from UI so a real backend/API can replace the mock data
// source (lib/booking/data.ts, lib/booking/store.ts) without touching any
// component.
//
// Service taxonomy mirrors the documented Backend SERVICE_CATALOG (service
// types: videography, spraying, monitoring, mapping, surveillance) — see
// lib/booking/data.ts for the frontend catalog entries actually surfaced in
// Book a Raider.
// ---------------------------------------------------------------------------

export type ServiceKey = "videography" | "spraying" | "mapping" | "surveillance";

export interface SubService {
  key: string;
  label: string;
}

export interface DroneService {
  key: ServiceKey;
  label: string;
  /** Heading shown above the sub-service selector, e.g. "Select Event Type". */
  subServiceHeading: string;
  /** Placeholder shown in the closed sub-service selector. */
  subServicePlaceholder: string;
  subServices: SubService[];
}

export interface BookingDraft {
  service: ServiceKey | null;
  subService: string | null;
  location: string;
  date: string;
  time: string;
}

export interface Operator {
  id: string;
  name: string;
  /** Short Raider callsign shown on the radar and results list, e.g. "RAIDER-07". */
  callsign: string;
  estimatedTakeoffMinutes: number;
  /** Approximate distance from the operational center, in miles. */
  distanceMiles: number;
  /** "busy" operators render as ambient radar context — not selectable for dispatch. */
  status: "available" | "busy";
  /** Synthetic map position derived from the operational center — demo only, not an exact fleet position. */
  latitude?: number;
  longitude?: number;
  /** Current battery, 0-100 — part of the suitability score (§6/§7). */
  battery: number;
  /** Services this specific Raider is equipped/capable for — used to filter/score
   * suitability for the requested booking service (§6). */
  capabilities: ServiceKey[];
  /** Vendor this Raider belongs to — a Raider is NOT permanently tied to one pilot
   * (§5); the vendor only groups drones for the resource-pool model. */
  vendorId: string;
  /** 0-100 composite suitability score (distance + battery + capability match)
   * used to rank/recommend the best available Raider (§6/§7). Highest wins. */
  suitabilityScore: number;
}

// ---------------------------------------------------------------------------
// Location-aware operations (Raider coverage + operational snapshot).
// See lib/booking/location.ts and lib/booking/operations.ts.
// ---------------------------------------------------------------------------

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "unsupported"
  | "manual";

export interface OperationalCenter {
  /** Human-readable label, e.g. "Bengaluru" or "Whitefield, Bengaluru". */
  label: string;
  latitude: number | null;
  longitude: number | null;
  /** Whether this center came from the browser or manual entry. */
  source: "browser" | "manual";
}

/** A geocoded, user-entered project/site location that drives Project Site
 * map mode (see components/booking/india-map.tsx). */
export interface ProjectSite {
  /** The text the user entered, used as the on-map label. */
  label: string;
  latitude: number;
  longitude: number;
  /** [south, north, west, east] from the geocoder, used to pick a zoom level. */
  boundingBox: [number, number, number, number] | null;
  /** Geocoder place rank (higher = more specific: building > street > locality > city). */
  placeRank: number | null;
}

export type OperationalStatus = "operational" | "limited" | "none";

export interface OperationalSnapshot {
  center: OperationalCenter;
  pilotsRange: [number, number];
  dronesRange: [number, number];
  flightsRange: [number, number];
  dispatchRangeMinutes: [number, number];
  primaryCoverageMiles: number;
  extendedCoverageMiles: number;
  status: OperationalStatus;
  updatedLabel: string;
}

export interface BookingDispatchDetails {
  pilotName: string;
  droneId: string;
  estimatedTakeoffMinutes: number;
}

// Mirrors the documented booking lifecycle (pending → confirmed →
// pilot_assigned → in_progress → completed), plus cancellation.
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "pilot-assigned"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  userId: string;
  service: ServiceKey;
  serviceLabel: string;
  subService: string;
  subServiceLabel: string;
  location: string;
  date: string;
  time: string;
  operatorId: string;
  operatorName: string;
  estimatedTakeoffMinutes: number;
  /** Demo drone tail number assigned to this booking only — not a public fleet ID. */
  droneId: string;
  status: BookingStatus;
  /** Gates the Pay Now action — see lib/booking/operations.ts / booking-confirmation.tsx.
   * Never true until an admin approves the booking (i.e. status leaves "pending"). */
  paymentAvailable: boolean;
  createdAt: string;
  /** Resolved project-site coordinates, when available — the drone's demo destination. */
  destinationLatitude?: number;
  destinationLongitude?: number;
}

// ---------------------------------------------------------------------------
// Auth — phone number + OTP only (see lib/booking/auth-context.tsx and
// app/api/auth/otp/*). No name/email/password anywhere in this flow.
// ---------------------------------------------------------------------------

// "admin" is the existing Raider-ops control room (see app/admin) — kept
// entirely separate from "fleet-manager", which is the supplied Fleet
// Manager dashboard workspace. Admin != Fleet Manager (see master
// integration prompt §17).
export type BookingRole = "customer" | "pilot" | "admin" | "sales" | "fleet-manager" | "technician";

export interface BookingUser {
  id: string;
  /** E.164-ish display form, e.g. "+91 98765 43210". */
  phone: string;
  /** Demo role-based access — defaults to "customer" for any non-demo number. */
  role: BookingRole;
}

// ---------------------------------------------------------------------------
// Raider System — live drone operations & tracking (FlightRadar24-style).
// Simulation-only telemetry model, shaped so a real telemetry backend
// (WebSocket / MQTT / REST polling / IoT) can populate the same
// DroneTelemetry shape later without any UI changes. See
// lib/booking/fleet-data.ts and lib/booking/drone-simulation.ts.
// ---------------------------------------------------------------------------

export type DroneStatus =
  | "available"
  | "ready"
  | "en-route"
  | "arriving"
  | "hovering"
  | "on-mission"
  | "returning"
  | "landing"
  | "maintenance"
  | "offline"
  | "completed";

// ---------------------------------------------------------------------------
// Service-specific WORKING behaviour (§4/§18 upgrade). Once a drone reaches
// its operation area it must visibly do the thing it was booked for — not
// one generic "on-mission" animation for every service. This only decides
// the *behaviour shape* while status === "working"/"on-mission"; the actual
// position math lives in drone-simulation.ts.
// ---------------------------------------------------------------------------
export type WorkBehavior =
  /** Stays fixed over the exact spot, subtle work pulse (spraying). */
  | "stationary"
  /** Stays fixed but slowly yaws/re-frames, camera pulse (videography). */
  | "hover-frame"
  /** Small controlled loop around the area, scanning pulse (surveillance/mapping). */
  | "patrol";

export const SERVICE_WORK_BEHAVIOR: Record<ServiceKey, WorkBehavior> = {
  spraying: "stationary",
  videography: "hover-frame",
  mapping: "patrol",
  surveillance: "patrol",
};

// ---------------------------------------------------------------------------
// Distributed resource network — Vendor -> Drones/Pilots, Technicians (§5).
// A drone does NOT permanently belong to one pilot: any available, qualified
// pilot/technician from the wider resource pool can be assigned (§6/§7).
// ---------------------------------------------------------------------------

export type ResourceAvailability = "available" | "assigned" | "busy" | "responding" | "offline";

export interface Vendor {
  id: string;
  name: string;
}

export interface FleetPilot {
  id: string;
  name: string;
  vendorId: string | null;
  location: GeoPoint;
  status: ResourceAvailability;
  /** Services this pilot is qualified to fly (§7). */
  qualifications: ServiceKey[];
}

export interface FleetTechnician {
  id: string;
  name: string;
  vendorId: string | null;
  location: GeoPoint;
  status: ResourceAvailability;
  /** What kind of repair this technician can perform (§7/§11). */
  repairCapability: string[];
}

/** Simulated drone breakdown / incident record (§11/§13). */
export interface DroneIncident {
  id: string;
  droneId: string;
  droneCallsign: string;
  location: GeoPoint;
  faultLabel: string;
  technicianId: string | null;
  technicianName: string | null;
  technicianDistanceKm: number | null;
  status: "fault-detected" | "technician-dispatched" | "repair-in-progress" | "resolved";
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  label: string;
}

/** Static demo fleet record — see lib/booking/fleet-data.ts. */
export interface FleetDrone {
  id: string;
  callsign: string;
  pilot: string;
  mission: string;
  /** "flying" drones cycle along start<->destination; "grounded" sit at start. */
  mode: "flying" | "grounded";
  /** Status shown while grounded (flying drones compute status dynamically). */
  groundStatus: Extract<DroneStatus, "available" | "offline" | "ready" | "maintenance">;
  start: GeoPoint;
  destination: GeoPoint;
  cruiseSpeedKmh: number;
  cruiseAltitudeM: number;
  /** Full out-and-back cycle length, so movement loops forever without teleporting. */
  loopDurationMinutes: number;
  /** Staggers drones so they aren't all mid-flight at the same instant. */
  phaseOffsetMinutes: number;
  /** Which service this leg represents — drives WORK_BEHAVIOR at the destination (§4). */
  serviceKey: ServiceKey;
  /** Services this airframe is equipped/capable for (§6/§7) — usually just serviceKey,
   * but multi-role drones can list more than one. */
  capabilities: ServiceKey[];
  /** Vendor this drone belongs to (§5) — independent of which pilot ends up flying it. */
  vendorId: string;
}

/** Live, computed telemetry for one drone at a point in time. */
export interface DroneTelemetry {
  droneId: string;
  callsign: string;
  pilot: string;
  status: DroneStatus;
  latitude: number;
  longitude: number;
  heading: number;
  speedKmh: number;
  altitudeM: number;
  battery: number;
  distanceTraveledKm: number;
  distanceRemainingKm: number;
  etaMinutes: number | null;
  mission: string;
  startLabel: string;
  startLatitude: number;
  startLongitude: number;
  destinationLabel: string;
  destinationLatitude: number;
  destinationLongitude: number;
  /** 0 = at start, 1 = at destination (for the current leg). */
  progress: number;
  /** Flight-time so far, for the "MISSION" duration readout. */
  flightDurationMinutes: number;
  lastUpdated: string;
  /** Which service is being performed — drives the WORK_BEHAVIOR animation
   * shape once status is "working"/"on-mission" (§4). Undefined for drones
   * with no active booking (idle fleet traffic). */
  serviceKey?: ServiceKey;
}

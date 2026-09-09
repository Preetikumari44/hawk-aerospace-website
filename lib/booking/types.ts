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
}

// ---------------------------------------------------------------------------
// Auth — phone number + OTP only (see lib/booking/auth-context.tsx and
// app/api/auth/otp/*). No name/email/password anywhere in this flow.
// ---------------------------------------------------------------------------

export interface BookingUser {
  id: string;
  /** E.164-ish display form, e.g. "+91 98765 43210". */
  phone: string;
}

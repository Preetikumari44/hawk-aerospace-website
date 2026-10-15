// ---------------------------------------------------------------------------
// Demo breakdown / incident simulation (§19). A pure function of wall-clock
// time, like drone-simulation.ts — RAIDER-18 (see fleet-data.ts) is the
// fixed demo airframe with a fault. This loops through the full documented
// flow (fault -> technician dispatched -> en route -> arrived -> repair ->
// resumed) forever so the scenario is always somewhere in progress and
// visible on the map/Raider/activity feed without needing a live fault-
// injection engine (§25 — map, Raider, activity, resources, timeline all
// read from this single source of truth).
// ---------------------------------------------------------------------------

import { getDemoIncident } from "./resource-assignment";
import { bearingDeg, clamp, lerpPosition, offsetKm } from "./tracking";
import type { GeoPoint } from "./types";

export type IncidentPhase =
  | "fault-detected"
  | "technician-dispatched"
  | "technician-en-route"
  | "technician-arrived"
  | "repair-in-progress"
  | "resumed";

export interface IncidentState {
  phase: IncidentPhase;
  droneId: string;
  droneCallsign: string;
  droneLocation: GeoPoint;
  faultLabel: string;
  technicianId: string;
  technicianName: string;
  technicianStartDistanceKm: number;
  /** Technician's live simulated position — same start->destination lerp
   * approach as the drone engine, so it visibly travels on the map. */
  technicianLatitude: number;
  technicianLongitude: number;
  technicianHeading: number;
  /** 0-1 across the whole loop, for a progress readout if needed. */
  cycleProgress: number;
}

const PHASE_DURATIONS_MIN: Record<IncidentPhase, number> = {
  "fault-detected": 0.4,
  "technician-dispatched": 0.3,
  "technician-en-route": 2.2,
  "technician-arrived": 0.3,
  "repair-in-progress": 1.6,
  resumed: 1.2,
};

const PHASE_ORDER: IncidentPhase[] = [
  "fault-detected",
  "technician-dispatched",
  "technician-en-route",
  "technician-arrived",
  "repair-in-progress",
  "resumed",
];

const CYCLE_MINUTES = PHASE_ORDER.reduce((sum, p) => sum + PHASE_DURATIONS_MIN[p], 0);

/** The one demo breakdown scenario, looping forever (§19/§32). */
export function computeIncidentState(nowMs: number): IncidentState {
  const base = getDemoIncident();
  const droneLocation = base.location;
  const distanceKm = base.technicianDistanceKm ?? 6;
  // Back out a stable "technician home base" point the right distance away
  // from the drone (bearing fixed, deterministic) so there's somewhere for
  // the marker to travel from during the en-route phase.
  const technicianStart: GeoPoint = { ...offsetKm(droneLocation, distanceKm, 205), label: "Technician Base" };

  const elapsedMinutes = (((nowMs / 60000) % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;

  let acc = 0;
  let phase: IncidentPhase = "fault-detected";
  let phaseElapsed = 0;
  for (const p of PHASE_ORDER) {
    const dur = PHASE_DURATIONS_MIN[p];
    if (elapsedMinutes < acc + dur) {
      phase = p;
      phaseElapsed = elapsedMinutes - acc;
      break;
    }
    acc += dur;
  }

  // Technician position: stays at base until dispatched, travels during
  // en-route, then holds at the drone for arrived/repair/resumed.
  let technicianLat = technicianStart.latitude;
  let technicianLng = technicianStart.longitude;
  if (phase === "technician-en-route") {
    const progress = clamp(phaseElapsed / PHASE_DURATIONS_MIN["technician-en-route"], 0, 1);
    const pos = lerpPosition(technicianStart, droneLocation, progress);
    technicianLat = pos.latitude;
    technicianLng = pos.longitude;
  } else if (phase === "technician-arrived" || phase === "repair-in-progress" || phase === "resumed") {
    technicianLat = droneLocation.latitude;
    technicianLng = droneLocation.longitude;
  }

  return {
    phase,
    droneId: base.droneId,
    droneCallsign: base.droneCallsign,
    droneLocation,
    faultLabel: base.faultLabel,
    technicianId: base.technicianId ?? "tech-unknown",
    technicianName: base.technicianName ?? "Nearest Technician",
    technicianStartDistanceKm: distanceKm,
    technicianLatitude: technicianLat,
    technicianLongitude: technicianLng,
    technicianHeading: bearingDeg(technicianStart, droneLocation),
    cycleProgress: elapsedMinutes / CYCLE_MINUTES,
  };
}

export const INCIDENT_PHASE_LABEL: Record<IncidentPhase, string> = {
  "fault-detected": "FAULT DETECTED",
  "technician-dispatched": "TECHNICIAN DISPATCHED",
  "technician-en-route": "TECHNICIAN EN ROUTE",
  "technician-arrived": "TECHNICIAN ARRIVED",
  "repair-in-progress": "REPAIR IN PROGRESS",
  resumed: "DRONE RESUMED",
};

/** True for the phases where the drone itself should render as
 * fault/maintenance on the map rather than its normal grounded state. */
export function isIncidentActivePhase(phase: IncidentPhase): boolean {
  return phase !== "resumed";
}

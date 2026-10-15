"use client";

// ---------------------------------------------------------------------------
// Demo drone-movement simulation engine.
//
// Pure, deterministic functions of a timestamp — no randomness at render
// time, no coordinates generated directly inside UI components (per the
// Raider System upgrade spec, §19/§20). Every drone loops smoothly along its
// start <-> destination path so it never teleports; the *only* input that
// changes its position is `nowMs`, which callers can source from real
// wall-clock time (always-live customer/pilot views) or from an admin-only
// virtual clock that supports Play/Pause/Speed (see useSimClock below).
//
// Swapping this for a real telemetry backend later (WebSocket / MQTT / REST
// polling / IoT) only means replacing computeFleetTelemetry's body — every
// consumer already only depends on the DroneTelemetry shape.
// ---------------------------------------------------------------------------

import * as React from "react";

import { bearingDeg, clamp, haversineKm, lerpPosition, offsetKm } from "./tracking";
import type { DroneStatus, DroneTelemetry, FleetDrone, GeoPoint, ServiceKey, WorkBehavior } from "./types";
import { SERVICE_WORK_BEHAVIOR } from "./types";

const HOLD_FRACTION = 0.16; // pause at destination (work) — longer than a quick touch-and-go
const ARRIVING_FRACTION = 0.86; // last slice of the outbound flight reads as "arriving", not just "en-route"
const HOVER_FRACTION_OF_HOLD = 0.22; // brief hover before service-specific work begins

/**
 * Small, controlled positional drift around a fixed work point while a
 * drone is hovering/working — NEVER a random walk away from the site (§4).
 * "stationary" (spraying) gets zero drift: the spec explicitly requires the
 * drone to stay put, not roam. "hover-frame" (videography) drifts a few
 * meters as if re-framing a shot. "patrol" (surveillance/mapping) makes a
 * small deliberate loop around the area — still bounded, still meaningful.
 */
function workPosition(base: GeoPoint, behavior: WorkBehavior, elapsedSeconds: number): GeoPoint {
  if (behavior === "stationary") return base;
  const radiusKm = behavior === "hover-frame" ? 0.02 : 0.12;
  const periodSeconds = behavior === "hover-frame" ? 45 : 26;
  const bearing = ((elapsedSeconds / periodSeconds) * 360) % 360;
  const offset = offsetKm(base, radiusKm, bearing);
  return { ...offset, label: base.label };
}

/** Computes live telemetry for one flying/grounded fleet drone at `nowMs`. */
export function computeDroneTelemetry(drone: FleetDrone, nowMs: number): DroneTelemetry {
  const legKm = haversineKm(drone.start, drone.destination);
  const workBehavior = SERVICE_WORK_BEHAVIOR[drone.serviceKey];

  if (drone.mode === "grounded" || legKm < 0.05) {
    return {
      droneId: drone.id,
      callsign: drone.callsign,
      pilot: drone.pilot,
      status: drone.groundStatus,
      latitude: drone.start.latitude,
      longitude: drone.start.longitude,
      heading: 0,
      speedKmh: 0,
      altitudeM: 0,
      battery: drone.groundStatus === "maintenance" ? 12 : 96,
      distanceTraveledKm: 0,
      distanceRemainingKm: 0,
      etaMinutes: null,
      mission: drone.mission,
      startLabel: drone.start.label,
      startLatitude: drone.start.latitude,
      startLongitude: drone.start.longitude,
      destinationLabel: drone.destination.label,
      destinationLatitude: drone.destination.latitude,
      destinationLongitude: drone.destination.longitude,
      progress: 0,
      flightDurationMinutes: 0,
      lastUpdated: new Date(nowMs).toISOString(),
      serviceKey: drone.serviceKey,
    };
  }

  const flightMinutesOneWay = (legKm / Math.max(1, drone.cruiseSpeedKmh)) * 60;
  const holdMinutes = Math.max(1.2, drone.loopDurationMinutes * HOLD_FRACTION);
  const legWithHold = flightMinutesOneWay + holdMinutes;
  const cycleMinutes = Math.max(legWithHold * 2, drone.loopDurationMinutes);

  const elapsedMinutes =
    (((nowMs / 60000 + drone.phaseOffsetMinutes) % cycleMinutes) + cycleMinutes) % cycleMinutes;

  let direction: "out" | "return";
  let legElapsed: number;
  let from: GeoPoint;
  let to: GeoPoint;

  if (elapsedMinutes < legWithHold) {
    direction = "out";
    legElapsed = elapsedMinutes;
    from = drone.start;
    to = drone.destination;
  } else {
    direction = "return";
    legElapsed = elapsedMinutes - legWithHold;
    from = drone.destination;
    to = drone.start;
  }

  const flying = legElapsed <= flightMinutesOneWay;
  const progress = clamp(flying ? legElapsed / flightMinutesOneWay : 1, 0, 1);
  const heading = bearingDeg(from, to);

  let status: DroneStatus;
  let position: { latitude: number; longitude: number };
  let mission = direction === "out" ? drone.mission : "Returning to Base";

  if (flying) {
    position = lerpPosition(from, to, progress);
    if (direction === "return") {
      status = progress > ARRIVING_FRACTION ? "landing" : "returning";
    } else {
      status = progress > ARRIVING_FRACTION ? "arriving" : "en-route";
    }
  } else if (direction === "out") {
    // At the destination: a brief HOVER, then service-specific WORK — two
    // visually distinct states, never one generic "parked" animation (§1/§4).
    const holdElapsedMinutes = legElapsed - flightMinutesOneWay;
    const hoverMinutes = holdMinutes * HOVER_FRACTION_OF_HOLD;
    if (holdElapsedMinutes < hoverMinutes) {
      status = "hovering";
      position = drone.destination;
    } else {
      status = "on-mission";
      position = workPosition(drone.destination, workBehavior, (holdElapsedMinutes - hoverMinutes) * 60);
      mission = `${drone.mission} · ${SERVICE_WORK_LABEL[drone.serviceKey]}`;
    }
  } else {
    status = "landing";
    position = drone.start;
  }

  const speedKmh = flying ? drone.cruiseSpeedKmh : 0;
  const altitudeM = flying
    ? drone.cruiseAltitudeM
    : status === "hovering" || status === "on-mission"
      ? Math.round(drone.cruiseAltitudeM * 0.55)
      : Math.round(drone.cruiseAltitudeM * (1 - progress) * 0.15);

  const distanceTraveledKm = legKm * progress;
  const distanceRemainingKm = legKm * (1 - progress);
  const etaMinutes = flying ? Math.max(0, flightMinutesOneWay - legElapsed) : direction === "out" ? 0 : null;

  // Battery drains across the outbound leg + work, "swaps" fresh at base on return.
  const cycleProgress = elapsedMinutes / cycleMinutes;
  const battery = Math.round(
    direction === "out" ? 92 - 34 * cycleProgress * 2.4 : 58 + 38 * progress - cycleProgress * 2,
  );

  return {
    droneId: drone.id,
    callsign: drone.callsign,
    pilot: drone.pilot,
    status,
    latitude: position.latitude,
    longitude: position.longitude,
    heading,
    speedKmh,
    altitudeM,
    battery: clamp(battery, 8, 100),
    distanceTraveledKm,
    distanceRemainingKm,
    etaMinutes,
    mission,
    startLabel: from.label,
    startLatitude: from.latitude,
    startLongitude: from.longitude,
    destinationLabel: to.label,
    destinationLatitude: to.latitude,
    destinationLongitude: to.longitude,
    progress,
    flightDurationMinutes: direction === "out" ? legElapsed : flightMinutesOneWay + legElapsed,
    lastUpdated: new Date(nowMs).toISOString(),
    serviceKey: drone.serviceKey,
  };
}

/** Short present-tense label for the active WORK behaviour, used to build a
 * readable mission string (e.g. "AgriSure · Spraying Active") and reused by
 * the booking journey below. */
export const SERVICE_WORK_LABEL: Record<ServiceKey, string> = {
  spraying: "Spraying Active",
  videography: "Recording",
  mapping: "Scanning Area",
  surveillance: "Monitoring Area",
};

export function computeFleetTelemetry(fleet: FleetDrone[], nowMs: number): DroneTelemetry[] {
  return fleet.map((drone) => computeDroneTelemetry(drone, nowMs));
}

/**
 * A dedicated multi-phase demo journey for one confirmed booking (customer
 * tracking) — independent of the shared demo fleet above. Reflects the
 * documented post-booking flow:
 *
 *   dispatched -> arriving-launch -> ready -> mission-started -> en-route -> completed
 *   (dispatch point)  ->  (LAUNCH POINT, i.e. the customer's project site)  ->  (MISSION DESTINATION)
 *
 * Purely a function of wall-clock time (`departureMs` is fixed per booking),
 * so refreshing the tracking page never restarts it — the same booking
 * always resolves to the same simulated Raider at approximately the same
 * point in its journey. This customer-facing simulation is deliberately
 * independent of the *actual* booking approval status (pending/confirmed/
 * pilot-assigned/...): see booking-tracking-view.tsx, which keeps the real
 * BookingStatusTimeline separate from this live-tracking phase.
 */
export interface BookingRoute {
  droneId: string;
  callsign: string;
  pilot: string;
  mission: string;
  /** Which booked service this journey performs — drives the WORKING-phase
   * behaviour shape (§4): stationary for spraying, hover-frame for
   * videography, patrol for surveillance/mapping. */
  serviceKey: ServiceKey;
  /** Where the simulated Raider departs from. */
  dispatchPoint: GeoPoint;
  /** The customer's own project/site location — first waypoint. */
  launchPoint: GeoPoint;
  /** Where the actual mission work happens — final waypoint. */
  missionDestination: GeoPoint;
  cruiseSpeedKmh: number;
  cruiseAltitudeM: number;
  /** ms epoch the Raider was "dispatched" — fixed per booking so it's deterministic. */
  departureMs: number;
}

// Flying ≠ hovering ≠ working (§1): every leg of the journey is its own
// distinct, clearly-labeled phase instead of one blurred "in progress" state.
export type BookingPhase =
  | "dispatched"
  | "arriving-launch"
  | "ready"
  | "mission-started"
  | "en-route"
  | "arriving-site"
  | "hovering"
  | "working"
  | "completed";

export interface BookingJourney {
  phase: BookingPhase;
  telemetry: DroneTelemetry;
}

const LAUNCH_HOLD_MINUTES = 0.4; // ~24s "Raider Ready" pause at the launch point
const DISPATCH_PHASE_FRACTION = 0.12; // first slice of leg 1 reads as "Dispatched"
const ARRIVING_SITE_FRACTION = 0.82; // last slice of leg 2 reads as "Arriving at Destination"
const HOVER_MINUTES = 0.3; // ~18s hover before service-specific work begins
const WORK_MINUTES = 2.2; // simulated on-site service duration, long enough to actually see it

export function computeBookingJourney(route: BookingRoute, nowMs: number): BookingJourney {
  const workBehavior = SERVICE_WORK_BEHAVIOR[route.serviceKey];
  const leg1Km = haversineKm(route.dispatchPoint, route.launchPoint);
  const leg1Minutes = Math.max(0.5, (leg1Km / Math.max(1, route.cruiseSpeedKmh)) * 60);
  const leg2Km = haversineKm(route.launchPoint, route.missionDestination);
  const leg2Minutes = Math.max(0.5, (leg2Km / Math.max(1, route.cruiseSpeedKmh)) * 60);

  const elapsedMinutes = Math.max(0, (nowMs - route.departureMs) / 60000);
  const leg1End = leg1Minutes;
  const readyEnd = leg1End + LAUNCH_HOLD_MINUTES;
  const leg2End = readyEnd + leg2Minutes;
  const hoverEnd = leg2End + HOVER_MINUTES;
  const workEnd = hoverEnd + WORK_MINUTES;

  let phase: BookingPhase;
  let from: GeoPoint;
  let to: GeoPoint;
  let legProgress: number;
  let status: DroneStatus;
  let etaMinutes: number;
  let distanceTraveledKm: number;
  let distanceRemainingKm: number;
  let speedKmh: number;
  let position: { latitude: number; longitude: number };

  if (elapsedMinutes < leg1End) {
    legProgress = clamp(elapsedMinutes / leg1Minutes, 0, 1);
    phase = legProgress < DISPATCH_PHASE_FRACTION ? "dispatched" : "arriving-launch";
    from = route.dispatchPoint;
    to = route.launchPoint;
    status = "en-route";
    etaMinutes = Math.max(0, leg1Minutes - elapsedMinutes);
    distanceTraveledKm = leg1Km * legProgress;
    distanceRemainingKm = leg1Km * (1 - legProgress);
    speedKmh = route.cruiseSpeedKmh;
    position = lerpPosition(from, to, legProgress);
  } else if (elapsedMinutes < readyEnd) {
    legProgress = 1;
    phase = "ready";
    from = route.dispatchPoint;
    to = route.launchPoint;
    status = "ready";
    etaMinutes = 0;
    distanceTraveledKm = leg1Km;
    distanceRemainingKm = 0;
    speedKmh = 0;
    position = route.launchPoint;
  } else if (elapsedMinutes < leg2End) {
    legProgress = clamp((elapsedMinutes - readyEnd) / leg2Minutes, 0, 1);
    phase =
      legProgress < DISPATCH_PHASE_FRACTION
        ? "mission-started"
        : legProgress > ARRIVING_SITE_FRACTION
          ? "arriving-site"
          : "en-route";
    from = route.launchPoint;
    to = route.missionDestination;
    status = phase === "arriving-site" ? "arriving" : "en-route";
    etaMinutes = Math.max(0, leg2Minutes - (elapsedMinutes - readyEnd));
    distanceTraveledKm = leg2Km * legProgress;
    distanceRemainingKm = leg2Km * (1 - legProgress);
    speedKmh = route.cruiseSpeedKmh;
    position = lerpPosition(from, to, legProgress);
  } else if (elapsedMinutes < hoverEnd) {
    // Reached the site — a distinct HOVER before any work starts (§1).
    legProgress = 1;
    phase = "hovering";
    from = route.launchPoint;
    to = route.missionDestination;
    status = "hovering";
    etaMinutes = 0;
    distanceTraveledKm = leg2Km;
    distanceRemainingKm = 0;
    speedKmh = 0;
    position = route.missionDestination;
  } else if (elapsedMinutes < workEnd) {
    // Service-specific WORK — stays around the SAME operation area, only
    // its shape (stationary / hover-frame / patrol) differs by service (§4).
    legProgress = 1;
    phase = "working";
    from = route.launchPoint;
    to = route.missionDestination;
    status = "on-mission";
    etaMinutes = Math.max(0, workEnd - elapsedMinutes);
    distanceTraveledKm = leg2Km;
    distanceRemainingKm = 0;
    speedKmh = 0;
    position = workPosition(route.missionDestination, workBehavior, (elapsedMinutes - hoverEnd) * 60);
  } else {
    legProgress = 1;
    phase = "completed";
    from = route.launchPoint;
    to = route.missionDestination;
    status = "completed";
    etaMinutes = 0;
    distanceTraveledKm = leg2Km;
    distanceRemainingKm = 0;
    speedKmh = 0;
    position = route.missionDestination;
  }

  const heading = bearingDeg(from, to);
  const overallElapsed = Math.min(elapsedMinutes, workEnd);
  const battery = clamp(Math.round(96 - 34 * (overallElapsed / Math.max(workEnd, 1))), 38, 100);

  const missionLabel =
    phase === "dispatched" || phase === "arriving-launch"
      ? "Dispatch to Launch Point"
      : phase === "ready"
        ? "Preparing for Mission"
        : phase === "hovering"
          ? "Holding Position"
          : phase === "working"
            ? `${route.mission} · ${SERVICE_WORK_LABEL[route.serviceKey]}`
            : phase === "completed"
              ? "Mission Completed"
              : route.mission;

  const altitudeM =
    status === "ready"
      ? Math.round(route.cruiseAltitudeM * 0.1)
      : status === "completed"
        ? 0
        : status === "hovering" || status === "on-mission"
          ? Math.round(route.cruiseAltitudeM * 0.55)
          : route.cruiseAltitudeM;

  const telemetry: DroneTelemetry = {
    droneId: route.droneId,
    callsign: route.callsign,
    pilot: route.pilot,
    status,
    latitude: position.latitude,
    longitude: position.longitude,
    heading,
    speedKmh,
    altitudeM,
    battery,
    distanceTraveledKm,
    distanceRemainingKm,
    etaMinutes,
    mission: missionLabel,
    startLabel: from.label,
    startLatitude: from.latitude,
    startLongitude: from.longitude,
    destinationLabel: to.label,
    destinationLatitude: to.latitude,
    destinationLongitude: to.longitude,
    progress: legProgress,
    flightDurationMinutes: elapsedMinutes,
    lastUpdated: new Date(nowMs).toISOString(),
    serviceKey: route.serviceKey,
  };

  return { phase, telemetry };
}

// ---------------------------------------------------------------------------
// Live clock hook — ticks every second, always-on. Used by customer/pilot
// tracking views, which are always "LIVE" (no simulation controls).
// ---------------------------------------------------------------------------
export function useLiveClock(intervalMs = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ---------------------------------------------------------------------------
// Admin-only simulation clock — Play / Pause / Reset / 1x-2x-5x speed, per
// §18/§41. Everyone else always sees the live wall-clock version above; only
// the admin fleet view mounts this.
// ---------------------------------------------------------------------------
export interface SimClock {
  now: number;
  playing: boolean;
  speed: 1 | 2 | 5;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: 1 | 2 | 5) => void;
}

export function useSimClock(): SimClock {
  const anchorRef = React.useRef<number | null>(null);
  const [virtualNow, setVirtualNow] = React.useState<number | null>(null);
  const [playing, setPlaying] = React.useState(true);
  const [speed, setSpeedState] = React.useState<1 | 2 | 5>(1);
  const rafRef = React.useRef<number | null>(null);
  const lastFrameRef = React.useRef<number | null>(null);
  const playingRef = React.useRef(playing);
  const speedRef = React.useRef(speed);

  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  React.useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // First-mount anchor is read once, client-side only, inside an effect —
  // not during render — so this hook stays pure for React's rules.
  React.useEffect(() => {
    if (anchorRef.current == null) {
      anchorRef.current = Date.now();
      setVirtualNow(anchorRef.current);
    }
  }, []);

  React.useEffect(() => {
    function tick(t: number) {
      if (lastFrameRef.current != null && playingRef.current) {
        const deltaMs = t - lastFrameRef.current;
        setVirtualNow((prev) => (prev == null ? prev : prev + deltaMs * speedRef.current));
      }
      lastFrameRef.current = t;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    // Briefly 0 before the mount effect below reads the real clock — avoids
    // calling Date.now() during render, which must stay pure.
    now: virtualNow ?? 0,
    playing,
    speed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    reset: () => {
      anchorRef.current = Date.now();
      setVirtualNow(anchorRef.current);
      setPlaying(true);
    },
    setSpeed: (s) => setSpeedState(s),
  };
}

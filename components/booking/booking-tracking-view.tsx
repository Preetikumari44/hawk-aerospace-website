"use client";

// Customer live-tracking view for a single confirmed booking. Live tracking
// starts the moment a booking exists — it is intentionally decoupled from
// the actual admin-approval BookingStatusTimeline below it (§2/§3 of the
// live-tracking spec): a booking can read "Awaiting Approval" while its
// simulated Raider is already dispatched and en route, because those are
// two different states. Shows the customer's own Raider prominently, plus
// generic ambient fleet traffic for the FlightRadar24 feel — never another
// customer's booking/mission/destination (§29).

import { motion } from "framer-motion";
import { XIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  type BookingPhase,
  computeBookingJourney,
  computeFleetTelemetry,
  useLiveClock,
} from "@/lib/booking/drone-simulation";
import { DEMO_FLEET, DEMO_PILOTS, DEMO_TECHNICIANS } from "@/lib/booking/fleet-data";
import { computeIncidentState } from "@/lib/booking/incident-simulation";
import { getBookingRoute } from "@/lib/booking/operations";
import { getBookingById } from "@/lib/booking/store";
import type { Booking, DroneTelemetry } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";

import { BookingStatusTimeline } from "./booking-status-timeline";
import { FleetMap, type FleetMapHandle } from "./fleet-map";
import { LiveActivityFeed } from "./live-activity-feed";
import { MapControls } from "./map-controls";
import { MapLegend } from "./map-legend";
import { RaiderStatusPanel } from "./raider-status-panel";
import { ResourceDetailPanel } from "./resource-detail-panel";
import { TelemetryPanel } from "./telemetry-panel";

const PHASE_HEADLINE: Record<BookingPhase, string> = {
  dispatched: "RAIDER DISPATCHED",
  "arriving-launch": "ARRIVING AT LAUNCH POINT",
  ready: "RAIDER READY",
  "mission-started": "MISSION STARTED",
  "en-route": "EN ROUTE TO DESTINATION",
  "arriving-site": "ARRIVING AT DESTINATION",
  hovering: "HOLDING POSITION",
  working: "SERVICE IN PROGRESS",
  completed: "MISSION COMPLETED",
};

export function BookingTrackingView({ bookingId, userId }: { bookingId: string; userId: string }) {
  const [booking, setBooking] = React.useState<Booking | null | undefined>(undefined);
  const [follow, setFollow] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Part 3/4: clicking a pilot/technician marker selects it (clearing any
  // drone selection) so the right panel shows exactly one resource's info
  // at a time, same as the existing drone-click behavior.
  const [selectedResource, setSelectedResource] = React.useState<
    { kind: "pilot" | "technician"; id: string } | null
  >(null);
  const mapRef = React.useRef<FleetMapHandle>(null);
  const now = useLiveClock(1000);

  React.useEffect(() => {
    if (!booking) return;
    const id = window.setTimeout(() => mapRef.current?.fitAll(), 200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fit when the booking identity changes, not on every telemetry tick.
  }, [booking?.id]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, only available client-side post-mount.
    setBooking(getBookingById(bookingId));
  }, [bookingId]);

  // The real booking status (admin approval) can still change server-side
  // in the demo (via the admin lifecycle controls) — keep it in sync so the
  // BookingStatusTimeline below reflects it, without touching the live
  // simulation above, which runs on its own clock.
  React.useEffect(() => {
    const id = window.setInterval(() => setBooking(getBookingById(bookingId)), 5000);
    return () => window.clearInterval(id);
  }, [bookingId]);

  if (booking === undefined) return null;

  if (!booking || booking.userId !== userId) {
    return (
      <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground text-sm">We couldn&apos;t find that booking on your account.</p>
        <Button size="lg" variant="outline" asChild>
          <Link href="/my-bookings">Back to My Bookings</Link>
        </Button>
      </div>
    );
  }

  if (booking.status === "cancelled") {
    return (
      <motion.div
        variants={stagger(0.06)}
        initial="hidden"
        animate="show"
        className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-5 rounded-2xl border p-8 text-center"
      >
        <motion.div
          variants={fadeUp}
          className="bg-destructive/15 border-destructive/40 text-destructive flex size-12 items-center justify-center rounded-full border"
        >
          <XIcon className="size-6" />
        </motion.div>
        <motion.p variants={fadeUp} className="text-foreground text-sm font-semibold">
          This booking was cancelled — no active tracking.
        </motion.p>
        <motion.div variants={fadeUp} className="w-full">
          <BookingStatusTimeline status={booking.status} />
        </motion.div>
      </motion.div>
    );
  }

  const route = getBookingRoute(booking);
  const { phase, telemetry: own } = computeBookingJourney(route, now);
  const fleetTelemetry: DroneTelemetry[] = computeFleetTelemetry(DEMO_FLEET, now);
  const allTelemetry = [own, ...fleetTelemetry];
  const selected = allTelemetry.find((t) => t.droneId === selectedId) ?? own;
  const isOwnSelected = selected.droneId === own.droneId;
  const incident = computeIncidentState(now);
  // Booking-scoped incident: only relevant here if it's actually THIS
  // booking's own drone (§10/§20 — never inflate booking resources with
  // unrelated global fleet activity).
  const ownIncident = incident.droneId === own.droneId ? incident : null;

  // The pilot/technician actually tied to THIS booking, when determinable
  // from existing data — never fabricated (Part 1/2). Falls back to no
  // assignment info for resources unrelated to this booking.
  const ownPilot = DEMO_PILOTS.find((p) => p.name === booking.operatorName) ?? null;
  const ownTechnician = ownIncident ? (DEMO_TECHNICIANS.find((t) => t.id === ownIncident.technicianId) ?? null) : null;
  const selectedPilot =
    selectedResource?.kind === "pilot" ? (DEMO_PILOTS.find((p) => p.id === selectedResource.id) ?? null) : null;
  const selectedTechnician =
    selectedResource?.kind === "technician"
      ? (DEMO_TECHNICIANS.find((t) => t.id === selectedResource.id) ?? null)
      : null;

  // Resource counts are derived from the SELECTED booking, never a global
  // fleet count (§10/§11/§17) — this demo's booking model assigns exactly
  // one drone and one pilot per booking; a technician only enters the count
  // if this booking's own drone actually has an active incident.
  const bookingResourceCounts = {
    drones: 1,
    pilots: 1,
    technicians: ownIncident ? 1 : 0,
  };
  const detectedCount = 1 + bookingResourceCounts.pilots + bookingResourceCounts.technicians;
  const lastUpdatedLabel = "Just now";

  const arrivingLaunch = phase === "dispatched" || phase === "arriving-launch";
  const arrivingDestination = phase === "mission-started" || phase === "en-route" || phase === "arriving-site";

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-brand/40 bg-brand/10 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="bg-brand size-2 animate-pulse rounded-full" />
          <span className="text-foreground text-sm font-bold tracking-wide">{own.callsign}</span>
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
            {PHASE_HEADLINE[phase]}
          </span>
        </div>
        {(arrivingLaunch || arrivingDestination) && (
          <span className="text-brand text-xs font-semibold">
            {arrivingLaunch ? "Arriving at Launch Point" : "Arriving at Destination"} ·{" "}
            {Math.max(0, Math.round(own.etaMinutes ?? 0))} min
          </span>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[66fr_34fr]">
        <div className="border-border/60 glass-2 relative isolate h-[520px] overflow-hidden rounded-2xl border lg:h-[640px]">
          <FleetMap
            ref={mapRef}
            className="hawk-leaflet isolate absolute inset-0 h-full w-full"
            telemetry={allTelemetry}
            selectedId={selectedId ?? own.droneId}
            onSelect={(id) => {
              setSelectedId(id);
              setSelectedResource(null);
            }}
            follow={follow}
            emphasizedIds={[own.droneId]}
            pilots={DEMO_PILOTS}
            technicians={DEMO_TECHNICIANS}
            selectedPilotId={selectedPilot?.id ?? null}
            selectedTechnicianId={selectedTechnician?.id ?? null}
            onSelectPilot={(id) => setSelectedResource({ kind: "pilot", id })}
            onSelectTechnician={(id) => setSelectedResource({ kind: "technician", id })}
            incident={{
              droneLocation: incident.droneLocation,
              technicianLocation: { latitude: incident.technicianLatitude, longitude: incident.technicianLongitude },
              showRoute: incident.phase !== "resumed",
            }}
            raiderTarget={{ latitude: own.latitude, longitude: own.longitude }}
          />
          {/* Raider System's radar HUD is a real geographic marker inside
              FleetMap (raider-marker.ts) — it follows the booked drone's
              actual coordinates and pans/zooms with the map, never a fixed
              screen overlay (§5–9). */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3">
            <span className="border-border/60 bg-background/90 text-foreground pointer-events-auto rounded-lg border px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
              {booking.id} · {PHASE_HEADLINE[phase]}
            </span>
            <MapControls
              follow={follow}
              onToggleFollow={() => setFollow((f) => !f)}
              onFitAll={() => mapRef.current?.fitAll()}
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start p-3">
            <MapLegend />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {(!isOwnSelected || selectedResource) && (
            <button
              type="button"
              onClick={() => {
                setSelectedId(own.droneId);
                setSelectedResource(null);
              }}
              className="text-brand self-start text-xs font-semibold underline-offset-2 hover:underline"
            >
              ← Back to my Raider ({own.callsign})
            </button>
          )}

          {/* Raider status is text-only here — the actual circular radar
              lives over the map, never duplicated (§21). */}
          <RaiderStatusPanel detectedCount={detectedCount} lastUpdatedLabel={lastUpdatedLabel} />

          {/* Booking info + resource counts, derived from THIS booking
              only — never a global fleet count (§16/§17). */}
          <div className="border-border/60 glass-1 flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-brand text-xs font-semibold tracking-[0.12em] uppercase">{booking.id}</span>
              <span className="text-foreground text-sm font-semibold">
                {booking.serviceLabel} · {booking.subServiceLabel}
              </span>
              <span className="text-muted-foreground text-xs">{booking.location}</span>
              <span className="text-muted-foreground text-xs">
                {booking.date} · {booking.time}
              </span>
            </div>
            <div className="border-border/50 grid grid-cols-3 gap-2 border-t pt-3 text-center">
              <ResourceCount label="Drones" value={bookingResourceCounts.drones} />
              <ResourceCount label="Pilots" value={bookingResourceCounts.pilots} />
              <ResourceCount label="Technicians" value={bookingResourceCounts.technicians} />
            </div>
          </div>

          {/* Part 3: whichever resource was clicked (drone/pilot/technician)
              drives this panel — same panel design throughout, never a new
              layout. */}
          {selectedPilot ? (
            <ResourceDetailPanel
              resource={{ kind: "pilot", ...selectedPilot }}
              assignment={
                selectedPilot.id === ownPilot?.id ? { bookingId: booking.id, droneCallsign: own.callsign } : null
              }
              className="w-full max-w-none"
            />
          ) : selectedTechnician ? (
            <ResourceDetailPanel
              resource={{ kind: "technician", ...selectedTechnician }}
              assignment={
                selectedTechnician.id === ownTechnician?.id
                  ? { bookingId: booking.id, droneCallsign: own.callsign }
                  : null
              }
              className="w-full max-w-none"
            />
          ) : (
            <TelemetryPanel
              telemetry={selected}
              bookingRef={isOwnSelected ? booking.id : undefined}
              showMissionDetails={isOwnSelected}
              className="w-full max-w-none"
            />
          )}

          {isOwnSelected && !selectedResource && (
            <div className="border-border/60 glass-1 flex items-center justify-between rounded-xl border p-4">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Pilot
                </span>
                <span className="text-foreground text-sm font-semibold">{booking.operatorName}</span>
              </div>
              <span className="border-brand/40 bg-brand/10 text-brand rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase">
                Assigned
              </span>
            </div>
          )}

          <LiveActivityFeed telemetry={[own]} incident={ownIncident} />

          <div className="border-border/60 glass-1 rounded-xl border p-4">
            <span className="text-muted-foreground mb-2 block text-[10px] font-semibold tracking-[0.12em] uppercase">
              Booking Status
            </span>
            <BookingStatusTimeline status={booking.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-foreground text-base font-bold">{String(value).padStart(2, "0")}</span>
      <span className="text-muted-foreground text-[9px] font-semibold tracking-[0.08em] uppercase">{label}</span>
    </div>
  );
}

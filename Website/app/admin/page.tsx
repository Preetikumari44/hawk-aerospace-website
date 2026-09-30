"use client";

import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AdminSimControls } from "@/components/booking/admin-sim-controls";
import { FleetMap, type FleetMapHandle } from "@/components/booking/fleet-map";
import { MapControls } from "@/components/booking/map-controls";
import { TelemetryPanel } from "@/components/booking/telemetry-panel";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { computeFleetTelemetry, useSimClock } from "@/lib/booking/drone-simulation";
import { DEMO_FLEET, DEMO_PILOTS, DEMO_TECHNICIANS } from "@/lib/booking/fleet-data";
import { computeIncidentState, INCIDENT_PHASE_LABEL } from "@/lib/booking/incident-simulation";
import { getAllBookings, updateBookingStatus } from "@/lib/booking/store";
import type { Booking, BookingStatus, DroneTelemetry } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

const NEXT_STATUS: Partial<Record<BookingStatus, { next: BookingStatus; label: string }>> = {
  pending: { next: "confirmed", label: "Approve" },
  confirmed: { next: "pilot-assigned", label: "Assign Pilot" },
  "pilot-assigned": { next: "in-progress", label: "Start Mission" },
  "in-progress": { next: "completed", label: "Complete" },
};

export default function AdminDashboardPage() {
  const { user, isAuthenticated, requestLogin } = useBookingAuth();
  const clock = useSimClock();
  const [selectedId, setSelectedId] = React.useState<string | null>(DEMO_FLEET[1]?.id ?? null);
  const [follow, setFollow] = React.useState(false);
  const mapRef = React.useRef<FleetMapHandle>(null);
  const [bookings, setBookings] = React.useState<Booking[]>([]);

  const telemetry: DroneTelemetry[] = React.useMemo(
    () => computeFleetTelemetry(DEMO_FLEET, clock.now),
    [clock.now],
  );
  const selected = telemetry.find((t) => t.droneId === selectedId) ?? null;

  const refreshBookings = React.useCallback(() => {
    setBookings(getAllBookings());
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, which is only available client-side post-mount.
    if (isAuthenticated && user?.role === "admin") refreshBookings();
  }, [isAuthenticated, user?.role, refreshBookings]);

  const stats = React.useMemo(() => {
    const inFlight = telemetry.filter(
      (t) => t.status === "en-route" || t.status === "arriving" || t.status === "returning" || t.status === "landing",
    ).length;
    const available = telemetry.filter((t) => t.status === "available").length;
    const onMission = telemetry.filter((t) => t.status === "on-mission" || t.status === "hovering").length;
    const maintenance = telemetry.filter((t) => t.status === "maintenance").length;
    const offline = telemetry.filter((t) => t.status === "offline").length;
    const activePilots = new Set(telemetry.filter((t) => t.speedKmh > 0).map((t) => t.pilot)).size;
    // Distributed resource pool counts (§9) — pilots/technicians are
    // independent pools, not tied 1:1 to a specific drone (§5).
    const availablePilots = DEMO_PILOTS.filter((p) => p.status === "available").length;
    const availableTechnicians = DEMO_TECHNICIANS.filter((t) => t.status === "available").length;
    const activeOperations = telemetry.filter((t) => t.status === "on-mission" || t.status === "hovering").length;
    return {
      total: DEMO_FLEET.length,
      inFlight,
      available,
      onMission,
      maintenance,
      offline,
      activePilots,
      availablePilots,
      availableTechnicians,
      activeOperations,
    };
  }, [telemetry]);

  const incident = React.useMemo(() => computeIncidentState(clock.now), [clock.now]);

  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
          <p className="text-muted-foreground text-sm">Log in with your Admin account to view fleet operations.</p>
          <Button size="lg" onClick={() => requestLogin("/admin")}>
            Log In
          </Button>
        </div>
      </Shell>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Shell>
        <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
          <ShieldCheckIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">This dashboard is only available to Admin accounts.</p>
          <Button size="lg" variant="outline" asChild>
            <Link href="/my-bookings">Back to My Bookings</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-8">
        <StatCard label="Total Drones" value={stats.total} />
        <StatCard label="In Flight" value={stats.inFlight} accent="text-pink-400" />
        <StatCard label="Available" value={stats.available} accent="text-amber-300" />
        <StatCard label="On Mission" value={stats.onMission} accent="text-purple-400" />
        <StatCard label="Maintenance" value={stats.maintenance} accent="text-orange-400" />
        <StatCard label="Available Pilots" value={stats.availablePilots} accent="text-brand" />
        <StatCard label="Available Technicians" value={stats.availableTechnicians} accent="text-sky-400" />
        <StatCard label="Active Operations" value={stats.activeOperations} accent="text-emerald-400" />
      </div>

      {incident && (
        <div className="border-orange-400/40 bg-orange-400/5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-orange-400 text-[11px] font-semibold tracking-[0.12em] uppercase">
              {INCIDENT_PHASE_LABEL[incident.phase]}
            </span>
            <span className="text-foreground text-sm font-semibold">
              {incident.droneCallsign} · {incident.faultLabel}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-orange-400 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Responding Technician
            </span>
            <span className="text-foreground text-sm font-semibold">
              {incident.technicianName} · {incident.technicianStartDistanceKm.toFixed(1)} km away
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[66fr_34fr]">
        <div className="border-border/60 glass-2 relative isolate h-[560px] overflow-hidden rounded-2xl border lg:h-[680px]">
          <FleetMap
            ref={mapRef}
            className="hawk-leaflet isolate absolute inset-0 h-full w-full"
            telemetry={telemetry}
            selectedId={selectedId}
            onSelect={setSelectedId}
            follow={follow}
            pilots={DEMO_PILOTS}
            technicians={DEMO_TECHNICIANS}
            incident={{
              droneLocation: incident.droneLocation,
              technicianLocation: { latitude: incident.technicianLatitude, longitude: incident.technicianLongitude },
              showRoute: incident.phase !== "resumed",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3">
            <span className="border-border/60 bg-background/90 text-foreground pointer-events-auto rounded-lg border px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
              Full Fleet · Karnataka Operations
            </span>
            <MapControls
              follow={follow}
              onToggleFollow={() => setFollow((f) => !f)}
              onFitAll={() => mapRef.current?.fitAll()}
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              followDisabled={!selectedId}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3">
            <AdminSimControls clock={clock} className="pointer-events-auto" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="border-border/60 glass-1 flex flex-wrap gap-1.5 rounded-xl border p-2">
            {DEMO_FLEET.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  selectedId === d.id ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-brand/10",
                )}
              >
                {d.callsign}
              </button>
            ))}
          </div>
          {selected && <TelemetryPanel telemetry={selected} paused={!clock.playing} className="w-full max-w-none" />}
        </div>
      </div>

      <div className="border-border/60 glass-1 flex flex-col gap-3 rounded-2xl border p-5">
        <span className="text-foreground text-sm font-semibold tracking-[0.1em] uppercase">
          Bookings · Lifecycle Control
        </span>
        {bookings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No bookings yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map((b) => {
              const action = NEXT_STATUS[b.status];
              return (
                <div
                  key={b.id}
                  className="border-border/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-foreground font-semibold">{b.id}</span>
                    <span className="text-muted-foreground text-xs">
                      {b.serviceLabel} · {b.location} · {b.userId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{b.status.replace("-", " ")}</Badge>
                    {action && (
                      <Button
                        size="sm"
                        onClick={() => {
                          updateBookingStatus(b.id, action.next);
                          refreshBookings();
                        }}
                      >
                        {action.label}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="border-border/60 glass-1 rounded-xl border p-3 text-center">
      <div className={cn("text-2xl font-bold", accent ?? "text-foreground")}>{value}</div>
      <div className="text-muted-foreground mt-1 text-[10px] font-semibold tracking-[0.1em] uppercase">{label}</div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex flex-col gap-6">
          <Reveal className="flex max-w-[640px] flex-col gap-3">
            <span className="eyebrow">Admin Dashboard</span>
            <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Full fleet operations.
            </h1>
            <p className="text-muted-foreground text-md font-medium">
              Live telemetry across every Raider, plus booking lifecycle control.
            </p>
          </Reveal>
          {children}
        </div>
      </section>
      <Footer />
    </main>
  );
}

"use client";

import { PlaneTakeoffIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { FleetMap, type FleetMapHandle } from "@/components/booking/fleet-map";
import { MapControls } from "@/components/booking/map-controls";
import { TelemetryPanel } from "@/components/booking/telemetry-panel";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { DEMO_PILOT_RAIDER_ID } from "@/lib/booking/demo-accounts";
import { computeDroneTelemetry, useLiveClock } from "@/lib/booking/drone-simulation";
import { getFleetDrone } from "@/lib/booking/fleet-data";

export default function PilotDashboardPage() {
  const { user, isAuthenticated, requestLogin } = useBookingAuth();
  const [follow, setFollow] = React.useState(true);
  const mapRef = React.useRef<FleetMapHandle>(null);
  const now = useLiveClock(1000);

  const drone = getFleetDrone(DEMO_PILOT_RAIDER_ID)!;
  const telemetry = computeDroneTelemetry(drone, now);

  React.useEffect(() => {
    mapRef.current?.fitAll();
  }, []);

  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex flex-col gap-8">
          <Reveal className="flex max-w-[640px] flex-col gap-3">
            <span className="eyebrow">Pilot Dashboard</span>
            <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">My drone. My mission.</h1>
            <p className="text-muted-foreground text-md font-medium">
              Live telemetry and route for your assigned Raider.
            </p>
          </Reveal>

          {!isAuthenticated ? (
            <LoginGate onLogin={() => requestLogin("/pilot")} />
          ) : user?.role !== "pilot" ? (
            <AccessDenied />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[66fr_34fr]">
              <div className="border-border/60 glass-2 relative isolate h-[520px] overflow-hidden rounded-2xl border lg:h-[640px]">
                <FleetMap
                  ref={mapRef}
                  className="hawk-leaflet isolate absolute inset-0 h-full w-full"
                  telemetry={[telemetry]}
                  selectedId={telemetry.droneId}
                  follow={follow}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
                  <span className="border-border/60 bg-background/90 text-foreground pointer-events-auto rounded-lg border px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                    My Drone · {telemetry.callsign}
                  </span>
                  <MapControls
                    follow={follow}
                    onToggleFollow={() => setFollow((f) => !f)}
                    onFitAll={() => mapRef.current?.fitAll()}
                    onZoomIn={() => mapRef.current?.zoomIn()}
                    onZoomOut={() => mapRef.current?.zoomOut()}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <TelemetryPanel telemetry={telemetry} className="w-full max-w-none" />
                <div className="border-border/60 glass-1 flex flex-col gap-2 rounded-xl border p-4 text-sm">
                  <span className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
                    Mission
                  </span>
                  <span className="text-foreground">{telemetry.mission}</span>
                  <span className="text-muted-foreground text-xs">Pilot · {telemetry.pilot}</span>
                  <span className="text-muted-foreground text-xs">Destination · {telemetry.destinationLabel}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
      <p className="text-muted-foreground text-sm">Log in with your Pilot account to view your mission.</p>
      <Button size="lg" onClick={onLogin}>
        Log In
      </Button>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
      <PlaneTakeoffIcon className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">This dashboard is only available to Pilot accounts.</p>
      <Button size="lg" variant="outline" asChild>
        <Link href="/my-bookings">Back to My Bookings</Link>
      </Button>
    </div>
  );
}

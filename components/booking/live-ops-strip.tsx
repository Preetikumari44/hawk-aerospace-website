"use client";

// Compact "operational capacity" readout — Available Drones / Available
// Pilots / Available Technicians / Active Operations (§9). Deliberately
// small numbers only, never exact fleet positions or vendor breakdowns
// (§9 — "Do NOT expose complicated backend/vendor distribution details").

import { PlaneIcon, UserIcon, WrenchIcon, ZapIcon } from "lucide-react";
import * as React from "react";

import { computeFleetTelemetry, useLiveClock } from "@/lib/booking/drone-simulation";
import { DEMO_FLEET, DEMO_PILOTS, DEMO_TECHNICIANS } from "@/lib/booking/fleet-data";

export function LiveOpsCounts({ className }: { className?: string }) {
  const now = useLiveClock(2000);
  const telemetry = React.useMemo(() => computeFleetTelemetry(DEMO_FLEET, now), [now]);

  const availableDrones = telemetry.filter((t) => t.status === "available").length;
  const activeOperations = telemetry.filter((t) => t.status === "on-mission" || t.status === "hovering").length;
  const availablePilots = DEMO_PILOTS.filter((p) => p.status === "available").length;
  const availableTechnicians = DEMO_TECHNICIANS.filter((t) => t.status === "available").length;

  const items = [
    { icon: PlaneIcon, label: "Available Drones", value: availableDrones },
    { icon: UserIcon, label: "Available Pilots", value: availablePilots },
    { icon: WrenchIcon, label: "Available Technicians", value: availableTechnicians },
    { icon: ZapIcon, label: "Active Operations", value: activeOperations },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="border-border bg-card shadow-2xl backdrop-blur-md flex items-center gap-3 rounded-3xl border p-6">
            <span className="border-brand/30 bg-accent text-brand flex size-10 shrink-0 items-center justify-center rounded-xl border">
              <Icon className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-foreground text-2xl leading-tight font-bold">{String(value).padStart(2, "0")}</span>
              <span className="text-muted-foreground text-[11px] leading-tight font-semibold tracking-[0.08em] uppercase">
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

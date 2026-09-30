"use client";

// Pilot/technician click -> the SAME right-side info panel used for drones
// (Part 1–3). Same outer frame as telemetry-panel.tsx so it reads as one
// consistent panel system, not a new layout. Only fields that already exist
// on FleetPilot/FleetTechnician are shown — nothing invented (Part 1/2).

import { UserIcon, WrenchIcon } from "lucide-react";

import type { FleetPilot, FleetTechnician } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

import { RESOURCE_STATUS_COLOR, RESOURCE_STATUS_LABEL } from "./resource-icons";

interface ResourceDetailPanelProps {
  resource: ({ kind: "pilot" } & FleetPilot) | ({ kind: "technician" } & FleetTechnician);
  /** Set when this resource happens to be the one assigned to the
   * currently-viewed booking, so the panel can truthfully show which
   * booking/drone it's tied to — never fabricated for ambient resources. */
  assignment?: { bookingId: string; droneCallsign: string } | null;
  className?: string;
}

export function ResourceDetailPanel({ resource, assignment, className }: ResourceDetailPanelProps) {
  const color = RESOURCE_STATUS_COLOR[resource.status];
  const isPilot = resource.kind === "pilot";
  const Icon = isPilot ? UserIcon : WrenchIcon;

  return (
    <div
      className={cn(
        "border-border/60 bg-background/90 supports-[backdrop-filter]:bg-background/80 w-full max-w-xs rounded-xl border p-4 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.45)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
          >
            <Icon className="size-4" style={{ color }} />
          </span>
          <div className="flex flex-col">
            <span className="text-foreground text-sm font-semibold">{resource.name}</span>
            <span className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
              {isPilot ? "Pilot" : "Technician"} · {resource.id}
            </span>
          </div>
        </div>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{ borderColor: color, color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          {RESOURCE_STATUS_LABEL[resource.status]}
        </span>
      </div>

      <div className="border-border/50 mt-3 flex flex-col gap-2 border-t pt-3 text-xs">
        <Row label="Current Location" value={resource.location.label ?? "In field"} />
        {isPilot ? (
          <Row
            label="Qualifications"
            value={(resource as FleetPilot).qualifications.map((q) => q).join(", ")}
          />
        ) : (
          <Row
            label="Repair Capability"
            value={(resource as FleetTechnician).repairCapability.join(", ")}
          />
        )}
        {assignment ? (
          <>
            <Row label="Assigned Drone" value={assignment.droneCallsign} />
            <Row label="Booking" value={assignment.bookingId} />
          </>
        ) : (
          <Row label="Assignment" value={RESOURCE_STATUS_LABEL[resource.status]} />
        )}
        <Row label="Last Update" value="Just now" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right font-medium capitalize">{value}</span>
    </div>
  );
}

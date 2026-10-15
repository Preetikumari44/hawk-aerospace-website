"use client";

// ---------------------------------------------------------------------------
// Compact live-activity feed (§23) — derived from the SAME telemetry +
// incident state as the map/Raider/timeline (§25 — one source of truth),
// not an independent fake log. Shows only the most recent handful of
// events so it never spams the panel.
// ---------------------------------------------------------------------------

import * as React from "react";

import { SERVICE_WORK_LABEL } from "@/lib/booking/drone-simulation";
import type { IncidentState } from "@/lib/booking/incident-simulation";
import { INCIDENT_PHASE_LABEL } from "@/lib/booking/incident-simulation";
import type { DroneTelemetry } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  text: string;
  tone: "default" | "warning" | "success";
}

function buildActivity(telemetry: DroneTelemetry[], incident: IncidentState | null): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const t of telemetry) {
    if (t.status === "on-mission" && t.serviceKey) {
      items.push({
        id: `${t.droneId}-working`,
        text: `${t.callsign} · ${SERVICE_WORK_LABEL[t.serviceKey]}`,
        tone: "default",
      });
    } else if (t.status === "arriving") {
      items.push({ id: `${t.droneId}-arriving`, text: `${t.callsign} arriving at destination`, tone: "default" });
    } else if (t.status === "hovering") {
      items.push({ id: `${t.droneId}-hovering`, text: `${t.callsign} holding position`, tone: "default" });
    }
  }

  if (incident) {
    items.push({
      id: `incident-${incident.phase}`,
      text: `${incident.droneCallsign} · ${INCIDENT_PHASE_LABEL[incident.phase]}${
        incident.phase !== "fault-detected" && incident.phase !== "resumed" ? ` · ${incident.technicianName}` : ""
      }`,
      tone: incident.phase === "resumed" ? "success" : "warning",
    });
  }

  return items.slice(0, 6);
}

export function LiveActivityFeed({
  telemetry,
  incident,
  className,
}: {
  telemetry: DroneTelemetry[];
  incident: IncidentState | null;
  className?: string;
}) {
  const items = React.useMemo(() => buildActivity(telemetry, incident), [telemetry, incident]);

  return (
    <div className={cn("border-border/60 glass-1 flex flex-col gap-2 rounded-xl border p-4", className)}>
      <span className="text-foreground text-xs font-semibold tracking-[0.14em] uppercase">Live Activity</span>
      <div className="flex flex-col gap-1.5">
        {items.length === 0 ? (
          <span className="text-muted-foreground text-xs">No activity right now.</span>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span
                className={cn(
                  "mt-1 size-1.5 shrink-0 rounded-full",
                  item.tone === "warning" && "bg-orange-400",
                  item.tone === "success" && "bg-emerald-400",
                  item.tone === "default" && "bg-brand",
                )}
              />
              <span className="text-muted-foreground">{item.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

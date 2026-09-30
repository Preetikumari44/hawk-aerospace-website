"use client";

// ---------------------------------------------------------------------------
// Raider System radar — a real interactive India map (components/booking/
// india-map.tsx) underneath a tactical HUD overlay (concentric rings,
// crosshair, rotating sweep) recolored to the Hawk brand palette. The HUD
// layer is decorative and non-interactive (pointer-events-none) so the map
// beneath it stays fully pannable/zoomable; operator markers and the
// project-location marker are real Leaflet markers plotted at their actual
// coordinates, not a synthetic radial placement.
// ---------------------------------------------------------------------------

import type { OperationalCenter, Operator } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

import { IndiaMap } from "./india-map";

interface RaiderRadarProps {
  className?: string;
  center: OperationalCenter | null;
  operators: Operator[];
  selectedOperatorId: string | null;
  onSelectOperator?: (id: string) => void;
  showOperators: boolean;
}

export function RaiderRadar({
  className,
  center,
  operators,
  selectedOperatorId,
  onSelectOperator,
  showOperators,
}: RaiderRadarProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Real, pannable/zoomable India map underlay. `isolate` is the actual
          fix for the radar-invisibility bug: Leaflet hard-codes raw z-index
          values on its own internal panes/controls (tile pane 200, overlay
          pane 400, marker pane 600, tooltip pane 650, popup pane 700, zoom/
          attribution controls 1000) and, without a stacking context of its
          own, those values were leaking out and comparing directly against
          this component's z-10/z-20 overlay siblings below — so the map
          tiles (z:200) painted OVER the z-20 radar HUD and hid it entirely.
          `isolate` contains every Leaflet z-index inside this element's own
          box, so nothing inside it can ever again out-stack the radar
          overlay, no matter what z-index Leaflet assigns internally. */}
      <IndiaMap
        className="hawk-leaflet isolate absolute inset-0 h-full w-full"
        center={center}
        operators={operators}
        selectedOperatorId={selectedOperatorId}
        onSelectOperator={onSelectOperator}
        showOperators={showOperators}
      />

      {/* Subtle HUD grid — purely decorative texture under the real Raider
          System panel (rendered by raider-system.tsx, above this
          component), and never intercepts pointer events so panning/
          zooming/clicking markers keeps working. No "Raider System" text
          here — that label lives in exactly one place, the telemetry
          strip, so it's never duplicated. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--brand) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--brand) 7%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          opacity: 0.5,
        }}
      />

      {/* Radar HUD (rings/crosshair/sweep) is now a real geographically-
          anchored Leaflet marker rendered INSIDE IndiaMap (see
          raider-marker.ts) — it pans/zooms/moves with the map instead of
          sitting fixed on screen. Nothing further to render here. */}

      {!center && (
        <div className="text-muted-foreground pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-4 text-center text-[11px]">
          Enter a project location to lock Raider coverage — showing India-wide view.
        </div>
      )}
    </div>
  );
}

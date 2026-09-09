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
      {/* Real, pannable/zoomable India map underlay. */}
      <IndiaMap
        className="hawk-leaflet absolute inset-0 h-full w-full"
        center={center}
        operators={operators}
        selectedOperatorId={selectedOperatorId}
        onSelectOperator={onSelectOperator}
        showOperators={showOperators}
      />

      {/* Tactical HUD overlay — decorative only, never blocks map interaction. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, var(--brand) 10%, transparent), transparent 55%)",
        }}
      >
        <div className="relative aspect-square w-[min(78%,540px)] shrink-0">
          {/* Concentric rings + grid (from globals.css) */}
          <div
            className="radar-grid-lines absolute inset-0 rounded-full border"
            style={{
              borderColor: "color-mix(in srgb, var(--brand) 45%, transparent)",
              boxShadow:
                "0 0 50px color-mix(in srgb, var(--brand) 12%, transparent), inset 0 0 50px color-mix(in srgb, var(--brand) 8%, transparent)",
            }}
          />

          {/* Crosshair */}
          <div
            className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2"
            style={{ background: "color-mix(in srgb, var(--brand) 30%, transparent)" }}
          />
          <div
            className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2"
            style={{ background: "color-mix(in srgb, var(--brand) 30%, transparent)" }}
          />

          {/* Rotating sweep */}
          <div
            className="radar-sweep absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0 82%, color-mix(in srgb, var(--brand) 40%, transparent))",
            }}
          />
        </div>
      </div>

      {!center && (
        <div className="text-muted-foreground pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-4 text-center text-[11px]">
          Enter a project location to lock Raider coverage — showing India-wide view.
        </div>
      )}
    </div>
  );
}

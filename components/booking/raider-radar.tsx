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

import type { OperationalCenter, Operator, ProjectSite } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

import { IndiaMap } from "./india-map";

interface RaiderRadarProps {
  className?: string;
  center: OperationalCenter | null;
  operators: Operator[];
  selectedOperatorId: string | null;
  onSelectOperator?: (id: string) => void;
  showOperators: boolean;
  projectSite?: ProjectSite | null;
}

export function RaiderRadar({
  className,
  center,
  operators,
  selectedOperatorId,
  onSelectOperator,
  showOperators,
  projectSite = null,
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
        projectSite={projectSite}
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
          opacity: projectSite ? 0 : 0.5,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Ambient "Live Drone Activity" glyphs (reference §8/§10) — a handful
          of small, fixed screen-space drone markers scattered around the
          radar while it's standing by. Purely decorative/non-interactive
          (never real dispatch data — that's the geo-anchored operator
          layer inside IndiaMap, shown only once a search actually runs),
          same drone glyph used everywhere else in the Raider System. */}
      {!showOperators && !projectSite && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {[
            { top: "22%", left: "18%", delay: "0s" },
            { top: "34%", left: "78%", delay: "0.6s" },
            { top: "68%", left: "30%", delay: "1.2s" },
            { top: "72%", left: "82%", delay: "1.8s" },
          ].map((spot, i) => (
            <span
              key={i}
              className="hawk-pulse-ring absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: spot.top, left: spot.left, animationDelay: spot.delay }}
            >
              <svg width="18" height="12" viewBox="0 0 46 30" fill="none">
                <g stroke="#1f7a43" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M20 15 L7 6 M26 15 L39 6 M20 18 L7 27 M26 18 L39 27" />
                </g>
                <g fill="#eaf4ec" stroke="#1f7a43" strokeWidth="1.6">
                  <circle cx="7" cy="6" r="3.6" />
                  <circle cx="39" cy="6" r="3.6" />
                  <circle cx="7" cy="27" r="3.6" />
                  <circle cx="39" cy="27" r="3.6" />
                </g>
                <rect x="19" y="13" width="8" height="5" rx="1.5" fill="#1f7a43" />
              </svg>
            </span>
          ))}
        </div>
      )}

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

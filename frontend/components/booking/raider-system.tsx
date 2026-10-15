"use client";

import { ChevronDownIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import * as React from "react";

import { getOperationalSnapshot } from "@/lib/booking/operations";
import type {
  LocationStatus,
  OperationalCenter,
  OperationalStatus,
  Operator,
  ProjectSite,
} from "@/lib/booking/types";
import { cn } from "@/lib/utils";

import { RaiderRadar } from "./raider-radar";
import { WeatherChip } from "./weather-chip";

type RaiderStage = "idle" | "scanning" | "dispatch";

interface RaiderSystemProps {
  stage: RaiderStage;
  operators: Operator[];
  selectedOperatorId: string | null;
  onSelectOperator?: (id: string) => void;
  center: OperationalCenter | null;
  locationStatus: LocationStatus;
  locationMessage: string | null;
  /** Set once a valid project/site location is geocoded: switches the panel
   * from the Raider System view to the Project Site map view. */
  projectSite?: ProjectSite | null;
}

const STATUS_LABEL: Record<OperationalStatus, string> = {
  operational: "Operational",
  limited: "Limited Availability",
  none: "No Nearby Operations",
};

const STATUS_DOT: Record<OperationalStatus, string> = {
  operational: "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]",
  limited: "bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]",
  none: "bg-muted-foreground",
};

// Solid-enough-to-read glass background for the panels that float directly
// on top of the live map — deliberately more opaque than the ambient
// `glass-*` utilities (which are tuned for ~5-10% tint over a plain card
// background, not over map tiles/labels), so the Raider System stays
// legible over Bengaluru's street grid instead of blending into it.
const overlayPanelClass = "bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80";

export function RaiderSystem({
  stage,
  operators,
  selectedOperatorId,
  onSelectOperator,
  center,
  locationStatus,
  locationMessage,
  projectSite = null,
}: RaiderSystemProps) {
  // Keep the map's attribution and zoom controls above the bottom status
  // panels in Project Site mode: publish the footer's height as a CSS
  // variable the map reads (see `.hawk-project-mode .leaflet-bottom`).
  const rootRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const root = rootRef.current;
    const footer = footerRef.current;
    if (!root || !footer || typeof ResizeObserver === "undefined") return;
    const update = () => root.style.setProperty("--hawk-map-footer-h", `${footer.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const isLocating = locationStatus === "requesting";
  const snapshot = center ? getOperationalSnapshot(center) : null;

  const availableCount = operators.filter((o) => o.status === "available").length;
  const busyCount = operators.filter((o) => o.status === "busy").length;
  const within100 = operators.filter((o) => o.distanceMiles <= 100).length;
  const within200 = operators.filter((o) => o.distanceMiles <= 200).length;

  const topStatusLabel =
    stage === "idle"
      ? "IDLE"
      : stage === "scanning"
        ? "SEARCHING"
        : selectedOperatorId
          ? "DISPATCH READY"
          : "ACTIVE";

  const secondaryStatus =
    stage === "idle"
      ? "STANDING BY"
      : stage === "scanning"
        ? "SCANNING SECTOR…"
        : "OPERATORS DETECTED";

  return (
    <div
      ref={rootRef}
      className="relative isolate h-full min-h-[560px] overflow-hidden lg:min-h-0"
    >
      {/* Base layer: the real, pannable/zoomable map — fills the entire
          panel. Everything below is an overlay stacked strictly above it
          (z-20+), never the other way around. */}
      <div className="absolute inset-0 z-0">
        <RaiderRadar
          className="absolute inset-0 h-full w-full"
          center={center}
          operators={operators}
          selectedOperatorId={selectedOperatorId}
          onSelectOperator={onSelectOperator}
          showOperators={stage === "dispatch" && operators.length > 0}
          projectSite={projectSite}
        />
      </div>

      {/* Weather chip (reference §11) — top-right of the map, above the HUD
          grid but below the telemetry strip so it never overlaps it.
          Renders nothing until a real location resolves and a real
          (keyless, free) weather fetch succeeds — see weather-chip.tsx. */}
      <div
        className={cn(
          "pointer-events-none absolute right-3 z-20 sm:right-4",
          projectSite ? "top-3" : "top-20",
        )}
      >
        <WeatherChip latitude={center?.latitude ?? null} longitude={center?.longitude ?? null} />
      </div>

      {/* Raider System HUD — the telemetry strip + location/coverage row,
          floated directly over the map with a solid-enough glass backing
          and a clear z-index above the map layer so it can never be
          covered by it. The wrapping div is pointer-events-none so empty
          space around the text still lets the map beneath receive
          drag/scroll/click; the strip itself opts back into pointer
          events so its own controls stay usable. */}
      {projectSite ? (
        <div className="pointer-events-none absolute top-3 left-3 z-20 max-w-[60%] sm:top-4 sm:left-4">
          <span
            className={cn(
              overlayPanelClass,
              "border-border/60 pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg",
            )}
          >
            <MapPinIcon className="text-brand size-3.5 shrink-0" />
            <span className="text-foreground truncate text-xs font-semibold">{projectSite.label}</span>
            {stage === "scanning" && (
              <span className="text-brand shrink-0 animate-pulse text-[10px] font-semibold tracking-[0.08em] uppercase">
                Scanning…
              </span>
            )}
          </span>
        </div>
      ) : (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col">
        <div
          className={cn(
            overlayPanelClass,
            "border-border/60 pointer-events-auto flex shrink-0 items-center justify-between border-b px-4 py-3 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.4)] sm:px-6",
          )}
        >
          <div className="flex flex-col">
            <span className="text-foreground text-sm font-semibold tracking-[0.15em] uppercase">
              Raider System
            </span>
            <span
              className={cn(
                "text-[11px] font-medium tracking-[0.08em]",
                stage === "idle" && "text-muted-foreground",
                stage === "scanning" && "text-brand animate-pulse",
                stage === "dispatch" && "text-emerald-400",
              )}
            >
              {secondaryStatus}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" />
              <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.15em] uppercase">
                Live
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  stage === "dispatch" ? "bg-emerald-400" : "bg-brand",
                  stage !== "idle" && "animate-pulse",
                )}
              />
              <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.15em] uppercase">
                {topStatusLabel}
              </span>
            </span>
          </div>
        </div>

        {/* Location / coverage context row — no manual location button anywhere here. */}
        <div
          className={cn(
            overlayPanelClass,
            "border-border/60 pointer-events-auto shrink-0 border-b px-4 py-3 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.4)] sm:px-6",
          )}
        >
          {center ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPinIcon className="text-brand size-4 shrink-0" />
                <span className="text-foreground text-sm font-semibold">{center.label}</span>
                <ChevronDownIcon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
              </div>
              {snapshot && (
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <span className={cn("size-1.5 rounded-full", STATUS_DOT[snapshot.status])} />
                  {STATUS_LABEL[snapshot.status]}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                {isLocating
                  ? "Detecting your location…"
                  : "Enter a project location to center Raider coverage."}
              </span>
            </div>
          )}
          {!center && locationMessage && (
            <p role="status" className="text-muted-foreground mt-1.5 text-[11px]">
              {locationMessage}
            </p>
          )}
        </div>
      </div>
      )}

      {/* Live status footer — same overlay treatment, anchored to the
          bottom of the map instead of pushing it down in normal flow. */}
      <div
        ref={footerRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col"
      >
        {stage === "idle" && !projectSite && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-30 sm:bottom-4 sm:left-4">
            <span className="bg-[#16231a]/85 text-white pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-lg backdrop-blur-md">
              <span className="bg-emerald-400 size-1.5 animate-pulse rounded-full" />
              Live Drone Activity
            </span>
          </div>
        )}

        {stage !== "idle" && operators.length > 0 && (
          <div
            className={cn(
              overlayPanelClass,
              "border-border/60 pointer-events-auto shrink-0 border-t px-4 py-4 shadow-[0_-2px_16px_-4px_rgba(0,0,0,0.4)] sm:px-6",
            )}
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="border-border/60 glass-1 rounded-xl border p-3">
                <div className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Available
                </div>
                <div className="text-foreground mt-1 text-lg font-semibold">
                  {String(availableCount).padStart(2, "0")}
                </div>
              </div>
              <div className="border-border/60 glass-1 rounded-xl border p-3">
                <div className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Active
                </div>
                <div className="text-foreground mt-1 text-lg font-semibold">
                  {String(busyCount).padStart(2, "0")}
                </div>
              </div>
              <div className="border-border/60 glass-1 rounded-xl border p-3">
                <div className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Within 100 mi
                </div>
                <div className="text-foreground mt-1 text-lg font-semibold">
                  {String(within100).padStart(2, "0")}
                </div>
              </div>
              <div className="border-border/60 glass-1 rounded-xl border p-3">
                <div className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Within 200 mi
                </div>
                <div className="text-foreground mt-1 text-lg font-semibold">
                  {String(within200).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        )}

        {stage !== "idle" && (
          <div
            className={cn(
              overlayPanelClass,
              "border-border/60 pointer-events-auto shrink-0 border-t px-4 py-2 sm:px-6",
            )}
          >
            <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
              <ShieldCheckIcon className="size-3 shrink-0" />
              Simulated availability — abstract coverage clusters, not exact positions.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

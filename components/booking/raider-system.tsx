"use client";

import { RadarIcon, ShieldCheckIcon } from "lucide-react";

import { getOperationalSnapshot } from "@/lib/booking/operations";
import type {
  LocationStatus,
  OperationalCenter,
  OperationalStatus,
  Operator,
} from "@/lib/booking/types";
import { cn } from "@/lib/utils";

import { RaiderRadar } from "./raider-radar";

type RaiderStage = "idle" | "scanning" | "dispatch";

interface RaiderSystemProps {
  stage: RaiderStage;
  operators: Operator[];
  selectedOperatorId: string | null;
  onSelectOperator?: (id: string) => void;
  center: OperationalCenter | null;
  locationStatus: LocationStatus;
  locationMessage: string | null;
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

export function RaiderSystem({
  stage,
  operators,
  selectedOperatorId,
  onSelectOperator,
  center,
  locationStatus,
  locationMessage,
}: RaiderSystemProps) {
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
    <div className="relative flex h-full min-h-[560px] flex-col overflow-y-auto lg:min-h-0">
      {/* Telemetry strip */}
      <div className="border-border/50 relative z-20 flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
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
      <div className="border-border/50 relative z-20 shrink-0 border-b px-4 py-3 sm:px-6">
        {center ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RadarIcon className="text-brand size-4 shrink-0" />
              <span className="text-foreground text-sm font-semibold">{center.label}</span>
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

      {/* Tactical radar display */}
      <div className="relative min-h-[240px] flex-1">
        <RaiderRadar
          className="absolute inset-0 h-full w-full"
          center={center}
          operators={operators}
          selectedOperatorId={selectedOperatorId}
          onSelectOperator={onSelectOperator}
          showOperators={stage === "dispatch" && operators.length > 0}
        />
      </div>

      {/* Live status footer */}
      {stage !== "idle" && operators.length > 0 && (
        <div className="border-border/50 relative z-20 shrink-0 border-t px-4 py-4 sm:px-6">
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
        <div className="border-border/50 relative z-20 shrink-0 border-t px-4 py-2 sm:px-6">
          <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
            <ShieldCheckIcon className="size-3 shrink-0" />
            Simulated availability — abstract coverage clusters, not exact positions.
          </span>
        </div>
      )}
    </div>
  );
}

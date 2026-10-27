"use client";

// Compact drone telemetry card — floats over the fleet map. Same shape for
// customer/pilot/admin views (§5/§9/§23/§24/§32); the `variant` prop only
// changes which extra line (booking ref for admin) is shown, never the
// underlying data source, so customers never see other bookings/pilots.

import { BatteryMediumIcon, GaugeIcon, MapPinIcon, MountainIcon, NavigationIcon } from "lucide-react";
import type { ReactNode } from "react";

import { formatDistanceKm, formatEtaMinutes, formatHeading } from "@/lib/booking/tracking";
import type { DroneTelemetry } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

import { AircraftGlyph, STATUS_COLOR, STATUS_LABEL } from "./aircraft-icon";
import { LiveIndicator } from "./live-indicator";

interface TelemetryPanelProps {
  telemetry: DroneTelemetry;
  paused?: boolean;
  bookingRef?: string;
  /** False for ambient/other fleet drones — hides mission/destination detail
   * so only generic operational telemetry is shown (never another
   * customer's booking, mission, or destination). Defaults to true. */
  showMissionDetails?: boolean;
  className?: string;
}

export function TelemetryPanel({
  telemetry: t,
  paused,
  bookingRef,
  showMissionDetails = true,
  className,
}: TelemetryPanelProps) {
  const color = STATUS_COLOR[t.status];

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
            <AircraftGlyph size={16} color={color} heading={t.heading} />
          </span>
          <div className="flex flex-col">
            <span className="text-foreground text-sm font-bold tracking-wide">{t.callsign}</span>
            <span className="text-muted-foreground text-xs">{t.pilot}</span>
          </div>
        </div>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
          style={{ borderColor: color, color }}
        >
          {STATUS_LABEL[t.status]}
        </span>
      </div>

      <div className="mt-3">
        <LiveIndicator lastUpdatedMs={new Date(t.lastUpdated).getTime()} paused={paused} />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Metric icon={<GaugeIcon className="size-3.5" />} label="Speed" value={`${Math.round(t.speedKmh)}`} unit="km/h" />
        <Metric icon={<MountainIcon className="size-3.5" />} label="Alt" value={`${Math.round(t.altitudeM)}`} unit="m" />
        <Metric icon={<NavigationIcon className="size-3.5" />} label="Heading" value={formatHeading(t.heading)} unit="" />
        <Metric icon={<BatteryMediumIcon className="size-3.5" />} label="Battery" value={`${t.battery}`} unit="%" />
      </div>

      <div className="border-border/50 mt-3 flex items-center justify-between border-t pt-3 text-xs">
        <span className="text-muted-foreground">ETA</span>
        <span className="text-foreground font-semibold">{formatEtaMinutes(t.etaMinutes)}</span>
      </div>

      {showMissionDetails && (
        <>
          <div className="mt-2 flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground font-semibold tracking-[0.1em] uppercase">Mission</span>
            <span className="text-foreground">{t.mission}</span>
          </div>

          <div className="mt-2 flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground flex items-center gap-1 font-semibold tracking-[0.1em] uppercase">
              <MapPinIcon className="size-3" /> Destination
            </span>
            <span className="text-foreground">{t.destinationLabel}</span>
          </div>
        </>
      )}

      <div className="text-muted-foreground mt-2 flex items-center justify-between text-[10px]">
        <span>{formatDistanceKm(t.distanceRemainingKm)} remaining</span>
        <span>{formatDistanceKm(t.distanceTraveledKm)} flown</span>
      </div>

      {bookingRef && (
        <div className="border-border/50 text-muted-foreground mt-3 border-t pt-2 text-[10px]">
          Booking · {bookingRef}
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, unit }: { icon: ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="border-border/50 glass-1 flex flex-col items-center gap-0.5 rounded-lg border py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-foreground text-xs font-semibold">
        {value}
        <span className="text-muted-foreground ml-0.5 text-[9px] font-normal">{unit}</span>
      </span>
      <span className="text-muted-foreground text-[8px] font-medium tracking-[0.08em] uppercase">{label}</span>
    </div>
  );
}

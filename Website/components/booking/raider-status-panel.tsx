"use client";

// Compact text-only Raider status summary (§21) — the real circular radar
// HUD is a geographic marker layered on the map itself (raider-marker.ts),
// never duplicated here.

import { cn } from "@/lib/utils";

export function RaiderStatusPanel({
  detectedCount,
  lastUpdatedLabel,
  className,
}: {
  detectedCount: number;
  lastUpdatedLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("border-border/60 glass-1 flex flex-col gap-2 rounded-xl border p-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-foreground text-xs font-semibold tracking-[0.14em] uppercase">Raider System</span>
        <span className="flex items-center gap-1.5">
          <span className="bg-emerald-400 size-1.5 animate-pulse rounded-full" />
          <span className="text-emerald-400 text-[10px] font-semibold tracking-[0.14em] uppercase">Live</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground text-sm font-bold">Active</span>
          <span className="text-muted-foreground text-[9px] font-semibold tracking-[0.08em] uppercase">
            Scan Status
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground text-sm font-bold">{String(detectedCount).padStart(2, "0")}</span>
          <span className="text-muted-foreground text-[9px] font-semibold tracking-[0.08em] uppercase">
            Detected
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground text-sm font-bold">{lastUpdatedLabel}</span>
          <span className="text-muted-foreground text-[9px] font-semibold tracking-[0.08em] uppercase">
            Last Update
          </span>
        </div>
      </div>
    </div>
  );
}

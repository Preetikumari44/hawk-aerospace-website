"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const LEGEND_ITEMS: { label: string; swatch: ReactNode }[] = [
  {
    label: "Drone",
    swatch: <span className="inline-block size-2.5 rounded-full" style={{ background: "#ec4899" }} />,
  },
  {
    label: "Pilot",
    swatch: <span className="inline-block size-2.5 rounded-full" style={{ background: "#34d399" }} />,
  },
  {
    label: "Technician",
    swatch: <span className="inline-block size-2.5 rounded-sm" style={{ background: "#38bdf8" }} />,
  },
  {
    label: "Incident",
    swatch: <span className="inline-block size-2.5 rounded-sm" style={{ background: "#f97316" }} />,
  },
  {
    label: "Flight Path",
    swatch: <span className="inline-block h-px w-3 border-t border-dashed" style={{ borderColor: "#4f7cff" }} />,
  },
  {
    label: "Operation Zone",
    swatch: <span className="inline-block size-2.5 rounded-full border" style={{ borderColor: "#a855f7" }} />,
  },
];

/** Compact legend overlay (§9) — required now that drones, pilots,
 * technicians, incidents and flight paths all share the same map. */
export function MapLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-background/90 border-border/60 pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.4)] backdrop-blur-md",
        className,
      )}
    >
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium">
          {item.swatch}
          {item.label}
        </span>
      ))}
    </div>
  );
}

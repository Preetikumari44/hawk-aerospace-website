"use client";

// Compact "● LIVE" / "PAUSED" status + a ticking "Last updated Xs ago" —
// used across the customer/pilot/admin tracking views (§15).

import * as React from "react";

import { timeAgoLabel } from "@/lib/booking/tracking";
import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  lastUpdatedMs: number;
  paused?: boolean;
  className?: string;
}

export function LiveIndicator({ lastUpdatedMs, paused = false, className }: LiveIndicatorProps) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={cn("flex items-center gap-2 text-[11px]", className)}>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "size-1.5 rounded-full",
            paused
              ? "bg-muted-foreground"
              : "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)] animate-pulse",
          )}
        />
        <span
          className={cn(
            "font-semibold tracking-[0.15em] uppercase",
            paused ? "text-muted-foreground" : "text-emerald-400",
          )}
        >
          {paused ? "Paused" : "Live"}
        </span>
      </span>
      <span className="text-muted-foreground">Last updated {timeAgoLabel(lastUpdatedMs, now)}</span>
    </span>
  );
}

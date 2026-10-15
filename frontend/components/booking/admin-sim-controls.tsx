"use client";

// Admin-only demo simulation controls (§18/§41) — Start/Pause/Reset + 1x/2x/5x
// speed. Never rendered for customer/pilot views.

import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";

import type { SimClock } from "@/lib/booking/drone-simulation";
import { cn } from "@/lib/utils";

const SPEEDS: Array<1 | 2 | 5> = [1, 2, 5];

export function AdminSimControls({ clock, className }: { clock: SimClock; className?: string }) {
  return (
    <div className={cn("border-border/60 bg-background/90 flex flex-wrap items-center gap-2 rounded-lg border p-2 backdrop-blur-md", className)}>
      <span className="text-muted-foreground px-1 text-[10px] font-semibold tracking-[0.15em] uppercase">
        Demo Simulation
      </span>
      <button
        type="button"
        onClick={clock.playing ? clock.pause : clock.play}
        className="border-border/60 text-foreground hover:bg-brand/10 flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold"
      >
        {clock.playing ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
        {clock.playing ? "Pause" : "Start"}
      </button>
      <button
        type="button"
        onClick={clock.reset}
        className="border-border/60 text-foreground hover:bg-brand/10 flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold"
      >
        <RotateCcwIcon className="size-3.5" />
        Reset
      </button>
      <div className="border-border/60 flex items-center overflow-hidden rounded-md border">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => clock.setSpeed(speed)}
            className={cn(
              "px-2.5 py-1 text-[11px] font-semibold transition-colors",
              clock.speed === speed ? "bg-brand text-brand-foreground" : "text-foreground hover:bg-brand/10",
            )}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}

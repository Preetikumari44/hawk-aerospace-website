"use client";

// Minimal control strip for the fleet map (§16/§33): Fleet Overview, Follow
// toggle, Fit All, Zoom In/Out. Kept consistent with the rest of the Raider
// System's glass-panel styling — no new visual language introduced.

import { LocateFixedIcon, Maximize2Icon, MinusIcon, PlusIcon, ScanIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface MapControlsProps {
  follow: boolean;
  onToggleFollow: () => void;
  onFitAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  followDisabled?: boolean;
  className?: string;
}

export function MapControls({
  follow,
  onToggleFollow,
  onFitAll,
  onZoomIn,
  onZoomOut,
  followDisabled,
  className,
}: MapControlsProps) {
  return (
    <div className={cn("pointer-events-auto flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={onFitAll}
        title="Fleet Overview — fit all active drones"
        className="border-border/60 bg-background/90 text-foreground hover:bg-brand/10 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md transition-colors"
      >
        <ScanIcon className="size-3.5" />
        Fleet Overview
      </button>
      <button
        type="button"
        onClick={onToggleFollow}
        disabled={followDisabled}
        title="Follow the selected drone"
        className={cn(
          "border-border/60 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur-md transition-colors disabled:opacity-40",
          follow ? "bg-brand text-brand-foreground border-brand" : "bg-background/90 text-foreground hover:bg-brand/10",
        )}
      >
        <LocateFixedIcon className="size-3.5" />
        Follow
      </button>
      <div className="border-border/60 bg-background/90 flex items-center overflow-hidden rounded-lg border backdrop-blur-md">
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom in"
          className="text-foreground hover:bg-brand/10 px-2 py-1.5"
        >
          <PlusIcon className="size-3.5" />
        </button>
        <span className="bg-border/60 h-4 w-px" />
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom out"
          className="text-foreground hover:bg-brand/10 px-2 py-1.5"
        >
          <MinusIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function FitAllIcon() {
  return <Maximize2Icon className="size-3.5" />;
}

"use client";

import { CheckIcon, RadioTowerIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Operator } from "../../lib/booking/types";

interface OperatorCardProps {
  operator: Operator;
  selected: boolean;
  onSelect: () => void;
}

export function OperatorCard({ operator, selected, onSelect }: OperatorCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group border-border/60 glass-1 relative flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-300",
        "hover:border-brand/50 hover:-translate-y-0.5",
        selected && "border-brand/70 shadow-[0_0_0_1px_var(--brand),0_0_24px_-6px_var(--brand)]",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected
              ? "border-brand bg-brand/15 text-brand"
              : "border-border/60 bg-secondary/60 text-muted-foreground",
          )}
        >
          <RadioTowerIcon className="size-4" />
          {!selected && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" />
          )}
        </span>
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-semibold">{operator.callsign}</span>
          <span className="text-muted-foreground text-xs">
            {operator.name} · {operator.distanceMiles} mi · {operator.estimatedTakeoffMinutes} min takeoff
          </span>
        </div>
      </div>

      <span
        className={cn(
          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase",
          selected
            ? "border-brand/60 bg-brand text-primary-foreground"
            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
        )}
      >
        {selected && <CheckIcon className="size-3" />}
        {selected ? "Selected" : "Available"}
      </span>
    </button>
  );
}

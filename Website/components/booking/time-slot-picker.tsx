"use client";

import { CheckIcon, MoonIcon, SunriseIcon, SunsetIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Old customer-app slots: Videography gets Morning / Evening / Night,
// every other service gets Morning / Evening only.
// (User_Frontend/src/customerModule/components/TimeSlotSelector.jsx)
export const VIDEOGRAPHY_SLOTS = [
  { key: "Morning", time: "(8AM - 1PM)", hour: 8, Icon: SunriseIcon },
  { key: "Evening", time: "(2PM - 6PM)", hour: 14, Icon: SunsetIcon },
  { key: "Night", time: "(After 6PM)", hour: 19, Icon: MoonIcon },
] as const;

export const STANDARD_SLOTS = [
  { key: "Morning", time: "(8AM - 1PM)", hour: 8, Icon: SunriseIcon },
  { key: "Evening", time: "(2PM - 6PM)", hour: 14, Icon: SunsetIcon },
] as const;

export type SlotKey = "Morning" | "Evening" | "Night";

/** Hour embedded into scheduledDate ISO (old SLOT_HOUR_MAP). */
export const SLOT_HOUR_MAP: Record<SlotKey, number> = { Morning: 8, Evening: 14, Night: 19 };

/** Backend DTO slot (morning | afternoon | evening). Night maps to evening. */
export function toPreferredTimeSlot(slot: string): "morning" | "afternoon" | "evening" | null {
  if (slot === "Morning") return "morning";
  if (slot === "Evening") return "afternoon";
  if (slot === "Night") return "evening";
  return null;
}

/** Builds the hour-embedded scheduledDate ISO for the backend. */
export function buildScheduledDate(dateYYYYMMDD: string, slot: string): string {
  const hour = SLOT_HOUR_MAP[slot as SlotKey] ?? 8;
  const candidate = new Date(`${dateYYYYMMDD}T${String(hour).padStart(2, "0")}:00:00`);
  if (Number.isNaN(candidate.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(hour, 0, 0, 0);
    return fallback.toISOString();
  }
  // If the slotted time already passed today, push to tomorrow same slot.
  if (candidate.getTime() < Date.now()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.toISOString();
}

interface TimeSlotPickerProps {
  service: string | null;
  value: string;
  onChange: (slot: SlotKey) => void;
}

export function TimeSlotPicker({ service, value, onChange }: TimeSlotPickerProps) {
  const slots = service === "videography" ? VIDEOGRAPHY_SLOTS : STANDARD_SLOTS;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-foreground text-sm font-medium">Time Slot</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map(({ key, time, Icon }) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key as SlotKey)}
              aria-pressed={selected}
              className={cn(
                "group border-border/60 glass-1 flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-300",
                "hover:border-brand/50 hover:-translate-y-0.5",
                selected &&
                  "border-brand/70 shadow-[0_0_0_1px_var(--brand),0_0_24px_-6px_var(--brand)]",
              )}
            >
              <span className="flex w-full items-center justify-between">
                <Icon className={cn("size-4", selected ? "text-brand" : "text-muted-foreground")} />
                {selected && <CheckIcon className="text-brand size-3.5" />}
              </span>
              <span className="text-foreground text-sm font-semibold">{key}</span>
              <span className="text-muted-foreground text-[11px]">{time}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

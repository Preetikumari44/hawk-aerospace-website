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

/** Same-day cut-offs (local time): morning hidden past 9 AM, morning + evening hidden past 3 PM. */
export const SAME_DAY_MORNING_CUTOFF_HOUR = 9;
export const SAME_DAY_EVENING_CUTOFF_HOUR = 15;

export function toDateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isToday(dateYYYYMMDD: string, now: Date = new Date()): boolean {
  return dateYYYYMMDD === toDateKeyLocal(now);
}

/** Slot keys still offered for a date. Non-videography gets Morning/Evening only. */
export function getAvailableSlotKeys(
  service: string | null,
  dateYYYYMMDD: string,
  now: Date = new Date(),
): SlotKey[] {
  const all: SlotKey[] = service === "videography" ? ["Morning", "Evening", "Night"] : ["Morning", "Evening"];
  if (!dateYYYYMMDD || !isToday(dateYYYYMMDD, now)) return all;
  const hour = now.getHours();
  if (hour >= SAME_DAY_EVENING_CUTOFF_HOUR) {
    return service === "videography" ? ["Night"] : [];
  }
  if (hour >= SAME_DAY_MORNING_CUTOFF_HOUR) {
    return service === "videography" ? ["Evening", "Night"] : ["Evening"];
  }
  return all;
}

export function isSlotAvailableToday(slot: string, now: Date = new Date()): boolean {
  const hour = now.getHours();
  if (slot === "Morning" && hour >= SAME_DAY_MORNING_CUTOFF_HOUR) return false;
  if (slot === "Evening" && hour >= SAME_DAY_EVENING_CUTOFF_HOUR) return false;
  return true;
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
  if (candidate.getTime() > Date.now()) {
    return candidate.toISOString();
  }
  // Same-day booking: keep today when the picked slot is still offered
  // (9 AM / 3 PM cut-offs); clamp to now + 30 min when the slot hour passed
  // within an open window (e.g. Evening picked at 2:30 PM).
  if (isToday(dateYYYYMMDD) && isSlotAvailableToday(slot)) {
    return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }
  // If the slotted time already passed today, push to tomorrow same slot.
  candidate.setDate(candidate.getDate() + 1);
  return candidate.toISOString();
}

interface TimeSlotPickerProps {
  service: string | null;
  date?: string;
  value: string;
  onChange: (slot: SlotKey) => void;
}

export function TimeSlotPicker({ service, date = "", value, onChange }: TimeSlotPickerProps) {
  const available = getAvailableSlotKeys(service, date);
  const slots = (service === "videography" ? VIDEOGRAPHY_SLOTS : STANDARD_SLOTS).filter((s) =>
    available.includes(s.key as SlotKey),
  );
  if (slots.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-foreground text-sm font-medium">Time Slot</span>
        <p className="border-destructive/30 bg-destructive/10 text-foreground rounded-xl border p-3 text-sm font-medium">
          No slots available today, please select a different date
        </p>
      </div>
    );
  }
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
                "group border-border bg-card flex flex-col items-start gap-1 rounded-3xl border p-6 text-left shadow-2xl backdrop-blur-md transition-all duration-300",
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

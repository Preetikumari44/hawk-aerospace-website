import { cn } from "@/lib/utils";

import type { BookingStatus } from "../../lib/booking/types";

const STEPS: { key: BookingStatus; label: string }[] = [
  { key: "pending", label: "Awaiting Approval" },
  { key: "confirmed", label: "Booking Confirmed" },
  { key: "pilot-assigned", label: "Pilot Assigned" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const STATUS_ORDER: BookingStatus[] = [
  "pending",
  "confirmed",
  "pilot-assigned",
  "in-progress",
  "completed",
];

export function BookingStatusTimeline({ status }: { status: BookingStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="flex w-full items-start justify-between gap-1">
      {STEPS.map((step, i) => {
        // Map the 5 display steps onto the underlying status order, treating
        // "Deployment" and "In Progress" as the same status stage split visually.
        const stepStatusIndex = Math.min(i, STATUS_ORDER.length - 1);
        const done = currentIndex >= stepStatusIndex && status !== "cancelled";
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full border transition-colors",
                  done ? "bg-brand border-brand" : "border-border bg-transparent",
                )}
              />
              {!isLast && (
                <span
                  className={cn(
                    "mx-1 h-px flex-1 transition-colors",
                    done ? "bg-brand/60" : "bg-border",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-center text-[10px] leading-tight font-medium tracking-[0.04em] uppercase",
                done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

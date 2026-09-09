"use client";

import { motion } from "framer-motion";

import { SERVICE_CATALOG } from "@/lib/booking/data";
import { SERVICE_ICONS } from "@/lib/booking/service-icons";
import type { ServiceKey } from "@/lib/booking/types";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ServiceSelectorProps {
  value: ServiceKey | null;
  onChange: (key: ServiceKey) => void;
}

// Horizontal "Choose Service" cards — large rounded-square icon, selected
// card gets a Hawk-blue filled background, label below. Mirrors the
// reference mobile screenshots' behavior (horizontally scrollable, smooth
// selection state) but in the existing dark Hawk Aerospace theme instead of
// their light one.
export function ServiceSelector({ value, onChange }: ServiceSelectorProps) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-2.5">
      <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">
        Choose Service
      </span>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {SERVICE_CATALOG.map((service) => {
          const selected = value === service.key;
          const Icon = SERVICE_ICONS[service.key];
          return (
            <button
              key={service.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(service.key)}
              className="group flex shrink-0 flex-col items-center gap-2 focus-visible:outline-hidden"
            >
              <span
                className={cn(
                  "flex size-16 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ease-out",
                  selected
                    ? "border-brand bg-brand text-brand-foreground shadow-[0_0_0_1px_var(--brand),0_0_24px_-4px_var(--brand)]"
                    : "border-border/60 bg-background/60 text-muted-foreground group-hover:border-brand/40 group-hover:text-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={selected ? 2.25 : 1.75} />
              </span>
              <span
                className={cn(
                  "text-xs font-semibold transition-colors duration-200",
                  selected ? "text-brand" : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {service.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

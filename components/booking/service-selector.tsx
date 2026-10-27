"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { SERVICE_CATALOG } from "@/lib/booking/data";
import { SERVICE_ICONS } from "@/lib/booking/service-icons";
import type { ServiceKey } from "@/lib/booking/types";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ServiceSelectorProps {
  value: ServiceKey | null;
  onChange: (key: ServiceKey) => void;
}

// Soft, light per-service palette for the "Choose Service" grid — each tone
// stays pastel/desaturated by design (never neon), matching the light glass
// hero composition. Same four services, same SERVICE_ICONS glyphs, same
// onChange contract as before; only the container's color treatment and
// grid layout changed (4-in-a-row on desktop, 2x2 on mobile, no horizontal
// scroll).
const SERVICE_TONES: Record<ServiceKey, { bg: string; border: string; icon: string; ring: string }> = {
  videography: { bg: "#e6f4ea", border: "#cfe8d6", icon: "#1f7a43", ring: "#3fa866" },
  spraying: { bg: "#e8f0fb", border: "#d2e2f6", icon: "#2f6feb", ring: "#5b8ff2" },
  mapping: { bg: "#fbf3e0", border: "#f3e3bd", icon: "#b3821b", ring: "#c99a2e" },
  surveillance: { bg: "#f2ecfa", border: "#e2d4f4", icon: "#7c3aed", ring: "#9a63f0" },
};

export function ServiceSelector({ value, onChange }: ServiceSelectorProps) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-3">
      <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">
        Choose Service
      </span>
      <div role="radiogroup" aria-label="Choose service" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SERVICE_CATALOG.map((service) => {
          const selected = value === service.key;
          const Icon = SERVICE_ICONS[service.key];
          const tone = SERVICE_TONES[service.key];
          const cardStyle: React.CSSProperties = {
            backgroundColor: tone.bg,
            borderColor: selected ? tone.ring : tone.border,
            ...(selected ? ({ "--tw-ring-color": tone.ring } as React.CSSProperties) : {}),
          };
          return (
            <button
              key={service.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(service.key)}
              style={cardStyle}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-hidden",
                selected && "shadow-md ring-2 ring-offset-2 ring-offset-transparent",
              )}
            >
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                style={{ color: tone.icon }}
              >
                <Icon className="size-8" strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-semibold text-[#263442]">{service.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

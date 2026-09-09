"use client";

import { motion } from "framer-motion";
import { RadarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG } from "@/lib/booking/data";
import type { BookingDraft, ServiceKey } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";

import { ServiceSelector } from "./service-selector";
import { SubServiceSelect } from "./sub-service-select";

interface BookingFormProps {
  draft: BookingDraft;
  onChange: (draft: BookingDraft) => void;
  onSubmit: () => void;
  isSubmitDisabled: boolean;
}

const inputClass =
  "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1";

export function BookingForm({ draft, onChange, onSubmit, isSubmitDisabled }: BookingFormProps) {
  function set<K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  // Selecting a new main service always resets the sub-service so a stale
  // choice from a different service can never be submitted.
  function selectService(key: ServiceKey) {
    onChange({ ...draft, service: key, subService: null });
  }

  const activeService = SERVICE_CATALOG.find((s) => s.key === draft.service) ?? null;

  const isComplete =
    !!draft.service &&
    !!draft.subService &&
    draft.location.trim() !== "" &&
    !!draft.date &&
    !!draft.time;
  const disabled = isSubmitDisabled || !isComplete;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <motion.div
      variants={stagger(0.06)}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <ServiceSelector value={draft.service} onChange={selectService} />

      <SubServiceSelect
        heading={activeService?.subServiceHeading ?? "Select Sub-Service"}
        placeholder={activeService?.subServicePlaceholder ?? "Select a service first"}
        options={activeService?.subServices ?? []}
        value={draft.subService}
        onChange={(key) => set("subService", key)}
        disabled={!activeService}
      />

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <label htmlFor="booking-location" className="text-foreground text-sm font-medium">
          Project / Site Location
        </label>
        <input
          id="booking-location"
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g. Whitefield, Bengaluru"
          className={inputClass}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="booking-date" className="text-foreground text-sm font-medium">
            Date
          </label>
          <input
            id="booking-date"
            type="date"
            min={today}
            value={draft.date}
            onChange={(e) => set("date", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="booking-time" className="text-foreground text-sm font-medium">
            Time
          </label>
          <input
            id="booking-time"
            type="time"
            value={draft.time}
            onChange={(e) => set("time", e.target.value)}
            className={inputClass}
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <Button size="lg" onClick={onSubmit} disabled={disabled} className="w-full">
          <RadarIcon className="size-4" />
          Find Available Operators
        </Button>
        {!isComplete && (
          <p className="text-muted-foreground text-center text-xs">
            Select a service, sub-service, location, date and time to continue.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RadarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG } from "@/lib/booking/data";
import type { BookingDraft, ServiceKey } from "@/lib/booking/types";
import { fadeUp } from "@/lib/motion";

import { ServiceSelector } from "./service-selector";
import { SubServiceSelect } from "./sub-service-select";

interface BookingFormProps {
  draft: BookingDraft;
  onChange: (draft: BookingDraft) => void;
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  /** Validation message shown under the Project / Site Location field. */
  locationError?: string | null;
  /** Neutral hint, e.g. when only a broader area of the address matched. */
  locationNote?: string | null;
  /** True while the field holds the auto-filled current location (not user
   * input): the text is pre-selected on focus so typing replaces it. */
  locationIsDefault?: boolean;
  /** True while the person is entering/selecting the Project Site location
   * (field focused or being edited); false once it is confirmed (Enter /
   * leaving the field) or the booking moves on. Drives which location view
   * the page shows: Project Site map while true, Raider System otherwise. */
  onLocationEditingChange?: (editing: boolean) => void;
}

const EMPTY_SERVICE_FIELDS: BookingDraft = { service: null, subService: null, location: "", date: "", time: "" };

const inputClass =
  "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1";

// Fields reveal one at a time as each prior selection is completed — no
// step counter, numbered stepper, or "Step X of Y" label anywhere. The
// sequencing itself lives entirely in this component's read of `draft`;
// callers just see a normal, growing form.
export function BookingForm({
  draft,
  onChange,
  onSubmit,
  isSubmitDisabled,
  locationError = null,
  locationNote = null,
  locationIsDefault = false,
  onLocationEditingChange,
}: BookingFormProps) {
  function set<K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  // Selecting a new main service always resets the sub-service so a stale
  // choice from a different service can never be submitted.
  function selectService(key: ServiceKey) {
    // A new service is a brand-new booking: nothing from the previous
    // service (sub-service, site, date, time) carries over.
    onChange({ ...EMPTY_SERVICE_FIELDS, service: key });
  }

  const activeService = SERVICE_CATALOG.find((s) => s.key === draft.service) ?? null;

  const hasService = !!draft.service;
  const hasSubService = !!draft.subService;
  const hasLocation = draft.location.trim() !== "";
  const hasDate = !!draft.date;
  const hasTime = !!draft.time;

  const isComplete = hasService && hasSubService && hasLocation && hasDate && hasTime;
  const disabled = isSubmitDisabled || !isComplete;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <ServiceSelector value={draft.service} onChange={selectService} />

      <AnimatePresence initial={false}>
        {hasService && (
          <motion.div
            key="sub-service"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0 }}
          >
            <SubServiceSelect
              heading={activeService?.subServiceHeading ?? "Select Sub-Service"}
              placeholder={activeService?.subServicePlaceholder ?? "Select a service first"}
              options={activeService?.subServices ?? []}
              value={draft.subService}
              onChange={(key) => set("subService", key)}
              disabled={!activeService}
            />
          </motion.div>
        )}

        {hasService && hasSubService && (
          <motion.div
            key="location"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="booking-location" className="text-foreground text-sm font-medium">
              Project / Site Location
            </label>
            <input
              id="booking-location"
              value={draft.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Whitefield, Bengaluru"
              className={inputClass}
              autoFocus
              autoComplete="off"
              onFocus={(e) => {
                if (locationIsDefault) e.currentTarget.select();
                onLocationEditingChange?.(true);
              }}
              onBlur={() => onLocationEditingChange?.(false)}
              onKeyDown={(e) => {
                // Enter confirms the Project Site: hand control back to the Raider System.
                if (e.key === "Enter") {
                  e.preventDefault();
                  onLocationEditingChange?.(false);
                  e.currentTarget.blur();
                }
              }}
              aria-invalid={locationError ? true : undefined}
              aria-describedby={locationError ? "booking-location-error" : undefined}
            />
            {!locationError && locationNote && (
              <p role="status" className="text-muted-foreground text-xs">
                {locationNote}
              </p>
            )}
            {locationError && (
              <p id="booking-location-error" role="status" className="text-destructive text-xs">
                {locationError}
              </p>
            )}
          </motion.div>
        )}

        {hasService && hasSubService && hasLocation && (
          <motion.div
            key="date-time"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-3"
          >
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
        )}

        {isComplete && (
          <motion.div
            key="submit"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2"
          >
            <Button size="lg" onClick={onSubmit} disabled={disabled} className="w-full">
              <RadarIcon className="size-4" />
              Find Available Operators
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

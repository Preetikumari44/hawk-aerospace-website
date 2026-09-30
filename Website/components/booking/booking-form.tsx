"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { mapsApi } from "@/lib/booking/api-client";
import { SERVICE_CATALOG } from "@/lib/booking/data";
import type { BookingDraft, ServiceKey } from "@/lib/booking/types";
import { fadeUp } from "@/lib/motion";

import { AddressFields } from "./address-fields";
import {
  type LocationSuggestion,
  LocationSuggestions,
} from "./location-suggestions";
import { ServiceSelector } from "./service-selector";
import { SubServiceSelect } from "./sub-service-select";
import { type SlotKey,TimeSlotPicker, toPreferredTimeSlot } from "./time-slot-picker";

interface BookingFormProps {
  draft: BookingDraft;
  onChange: (draft: BookingDraft) => void;
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  /** Browser/operational center used to bias autocomplete results. */
  center?: { latitude: number | null; longitude: number | null } | null;
}

const inputClass =
  "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1";

async function nominatimFallback(query: string): Promise<LocationSuggestion[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      place_id?: number;
    }>;
    return results.slice(0, 4).map((r) => ({
      label: r.display_name,
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      placeId: r.place_id != null ? String(r.place_id) : undefined,
    }));
  } catch {
    return [];
  }
}

// Fields reveal one at a time as each prior selection is completed — no
// step counter, numbered stepper, or "Step X of Y" label anywhere. The
// sequencing itself lives entirely in this component's read of `draft`;
// callers just see a normal, growing form.
export function BookingForm({ draft, onChange, onSubmit, isSubmitDisabled, center }: BookingFormProps) {
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = React.useState(false);
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debounceRef = React.useRef<number | null>(null);
  const requestIdRef = React.useRef(0);

  function set<K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  // Selecting a new main service always resets the sub-service so a stale
  // choice from a different service can never be submitted.
  function selectService(key: ServiceKey) {
    onChange({ ...draft, service: key, subService: null });
  }

  const activeService = SERVICE_CATALOG.find((s) => s.key === draft.service) ?? null;

  const hasService = !!draft.service;
  const hasSubService = !!draft.subService;
  const hasLocation = draft.location.trim() !== "";
  const hasDate = !!draft.date;
  const hasTime = !!draft.time;

  const isComplete = hasService && hasSubService && hasLocation && hasDate && hasTime;
  void isComplete;
  void isSubmitDisabled;
  const today = new Date().toISOString().slice(0, 10);
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const fetchSuggestions = React.useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setSuggestLoading(false);
        return;
      }
      setSuggestLoading(true);
      const requestId = ++requestIdRef.current;
      const lat = center?.latitude;
      const lng = center?.longitude;
      void (async () => {
        let results: LocationSuggestion[] = [];
        try {
          results = await mapsApi.autocomplete(trimmed, {
            ...(lat != null && lng != null
              ? { latitude: lat, longitude: lng, radiusKm: 100 }
              : {}),
          });
        } catch {
          results = [];
        }
        // Keyless fallback so hints still work before the backend maps key ships.
        if (results.length === 0) results = await nominatimFallback(trimmed);
        if (requestIdRef.current !== requestId) return;
        setSuggestions(results.slice(0, 4));
        setActiveIndex(0);
        setSuggestLoading(false);
      })();
    },
    [center],
  );

  function handleLocationChange(value: string) {
    onChange({ ...draft, location: value, coordinates: null });
    setSuggestOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(value), 300);
  }

  function handleSelectSuggestion(s: LocationSuggestion) {
    onChange({
      ...draft,
      location: s.label,
      coordinates:
        s.latitude != null && s.longitude != null
          ? { lat: s.latitude, lng: s.longitude }
          : draft.coordinates,
    });
    setSuggestOpen(false);
    setSuggestions([]);
  }

  function handleLocationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestOpen || (suggestions.length === 0 && !suggestLoading)) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = suggestions[activeIndex];
      if (picked) handleSelectSuggestion(picked);
    } else if (e.key === "Escape") {
      setSuggestOpen(false);
    }
  }

  React.useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    [],
  );

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
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => {
                if (draft.location.trim().length >= 2) {
                  setSuggestOpen(true);
                  fetchSuggestions(draft.location);
                }
              }}
              onBlur={() => {
                // Closed on a tick so suggestion mousedown selects first.
                window.setTimeout(() => setSuggestOpen(false), 120);
              }}
              onKeyDown={handleLocationKeyDown}
              placeholder="e.g. Whitefield, Bengaluru"
              className={inputClass}
              autoComplete="off"
            />
            <LocationSuggestions
              suggestions={suggestions}
              loading={suggestLoading}
              open={suggestOpen && hasService && hasSubService}
              activeIndex={activeIndex}
              onSelect={handleSelectSuggestion}
              onActiveChange={setActiveIndex}
            />
          </motion.div>
        )}

        {hasService && hasSubService && hasLocation && (
          <motion.div
            key="detailed-address"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0 }}
          >
            <AddressFields value={draft.detailedAddress} onChange={(v) => set("detailedAddress", v)} />
          </motion.div>
        )}

        {hasService && hasSubService && hasLocation && (
          <motion.div
            key="date-time"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="booking-date" className="text-foreground text-sm font-medium">
                Date
              </label>
              <input
                id="booking-date"
                type="date"
                min={today}
                max={maxDate}
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
                className={inputClass}
              />
              <p className="text-muted-foreground text-[11px]">
                Bookings can be scheduled within the next 7 days.
              </p>
            </div>
            <TimeSlotPicker
              service={draft.service}
              value={draft.time}
              onChange={(slot: SlotKey) =>
                onChange({ ...draft, time: slot, preferredTimeSlot: toPreferredTimeSlot(slot) })
              }
            />
          </motion.div>
        )}

        {/* {isComplete && (
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
        )} */}
        {/* NOTE: "Find available operators" + operator suggestions temporarily
            disabled — will be reused later. Booking now continues directly
            service page → payment → checks → confirmation. */}
      </AnimatePresence>
    </div>
  );
}

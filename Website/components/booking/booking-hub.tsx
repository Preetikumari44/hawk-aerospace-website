"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import * as React from "react";

import { pilotsApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { generateOperators, SERVICE_CATALOG } from "@/lib/booking/data";
import { geocodeLocation } from "@/lib/booking/geocode";
import { useUserLocation } from "@/lib/booking/location";
import {
  saveBookingIntent,
  saveBookingResumeState,
  takeBookingResumeState,
} from "@/lib/booking/resume";
import type { Booking, BookingDraft, OperationalCenter, Operator } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { Reveal } from "../ui/reveal";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingForm } from "./booking-form";
import { BookingSummary } from "./booking-summary";
import { PriceEstimate, usePriceEstimate } from "./price-estimate";
import { RaiderSystem } from "./raider-system";

type Stage = "form" | "scanning" | "dispatch" | "confirmed";

const EMPTY_DRAFT: BookingDraft = {
  service: null,
  subService: null,
  crop: null,
  infraType: null,
  areaValue: 1,
  areaUnit: "acre",
  instructions: "",
  location: "",
  coordinates: null,
  detailedAddress: { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" },
  date: "",
  time: "",
  preferredTimeSlot: null,
};

export function BookingHub() {
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const location = useUserLocation();
  const router = useRouter();

  const [draft, setDraft] = React.useState<BookingDraft>(EMPTY_DRAFT);
  const [stage, setStage] = React.useState<Stage>("form");
  const [operators, setOperators] = React.useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = React.useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = React.useState<Booking | null>(null);
  const [priceEstimate, setPriceEstimate] = React.useState<Record<string, unknown> | null>(null);
  // Coordinates resolved for a manually-typed location (best effort), so the
  // map can still center on it even without browser geolocation.
  const [geocoded, setGeocoded] = React.useState<{ query: string; lat: number; lng: number } | null>(
    null,
  );

  // Restore an in-progress booking (service/sub-service/location/date/slot +
  // the last scan's operators and selection) after a round trip through the
  // dedicated /login page — see lib/booking/resume.ts. Runs once on mount.
  React.useEffect(() => {
    const resumed = takeBookingResumeState();
    if (!resumed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from sessionStorage after a real route change (see BookingAuthProvider for the same pattern); there is no way to pass this back except through storage.
    setDraft(resumed.draft);
    setOperators(resumed.operators);
    setSelectedOperatorId(resumed.selectedOperatorId);
    setStage(resumed.operators.length > 0 ? "dispatch" : "form");
    if (resumed.priceEstimate) setPriceEstimate(resumed.priceEstimate);
    // Land directly on the booking panel with the guest-filled details intact.
    window.setTimeout(() => {
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const service = SERVICE_CATALOG.find((s) => s.key === draft.service) ?? null;
  const subService = service?.subServices.find((s) => s.key === draft.subService) ?? null;
  const selectedOperator = operators.find((o) => o.id === selectedOperatorId) ?? null;
  // Only "available" units are dispatchable — "busy" ones exist purely as
  // ambient context on the map (see lib/booking/data.ts).
  const availableOperators = operators.filter((o) => o.status === "available");

  // Manual project location always overrides browser location for the
  // operational center. Autofill the field once from a resolved browser
  // location, but never stomp on something the user has typed.
  React.useEffect(() => {
    if (
      location.status === "granted" &&
      location.center &&
      location.center.label !== "Locating…" &&
      !draft.location.trim()
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the form field from an external, user-initiated browser API result (see BookingAuthProvider for the same pattern).
      setDraft((d) => (d.location.trim() ? d : { ...d, location: location.center!.label }));
    }
  }, [location.status, location.center, draft.location]);

  // Best-effort forward geocoding for a manually-typed location so the real
  // India map has coordinates to center on, even when it doesn't match the
  // resolved browser location. Debounced; failures are silent (map just
  // stays on the last known center / India overview).
  React.useEffect(() => {
    const query = draft.location.trim();
    if (!query || query === location.center?.label || draft.coordinates) return;

    const handle = window.setTimeout(() => {
      geocodeLocation(query).then((result) => {
        if (!result) return;
        setGeocoded({ query, lat: result.latitude, lng: result.longitude });
        setDraft((d) =>
          d.location.trim() === query && !d.coordinates
            ? { ...d, coordinates: { lat: result.latitude, lng: result.longitude } }
            : d,
        );
      });
    }, 600);

    return () => window.clearTimeout(handle);
  }, [draft.location, draft.coordinates, location.center?.label]);

  const operationalCenter: OperationalCenter | null = draft.location.trim()
    ? {
        label: draft.location.trim(),
        latitude:
          draft.coordinates?.lat ??
          (location.center && location.center.label === draft.location.trim()
            ? location.center.latitude
            : geocoded && geocoded.query === draft.location.trim()
              ? geocoded.lat
              : null),
        longitude:
          draft.coordinates?.lng ??
          (location.center && location.center.label === draft.location.trim()
            ? location.center.longitude
            : geocoded && geocoded.query === draft.location.trim()
              ? geocoded.lng
              : null),
        source:
          location.center && location.center.label === draft.location.trim() ? "browser" : "manual",
      }
    : location.status === "granted" && location.center && location.center.label !== "Locating…"
      ? location.center
      : null;

  // Estimated cost once a time slot is picked (live, catalog-driven).
  // `priceEstimate` holds the resumed snapshot after a login round-trip;
  // the live estimate takes over as soon as it arrives.
  const hubSub = service?.subServices.find((s) => s.key === draft.subService) ?? null;
  const { estimate: liveEstimate, loading: priceLoading } = usePriceEstimate(
    hubSub?.estimateServiceType ?? draft.service,
    draft.date,
    draft.time,
    operationalCenter?.latitude ?? null,
    operationalCenter?.longitude ?? null,
    {
      catalogKey: hubSub?.estimateKey ?? hubSub?.detailsValue ?? null,
      unit: draft.service === "spraying" || draft.service === "mapping" ? "per_acre" : undefined,
      quantity: draft.areaValue ?? 1,
    },
  );
  const effectiveEstimate =
    (liveEstimate as Record<string, unknown> | null) ?? priceEstimate;

  function handleFindOperators() {
    if (!draft.service || !draft.subService) return;
    setStage("scanning");
    setSelectedOperatorId(null);
    const center =
      operationalCenter?.latitude != null && operationalCenter?.longitude != null
        ? { latitude: operationalCenter.latitude, longitude: operationalCenter.longitude }
        : null;

    const finish = (found: Operator[]) => {
      // Nearest 3 only — pilot pick stays optional (FM assigns after approval).
      setOperators(found.slice(0, 3));
      setStage("dispatch");
    };

    // Brief scan delay for the sweep-to-results reveal. Visual only.
    window.setTimeout(() => {
      if (!center) {
        finish(generateOperators(4, null, draft.service));
        return;
      }
      pilotsApi
        .nearbyPilots({
          latitude: center.latitude,
          longitude: center.longitude,
          serviceType: draft.service ?? undefined,
          limit: 3,
        })
        .then((pilots) => {
          if (pilots.length === 0) {
            finish(generateOperators(4, center, draft.service));
            return;
          }
          const mapped: Operator[] = pilots.slice(0, 3).map((p, i) => {
            const miles =
              p.distanceMiles ?? (p.distanceKm != null ? p.distanceKm * 0.621371 : 4 + i * 3);
            return {
              id: p.pilotUid ?? p.id ?? `pilot-${i}`,
              name: p.name,
              callsign: `PILOT-${String(i + 1).padStart(2, "0")}`,
              estimatedTakeoffMinutes: 14 + i * 4,
              distanceMiles: Math.round(miles * 10) / 10,
              status: "available" as const,
              battery: 80,
              capabilities: draft.service ? [draft.service] : [],
              vendorId: "backend",
              suitabilityScore: 90 - i * 10,
              ...(p.latitude != null && p.longitude != null
                ? { latitude: p.latitude, longitude: p.longitude }
                : {}),
            };
          });
          finish(mapped);
        })
        .catch(() => {
          // New backend endpoint not deployed yet — demo fallback, capped at 3.
          finish(generateOperators(4, center, draft.service));
        });
    }, 1100);
  }

  function handleConfirm() {
    const snapshot = {
      draft,
      operators,
      selectedOperatorId,
      priceEstimate: effectiveEstimate,
    };
    if (!isAuthenticated) {
      // Login is a dedicated page, so this component unmounts on the way
      // there — persist the draft/scan/selection first so the booking is
      // waiting, filled in, when the user lands back on "/#booking".
      saveBookingResumeState(snapshot);
      requestLogin("/#booking");
      return;
    }
    // Authenticated → carry the intent into the payment selection page,
    // which creates the real backend booking.
    saveBookingIntent(snapshot);
    router.push("/booking/payment");
  }

  function handleNewBooking() {
    setDraft(EMPTY_DRAFT);
    setStage("form");
    setOperators([]);
    setSelectedOperatorId(null);
    setConfirmedBooking(null);
    setPriceEstimate(null);
  }

  const showEstimate = !!draft.service && !!draft.date && !!draft.time;

  return (
    <section
      id="booking"
      className="border-border/60 relative overflow-hidden border-b pt-20 pb-6 sm:pt-24 lg:h-screen lg:pb-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(55% 45% at 85% 0%, color-mix(in srgb, var(--route) 16%, transparent), transparent 70%)",
        }}
      />

      <div className="max-w-container mx-auto flex h-full flex-col gap-4 px-4 lg:gap-5">
        <Reveal>
          <span className="eyebrow">Book a Raider</span>
        </Reveal>

        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          animate="show"
          className={cn(
            "grid flex-1 grid-cols-1 gap-5 lg:min-h-0 lg:grid-cols-[34fr_66fr]",
            stage === "confirmed" && "lg:grid-cols-1",
          )}
        >
          <motion.div
            variants={fadeUp}
            className="border-border/60 glass-2 flex flex-col rounded-2xl border p-5 sm:p-6 lg:h-full lg:overflow-y-auto lg:p-6"
          >
            {stage === "confirmed" && confirmedBooking ? (
              <div className="mx-auto w-full max-w-lg">
                <BookingConfirmation
                  booking={confirmedBooking}
                  onViewBookings={() => {
                    window.location.href = "/my-bookings";
                  }}
                  onNewBooking={handleNewBooking}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <BookingForm
                  draft={draft}
                  onChange={setDraft}
                  onSubmit={handleFindOperators}
                  isSubmitDisabled={!draft.service || !draft.subService || stage === "scanning"}
                  center={
                    operationalCenter?.latitude != null && operationalCenter?.longitude != null
                      ? {
                          latitude: operationalCenter.latitude,
                          longitude: operationalCenter.longitude,
                        }
                      : null
                  }
                />

                {showEstimate && stage === "form" && (
                  <PriceEstimate
                    serviceType={hubSub?.estimateServiceType ?? draft.service}
                    catalogKey={hubSub?.estimateKey ?? hubSub?.detailsValue ?? null}
                    unit={draft.service === "spraying" || draft.service === "mapping" ? "per_acre" : undefined}
                    quantity={draft.areaValue ?? 1}
                    date={draft.date}
                    slot={draft.time}
                    latitude={operationalCenter?.latitude ?? null}
                    longitude={operationalCenter?.longitude ?? null}
                    onEstimate={(e) =>
                      setPriceEstimate((e as Record<string, unknown> | null) ?? null)
                    }
                  />
                )}

                {/* Temporarily disabled — operator suggestions will be reused later.
                {stage === "dispatch" && service && availableOperators.length > 0 && (
                  <div className="border-border/50 border-t pt-5">
                    <DispatchPanel
                      operators={availableOperators}
                      selectedOperatorId={selectedOperatorId}
                      onSelectOperator={(id) => setSelectedOperatorId(id || null)}
                    />
                  </div>
                )} */}

                {stage === "dispatch" && service && availableOperators.length === 0 && (
                  <div className="border-border/50 border-t pt-5 text-center">
                    <p className="text-foreground text-sm font-semibold">No Raiders Found</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Try another time, location or service.
                    </p>
                  </div>
                )}

                {stage === "dispatch" && service && subService && (
                  <div className="border-border/50 border-t pt-5">
                    <BookingSummary
                      service={service}
                      subService={subService}
                      location={draft.location}
                      date={draft.date}
                      time={draft.time}
                      operator={selectedOperator}
                      priceEstimate={liveEstimate}
                      priceLoading={priceLoading}
                      isAuthenticated={isAuthenticated}
                      onConfirm={handleConfirm}
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {stage !== "confirmed" && (
            <motion.div
              variants={fadeUp}
              className="border-border/60 glass-2 flex flex-col overflow-hidden rounded-2xl border lg:h-full"
            >
              <RaiderSystem
                stage={stage === "form" ? "idle" : stage === "scanning" ? "scanning" : "dispatch"}
                operators={operators}
                selectedOperatorId={selectedOperatorId}
                onSelectOperator={(id) => setSelectedOperatorId(id || null)}
                center={operationalCenter}
                locationStatus={location.status}
                locationMessage={location.message}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

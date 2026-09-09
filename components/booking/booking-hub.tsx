"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { useBookingAuth } from "@/lib/booking/auth-context";
import { generateOperators, SERVICE_CATALOG } from "@/lib/booking/data";
import { geocodeLocation } from "@/lib/booking/geocode";
import { useUserLocation } from "@/lib/booking/location";
import { getBookingDispatchDetails } from "@/lib/booking/operations";
import { saveBookingResumeState, takeBookingResumeState } from "@/lib/booking/resume";
import { generateBookingId, saveBooking } from "@/lib/booking/store";
import type { Booking, BookingDraft, OperationalCenter, Operator } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { Reveal } from "../ui/reveal";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingForm } from "./booking-form";
import { BookingSummary } from "./booking-summary";
import { DispatchPanel } from "./dispatch-panel";
import { RaiderSystem } from "./raider-system";

type Stage = "form" | "scanning" | "dispatch" | "confirmed";

const EMPTY_DRAFT: BookingDraft = { service: null, subService: null, location: "", date: "", time: "" };

export function BookingHub() {
  const { user, isAuthenticated, requestLogin } = useBookingAuth();
  const location = useUserLocation();

  const [draft, setDraft] = React.useState<BookingDraft>(EMPTY_DRAFT);
  const [stage, setStage] = React.useState<Stage>("form");
  const [operators, setOperators] = React.useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = React.useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = React.useState<Booking | null>(null);
  // Coordinates resolved for a manually-typed location (best effort), so the
  // map can still center on it even without browser geolocation.
  const [geocoded, setGeocoded] = React.useState<{ query: string; lat: number; lng: number } | null>(
    null,
  );

  // Restore an in-progress booking (service/sub-service/location/date/time +
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
    if (!query || query === location.center?.label) return;

    const handle = window.setTimeout(() => {
      geocodeLocation(query).then((result) => {
        if (!result) return;
        setGeocoded({ query, lat: result.latitude, lng: result.longitude });
      });
    }, 600);

    return () => window.clearTimeout(handle);
  }, [draft.location, location.center?.label]);

  const operationalCenter: OperationalCenter | null = draft.location.trim()
    ? {
        label: draft.location.trim(),
        latitude:
          location.center && location.center.label === draft.location.trim()
            ? location.center.latitude
            : geocoded && geocoded.query === draft.location.trim()
              ? geocoded.lat
              : null,
        longitude:
          location.center && location.center.label === draft.location.trim()
            ? location.center.longitude
            : geocoded && geocoded.query === draft.location.trim()
              ? geocoded.lng
              : null,
        source:
          location.center && location.center.label === draft.location.trim() ? "browser" : "manual",
      }
    : location.status === "granted" && location.center && location.center.label !== "Locating…"
      ? location.center
      : null;

  function handleFindOperators() {
    if (!draft.service || !draft.subService) return;
    setStage("scanning");
    setSelectedOperatorId(null);
    // Brief scan delay for the sweep-to-results reveal. Purely visual —
    // the operators below are demo/mock data, not a real dispatch lookup.
    window.setTimeout(() => {
      const found = generateOperators(
        4,
        operationalCenter?.latitude != null && operationalCenter?.longitude != null
          ? { latitude: operationalCenter.latitude, longitude: operationalCenter.longitude }
          : null,
      );
      setOperators(found);
      setStage("dispatch");
    }, 1100);
  }

  function proceedToConfirm() {
    if (!service || !subService || !selectedOperator) return;
    const bookingId = generateBookingId();
    const dispatch = getBookingDispatchDetails(bookingId);
    const booking: Booking = {
      id: bookingId,
      userId: user!.id,
      service: service.key,
      serviceLabel: service.label,
      subService: subService.key,
      subServiceLabel: subService.label,
      location: draft.location || "Selected project site",
      date: draft.date,
      time: draft.time,
      operatorId: selectedOperator.id,
      operatorName: selectedOperator.name,
      estimatedTakeoffMinutes: selectedOperator.estimatedTakeoffMinutes,
      droneId: dispatch.droneId,
      // Every new booking starts pending admin approval — never pretend it's
      // immediately confirmed. See booking-confirmation.tsx / the documented
      // "Awaiting Admin Approval" payment rule.
      status: "pending",
      paymentAvailable: false,
      createdAt: new Date().toISOString(),
    };
    saveBooking(booking);
    setConfirmedBooking(booking);
    setStage("confirmed");
  }

  function handleConfirm() {
    if (!isAuthenticated) {
      // Login is a dedicated page, so this component unmounts on the way
      // there — persist the draft/scan/selection first so the booking is
      // waiting, filled in, when the user lands back on "/".
      saveBookingResumeState({ draft, operators, selectedOperatorId });
      requestLogin("/");
      return;
    }
    proceedToConfirm();
  }

  function handleNewBooking() {
    setDraft(EMPTY_DRAFT);
    setStage("form");
    setOperators([]);
    setSelectedOperatorId(null);
    setConfirmedBooking(null);
  }

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
                />

                {stage === "dispatch" && service && availableOperators.length > 0 && (
                  <div className="border-border/50 border-t pt-5">
                    <DispatchPanel
                      operators={availableOperators}
                      selectedOperatorId={selectedOperatorId}
                      onSelectOperator={setSelectedOperatorId}
                    />
                  </div>
                )}

                {stage === "dispatch" && service && availableOperators.length === 0 && (
                  <div className="border-border/50 border-t pt-5 text-center">
                    <p className="text-foreground text-sm font-semibold">No Raiders Found</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Try another time, location or service.
                    </p>
                  </div>
                )}

                {stage === "dispatch" && service && subService && selectedOperator && (
                  <div className="border-border/50 border-t pt-5">
                    <BookingSummary
                      service={service}
                      subService={subService}
                      location={draft.location}
                      date={draft.date}
                      time={draft.time}
                      operator={selectedOperator}
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
                onSelectOperator={setSelectedOperatorId}
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

"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { useBookingAuth } from "@/lib/booking/auth-context";
import { generateOperators, SERVICE_CATALOG } from "@/lib/booking/data";
import { geocodeLocation,type GeocodeResult } from "@/lib/booking/geocode";
import { useUserLocation } from "@/lib/booking/location";
import { getBookingDispatchDetails } from "@/lib/booking/operations";
import { saveBookingResumeState, takeBookingResumeState } from "@/lib/booking/resume";
import { generateBookingId, saveBooking } from "@/lib/booking/store";
import type {
  Booking,
  BookingDraft,
  OperationalCenter,
  Operator,
  ProjectSite,
} from "@/lib/booking/types";
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
  // `result: null` means the geocoder answered but found nothing.
  const [geocoded, setGeocoded] = React.useState<{
    query: string;
    result: GeocodeResult | null;
  } | null>(null);
  // Last successfully geocoded, user-entered project location. Drives Project
  // Site map mode; cleared the moment the field is emptied.
  const [projectSite, setProjectSite] = React.useState<ProjectSite | null>(null);
  // Who owns the Project / Site Location field's current value:
  //  - "auto": we pre-filled it from the browser's current location (the
  //    Raider System's default). It is NOT a project location, so it never
  //    switches the panel out of the Raider System.
  //  - "user": the person has typed/edited/cleared it. From that moment the
  //    user's text has absolute priority and is never overwritten.
  // Comparing text to the autofilled label is deliberately avoided: it made a
  // user-typed "Bengaluru" indistinguishable from the default.
  const [locationSource, setLocationSource] = React.useState<"auto" | "user">("auto");
  // The current-location prefill happens at most once per booking, so
  // emptying the field can never bring the default back.
  const autofillDoneRef = React.useRef(false);
  // Which location view is on screen is driven purely by the booking step,
  // never by the service: true only while the person is entering/selecting
  // the Project Site location, false everywhere else (service, date, time,
  // next service, after the site is confirmed).
  const [pickingProjectSite, setPickingProjectSite] = React.useState(false);

  // Restore an in-progress booking (service/sub-service/location/date/time +
  // the last scan's operators and selection) after a round trip through the
  // dedicated /login page — see lib/booking/resume.ts. Runs once on mount.
  React.useEffect(() => {
    const resumed = takeBookingResumeState();
    if (!resumed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from sessionStorage after a real route change (see BookingAuthProvider for the same pattern); there is no way to pass this back except through storage.
    setDraft(resumed.draft);
    // The restored location is what the person booked with — treat it as theirs.
    autofillDoneRef.current = true;
    setLocationSource("user");
    setPickingProjectSite(false);
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

  // Pre-fill the field ONCE from the resolved browser location (the Raider
  // System's current location). It's only a starting value: the one-shot flag
  // means it is never re-applied after the user edits or clears the field, and
  // it is never applied over anything the user has typed.
  React.useEffect(() => {
    if (autofillDoneRef.current) return;
    if (
      location.status === "granted" &&
      location.center &&
      location.center.label !== "Locating…" &&
      !draft.location.trim() &&
      locationSource === "auto"
    ) {
      autofillDoneRef.current = true;
      const label = location.center.label;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill from an external, user-initiated browser API result.
      setDraft((d) => (d.location.trim() ? d : { ...d, location: label }));
    }
  }, [location.status, location.center, draft.location, locationSource]);

  const trimmedLocation = draft.location.trim();
  const isUserLocation = locationSource === "user" && trimmedLocation.length > 0;

  // Forward geocoding of whatever the USER typed (never the auto-filled
  // current location). Debounced and cached (lib/booking/geocode.ts). A
  // result moves the Project Site; "not found" clears it, so a wrong or stale
  // map is never left on screen.
  React.useEffect(() => {
    if (!isUserLocation || trimmedLocation.length < 3) return;

    let cancelled = false;
    const handle = window.setTimeout(() => {
      geocodeLocation(trimmedLocation).then((result) => {
        if (cancelled) return;
        setGeocoded({ query: trimmedLocation, result });
        setProjectSite(
          result
            ? {
                label: trimmedLocation,
                latitude: result.latitude,
                longitude: result.longitude,
                source: "geocoded" as const,
                boundingBox: result.boundingBox ?? null,
                placeRank: result.placeRank ?? null,
              }
            : null,
        );
      });
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [isUserLocation, trimmedLocation]);

  // Project Site mode is active only for a user-entered location that has
  // resolved. While a new query is still resolving the previous site stays up
  // (no flicker back to the radar on every keystroke); a failed lookup clears
  // it above.
  const activeProjectSite = isUserLocation ? projectSite : null;
  // Exactly one location view: the Project Site map while the site is being
  // entered/selected, otherwise the Raider System (which stays centered on the
  // confirmed site once there is one).
  const projectSiteMapSite = pickingProjectSite ? activeProjectSite : null;
  const geocodeSettled = geocoded?.query === trimmedLocation;
  const locationNote =
    isUserLocation && geocodeSettled && geocoded?.result?.matchedText
      ? `Exact address not found — showing ${geocoded.result.matchedText}.`
      : isUserLocation && trimmedLocation.length >= 3 && !geocodeSettled
        ? "Locating…"
        : null;
  const locationError =
    isUserLocation && geocodeSettled && geocoded?.result === null
      ? "Location not found. Please enter a valid address."
      : null;

  // Every edit of the field hands ownership to the user. Emptying it (or
  // shortening it below a searchable length) drops the stored site in the same
  // event so a stale pin can never reappear, and the Raider System returns.
  function handleDraftChange(next: BookingDraft) {
    const serviceChanged = next.service !== draft.service;
    // Choosing a different service starts a completely fresh booking: the map
    // closes, the Raider System returns and any earlier scan/selection is
    // dropped. Only booking fields reset — login/session are untouched.
    if (serviceChanged) {
      setPickingProjectSite(false);
      setProjectSite(null);
      setGeocoded(null);
      setStage("form");
      setOperators([]);
      setSelectedOperatorId(null);
      autofillDoneRef.current = true;
      setLocationSource("user");
    } else if (
      next.subService !== draft.subService ||
      next.date !== draft.date ||
      next.time !== draft.time
    ) {
      // Sub-service / date / time: the Project Site step is over.
      setPickingProjectSite(false);
    }
    if (next.location !== draft.location) {
      if (!serviceChanged) setPickingProjectSite(true);
      autofillDoneRef.current = true;
      setLocationSource("user");
      if (next.location.trim().length < 3) {
        setProjectSite(null);
        setGeocoded(null);
      }
    }
    setDraft(next);
  }

  // Raider System / operations center. A user-entered location uses its
  // geocoded coordinates (null until resolved); otherwise the browser's
  // current location. These two never share state.
  const geocodedForField =
    isUserLocation && geocoded && geocoded.query === trimmedLocation ? geocoded.result : null;
  const operationalCenter: OperationalCenter | null = isUserLocation
    ? {
        label: trimmedLocation,
        latitude: geocodedForField?.latitude ?? projectSite?.latitude ?? null,
        longitude: geocodedForField?.longitude ?? projectSite?.longitude ?? null,
        source: "manual",
      }
    : trimmedLocation && location.center
      ? location.center
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
        draft.service,
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
      ...(operationalCenter?.latitude != null && operationalCenter?.longitude != null
        ? { destinationLatitude: operationalCenter.latitude, destinationLongitude: operationalCenter.longitude }
        : {}),
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
    setProjectSite(null);
    setGeocoded(null);
    setLocationSource("auto");
    setPickingProjectSite(false);
    // Fresh booking: the field starts empty and the Raider System shows the
    // current location; don't re-prefill the field.
    autofillDoneRef.current = true;
  }

  return (
    <section
      id="booking"
      className="border-border relative overflow-hidden border-b pt-20 pb-6 sm:pt-24 lg:h-screen lg:pb-6"
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
        {/* Hero heading block — eyebrow / "Choose Service" / subtitle. The
            "Mapping — A Safer, Smarter Tomorrow" tagline that used to sit on
            the right has been removed per the fix spec; no replacement
            heading was added. Booking form/panels below are unchanged. */}
        <div className="flex flex-wrap items-start justify-between gap-6 pt-2">
          <Reveal>
            <div className="flex flex-col gap-2">
              <span className="text-brand flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase">
                Book a Raider
                <span className="bg-brand/70 h-px w-6" />
              </span>
              <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
                <span style={{ color: "#263442" }}>Choose </span>
                <span className="text-brand">Service</span>
              </h1>
              <p className="text-muted-foreground text-sm font-medium sm:text-base">
                Aerial intelligence for real-world impact
              </p>
            </div>
          </Reveal>

        </div>

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
            className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col rounded-3xl border p-6 sm:p-6 lg:h-full lg:overflow-y-auto lg:p-6"
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
                  onChange={handleDraftChange}
                  locationError={locationError}
                  locationNote={locationNote}
                  locationIsDefault={locationSource === "auto" && trimmedLocation !== ""}
                  onLocationEditingChange={setPickingProjectSite}
                  onSubmit={handleFindOperators}
                  isSubmitDisabled={!draft.service || !draft.subService || stage === "scanning"}
                />

                {stage === "dispatch" && service && availableOperators.length > 0 && (
                  <div className="border-border border-t pt-5">
                    <DispatchPanel
                      operators={availableOperators}
                      selectedOperatorId={selectedOperatorId}
                      onSelectOperator={setSelectedOperatorId}
                    />
                  </div>
                )}

                {stage === "dispatch" && service && availableOperators.length === 0 && (
                  <div className="border-border border-t pt-5 text-center">
                    <p className="text-foreground text-sm font-semibold">No Raiders Found</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Try another time, location or service.
                    </p>
                  </div>
                )}

                {stage === "dispatch" && service && subService && selectedOperator && (
                  <div className="border-border border-t pt-5">
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
              className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col overflow-hidden rounded-3xl border lg:h-full"
            >
              <RaiderSystem
                key={projectSiteMapSite ? "project-site-map" : "raider-system"}
                stage={stage === "form" ? "idle" : stage === "scanning" ? "scanning" : "dispatch"}
                operators={operators}
                selectedOperatorId={selectedOperatorId}
                onSelectOperator={setSelectedOperatorId}
                center={operationalCenter}
                locationStatus={location.status}
                locationMessage={location.message}
                projectSite={projectSiteMapSite}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

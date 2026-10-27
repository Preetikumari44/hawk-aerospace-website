"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, MinusIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { AddressFields } from "@/components/booking/address-fields";
import { type LocationSuggestion, LocationSuggestions } from "@/components/booking/location-suggestions";
import { PriceEstimate } from "@/components/booking/price-estimate";
import { RaiderSystem } from "@/components/booking/raider-system";
import { SubServiceSelect } from "@/components/booking/sub-service-select";
import { getAvailableSlotKeys, type SlotKey, TimeSlotPicker, toPreferredTimeSlot } from "@/components/booking/time-slot-picker";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { mapsApi, getAuthToken } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import {
  AREA_UNITS,
  MAPPING_INFRA_TYPES,
  SERVICE_CATALOG,
  SPRAYING_CROPS,
  SURVEILLANCE_QUANTITY_META,
  VIDEO_QUANTITY_META,
} from "@/lib/booking/data";
import { geocodeLocation } from "@/lib/booking/geocode";
import { useUserLocation } from "@/lib/booking/location";
import { buildPricingInput } from "@/lib/booking/pricing-units";
import { saveBookingIntent, saveBookingResumeState, takeBookingResumeState } from "@/lib/booking/resume";
import type { BookingDraft, ServiceKey } from "@/lib/booking/types";
import { fadeUp } from "@/lib/motion";

const inputClass =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

const VALID: ServiceKey[] = ["videography", "spraying", "mapping", "surveillance"];

async function nominatimFallback(query: string): Promise<LocationSuggestion[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; place_id?: number }>;
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

export default function ServiceBookingPage() {
  const params = useParams<{ service: string }>();
  const router = useRouter();
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const location = useUserLocation();
  const raw = (params?.service ?? "").toLowerCase();
  const serviceKey: ServiceKey | null = (VALID as string[]).includes(raw) ? (raw as ServiceKey) : null;
  const service = SERVICE_CATALOG.find((s) => s.key === serviceKey) ?? null;

  const [draft, setDraft] = React.useState<BookingDraft>({
    service: serviceKey,
    subService: null,
    crop: null,
    infraType: null,
    areaValue: 1,
    areaUnit: "acre",
    videographyQuantity: 30,
    surveillanceQuantity: 1,
    instructions: "",
    location: "",
    coordinates: null,
    detailedAddress: { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" },
    date: "",
    time: "",
    preferredTimeSlot: null,
  });
  const [priceEstimate, setPriceEstimate] = React.useState<Record<string, unknown> | null>(null);
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = React.useState(false);
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [geocoded, setGeocoded] = React.useState<{ query: string; lat: number; lng: number } | null>(null);
  const requestIdRef = React.useRef(0);
  const debounceRef = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  React.useEffect(() => {
    const resumed = takeBookingResumeState();
    if (!resumed || resumed.draft.service !== serviceKey) return;
    setDraft(resumed.draft);
    if (resumed.priceEstimate) setPriceEstimate(resumed.priceEstimate);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot restore of a pre-login draft after the /login round-trip.
  }, [serviceKey]);

  const isSpraying = serviceKey === "spraying";
  const isMapping = serviceKey === "mapping";
  const isVideo = serviceKey === "videography";
  const isSurv = serviceKey === "surveillance";
  const hasSub = !!draft.subService;
  const sub = service?.subServices.find((s) => s.key === draft.subService) ?? null;
  const videoMeta = isVideo && draft.subService ? VIDEO_QUANTITY_META[draft.subService] : undefined;
  const survMeta = isSurv && draft.subService ? SURVEILLANCE_QUANTITY_META[draft.subService] : undefined;

  const hasServiceConfig = isSpraying
    ? hasSub && !!draft.crop
    : isMapping
      ? hasSub && !!draft.infraType
      : isVideo
        ? hasSub && !!videoMeta
        : hasSub && !!survMeta;
  const showArea = isSpraying ? hasSub && !!draft.crop : isMapping ? hasSub && !!draft.infraType : false;
  const showDate = !!hasServiceConfig && (isVideo || isSurv || (draft.areaValue ?? 0) > 0);
  const showTime = showDate && !!draft.date;
  const showAddress = showTime && !!draft.time;
  const showDetailed = showAddress && draft.location.trim() !== "";
  const showEstimate = showDetailed && (draft.detailedAddress?.addressLine1?.trim() ?? "") !== "";
  const today = new Date().toISOString().slice(0, 10);
  // Spraying stays within 1 week; videography / surveillance / mapping allow 1 year.
  const bookingWindowDays = serviceKey === "spraying" ? 7 : 365;
  const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + bookingWindowDays); return d.toISOString().slice(0, 10); })();
  const bookingWindowLabel = serviceKey === "spraying" ? "within the next 7 days" : "within the next 1 year";

  function set<K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // Clear a stale slot when the date/service changes and the picked slot is
  // no longer offered (same-day 9 AM / 3 PM cut-offs).
  React.useEffect(() => {
    if (!draft.date || !draft.time) return;
    const available = getAvailableSlotKeys(serviceKey, draft.date);
    if (!available.includes(draft.time as SlotKey)) {
      setDraft((d) => ({ ...d, time: "", preferredTimeSlot: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on date/service/slot change.
  }, [draft.date, draft.time, serviceKey]);

  function fetchSuggestions(query: string) {
    const trimmed = query.trim();
    // COST GUARD: min 3 chars — matches backend MIN_AUTOCOMPLETE_CHARS so
    // 1-2 char keystrokes never touch billable Google APIs.
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    const requestId = ++requestIdRef.current;
    void (async () => {
      // Backend (needs JWT) and Nominatim (keyless) race in parallel and
      // merge — guests get Nominatim hints, logged-in users get both.
      const [backend, fallback] = await Promise.all([
        getAuthToken()
          ? mapsApi.autocomplete(trimmed, {}).catch(() => [] as LocationSuggestion[])
          : Promise.resolve([] as LocationSuggestion[]),
        nominatimFallback(trimmed),
      ]);
      if (requestIdRef.current !== requestId) return;
      const seen = new Set<string>();
      const merged = [...backend, ...fallback].filter((s) => {
        const k = s.label.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setSuggestions(merged.slice(0, 4));
      setActiveIndex(0);
      setSuggestLoading(false);
    })();
  }

  function handleLocationChange(value: string) {
    setDraft((d) => ({ ...d, location: value, coordinates: null }));
    setSuggestOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // COST GUARD: 700ms debounce (was 300ms) — halves backend/Google hits while typing.
    debounceRef.current = window.setTimeout(() => fetchSuggestions(value), 700);
  }

  function handleSelectSuggestion(s: LocationSuggestion) {
    setDraft((d) => ({
      ...d,
      location: s.label,
      coordinates: s.latitude != null && s.longitude != null ? { lat: s.latitude, lng: s.longitude } : d.coordinates,
    }));
    setSuggestOpen(false);
    setSuggestions([]);
  }

  React.useEffect(() => {
    const query = draft.location.trim();
    if (!query || draft.coordinates) return;
    const handle = window.setTimeout(() => {
      void geocodeLocation(query).then((result) => {
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
  }, [draft.location, draft.coordinates]);

  const center =
    draft.coordinates != null
      ? { label: draft.location.trim(), latitude: draft.coordinates.lat, longitude: draft.coordinates.lng, source: "manual" as const }
      : geocoded && geocoded.query === draft.location.trim()
        ? { label: draft.location.trim(), latitude: geocoded.lat, longitude: geocoded.lng, source: "manual" as const }
        : location.status === "granted" && location.center && location.center.label !== "Locating…"
          ? location.center
          : null;

  // Catalog pricing args — shared with the payment payload builder so the
  // estimate and the created booking price identically (pricing-units.ts).
  const estimateArgs = React.useMemo(() => {
    const pricing = buildPricingInput(draft);
    return {
      serviceType: pricing.serviceType,
      catalogKey: pricing.catalogKey,
      unit: pricing.unit,
      quantity: pricing.quantity,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primitives only; areaInAcres derived from area fields below.
  }, [isVideo, isSurv, isSpraying, isMapping, serviceKey, sub?.detailsValue, sub?.estimateKey, sub?.estimateServiceType, videoMeta?.unit, videoMeta?.defaultQty, survMeta?.unit, draft.videographyQuantity, draft.surveillanceQuantity, draft.areaValue, draft.areaUnit, draft.instructions]);

  function handleContinue() {
    if (!serviceKey) return;
    const snapshot = { draft, operators: [], selectedOperatorId: null, priceEstimate };
    saveBookingIntent(snapshot);
    if (!isAuthenticated) {
      saveBookingResumeState(snapshot);
      requestLogin("/booking/payment");
      return;
    }
    router.push("/booking/payment");
  }

  if (!service || !serviceKey) {
    return (
      <main className="hawk-theme hawk-forest relative min-h-screen w-full overflow-hidden">
        <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
        }}
      />
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" /><Navbar />
        <section className="mx-auto max-w-lg px-4 pt-32 pb-16 text-center">
          <p className="text-lg font-semibold">Select a service to continue</p>
          <Link href="/#booking" className="text-brand mt-4 inline-block text-sm">Back to services</Link>
        </section>
        <Footer />
      </main>
    );
  }

  const videoQty = draft.videographyQuantity ?? videoMeta?.defaultQty ?? 30;
  const survQty = draft.surveillanceQuantity ?? 1;

  return (
    <main className="hawk-theme hawk-forest relative min-h-screen w-full overflow-hidden">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
        }}
      />
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" /><Navbar />
      <section className="max-w-container mx-auto grid grid-cols-1 gap-5 px-4 pt-28 pb-16 sm:pt-36 lg:grid-cols-[34fr_66fr]">
        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-6 rounded-3xl border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Link href="/#booking" aria-label="Back" className="border-border bg-card shadow-2xl backdrop-blur-md rounded-full border p-2">
              <ArrowLeftIcon className="size-4" />
            </Link>
            <h1 className="text-2xl font-semibold sm:text-3xl">{service.label}</h1>
          </div>

          <SubServiceSelect
            heading={service.subServiceHeading}
            placeholder={service.subServicePlaceholder}
            options={service.subServices}
            value={draft.subService}
            onChange={(k) => {
              setDraft((d) => ({
                ...d,
                subService: k,
                videographyQuantity: k && VIDEO_QUANTITY_META[k] ? VIDEO_QUANTITY_META[k].defaultQty : d.videographyQuantity,
                surveillanceQuantity: 1,
              }));
            }}
            disabled={false}
          />

          <AnimatePresence initial={false}>
            {isSpraying && hasSub && (
              <motion.div key="crop" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label className="text-foreground text-sm font-medium">Select your Crop</label>
                <select value={draft.crop ?? ""} onChange={(e) => set("crop", e.target.value || null)} className={inputClass}>
                  <option value="">Select your Crop</option>
                  {SPRAYING_CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </motion.div>
            )}
            {isMapping && hasSub && (
              <motion.div key="infra" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label className="text-foreground text-sm font-medium">Select Your Infrastructure Type</label>
                <select value={draft.infraType ?? ""} onChange={(e) => set("infraType", e.target.value || null)} className={inputClass}>
                  <option value="">Select Your Infrastructure Type</option>
                  {MAPPING_INFRA_TYPES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </motion.div>
            )}

            {isVideo && videoMeta && (
              <motion.div key="vqty" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label className="text-foreground text-sm font-medium">
                  {videoMeta.unit === "min" ? "Duration (minutes)" : "Number of properties"}
                </label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => set("videographyQuantity", Math.max(videoMeta.min, videoQty - videoMeta.step))} aria-label="Decrease">
                    <MinusIcon className="size-4" />
                  </Button>
                  <span className="text-foreground min-w-12 text-center text-lg font-semibold">{videoQty}</span>
                  <Button variant="outline" size="icon" onClick={() => set("videographyQuantity", videoQty + videoMeta.step)} aria-label="Increase">
                    <PlusIcon className="size-4" />
                  </Button>
                  <span className="text-muted-foreground text-sm">{videoMeta.label}</span>
                </div>
              </motion.div>
            )}

            {isSurv && survMeta && (
              <motion.div key="sqty" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label className="text-foreground text-sm font-medium">Duration / Coverage</label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => set("surveillanceQuantity", Math.max(1, survQty - 1))} aria-label="Decrease">
                    <MinusIcon className="size-4" />
                  </Button>
                  <span className="text-foreground min-w-12 text-center text-lg font-semibold">{survQty}</span>
                  <Button variant="outline" size="icon" onClick={() => set("surveillanceQuantity", survQty + 1)} aria-label="Increase">
                    <PlusIcon className="size-4" />
                  </Button>
                  <span className="text-muted-foreground text-sm">{survMeta.label}</span>
                </div>
              </motion.div>
            )}

            {showArea && (
              <motion.div key="area" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label className="text-foreground text-sm font-medium">
                  {isMapping ? "Enter Your Land Area" : "Enter Your Farm Area"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min={1} value={draft.areaValue ?? 1}
                    onChange={(e) => set("areaValue", Math.max(1, Number(e.target.value) || 1))}
                    className={inputClass} aria-label="Area" />
                  <select value={draft.areaUnit ?? "acre"}
                    onChange={(e) => set("areaUnit", e.target.value as BookingDraft["areaUnit"])}
                    className={inputClass} aria-label="Unit">
                    {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </motion.div>
            )}

            {showDate && (
              <motion.div key="date" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label htmlFor="svc-date" className="text-foreground text-sm font-medium">Date</label>
                <input id="svc-date" type="date" min={today} max={maxDate} value={draft.date}
                  onChange={(e) => set("date", e.target.value)} className={inputClass} />
                <p className="text-muted-foreground text-[11px]">Bookings can be scheduled {bookingWindowLabel}.</p>
              </motion.div>
            )}

            {showTime && (
              <motion.div key="time" variants={fadeUp} initial="hidden" animate="show">
                <TimeSlotPicker service={serviceKey} date={draft.date} value={draft.time}
                  onChange={(s: SlotKey) => setDraft((d) => ({ ...d, time: s, preferredTimeSlot: toPreferredTimeSlot(s) }))} />
              </motion.div>
            )}

            {isSpraying && showTime && (
              <motion.div key="instr" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label className="text-foreground text-sm font-medium">Any Special Instructions?</label>
                <textarea value={draft.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)}
                  placeholder="Enter special instructions for the booking"
                  className="border-input bg-card focus:border-brand focus:ring-ring min-h-24 rounded-xl border px-3.5 py-2 text-sm outline-none transition-colors focus:ring-2" />
              </motion.div>
            )}

            {showAddress && (
              <motion.div key="addr" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label htmlFor="svc-loc" className="text-foreground text-sm font-medium">Project / Site Location</label>
                <input id="svc-loc" value={draft.location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => { setSuggestOpen(true); if (draft.location.trim().length >= 3) fetchSuggestions(draft.location); }}
                  onBlur={() => window.setTimeout(() => setSuggestOpen(false), 120)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
                    else if (e.key === "Enter") { e.preventDefault(); const p = suggestions[activeIndex]; if (p) handleSelectSuggestion(p); }
                    else if (e.key === "Escape") setSuggestOpen(false);
                  }}
                  placeholder="e.g. Whitefield, Bengaluru" className={inputClass} autoComplete="off" />
                <LocationSuggestions suggestions={suggestions} loading={suggestLoading} open={suggestOpen}
                  activeIndex={activeIndex}
                  onSelect={handleSelectSuggestion}
                  onActiveChange={setActiveIndex} />
              </motion.div>
            )}

            {showDetailed && (
              <motion.div key="daddr" variants={fadeUp} initial="hidden" animate="show">
                <AddressFields value={draft.detailedAddress ?? { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" }} onChange={(v) => set("detailedAddress", v)} />
              </motion.div>
            )}

            {showEstimate && (
              <motion.div key="est" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-3">
                <PriceEstimate serviceType={estimateArgs.serviceType} catalogKey={estimateArgs.catalogKey}
                  unit={estimateArgs.unit} quantity={estimateArgs.quantity}
                  date={draft.date} slot={draft.time}
                  latitude={center?.latitude ?? null} longitude={center?.longitude ?? null}
                  onEstimate={(e) => setPriceEstimate((e as Record<string, unknown> | null) ?? null)} />
                <Button size="lg" onClick={handleContinue} className="w-full">
                  Continue to Payment <ArrowRightIcon className="size-4" />
                </Button>
                <p className="text-muted-foreground text-[11px]">Payment selection → fly-zone & weather checks → booking confirmation.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex min-h-[420px] flex-col overflow-hidden rounded-3xl border lg:h-full">
          <RaiderSystem
            stage="dispatch"
            operators={[]}
            selectedOperatorId={null}
            onSelectOperator={() => {}}
            center={center}
            locationStatus={location.status}
            locationMessage={location.message}
          />
        </div>
      </section>
      <Footer />
    </main>
  );
}

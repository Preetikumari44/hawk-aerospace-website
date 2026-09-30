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
import { type SlotKey, TimeSlotPicker, toPreferredTimeSlot } from "@/components/booking/time-slot-picker";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
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
import { saveBookingIntent, saveBookingResumeState } from "@/lib/booking/resume";
import type { BookingDraft, ServiceKey } from "@/lib/booking/types";
import { fadeUp } from "@/lib/motion";

const inputClass =
  "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1";

const VALID: ServiceKey[] = ["videography", "spraying", "mapping", "surveillance"];
const AREA_TO_ACRES: Record<string, number> = { acre: 1, hectare: 2.47105, sq_m: 1 / 4046.8564224 };

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
  const showEstimate = showDetailed && draft.detailedAddress.addressLine1.trim() !== "";
  const today = new Date().toISOString().slice(0, 10);
  const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

  function set<K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function fetchSuggestions(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
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
    debounceRef.current = window.setTimeout(() => fetchSuggestions(value), 300);
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

  const areaInAcres = Math.round(Number(draft.areaValue ?? 1) * (AREA_TO_ACRES[draft.areaUnit ?? "acre"] ?? 1) * 100) / 100;
  // Memoised on primitives so the estimate effect fires only on real changes
  // (a fresh object every render caused a POST loop → HTTP 429).
  // Catalog pricing args for POST /pricing/estimate-service — mirrors mobile
  // PriceEstimateCard (base price × quantity + factors + 18% GST).
  const estimateArgs = React.useMemo(() => {
    if (isVideo && sub && videoMeta) {
      const qty = draft.videographyQuantity ?? videoMeta.defaultQty;
      return {
        serviceType: "videography",
        catalogKey: sub.estimateKey ?? sub.detailsValue ?? null,
        unit: videoMeta.unit,
        quantity: qty,
      };
    }
    if (isSurv && sub && survMeta) {
      const qty = draft.surveillanceQuantity ?? 1;
      return {
        serviceType: "surveillance",
        catalogKey: sub.estimateKey ?? sub.detailsValue ?? null,
        unit: survMeta.unit,
        quantity: qty,
      };
    }
    if ((isSpraying || isMapping) && sub) {
      return {
        serviceType: sub.estimateServiceType ?? serviceKey,
        catalogKey: sub.estimateKey ?? sub.detailsValue ?? null,
        unit: "per_acre",
        quantity: areaInAcres,
      };
    }
    return { serviceType: serviceKey, catalogKey: null, unit: null, quantity: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primitives only; areaInAcres derived from area fields below.
  }, [isVideo, isSurv, isSpraying, isMapping, serviceKey, sub?.detailsValue, sub?.estimateKey, sub?.estimateServiceType, videoMeta?.unit, videoMeta?.defaultQty, survMeta?.unit, draft.videographyQuantity, draft.surveillanceQuantity, draft.areaValue, draft.areaUnit]);

  function handleContinue() {
    if (!serviceKey) return;
    const snapshot = { draft, operators: [], selectedOperatorId: null, priceEstimate };
    if (!isAuthenticated) {
      saveBookingResumeState(snapshot);
      requestLogin(`/booking/${serviceKey}`);
      return;
    }
    saveBookingIntent(snapshot);
    router.push("/booking/payment");
  }

  if (!service || !serviceKey) {
    return (
      <main className="bg-background text-foreground min-h-screen">
        <LayoutLines /><Navbar />
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
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines /><Navbar />
      <section className="max-w-container mx-auto grid grid-cols-1 gap-5 px-4 pt-28 pb-16 sm:pt-36 lg:grid-cols-[34fr_66fr]">
        <div className="border-border/60 glass-2 flex flex-col gap-6 rounded-2xl border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Link href="/#booking" aria-label="Back" className="border-border/60 glass-1 rounded-full border p-2">
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
                <p className="text-muted-foreground text-[11px]">Bookings can be scheduled within the next 7 days.</p>
              </motion.div>
            )}

            {showTime && (
              <motion.div key="time" variants={fadeUp} initial="hidden" animate="show">
                <TimeSlotPicker service={serviceKey} value={draft.time}
                  onChange={(s: SlotKey) => setDraft((d) => ({ ...d, time: s, preferredTimeSlot: toPreferredTimeSlot(s) }))} />
              </motion.div>
            )}

            {isSpraying && showTime && (
              <motion.div key="instr" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label className="text-foreground text-sm font-medium">Any Special Instructions?</label>
                <textarea value={draft.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)}
                  placeholder="Enter special instructions for the booking"
                  className="border-border/70 bg-background/60 min-h-24 rounded-md border px-3 py-2 text-sm outline-none" />
              </motion.div>
            )}

            {showAddress && (
              <motion.div key="addr" variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <label htmlFor="svc-loc" className="text-foreground text-sm font-medium">Project / Site Location</label>
                <input id="svc-loc" value={draft.location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => { setSuggestOpen(true); if (draft.location.trim().length >= 2) fetchSuggestions(draft.location); }}
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
                <AddressFields value={draft.detailedAddress} onChange={(v) => set("detailedAddress", v)} />
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

        <div className="border-border/60 glass-2 flex min-h-[420px] flex-col overflow-hidden rounded-2xl border lg:h-full">
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

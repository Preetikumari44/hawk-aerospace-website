"use client";

// Update location — Super App UpdateLocationScreen parity: worldwide
// home-location editor (search + browser GPS) saved to the profile
// (PATCH /users/me {location, address}).

import { ArrowLeftIcon, LocateFixedIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import {
  type LocationSuggestion,
  LocationSuggestions,
} from "@/components/booking/location-suggestions";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { customerApi, mapsApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";

async function nominatimSearch(query: string): Promise<LocationSuggestion[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      place_id?: number;
    }>;
    return results.slice(0, 6).map((r) => ({
      label: r.display_name,
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      placeId: r.place_id != null ? String(r.place_id) : undefined,
    }));
  } catch {
    return [];
  }
}

interface NominatimAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
}

function formatDetailedAddress(displayName: string, address?: NominatimAddress): string {
  if (!address) return displayName;
  const parts = [
    address.road,
    address.suburb ?? address.neighbourhood,
    address.city ?? address.town ?? address.village ?? address.county,
    address.state,
    address.postcode,
  ].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  const deduped = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return deduped.length > 0 ? deduped.join(", ") : displayName;
}

async function reverseGeocodeDetailed(lat: number, lng: number): Promise<string | null> {
  try {
    const backend = (await mapsApi.reverseGeocode(lat, lng).catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (backend && typeof backend === "object") {
      const label =
        backend.displayName ??
        backend.formattedAddress ??
        backend.address ??
        backend.label;
      if (typeof label === "string" && label.trim()) return label.trim();
    }
  } catch {
    /* fall through to Nominatim */
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { display_name?: string; address?: NominatimAddress };
    if (!json.display_name) return null;
    return formatDetailedAddress(json.display_name, json.address);
  } catch {
    return null;
  }
}

const input =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

export default function UpdateLocationPage() {
  const router = useRouter();
  const { isAuthenticated, requestLogin, refreshUser } = useBookingAuth();
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<LocationSuggestion | null>(null);
  const [gpsLoading, setGpsLoading] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const debounce = React.useRef<number | null>(null);
  const searchId = React.useRef(0);

  function search(value: string) {
    setQuery(value);
    setOpen(true);
    if (debounce.current) window.clearTimeout(debounce.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const id = ++searchId.current;
    debounce.current = window.setTimeout(() => {
      void (async () => {
        const trimmed = value.trim();
        const [backend, fallback] = await Promise.all([
          mapsApi.autocomplete(trimmed).catch(() => [] as LocationSuggestion[]),
          nominatimSearch(trimmed),
        ]);
        if (searchId.current !== id) return;
        const seen = new Set<string>();
        const merged = [...backend, ...fallback].filter((s) => {
          const k = s.label.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setSuggestions(merged.slice(0, 6));
        setSearchLoading(false);
      })();
    }, 300);
  }

  function useGps() {
    if (!("geolocation" in navigator)) {
      setMsg("Geolocation isn't supported in this browser.");
      return;
    }
    setMsg(null);
    setGpsLoading(true);
    const onPosition = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      setMsg("Resolving your street address…");
      void reverseGeocodeDetailed(latitude, longitude).then((label) => {
        setGpsLoading(false);
        setPicked({
          label: label ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          latitude,
          longitude,
        });
        setQuery(label ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setOpen(false);
        setMsg(null);
      });
    };
    const onError = (err: GeolocationPositionError) => {
      setGpsLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        setMsg("Location permission is blocked. Allow location access in your browser settings, then try again — or search instead.");
      } else if (err.code === err.TIMEOUT) {
        setMsg("Location request timed out. Make sure GPS is on and try again — or search instead.");
      } else {
        setMsg("Couldn't get your location. Search for it instead.");
      }
    };
    const nav = navigator as Navigator & {
      permissions?: { query?: (o: { name: string }) => Promise<{ state: string }> };
    };
    const queryPermission =
      nav.permissions?.query?.({ name: "geolocation" }).catch(() => null) ?? Promise.resolve(null);
    void queryPermission.then((status) => {
      if (status && status.state === "denied") {
        onError({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        return;
      }
      navigator.geolocation.getCurrentPosition(onPosition, onError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      });
    });
  }

  async function save() {
    if (!picked || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      await customerApi.updateCurrentUser({ location: picked.label, address: picked.label });
      await refreshUser().catch(() => undefined);
      router.push("/my-bookings");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save location.");
      setSaving(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
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
            <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <span className="eyebrow">Location</span>
          <Button size="lg" onClick={() => requestLogin("/location")}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

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
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex max-w-xl flex-col gap-6">
          <Link href="/my-bookings" className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline">
            <ArrowLeftIcon className="size-4" />
            Back to My Bookings
          </Link>
          <h1 className="text-3xl font-semibold sm:text-4xl">Home Location</h1>
          <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-foreground text-sm font-medium">Search anywhere in the world</span>
              <input
                value={query}
                onChange={(e) => search(e.target.value)}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                placeholder="City, area, landmark…"
                className={input}
                autoComplete="off"
              />
            </label>
            <LocationSuggestions
              suggestions={suggestions}
              loading={searchLoading}
              open={open}
              activeIndex={0}
              onSelect={(s) => {
                setPicked(s);
                setQuery(s.label);
                setOpen(false);
              }}
              onActiveChange={() => undefined}
            />
            <Button variant="outline" onClick={useGps} disabled={gpsLoading}>
              <LocateFixedIcon className="size-4" />
              {gpsLoading ? "Locating…" : "Use Current Location"}
            </Button>
            {picked ? (
              <p className="text-muted-foreground text-sm">
                Selected: <span className="text-foreground font-medium">{picked.label}</span>
              </p>
            ) : null}
            {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
            <Button onClick={() => void save()} disabled={!picked || saving}>
              {saving ? "Saving…" : "Save Location"}
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

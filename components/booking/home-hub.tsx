"use client";

// Customer home hub — Super App HomeScreen parity for the web dashboard:
// live weather card (Open-Meteo + backend checkWeather), Active/Upcoming
// booking carousels (backend listBookings), and home-location edit
// (browser GPS default, manual override saved to the profile).

import { CloudSunIcon, MapPinIcon, PlaneTakeoffIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { type BackendBooking,customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { useUserLocation } from "@/lib/booking/location";
import type { BookingStatus } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

const HOME_LOCATION_KEY = "hawk_home_location_v1";

interface WeatherNow {
  temperature: number | null;
  windKmh: number | null;
  humidity: number | null;
  code: number | null;
  condition: string;
  safe: boolean | null;
}

function codeToCondition(code: number | null): { condition: string; safe: boolean | null } {
  if (code == null) return { condition: "Unknown", safe: null };
  if (code === 0) return { condition: "Clear sky", safe: true };
  if (code <= 3) return { condition: "Partly cloudy", safe: true };
  if (code <= 48) return { condition: "Fog", safe: false };
  if (code <= 67) return { condition: "Rain", safe: false };
  if (code <= 77) return { condition: "Snow", safe: false };
  if (code <= 82) return { condition: "Showers", safe: false };
  if (code <= 86) return { condition: "Snow showers", safe: false };
  if (code >= 95) return { condition: "Thunderstorm", safe: false };
  return { condition: "Overcast", safe: true };
}

async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherNow | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
      };
    };
    const c = json.current;
    if (!c) return null;
    const { condition, safe } = codeToCondition(
      typeof c.weather_code === "number" ? c.weather_code : null,
    );
    return {
      temperature: typeof c.temperature_2m === "number" ? c.temperature_2m : null,
      windKmh: typeof c.wind_speed_10m === "number" ? c.wind_speed_10m : null,
      humidity: typeof c.relative_humidity_2m === "number" ? c.relative_humidity_2m : null,
      code: typeof c.weather_code === "number" ? c.weather_code : null,
      condition,
      safe,
    };
  } catch {
    return null;
  }
}

function normalizeStatus(raw: unknown): BookingStatus {
  if (raw === "confirmed" || raw === "pilot-assigned" || raw === "pilot_assigned") {
    return raw === "pilot_assigned" ? "pilot-assigned" : (raw as BookingStatus);
  }
  if (raw === "in-progress" || raw === "in_progress") return "in-progress";
  if (raw === "completed" || raw === "cancelled" || raw === "pending") return raw;
  return "pending";
}

function bookingDateOnly(b: BackendBooking): string {
  return typeof b.scheduledDate === "string" ? b.scheduledDate.slice(0, 10) : "";
}

function isActiveBooking(b: BackendBooking): boolean {
  const st = normalizeStatus(b.status);
  if (st === "in-progress" || st === "pilot-assigned") return true;
  if (st === "confirmed") {
    const today = new Date().toISOString().slice(0, 10);
    const d = bookingDateOnly(b);
    return !d || d <= today;
  }
  return false;
}

function isUpcomingBooking(b: BackendBooking): boolean {
  const st = normalizeStatus(b.status);
  if (st === "cancelled" || st === "completed") return false;
  return !isActiveBooking(b);
}

function toList(v: BackendBooking[] | { bookings: BackendBooking[] }): BackendBooking[] {
  return Array.isArray(v) ? v : Array.isArray(v.bookings) ? v.bookings : [];
}

export function HomeHub() {
  const { isAuthenticated, backendUser, frontendRole, refreshUser } = useBookingAuth();
  const canEditLocation = frontendRole === "customer" || frontendRole === "sales";
  const geo = useUserLocation();
  const [weather, setWeather] = React.useState<WeatherNow | null>(null);
  const [weatherLabel, setWeatherLabel] = React.useState<string | null>(null);
  const [bookings, setBookings] = React.useState<BackendBooking[] | null>(null);
  const [homeLocation, setHomeLocation] = React.useState<string>("");
  const [editingLocation, setEditingLocation] = React.useState(false);
  const [locationDraft, setLocationDraft] = React.useState("");
  const [savingLocation, setSavingLocation] = React.useState(false);

  // Home location: profile address when logged in, else browser label, else saved manual.
  // Logged-out users always see "Not set" — never a previous session's location.
  React.useEffect(() => {
    if (!isAuthenticated) {
      setHomeLocation("");
      setEditingLocation(false);
      return;
    }
    const profileAddress =
      (backendUser?.address as string | undefined) ||
      ((backendUser?.profileData as Record<string, unknown> | undefined)?.address as string | undefined);
    if (profileAddress) {
      setHomeLocation(profileAddress);
      return;
    }
    if (geo.center?.label) {
      setHomeLocation(geo.center.label);
      return;
    }
    try {
      const saved = window.localStorage.getItem(HOME_LOCATION_KEY);
      if (saved) setHomeLocation(saved);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, backendUser, geo.center?.label]);

  // Live weather at the effective location (browser coords preferred).
  React.useEffect(() => {
    const lat = geo.center?.latitude;
    const lng = geo.center?.longitude;
    if (lat == null || lng == null) return;
    let cancelled = false;
    fetchOpenMeteo(lat, lng).then((w) => {
      if (!cancelled && w) {
        setWeather(w);
        setWeatherLabel(geo.center?.label ?? null);
      }
    });
    if (isAuthenticated) {
      customerApi
        .checkWeather({ latitude: lat, longitude: lng })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [geo.center?.latitude, geo.center?.longitude, isAuthenticated]);

  // Active/Upcoming carousels from live bookings.
  React.useEffect(() => {
    if (!isAuthenticated) {
      setBookings(null);
      return;
    }
    let cancelled = false;
    customerApi
      .listBookings()
      .then((v) => {
        if (!cancelled) setBookings(toList(v));
      })
      .catch(() => {
        if (!cancelled) setBookings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function saveLocation() {
    const value = locationDraft.trim();
    if (!value) return;
    setSavingLocation(true);
    try {
      if (isAuthenticated) {
        await customerApi.updateCurrentUser({ location: value, address: value });
        await refreshUser().catch(() => undefined);
      } else {
        window.localStorage.setItem(HOME_LOCATION_KEY, value);
      }
      setHomeLocation(value);
      setEditingLocation(false);
    } catch {
      /* surface stays; user can retry */
    } finally {
      setSavingLocation(false);
    }
  }

  const active = (bookings ?? []).filter(isActiveBooking).slice(0, 8);
  const upcoming = (bookings ?? []).filter(isUpcomingBooking).slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[34fr_66fr]">
      {/* Weather + location */}
      <div className="border-border/60 glass-2 flex flex-col gap-3 rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
            Home Weather
          </span>
          <CloudSunIcon className="text-brand size-4" />
        </div>
        {weather ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-foreground text-3xl font-bold">
                {weather.temperature != null ? `${Math.round(weather.temperature)}°C` : "—"}
              </span>
              <span className="text-muted-foreground text-sm">{weather.condition}</span>
              {weather.safe != null && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase",
                    weather.safe
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {weather.safe ? "Flyable" : "Caution"}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {weatherLabel ?? ""}
              {weather.windKmh != null ? ` · Wind ${Math.round(weather.windKmh)} km/h` : ""}
              {weather.humidity != null ? ` · Humidity ${weather.humidity}%` : ""}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            {geo.status === "requesting" ? "Locating you for live weather…" : "Allow location or set it below for live weather."}
          </p>
        )}
        <div className="border-border/50 mt-1 flex flex-col gap-2 border-t pt-3">
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
            Home Location
          </span>
          {!editingLocation ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                <MapPinIcon className="size-4 shrink-0" />
                <span className="truncate">{homeLocation || "Not set"}</span>
              </span>
              {canEditLocation ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLocationDraft(homeLocation);
                      setEditingLocation(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Link href="/location" className="text-brand text-xs font-semibold hover:underline">
                    Map editor
                  </Link>
                </>
              ) : (
                <span className="text-muted-foreground text-xs">Live GPS</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                value={locationDraft}
                onChange={(e) => setLocationDraft(e.target.value)}
                placeholder="City, State"
                className="border-border/70 bg-background/60 h-10 rounded-md border px-3 text-sm outline-none"
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={savingLocation || !locationDraft.trim()} onClick={() => void saveLocation()}>
                  {savingLocation ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingLocation(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active / Upcoming carousels */}
      <div className="flex flex-col gap-4">
        <BookingCarousel
          title="Active Now"
          empty={isAuthenticated ? "No active missions right now." : "Log in to see your live missions."}
          bookings={active}
          loggedIn={isAuthenticated}
        />
        <BookingCarousel
          title="Upcoming"
          empty={isAuthenticated ? "Nothing scheduled ahead." : "Log in to see upcoming flights."}
          bookings={upcoming}
          loggedIn={isAuthenticated}
        />
      </div>
    </div>
  );
}

function BookingCarousel({
  title,
  empty,
  bookings,
  loggedIn,
}: {
  title: string;
  empty: string;
  bookings: BackendBooking[];
  loggedIn: boolean;
}) {
  return (
    <div className="border-border/60 glass-2 rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
          {title}
        </span>
        {loggedIn && bookings.length > 0 && (
          <Link href="/my-bookings" className="text-brand text-xs font-semibold hover:underline">
            View all
          </Link>
        )}
      </div>
      {bookings.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <div className="flex snap-x gap-3 overflow-x-auto pb-1">
          {bookings.map((b) => (
            <Link
              key={String(b.bookingNumber ?? b.id)}
              href={`/track/${b.bookingNumber ?? b.id}`}
              className="border-border/60 bg-background/60 w-56 shrink-0 snap-start rounded-xl border p-3 transition-colors hover:border-white/20"
            >
              <div className="flex items-center gap-1.5">
                <PlaneTakeoffIcon className="text-brand size-3.5" />
                <span className="text-foreground truncate text-sm font-semibold">
                  {typeof b.serviceType === "string" ? b.serviceType : "Drone Service"}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {typeof b.address === "string" ? b.address : ""}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {bookingDateOnly(b)}
                {b.preferredTimeSlot ? ` · ${b.preferredTimeSlot}` : ""}
              </p>
              <span className="text-brand mt-1 inline-block text-xs font-semibold">
                {String(b.status ?? "pending")} →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

// ---------------------------------------------------------------------------
// Browser geolocation for the location-aware Raider / operational snapshot.
// Never blocks the booking flow — every failure state falls back gracefully
// to manual location entry, which always takes priority when set.
// ---------------------------------------------------------------------------

import * as React from "react";

import type { LocationStatus, OperationalCenter } from "./types";

interface UseUserLocationResult {
  status: LocationStatus;
  center: OperationalCenter | null;
  /** Human-readable reason shown to the user when location isn't available. */
  message: string | null;
  requestLocation: () => void;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string };
    const city = json.city || json.locality;
    if (!city) return null;
    return json.principalSubdivision ? `${city}, ${json.principalSubdivision}` : city;
  } catch {
    return null;
  }
}

/**
 * Requests the visitor's approximate location automatically, through the
 * browser's native permission prompt (navigator.geolocation) — there is no
 * custom "Use My Location" control anywhere in the UI. If the user has
 * already granted or denied the permission previously, the browser resolves
 * this immediately without prompting again. A denial or failure never blocks
 * the page — manual location search always remains available and takes
 * priority the moment the user types something.
 */
export function useUserLocation(): UseUserLocationResult {
  const [status, setStatus] = React.useState<LocationStatus>("idle");
  const [center, setCenter] = React.useState<OperationalCenter | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const requestLocation = React.useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      setMessage("Location isn't supported in this browser. Enter your project location manually.");
      return;
    }

    setStatus("requesting");
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setStatus("granted");
        setCenter({ label: "Locating…", latitude, longitude, source: "browser" });

        reverseGeocode(latitude, longitude).then((label) => {
          setCenter({
            label: label ?? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
            latitude,
            longitude,
            source: "browser",
          });
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          setMessage("Location access unavailable. Enter your project location manually.");
        } else {
          setStatus("unavailable");
          setMessage("Couldn't detect your location. Enter your project location manually.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  // Fire the native browser permission prompt automatically on mount —
  // no manual "Use My Location" trigger anywhere in the UI.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- triggers the native browser geolocation permission prompt (an external API), not a plain state sync; requestLocation itself sets "requesting" status before the async browser callback resolves.
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only.
  }, []);

  return { status, center, message, requestLocation };
}

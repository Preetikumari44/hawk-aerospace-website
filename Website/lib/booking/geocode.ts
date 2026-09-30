"use client";

// ---------------------------------------------------------------------------
// Forward geocoding for manually-typed "Project / Site Location" text, so the
// Raider map can center on it even when the browser location wasn't used.
// Uses OpenStreetMap's free Nominatim endpoint — no API key required. Best
// effort only: on any failure the caller simply keeps showing the map
// without a resolved center, per the graceful-degradation requirement.
// ---------------------------------------------------------------------------

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmed)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return null;
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

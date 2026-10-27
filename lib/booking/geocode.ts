"use client";

// ---------------------------------------------------------------------------
// Forward geocoding for manually-typed "Project / Site Location" text, so the
// Raider map can center on it even when the browser location wasn't used.
// Uses OpenStreetMap's free Nominatim endpoint — no API key required. Best
// effort only: on any failure the caller simply keeps showing the map
// without a resolved center, per the graceful-degradation requirement.
//
// Results (including confirmed "no match" answers) are cached per query so
// re-entering or re-editing the same address never hits the network twice.
// ---------------------------------------------------------------------------

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** [south, north, west, east] */
  boundingBox: [number, number, number, number] | null;
  placeRank: number | null;
  /** Set when the full text had no match and a broader part of it was used
   * instead (e.g. building name dropped) — the part that actually matched. */
  matchedText?: string;
}

interface NominatimHit {
  lat: string;
  lon: string;
  boundingbox?: string[];
  place_rank?: number;
}

const cache = new Map<string, GeocodeResult | null>();

async function lookup(trimmed: string): Promise<GeocodeResult | null | undefined> {
  const key = trimmed.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(trimmed)}`,
      { headers: { Accept: "application/json", "Accept-Language": "en" } },
    );
    if (!res.ok) return undefined;
    const results = (await res.json()) as NominatimHit[];
    const first = results[0];
    if (!first) {
      cache.set(key, null);
      return null;
    }
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

    const bb = first.boundingbox?.map(Number);
    const boundingBox =
      bb && bb.length === 4 && bb.every(Number.isFinite)
        ? ([bb[0], bb[1], bb[2], bb[3]] as [number, number, number, number])
        : null;

    const result: GeocodeResult = {
      latitude,
      longitude,
      boundingBox,
      placeRank: typeof first.place_rank === "number" ? first.place_rank : null,
    };
    cache.set(key, result);
    return result;
  } catch {
    // Network failure — don't cache, so a retry can succeed.
    return undefined;
  }
}

/**
 * Resolves free text to coordinates. If the exact text has no match (typical
 * for a building/business name missing from OpenStreetMap), it retries with
 * leading comma-separated parts removed — "Icon Suites, Brookefield,
 * Bengaluru" → "Brookefield, Bengaluru" — and reports what matched via
 * `matchedText` so the UI can say so instead of silently substituting.
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const exact = await lookup(trimmed);
  if (exact) return exact;
  if (exact === undefined) return null;

  // Progressively broaden: drop the leading (most specific) part one at a
  // time, keeping at least two parts so we never collapse to a bare state or
  // a wrong same-named place.
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  for (let i = 1; i <= parts.length - 2; i += 1) {
    const broader = parts.slice(i).join(", ");
    // Stay within Nominatim's 1 request/second usage policy.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const fallback = await lookup(broader);
    if (fallback) return { ...fallback, matchedText: broader };
    if (fallback === undefined) return null;
  }
  return null;
}

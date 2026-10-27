"use client";

// Real current-weather lookup for the small floating weather card on the
// homepage Raider System map (§7/§11 of the reference brief: "do not invent
// weather values; if unavailable, use a proper empty/loading state").
//
// This project had no weather integration to reuse, so rather than
// hardcoding a plausible-looking number, this calls Open-Meteo's free
// current-weather endpoint (no API key, no account) for the same
// coordinates already resolved for the operational center. If the fetch
// fails or there are no coordinates yet, the caller renders nothing —
// never a fabricated fallback.

export interface WeatherSnapshot {
  temperatureC: number;
  condition: string;
}

// Minimal subset of WMO weather-interpretation codes, used only to turn
// Open-Meteo's numeric `weathercode` into the short label the card shows.
function labelForCode(code: number): string {
  if (code === 0) return "Clear Skies";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Light Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorms";
  return "Clear Skies";
}

export async function fetchWeatherSnapshot(
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current_weather?: { temperature?: number; weathercode?: number };
    };
    const current = json.current_weather;
    if (!current || typeof current.temperature !== "number") return null;
    return {
      temperatureC: Math.round(current.temperature),
      condition: labelForCode(current.weathercode ?? 0),
    };
  } catch {
    return null;
  }
}

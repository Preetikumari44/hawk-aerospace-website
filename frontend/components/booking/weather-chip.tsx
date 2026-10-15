"use client";

import { CloudIcon, SunIcon } from "lucide-react";
import * as React from "react";

import { fetchWeatherSnapshot, type WeatherSnapshot } from "@/lib/booking/weather";

// Small floating weather card over the Raider System map (reference §11).
// Renders nothing while there's no resolved location, and nothing if the
// fetch fails — never a placeholder number. See lib/booking/weather.ts for
// why this calls a real (free, keyless) weather API instead of a fake value.
export function WeatherChip({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const [snapshot, setSnapshot] = React.useState<WeatherSnapshot | null>(null);

  React.useEffect(() => {
    if (latitude == null || longitude == null) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    fetchWeatherSnapshot(latitude, longitude).then((result) => {
      if (!cancelled) setSnapshot(result);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (!snapshot) return null;

  const isClear = snapshot.condition === "Clear Skies" || snapshot.condition === "Partly Cloudy";

  return (
    <div className="bg-[#16231a]/85 text-white pointer-events-none flex items-center gap-2 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md">
      {isClear ? <SunIcon className="size-5 text-amber-300" /> : <CloudIcon className="size-5 text-slate-300" />}
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">{snapshot.temperatureC}°C</span>
        <span className="text-[10px] font-medium text-white/70">{snapshot.condition}</span>
      </div>
    </div>
  );
}

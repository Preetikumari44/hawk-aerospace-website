"use client";

// ---------------------------------------------------------------------------
// Raider System — real interactive India map underlay.
//
// A genuine Leaflet map (pan/zoom/drag, real OSM-derived dark tiles), not a
// static SVG outline or screenshot. Sits beneath the tactical radar HUD
// overlay (rings/crosshair/sweep) rendered by raider-radar.tsx. Leaflet only
// exists in the browser, so `leaflet` is imported dynamically inside
// useEffect (client-only, post-hydration) — this file must never touch
// `window`/`document` at module scope, per Next.js SSR safety.
// ---------------------------------------------------------------------------

import "leaflet/dist/leaflet.css";

import * as React from "react";

import type { OperationalCenter, Operator } from "@/lib/booking/types";

import { attachRaiderZoomScale, raiderMarkerHtml } from "./raider-marker";

interface IndiaMapProps {
  className?: string;
  center: OperationalCenter | null;
  operators: Operator[];
  selectedOperatorId: string | null;
  onSelectOperator?: (id: string) => void;
  showOperators: boolean;
}

// Geographic center of India and a zoom level that shows the whole country.
const INDIA_CENTER: [number, number] = [22.3511, 78.6677];
const INDIA_OVERVIEW_ZOOM = 4.6;
const LOCATION_ZOOM = 10.5;

// Loose bounding box around India (with margin) so panning/zooming stays in
// the tactical operating theatre instead of drifting into open ocean —
// still permits scrolling between states/cities per the requirements.
const INDIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [2, 60],
  [40, 100],
];

function statusColor(status: Operator["status"], selected: boolean) {
  if (selected) return "#4f7cff";
  if (status === "busy") return "#f59e0b";
  return "#a78bfa";
}

export function IndiaMap({
  className,
  center,
  operators,
  selectedOperatorId,
  onSelectOperator,
  showOperators,
}: IndiaMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<import("leaflet").Map | null>(null);
  const leafletRef = React.useRef<typeof import("leaflet") | null>(null);
  const centerMarkerRef = React.useRef<import("leaflet").Marker | null>(null);
  const operatorLayerRef = React.useRef<import("leaflet").LayerGroup | null>(null);
  const raiderMarkerRef = React.useRef<import("leaflet").Marker | null>(null);
  const raiderZoomCleanupRef = React.useRef<(() => void) | null>(null);
  const [ready, setReady] = React.useState(false);

  // Keep the latest callback in a ref so Leaflet's click handlers (bound
  // once per marker) always call the current selection handler.
  const onSelectRef = React.useRef(onSelectOperator);
  React.useEffect(() => {
    onSelectRef.current = onSelectOperator;
  }, [onSelectOperator]);

  // Mount: create the map once, client-side only.
  React.useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: INDIA_CENTER,
        zoom: INDIA_OVERVIEW_ZOOM,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
        maxBounds: INDIA_MAX_BOUNDS,
        maxBoundsViscosity: 0.7,
      });

      // Esri "World Light Gray" basemap — genuinely free, no API key/account
      // required (unlike CARTO's basemaps.cartocdn.com tiles, which now
      // demand a CARTO account/API key and render a repeated "API KEY
      // REQUIRED" watermark without one). Two layers stacked: a soft gray
      // base fill, then a reference layer with roads/labels/boundaries/water
      // on top — this is Esri's documented way to get one composited light
      // map (roads/labels/water stay legible, unlike a plain white basemap).
      const esriAttribution =
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ";
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, maxNativeZoom: 16, minZoom: 2, attribution: esriAttribution },
      ).addTo(map);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, maxNativeZoom: 16, minZoom: 2, pane: "overlayPane" },
      ).addTo(map);

      L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      operatorLayerRef.current = L.layerGroup().addTo(map);

      // Raider System radar HUD — a real geographically-anchored marker
      // (see raider-marker.ts), not a fixed CSS overlay, so it genuinely
      // pans/zooms with the map instead of sitting fixed on screen (§5/§8).
      raiderZoomCleanupRef.current = attachRaiderZoomScale(map);
      const raiderIcon = L.divIcon({
        className: "",
        html: raiderMarkerHtml(),
        iconSize: [240, 240],
        iconAnchor: [120, 120],
      });
      raiderMarkerRef.current = L.marker(INDIA_CENTER, {
        icon: raiderIcon,
        keyboard: false,
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      raiderZoomCleanupRef.current?.();
      raiderZoomCleanupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      operatorLayerRef.current = null;
      centerMarkerRef.current = null;
      raiderMarkerRef.current = null;
    };
  }, []);

  // Fly to the operational center (or back to the India overview) whenever
  // the resolved center coordinates change.
  React.useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (center && center.latitude != null && center.longitude != null) {
      map.flyTo([center.latitude, center.longitude], LOCATION_ZOOM, { duration: 1.1 });
    } else {
      map.flyTo(INDIA_CENTER, INDIA_OVERVIEW_ZOOM, { duration: 1.1 });
    }
  }, [ready, center]);

  // The Raider marker follows the same target as the map itself — the
  // operational center once one is set, otherwise the India overview point
  // (§6/§10: same coordinates already used elsewhere, never a separate fake
  // position for the radar).
  React.useEffect(() => {
    if (!ready || !raiderMarkerRef.current) return;
    const target: [number, number] =
      center && center.latitude != null && center.longitude != null
        ? [center.latitude, center.longitude]
        : INDIA_CENTER;
    raiderMarkerRef.current.setLatLng(target);
  }, [ready, center]);

  // Glowing marker for the selected project / site location.
  React.useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }

    if (center && center.latitude != null && center.longitude != null) {
      // Glowing, pulsing live-location marker for the Raider System — a
      // genuine Leaflet marker (markerPane, above both tile layers), so it
      // always renders directly on top of the map and stays anchored to
      // its coordinates as the map pans/zooms.
      const icon = L.divIcon({
        className: "",
        html:
          `<span class="hawk-map-center-marker" aria-hidden="true">` +
          `<span class="hawk-map-center-pulse"></span>` +
          `<span class="hawk-map-center-dot"></span>` +
          `</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      centerMarkerRef.current = L.marker([center.latitude, center.longitude], {
        icon,
        keyboard: false,
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [ready, center]);

  // Real operator markers, plotted at their actual synthetic lat/lng (see
  // lib/booking/data.ts) instead of a decorative random placement.
  React.useEffect(() => {
    if (!ready || !leafletRef.current || !operatorLayerRef.current) return;
    const L = leafletRef.current;
    const layer = operatorLayerRef.current;
    layer.clearLayers();

    if (!showOperators) return;

    for (const op of operators) {
      if (op.latitude == null || op.longitude == null) continue;
      const selected = op.id === selectedOperatorId;
      const busy = op.status === "busy";
      const color = statusColor(op.status, selected);
      const size = selected ? 18 : 13;

      const icon = L.divIcon({
        className: "",
        html: `<span class="hawk-map-blip${busy ? " hawk-map-blip-busy" : ""}" style="--blip-color:${color};--blip-size:${size}px"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([op.latitude, op.longitude], {
        icon,
        keyboard: false,
        interactive: !busy && !!onSelectRef.current,
      });
      marker.bindTooltip(
        `${op.callsign} · ${op.distanceMiles} mi · ${busy ? "In operation" : "Available"}`,
        { direction: "top", offset: [0, -6] },
      );
      if (!busy) {
        marker.on("click", () => onSelectRef.current?.(op.id));
      }
      marker.addTo(layer);
    }
  }, [ready, operators, selectedOperatorId, showOperators]);

  return <div ref={containerRef} className={className} />;
}

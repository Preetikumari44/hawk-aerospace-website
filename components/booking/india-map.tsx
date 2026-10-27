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

import type { OperationalCenter, Operator, ProjectSite } from "@/lib/booking/types";

import { attachRaiderZoomScale, raiderMarkerHtml } from "./raider-marker";

interface IndiaMapProps {
  className?: string;
  center: OperationalCenter | null;
  operators: Operator[];
  selectedOperatorId: string | null;
  onSelectOperator?: (id: string) => void;
  showOperators: boolean;
  /** Geocoded project/site location. When set, the map is in Project Site
   * mode: the Raider radar is hidden, a project pin is placed and the map
   * moves to the resolved coordinates. When null, the default Raider System
   * behaviour is untouched. */
  projectSite?: ProjectSite | null;
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

// Picks a starting zoom from how specific the geocoded result is: the
// geocoder's bounding box when it has one (building < street < locality <
// city), otherwise its place rank. The user can then zoom freely.
function zoomForSite(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  bbox: string,
  rank: number | null,
): number {
  const parts = bbox ? bbox.split(",").map(Number) : [];
  if (parts.length === 4 && parts.every(Number.isFinite)) {
    const [s, n, w, e] = parts;
    if (n > s || e > w) {
      const z = map.getBoundsZoom(L.latLngBounds([s, w], [n, e]), false, L.point(48, 48));
      if (Number.isFinite(z)) return Math.min(17, Math.max(5, z));
    }
  }
  if (rank == null) return 15;
  if (rank >= 26) return 17;
  if (rank >= 22) return 16;
  if (rank >= 18) return 14;
  if (rank >= 16) return 12;
  if (rank >= 12) return 10;
  if (rank >= 8) return 7;
  return 5;
}

const SITE_PIN_HTML =
  `<span class="hawk-site-pin" aria-hidden="true">` +
  `<svg width="30" height="40" viewBox="0 0 30 40" fill="none">` +
  `<path d="M15 39C15 39 28 24.6 28 14.5 28 7.04 22.18 1 15 1S2 7.04 2 14.5C2 24.6 15 39 15 39Z" fill="var(--brand)" stroke="#fff" stroke-width="2"/>` +
  `<circle cx="15" cy="14.5" r="5" fill="#fff"/>` +
  `</svg>` +
  `<span class="hawk-site-pin-label">Project Site</span>` +
  `</span>`;

// Project Site mode basemap: full street maps (roads, localities, landmarks
// down to street level), all keyless. They are tried in order; if one fails
// to deliver any tile (blocked, rate-limited, offline) the map moves on to the
// next and logs a console warning — see the basemap effect below. Set
// NEXT_PUBLIC_MAP_TILE_URL / NEXT_PUBLIC_MAP_TILE_ATTRIBUTION (see
// .env.example) to put a provider of your own first. Each provider's required
// attribution is always shown by Leaflet's attribution control, never hidden.
interface SiteTileProvider {
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxNativeZoom: number;
}

const OSM_CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

const SITE_TILE_PROVIDERS: SiteTileProvider[] = [
  ...(process.env.NEXT_PUBLIC_MAP_TILE_URL
    ? [
        {
          name: "custom",
          url: process.env.NEXT_PUBLIC_MAP_TILE_URL,
          attribution: process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || "",
          maxNativeZoom: 19,
        },
      ]
    : []),
  {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_CREDIT,
    maxNativeZoom: 19,
  },
  {
    name: "CARTO Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>`,
    subdomains: "abcd",
    maxNativeZoom: 19,
  },
  {
    name: "Esri World Street Map",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    maxNativeZoom: 17,
  },
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
  projectSite = null,
}: IndiaMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<import("leaflet").Map | null>(null);
  const leafletRef = React.useRef<typeof import("leaflet") | null>(null);
  const centerMarkerRef = React.useRef<import("leaflet").Marker | null>(null);
  const operatorLayerRef = React.useRef<import("leaflet").LayerGroup | null>(null);
  const raiderMarkerRef = React.useRef<import("leaflet").Marker | null>(null);
  const raiderZoomCleanupRef = React.useRef<(() => void) | null>(null);
  const siteMarkerRef = React.useRef<import("leaflet").Marker | null>(null);
  const raiderTilesRef = React.useRef<import("leaflet").TileLayer[]>([]);
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);
  const siteTilesRef = React.useRef<import("leaflet").TileLayer | null>(null);
  const [ready, setReady] = React.useState(false);
  // Which Project Site basemap is active, and whether every one of them failed.
  const [siteProvider, setSiteProvider] = React.useState(0);
  const [tilesFailed, setTilesFailed] = React.useState(false);

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
      const esriBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, maxNativeZoom: 16, minZoom: 2, attribution: esriAttribution },
      ).addTo(map);
      const esriReference = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, maxNativeZoom: 16, minZoom: 2, pane: "overlayPane" },
      ).addTo(map);
      raiderTilesRef.current = [esriBase, esriReference];

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

      // Keep Leaflet's size in sync with its panel (layout shifts, mode
      // switches, window resize) so tiles never render into a stale 0-size box.
      if (typeof ResizeObserver !== "undefined") {
        resizeObserverRef.current = new ResizeObserver(() => {
          // Ignore callbacks that arrive after this map was destroyed.
          if (mapRef.current === map) map.invalidateSize();
        });
        resizeObserverRef.current.observe(containerRef.current);
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
      raiderZoomCleanupRef.current?.();
      raiderZoomCleanupRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      raiderTilesRef.current = [];
      siteTilesRef.current = null;
      const dying = mapRef.current;
      // Null the shared ref first so any effect/observer callback that fires
      // during teardown sees "no map" instead of a half-destroyed instance,
      // then stop any in-flight flyTo/pan animation before destroying it.
      mapRef.current = null;
      if (dying) {
        dying.stop();
        dying.remove();
      }
      leafletRef.current = null;
      operatorLayerRef.current = null;
      centerMarkerRef.current = null;
      raiderMarkerRef.current = null;
      siteMarkerRef.current = null;
    };
  }, []);

  // Primitive project-site fields so the effects below only re-run when the
  // resolved location really changes (not on every parent re-render).
  const siteLat = projectSite?.latitude ?? null;
  const siteLng = projectSite?.longitude ?? null;
  const siteBbox = projectSite?.boundingBox?.join(",") ?? "";
  const siteRank = projectSite?.placeRank ?? null;
  const hasSite = siteLat != null && siteLng != null;

  // Project Site mode flag on the map container. This must be a classList
  // toggle, NOT a React className change: Leaflet adds its own classes to this
  // element (leaflet-container, leaflet-fade-anim, ...), and re-rendering the
  // className attribute wipes them — which strips the `.leaflet-container
  // .leaflet-tile { max-width: none }` rule and lets Tailwind's `img {
  // max-width: 100% }` collapse every map tile to zero width (blank map).
  React.useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    map.getContainer().classList.toggle("hawk-project-mode", hasSite);
    // Project Site mode is a clean geographic map: take the Raider radar off
    // the map entirely (not just fade it) and put it back when the project
    // location is cleared.
    const radar = raiderMarkerRef.current;
    if (radar) {
      if (hasSite && map.hasLayer(radar)) radar.remove();
      else if (!hasSite && !map.hasLayer(radar)) radar.addTo(map);
    }
  }, [ready, hasSite]);

  // Basemap per mode: the existing Esri light-gray layers for the Raider
  // System; a full street map (with its attribution) for Project Site mode.
  // If the active street provider returns no tiles at all, move to the next
  // one and say so in the console rather than leaving a blank map.
  React.useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (!hasSite) {
      for (const layer of raiderTilesRef.current) if (!map.hasLayer(layer)) layer.addTo(map);
      map.invalidateSize();
      return;
    }

    // Exactly one basemap in Project Site mode: drop the Raider layers and any
    // other tile layer still attached.
    map.eachLayer((existing) => {
      if (existing instanceof L.TileLayer) map.removeLayer(existing);
    });

    const index = Math.min(siteProvider, SITE_TILE_PROVIDERS.length - 1);
    const provider = SITE_TILE_PROVIDERS[index];
    const layer = L.tileLayer(provider.url, {
      maxZoom: 18,
      maxNativeZoom: provider.maxNativeZoom,
      minZoom: 2,
      attribution: provider.attribution,
      subdomains: provider.subdomains ?? "abc",
    });

    let loaded = 0;
    let failed = 0;
    // Named handlers, removed individually below. NEVER call `layer.off()`
    // with no arguments: Leaflet registers its own `remove` listener on the
    // layer (Layer._layerAdd) that detaches the layer's map events, and a
    // blanket off() deletes it. The dead layer's `viewreset`/`zoomanim`
    // handlers then stay on the map with `_map === null`, and the next
    // pan/zoom/flyTo throws "Cannot read properties of null (reading
    // 'getCenter' / 'project')".
    const onTileLoad = () => {
      loaded += 1;
      if (loaded === 1) setTilesFailed(false);
    };
    const onTileError = (e: import("leaflet").TileErrorEvent) => {
      failed += 1;
      if (failed === 1) {
        console.warn(`[map] ${provider.name} tile failed to load:`, e.tile?.src);
      }
      if (loaded === 0 && failed >= 4) {
        if (index < SITE_TILE_PROVIDERS.length - 1) {
          console.warn(`[map] ${provider.name} returned no tiles — switching to the next provider.`);
          setSiteProvider(index + 1);
        } else {
          console.error("[map] No map provider returned tiles. Check network access to the tile servers.");
          setTilesFailed(true);
        }
      }
    };
    layer.on("tileload", onTileLoad);
    layer.on("tileerror", onTileError);

    layer.addTo(map);
    siteTilesRef.current = layer;
    map.invalidateSize();

    return () => {
      layer.off("tileload", onTileLoad);
      layer.off("tileerror", onTileError);
      // The map may already have been destroyed by the unmount cleanup.
      if (mapRef.current === map && map.hasLayer(layer)) map.removeLayer(layer);
      if (siteTilesRef.current === layer) siteTilesRef.current = null;
    };
  }, [ready, hasSite, siteProvider]);

  // Fly to the operational center (or back to the India overview) whenever
  // the resolved center coordinates change.
  React.useEffect(() => {
    if (!ready || !mapRef.current) return;
    // Project Site mode owns the camera (see the project-site effect below).
    if (hasSite) return;
    const map = mapRef.current;
    if (center && center.latitude != null && center.longitude != null) {
      map.flyTo([center.latitude, center.longitude], LOCATION_ZOOM, { duration: 1.1 });
    } else {
      map.flyTo(INDIA_CENTER, INDIA_OVERVIEW_ZOOM, { duration: 1.1 });
    }
  }, [ready, center, hasSite]);

  // Project Site mode: exactly one pin at the resolved coordinates (the old
  // one is removed first), and the camera moves there at a zoom matched to
  // how specific the address is. Normal Leaflet pan/zoom stays enabled.
  React.useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (siteMarkerRef.current) {
      siteMarkerRef.current.remove();
      siteMarkerRef.current = null;
    }
    if (siteLat == null || siteLng == null) return;

    const icon = L.divIcon({
      className: "",
      html: SITE_PIN_HTML,
      iconSize: [30, 40],
      iconAnchor: [15, 39],
    });
    siteMarkerRef.current = L.marker([siteLat, siteLng], {
      icon,
      keyboard: false,
      interactive: false,
      zIndexOffset: 1200,
    }).addTo(map);

    map.flyTo([siteLat, siteLng], zoomForSite(L, map, siteBbox, siteRank), { duration: 1.1 });
  }, [ready, siteLat, siteLng, siteBbox, siteRank]);

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

    // In Project Site mode the project pin replaces this Raider locator.
    if (hasSite) return;

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
  }, [ready, center, hasSite]);

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

  return (
    <>
      <div ref={containerRef} className={className} />
      {hasSite && tilesFailed && (
        <div
          role="alert"
          className="border-border bg-card/95 text-muted-foreground pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-xl border px-3 py-1.5 text-[11px] shadow"
        >
          Map tiles couldn&apos;t be loaded. Check your internet connection.
        </div>
      )}
    </>
  );
}

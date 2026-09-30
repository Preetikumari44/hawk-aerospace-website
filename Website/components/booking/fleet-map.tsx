"use client";

// ---------------------------------------------------------------------------
// Raider System — live fleet tracking map. A dedicated Leaflet layer for the
// FlightRadar24-style upgrade (customer/pilot/admin tracking views), built
// alongside india-map.tsx rather than inside it: india-map.tsx stays exactly
// as-is for the existing "Book a Raider" operator-dispatch step, and this
// component owns the post-booking live-tracking experience so neither one
// risks the other's behavior.
//
// Reuses the same Esri light-gray basemap + `isolate`/z-index approach that
// fixed the original Raider radar visibility bug (see india-map.tsx), and
// the same "aircraft glyph, never a dot" marker language (aircraft-icon.tsx)
// everywhere a drone is drawn.
// ---------------------------------------------------------------------------

import "leaflet/dist/leaflet.css";

import * as React from "react";

import { haversineKm } from "@/lib/booking/tracking";
import type { DroneTelemetry, FleetPilot, FleetTechnician } from "@/lib/booking/types";

import { aircraftIconHtml, STATUS_COLOR } from "./aircraft-icon";
import { attachRaiderZoomScale, raiderMarkerHtml } from "./raider-marker";
import {
  incidentIconHtml,
  pilotIconHtml,
  RESOURCE_STATUS_LABEL,
  technicianIconHtml,
} from "./resource-icons";

const INDIA_CENTER: [number, number] = [15.3, 76.5];
// Reference point for the compact "X km" distance shown in pilot/technician
// tooltips (§7/§8) — the map has no single "operational center" of its own
// outside an active booking, so distances are shown relative to HQ.
const HQ_REFERENCE = { latitude: 12.9716, longitude: 77.5946 };
const INDIA_OVERVIEW_ZOOM = 6;
const FOLLOW_ZOOM = 13;
const TRAIL_MAX_POINTS = 400;

export interface FleetMapHandle {
  fitAll: () => void;
  flyToSelected: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface FleetMapProps {
  className?: string;
  telemetry: DroneTelemetry[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  /** When true, the map re-centers on the selected drone every tick. */
  follow?: boolean;
  /** Drones that always render with the highlighted/selected glyph styling
   * (e.g. the customer's own booked Raider), independent of `selectedId` —
   * so it stays visually distinguishable even while another drone is
   * selected for viewing. */
  emphasizedIds?: string[];
  /** Pilots to plot as dedicated person markers (§6/§7) — omit to hide. */
  pilots?: FleetPilot[];
  /** Technicians to plot as dedicated wrench markers (§6/§8) — omit to hide. */
  technicians?: FleetTechnician[];
  /** Live incident/breakdown to highlight (§9/§19) — draws an alert marker
   * plus a route line from the responding technician to the affected drone. */
  incident?: {
    droneLocation: { latitude: number; longitude: number };
    technicianLocation: { latitude: number; longitude: number };
    showRoute: boolean;
  } | null;
  /** Geographic point the Raider System radar HUD should track — the
   * booked drone's live position on the tracking page. A real Leaflet
   * marker (see raider-marker.ts), not a fixed CSS overlay: it pans/zooms/
   * follows exactly like any other marker. Omit/null to hide the radar. */
  raiderTarget?: { latitude: number; longitude: number } | null;
  /** Currently-selected pilot/technician (Part 3/4) — gives that one
   * marker a subtle highlight; independent of the drone `selectedId`. */
  selectedPilotId?: string | null;
  selectedTechnicianId?: string | null;
  onSelectPilot?: (id: string) => void;
  onSelectTechnician?: (id: string) => void;
}

export const FleetMap = React.forwardRef<FleetMapHandle, FleetMapProps>(function FleetMap(
  {
    className,
    telemetry,
    selectedId,
    onSelect,
    follow = false,
    emphasizedIds,
    pilots,
    technicians,
    incident,
    raiderTarget,
    selectedPilotId,
    selectedTechnicianId,
    onSelectPilot,
    onSelectTechnician,
  },
  ref,
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<import("leaflet").Map | null>(null);
  const leafletRef = React.useRef<typeof import("leaflet") | null>(null);
  const aircraftLayerRef = React.useRef<import("leaflet").LayerGroup | null>(null);
  const routeLayerRef = React.useRef<import("leaflet").LayerGroup | null>(null);
  const trailLayerRef = React.useRef<import("leaflet").LayerGroup | null>(null);
  const resourceLayerRef = React.useRef<import("leaflet").LayerGroup | null>(null);
  const raiderMarkerRef = React.useRef<import("leaflet").Marker | null>(null);
  const raiderZoomCleanupRef = React.useRef<(() => void) | null>(null);
  const markersRef = React.useRef<Map<string, import("leaflet").Marker>>(new Map());
  const trailsRef = React.useRef<Map<string, [number, number][]>>(new Map());
  const [ready, setReady] = React.useState(false);

  const onSelectRef = React.useRef(onSelect);
  React.useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const onSelectPilotRef = React.useRef(onSelectPilot);
  React.useEffect(() => {
    onSelectPilotRef.current = onSelectPilot;
  }, [onSelectPilot]);

  const onSelectTechnicianRef = React.useRef(onSelectTechnician);
  React.useEffect(() => {
    onSelectTechnicianRef.current = onSelectTechnician;
  }, [onSelectTechnician]);
  const selectedIdRef = React.useRef(selectedId);
  selectedIdRef.current = selectedId;

  const fitAll = React.useCallback(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const points = telemetry.map((t) => [t.latitude, t.longitude] as [number, number]);
    if (points.length === 0) {
      map.flyTo(INDIA_CENTER, INDIA_OVERVIEW_ZOOM, { duration: 0.8 });
      return;
    }
    if (points.length === 1) {
      map.flyTo(points[0], FOLLOW_ZOOM, { duration: 0.8 });
      return;
    }
    map.flyToBounds(L.latLngBounds(points), { padding: [56, 56], duration: 0.9, maxZoom: 12 });
  }, [telemetry]);

  const flyToSelected = React.useCallback(() => {
    const map = mapRef.current;
    const id = selectedIdRef.current;
    if (!map || !id) return;
    const current = telemetry.find((t) => t.droneId === id);
    if (!current) return;
    map.flyTo([current.latitude, current.longitude], Math.max(map.getZoom(), FOLLOW_ZOOM), {
      duration: 0.9,
    });
  }, [telemetry]);

  React.useImperativeHandle(
    ref,
    () => ({
      fitAll,
      flyToSelected,
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
    }),
    [fitAll, flyToSelected],
  );

  // Mount: create the map once, client-side only.
  React.useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: INDIA_CENTER,
        zoom: INDIA_OVERVIEW_ZOOM,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      const esriAttribution = "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ";
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

      const setZoomScale = () => {
        const scale = Math.min(1.6, Math.max(0.6, map.getZoom() / 8));
        map.getContainer().style.setProperty("--hawk-zoom-scale", String(scale));
      };
      map.on("zoomend", setZoomScale);
      setZoomScale();
      raiderZoomCleanupRef.current = attachRaiderZoomScale(map);

      routeLayerRef.current = L.layerGroup().addTo(map);
      trailLayerRef.current = L.layerGroup().addTo(map);
      aircraftLayerRef.current = L.layerGroup().addTo(map);
      resourceLayerRef.current = L.layerGroup().addTo(map);

      // Raider System radar HUD — a real geographically-anchored marker
      // (raider-marker.ts), hidden until a raiderTarget is supplied.
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
        opacity: 0,
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
      aircraftLayerRef.current = null;
      routeLayerRef.current = null;
      trailLayerRef.current = null;
      resourceLayerRef.current = null;
      raiderMarkerRef.current = null;
      markersRef.current.clear();
      trailsRef.current.clear();
    };
  }, []);

  // Raider marker follows raiderTarget exactly — the SAME coordinates
  // already used by the drone marker, never a separate fake position
  // (§5/§6/§9). Hidden (opacity 0) when there's no target to track.
  React.useEffect(() => {
    if (!ready || !raiderMarkerRef.current) return;
    if (raiderTarget) {
      raiderMarkerRef.current.setLatLng([raiderTarget.latitude, raiderTarget.longitude]);
      raiderMarkerRef.current.setOpacity(1);
    } else {
      raiderMarkerRef.current.setOpacity(0);
    }
  }, [ready, raiderTarget]);

  // Static-ish layer: route lines + start/destination markers. Redrawn only
  // when the set of drones or the selection changes (not every tick).
  const routeSignature = telemetry.map((t) => `${t.droneId}:${t.startLabel}:${t.destinationLabel}`).join("|");
  React.useEffect(() => {
    if (!ready || !leafletRef.current || !routeLayerRef.current) return;
    const L = leafletRef.current;
    const layer = routeLayerRef.current;
    layer.clearLayers();

    const dotIcon = (color: string) =>
      L.divIcon({
        className: "",
        html: `<span style="display:block;width:9px;height:9px;border-radius:9999px;background:${color};box-shadow:0 0 6px ${color};border:1.5px solid white;"></span>`,
        iconSize: [9, 9],
        iconAnchor: [4, 4],
      });

    for (const t of telemetry) {
      const isFlying =
        t.status === "en-route" ||
        t.status === "arriving" ||
        t.status === "on-mission" ||
        t.status === "hovering" ||
        t.status === "returning" ||
        t.status === "landing";
      if (!isFlying) continue; // grounded/available/offline/maintenance drones have no route to draw

      const selected = t.droneId === selectedId;
      const color = selected ? "#4f7cff" : STATUS_COLOR[t.status];
      const start: [number, number] = [t.startLatitude, t.startLongitude];
      const dest: [number, number] = [t.destinationLatitude, t.destinationLongitude];

      // Full planned route, start -> destination, dashed and muted unless
      // this is the focused drone.
      L.polyline([start, dest], {
        color,
        weight: selected ? 2.5 : 1.25,
        opacity: selected ? 0.55 : 0.25,
        dashArray: "2 8",
      }).addTo(layer);

      if (selected) {
        L.marker(start, { icon: dotIcon("#22c55e"), keyboard: false, interactive: false })
          .bindTooltip(`Start · ${t.startLabel}`, { direction: "top" })
          .addTo(layer);
        L.marker(dest, { icon: dotIcon("#ef4444"), keyboard: false, interactive: false })
          .bindTooltip(`Destination · ${t.destinationLabel}`, { direction: "top" })
          .addTo(layer);
      }
    }
  }, [ready, routeSignature, selectedId, telemetry]);

  // Trail (flight history) for the selected drone — accumulate real visited
  // points as telemetry ticks in, capped so it doesn't grow unbounded.
  React.useEffect(() => {
    if (!ready || !leafletRef.current || !trailLayerRef.current) return;
    const L = leafletRef.current;
    const layer = trailLayerRef.current;

    for (const t of telemetry) {
      const key = t.droneId;
      const points = trailsRef.current.get(key) ?? [];
      const last = points[points.length - 1];
      if (!last || Math.abs(last[0] - t.latitude) > 1e-6 || Math.abs(last[1] - t.longitude) > 1e-6) {
        points.push([t.latitude, t.longitude]);
        if (points.length > TRAIL_MAX_POINTS) points.shift();
        // Mission restart (progress snapped back near 0 after being high) —
        // start a fresh trail instead of drawing a line across the map.
        if (points.length > 2) {
          const prev = points[points.length - 2];
          const jumpKm = Math.hypot(prev[0] - t.latitude, prev[1] - t.longitude);
          if (jumpKm > 0.5) {
            trailsRef.current.set(key, [[t.latitude, t.longitude]]);
            continue;
          }
        }
        trailsRef.current.set(key, points);
      }
    }

    layer.clearLayers();
    if (selectedId) {
      const points = trailsRef.current.get(selectedId);
      if (points && points.length > 1) {
        L.polyline(points, { color: "var(--brand, #4f7cff)", weight: 3, opacity: 0.75 }).addTo(layer);
      }
    }
  }, [ready, telemetry, selectedId]);

  // Aircraft markers — updated every tick, smoothly (CSS-transitioned
  // rotation) rather than recreated, so movement reads as continuous flight
  // rather than a jump-cut.
  React.useEffect(() => {
    if (!ready || !leafletRef.current || !aircraftLayerRef.current) return;
    const L = leafletRef.current;
    const layer = aircraftLayerRef.current;
    const seen = new Set<string>();

    for (const t of telemetry) {
      seen.add(t.droneId);
      const selected = t.droneId === selectedId || (emphasizedIds?.includes(t.droneId) ?? false);
      const icon = L.divIcon({
        className: "",
        html: aircraftIconHtml({ heading: t.heading, status: t.status, selected, size: selected ? 30 : 24 }),
        iconSize: [selected ? 30 : 24, selected ? 30 : 24],
        iconAnchor: [selected ? 15 : 12, selected ? 15 : 12],
      });

      let marker = markersRef.current.get(t.droneId);
      if (!marker) {
        marker = L.marker([t.latitude, t.longitude], { icon, keyboard: false, zIndexOffset: selected ? 1000 : 0 });
        marker.on("click", () => onSelectRef.current?.(t.droneId));
        marker.addTo(layer);
        markersRef.current.set(t.droneId, marker);
      } else {
        marker.setLatLng([t.latitude, t.longitude]);
        marker.setIcon(icon);
        marker.setZIndexOffset(selected ? 1000 : 0);
      }
      marker.bindTooltip(`${t.callsign} · ${Math.round(t.speedKmh)} km/h`, {
        direction: "top",
        offset: [0, -14],
      });
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [ready, telemetry, selectedId, emphasizedIds]);

  // Follow mode: recenter on the selected drone every tick, without forcing
  // the zoom level — the user stays in control of zoom while followed.
  React.useEffect(() => {
    if (!ready || !mapRef.current || !follow || !selectedId) return;
    const current = telemetry.find((t) => t.droneId === selectedId);
    if (!current) return;
    mapRef.current.panTo([current.latitude, current.longitude], { animate: true, duration: 0.5 });
  }, [ready, follow, selectedId, telemetry]);

  // Pilot / technician / incident markers (§6/§7/§8/§9) — a dedicated layer
  // so they can be toggled/redrawn independently of the aircraft layer.
  // Rebuilt each tick (small counts, cheap) rather than diffed like the
  // aircraft markers, since pilots/technicians move far less often.
  React.useEffect(() => {
    if (!ready || !leafletRef.current || !resourceLayerRef.current) return;
    const L = leafletRef.current;
    const layer = resourceLayerRef.current;
    layer.clearLayers();

    for (const pilot of pilots ?? []) {
      const distanceKm = haversineKm(HQ_REFERENCE, pilot.location);
      const selected = pilot.id === selectedPilotId;
      const size = selected ? 28 : 22;
      const icon = L.divIcon({
        className: "",
        html: pilotIconHtml({ status: pilot.status, selected, size }),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([pilot.location.latitude, pilot.location.longitude], {
        icon,
        keyboard: false,
        interactive: !!onSelectPilotRef.current,
        zIndexOffset: selected ? 900 : 0,
      }).bindTooltip(`${pilot.name} · ${RESOURCE_STATUS_LABEL[pilot.status]} · ${distanceKm.toFixed(1)} km`, {
        direction: "top",
        offset: [0, -12],
      });
      marker.on("click", () => onSelectPilotRef.current?.(pilot.id));
      marker.addTo(layer);
    }

    for (const tech of technicians ?? []) {
      const distanceKm = haversineKm(HQ_REFERENCE, tech.location);
      const selected = tech.id === selectedTechnicianId;
      const size = selected ? 28 : 22;
      const icon = L.divIcon({
        className: "",
        html: technicianIconHtml({ status: tech.status, selected, size }),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([tech.location.latitude, tech.location.longitude], {
        icon,
        keyboard: false,
        interactive: !!onSelectTechnicianRef.current,
        zIndexOffset: selected ? 900 : 0,
      }).bindTooltip(`${tech.name} · ${RESOURCE_STATUS_LABEL[tech.status]} · ${distanceKm.toFixed(1)} km`, {
        direction: "top",
        offset: [0, -12],
      });
      marker.on("click", () => onSelectTechnicianRef.current?.(tech.id));
      marker.addTo(layer);
    }

    if (incident) {
      const droneLatLng: [number, number] = [incident.droneLocation.latitude, incident.droneLocation.longitude];
      const techLatLng: [number, number] = [
        incident.technicianLocation.latitude,
        incident.technicianLocation.longitude,
      ];
      const alertIcon = L.divIcon({
        className: "",
        html: incidentIconHtml({ size: 26 }),
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(droneLatLng, { icon: alertIcon, keyboard: false, zIndexOffset: 1200 })
        .bindTooltip("Incident · Fault Detected", { direction: "top", offset: [0, -14] })
        .addTo(layer);

      // The responding technician's own live position (§19) — separate from
      // the static technician pool markers above, since this one moves.
      const respondingIcon = L.divIcon({
        className: "",
        html: technicianIconHtml({ status: "responding", size: 24 }),
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker(techLatLng, { icon: respondingIcon, keyboard: false, zIndexOffset: 1100 })
        .bindTooltip("Technician · En Route to Incident", { direction: "top", offset: [0, -14] })
        .addTo(layer);

      if (incident.showRoute) {
        L.polyline([techLatLng, droneLatLng], {
          color: "#f97316",
          weight: 2.5,
          opacity: 0.7,
          dashArray: "3 7",
        }).addTo(layer);
      }
    }
  }, [ready, pilots, technicians, incident, selectedPilotId, selectedTechnicianId]);

  return <div ref={containerRef} className={className} />;
});

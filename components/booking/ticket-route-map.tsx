"use client";

// Point-to-point route map (leaflet) for ticket navigation: origin →
// destination markers + straight-line path + Google Maps deeplink.

import * as React from "react";

export interface RoutePoint {
  latitude: number;
  longitude: number;
  label: string;
}

export function TicketRouteMap({
  origin,
  destination,
}: {
  origin: RoutePoint;
  destination: RoutePoint;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<{ remove: () => void } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !ref.current) return;
      mapRef.current?.remove();
      const map = L.map(ref.current, { scrollWheelZoom: true }).setView(
        [(origin.latitude + destination.latitude) / 2, (origin.longitude + destination.longitude) / 2],
        11,
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
      }).addTo(map);
      const dot = (color: string) =>
        L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
      L.marker([origin.latitude, origin.longitude], { icon: dot("#3A6EA5") })
        .addTo(map)
        .bindPopup(origin.label);
      L.marker([destination.latitude, destination.longitude], { icon: dot("#1f9d55") })
        .addTo(map)
        .bindPopup(destination.label);
      L.polyline(
        [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude],
        ],
        { color: "#1f3b2f", weight: 3, dashArray: "8 6" },
      ).addTo(map);
      map.fitBounds(
        L.latLngBounds([origin.latitude, origin.longitude], [destination.latitude, destination.longitude]).pad(0.3),
      );
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [origin.latitude, origin.longitude, destination.latitude, destination.longitude, origin.label, destination.label]);

  return <div ref={ref} style={{ height: 240, width: "100%", borderRadius: 16, overflow: "hidden" }} />;
}

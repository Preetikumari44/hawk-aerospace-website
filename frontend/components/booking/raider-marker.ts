// ---------------------------------------------------------------------------
// The Raider System's radar HUD (rings, crosshair, sweep, center pulse) as a
// real, geographically-anchored Leaflet marker — NOT a fixed-position CSS
// overlay. Reused by both india-map.tsx (front page / "Book a Raider"
// search) and fleet-map.tsx (live tracking), so there is exactly one Raider
// implementation, positioned with real lat/lng and scaled by real zoom
// level, per the "must move/zoom/pan with the map, not just CSS" spec.
//
// Visual language (rings/crosshair/sweep/pulse) is unchanged — this only
// changes WHERE it lives (a Leaflet marker pane, not a fixed screen div) and
// HOW its size responds to zoom (a CSS custom property driven by
// `map.getZoom()`, not a static circle).
// ---------------------------------------------------------------------------

export const RAIDER_MARKER_BASE_PX = 240;

/** Static HTML for the radar marker's divIcon — plain inline styles, no
 * Tailwind utility classes, matching the existing aircraft/resource marker
 * pattern (aircraft-icon.tsx, resource-icons.tsx) so it renders correctly
 * regardless of Tailwind's content scan. Reuses the existing
 * `.radar-grid-lines` / `.radar-sweep` / `.radar-blip-ping` keyframe
 * animations from globals.css — same look as before, just relocated. */
export function raiderMarkerHtml(size = RAIDER_MARKER_BASE_PX): string {
  return `
    <div class="hawk-raider-marker" style="width:${size}px;height:${size}px;position:relative;transform:scale(var(--hawk-radar-scale, 1));transform-origin:center center;">
      <div class="radar-grid-lines" style="position:absolute;inset:0;border-radius:9999px;border:1px solid color-mix(in srgb, var(--brand) 45%, transparent);box-shadow:0 0 50px color-mix(in srgb, var(--brand) 12%, transparent), inset 0 0 50px color-mix(in srgb, var(--brand) 8%, transparent);"></div>
      <div style="position:absolute;top:50%;left:0;right:0;height:1px;transform:translateY(-50%);background:color-mix(in srgb, var(--brand) 30%, transparent);"></div>
      <div style="position:absolute;top:0;bottom:0;left:50%;width:1px;transform:translateX(-50%);background:color-mix(in srgb, var(--brand) 30%, transparent);"></div>
      <div class="radar-sweep" style="position:absolute;inset:0;border-radius:9999px;background:conic-gradient(from 0deg, transparent 0 82%, color-mix(in srgb, var(--brand) 40%, transparent));"></div>
      <div style="position:absolute;top:50%;left:50%;width:11px;height:11px;transform:translate(-50%,-50%);">
        <span class="radar-blip-ping" style="position:absolute;inset:0;border-radius:9999px;background:#ec4899;"></span>
        <span style="position:relative;display:block;width:100%;height:100%;border-radius:9999px;background:#ec4899;box-shadow:0 0 10px #ec4899, 0 0 3px #ec4899;"></span>
      </div>
    </div>
  `;
}

/**
 * Wires a `zoomend` listener that sets `--hawk-radar-scale` on the map
 * container — wider dynamic range than the subtle `--hawk-zoom-scale` used
 * for aircraft/resource markers, so at low zoom the radar genuinely shrinks
 * to a small geographic object instead of staying a giant fixed circle
 * (§8/§23), and at high zoom it grows to feel like a real scanning radius.
 * Returns a cleanup function.
 */
export function attachRaiderZoomScale(map: import("leaflet").Map): () => void {
  const update = () => {
    const scale = Math.min(2.1, Math.max(0.22, map.getZoom() / 7.2));
    map.getContainer().style.setProperty("--hawk-radar-scale", String(scale));
  };
  map.on("zoomend", update);
  update();
  return () => {
    map.off("zoomend", update);
  };
}

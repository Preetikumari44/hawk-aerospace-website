import type { ResourceAvailability } from "@/lib/booking/types";

// ---------------------------------------------------------------------------
// Distinct marker builders for pilots, technicians and incidents (§6/§7/§8).
// Deliberately different SHAPES (not just colors) from the drone rotor glyph
// in aircraft-icon.tsx, so a colorblind user or a quick glance can still
// tell drone vs pilot vs technician vs incident apart at a glance.
// ---------------------------------------------------------------------------

export const RESOURCE_STATUS_LABEL: Record<ResourceAvailability, string> = {
  available: "AVAILABLE",
  assigned: "ASSIGNED",
  busy: "BUSY",
  responding: "RESPONDING",
  offline: "OFFLINE",
};

export const RESOURCE_STATUS_COLOR: Record<ResourceAvailability, string> = {
  available: "#34d399",
  assigned: "#38bdf8",
  busy: "#f59e0b",
  responding: "#f472b6",
  offline: "#6b7280",
};

interface ResourceIconOptions {
  status: ResourceAvailability;
  selected?: boolean;
  size?: number;
}

/** PERSON / PILOT marker (§7) — a filled person glyph in a pin, distinct
 * from the drone's four-rotor glyph and the technician's wrench. */
export function pilotIconHtml({ status, selected, size = 24 }: ResourceIconOptions): string {
  const color = RESOURCE_STATUS_COLOR[status];
  const ring = selected ? "#4f7cff" : color;
  return `
    <span class="hawk-resource-marker" style="width:${size}px;height:${size}px;">
      <span class="hawk-resource-pulse" style="background:${ring}"></span>
      <span class="hawk-resource-pin" style="border-color:${ring};background:color-mix(in srgb, ${color} 22%, #0a0a0a 78%);">
        <svg viewBox="0 0 24 24" width="${Math.round(size * 0.6)}" height="${Math.round(size * 0.6)}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="7.5" r="3.4" fill="${color}" />
          <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      </span>
    </span>
  `;
}

/** WRENCH / TECHNICIAN marker (§8) — distinct pin shape + wrench glyph. */
export function technicianIconHtml({ status, selected, size = 24 }: ResourceIconOptions): string {
  const color = RESOURCE_STATUS_COLOR[status];
  const ring = selected ? "#4f7cff" : color;
  return `
    <span class="hawk-resource-marker" style="width:${size}px;height:${size}px;">
      <span class="hawk-resource-pulse" style="background:${ring}"></span>
      <span class="hawk-resource-pin hawk-resource-pin-square" style="border-color:${ring};background:color-mix(in srgb, ${color} 22%, #0a0a0a 78%);">
        <svg viewBox="0 0 24 24" width="${Math.round(size * 0.58)}" height="${Math.round(size * 0.58)}" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20.5 6.5a3.5 3.5 0 0 1-4.6 3.32L9.6 16.1a1.9 1.9 0 1 1-2.7-2.7l6.28-6.28A3.5 3.5 0 1 1 18 3.5l-2.1 2.1 1.3 1.3 2.1-2.1c.39.53.62 1.18.62 1.9z"
            fill="${color}"
          />
        </svg>
      </span>
    </span>
  `;
}

/** ALERT / INCIDENT marker (§9) — always red/orange regardless of any
 * status palette, so a fault is unmistakable on the map. */
export function incidentIconHtml({ size = 26 }: { size?: number } = {}): string {
  return `
    <span class="hawk-resource-marker hawk-anim-maintenance" style="width:${size}px;height:${size}px;">
      <span class="hawk-resource-pulse" style="background:#f97316"></span>
      <span class="hawk-resource-pin hawk-resource-pin-alert" style="border-color:#f97316;background:color-mix(in srgb, #f97316 28%, #0a0a0a 72%);">
        <svg viewBox="0 0 24 24" width="${Math.round(size * 0.58)}" height="${Math.round(size * 0.58)}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3 22 20H2Z" fill="none" stroke="#f97316" stroke-width="2" stroke-linejoin="round" />
          <rect x="11" y="9.5" width="2" height="5" rx="1" fill="#f97316" />
          <circle cx="12" cy="16.5" r="1.15" fill="#f97316" />
        </svg>
      </span>
    </span>
  `;
}

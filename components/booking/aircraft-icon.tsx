// ---------------------------------------------------------------------------
// Drone/Raider marker — a real top-down DRONE silhouette (quadcopter body,
// four arms + rotors, a nose chevron marking the front), never a dot, pin,
// or circle. This is the single reusable marker used everywhere a Raider is
// drawn: Fleet Map, Raider System/Radar, Live Tracking, My Bookings, Follow
// mode — see call sites for the full list. Points north (heading 0°) by
// default; callers rotate the whole glyph to the drone's actual heading.
// ---------------------------------------------------------------------------

import type { DroneStatus } from "@/lib/booking/types";

export const STATUS_LABEL: Record<DroneStatus, string> = {
  available: "AVAILABLE",
  ready: "READY",
  "en-route": "EN ROUTE",
  arriving: "ARRIVING",
  hovering: "HOVERING",
  "on-mission": "SERVICE IN PROGRESS",
  returning: "RETURNING",
  landing: "LANDING",
  maintenance: "MAINTENANCE",
  offline: "OFFLINE",
  completed: "MISSION COMPLETED",
};

// Preferred palette from the Raider System spec: available = yellow,
// active/in flight = pink/magenta, busy (returning/landing) = orange,
// offline = muted, completed = green. A drone's own SELECTED/highlighted
// state (see aircraftIconHtml) always overrides this with the brand color,
// so a customer's booked Raider is never forced into the generic "active"
// pink — see components/booking/booking-tracking-view.tsx.
export const STATUS_COLOR: Record<DroneStatus, string> = {
  available: "#facc15",
  ready: "#facc15",
  "en-route": "#ec4899",
  arriving: "#f472b6",
  hovering: "#38bdf8",
  "on-mission": "#a855f7",
  returning: "#f59e0b",
  landing: "#f59e0b",
  maintenance: "#f97316",
  offline: "#6b7280",
  completed: "#22c55e",
};

// Distinct per-status marker animation classes (§1) — flying reads as
// travel (bob + directional trail), hovering reads as holding position
// (gentle float, zero forward motion), working pulses in the service color
// so "the drone is doing the booked service here" is visually obvious
// without needing to read the label.
export const STATUS_ANIMATION_CLASS: Record<DroneStatus, string> = {
  available: "",
  ready: "hawk-anim-idle",
  "en-route": "hawk-anim-flying",
  arriving: "hawk-anim-arriving",
  hovering: "hawk-anim-hovering",
  "on-mission": "hawk-anim-working",
  returning: "hawk-anim-flying",
  landing: "hawk-anim-arriving",
  maintenance: "hawk-anim-maintenance",
  offline: "",
  completed: "",
};

export const SELECTED_COLOR = "var(--brand, #4f7cff)";

interface AircraftGlyphProps {
  className?: string;
  size?: number;
  color?: string;
  heading?: number;
}

/** Standalone top-down drone SVG glyph for legends/telemetry panels (not a Leaflet marker). */
export function AircraftGlyph({ className, size = 16, color = "currentColor", heading = 0 }: AircraftGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ transform: `rotate(${heading}deg)`, transformOrigin: "50% 50%" }}
      aria-hidden
    >
      <DroneShape color={color} />
    </svg>
  );
}

/** The actual top-down drone silhouette — four diagonal arms with rotor
 * rings in an X configuration, a central body, and a small nose chevron so
 * the front (heading 0°/north) is always visually obvious once rotated. */
function DroneShape({ color }: { color: string }) {
  return (
    <g>
      <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill={color} transform="rotate(45 12 12)" />
      <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill={color} transform="rotate(135 12 12)" />
      <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill={color} transform="rotate(225 12 12)" />
      <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill={color} transform="rotate(315 12 12)" />
      <circle cx="12" cy="3.9" r="2.15" fill="none" stroke={color} strokeWidth="1.5" transform="rotate(45 12 12)" />
      <circle cx="12" cy="3.9" r="2.15" fill="none" stroke={color} strokeWidth="1.5" transform="rotate(135 12 12)" />
      <circle cx="12" cy="3.9" r="2.15" fill="none" stroke={color} strokeWidth="1.5" transform="rotate(225 12 12)" />
      <circle cx="12" cy="3.9" r="2.15" fill="none" stroke={color} strokeWidth="1.5" transform="rotate(315 12 12)" />
      <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.7" fill={color} />
      <path d="M12 5.7 L13.15 8.15 L10.85 8.15 Z" fill={color} />
    </g>
  );
}

interface AircraftIconOptions {
  heading: number;
  status: DroneStatus;
  selected: boolean;
  size?: number;
}

/**
 * Builds a Leaflet DivIcon for a fleet drone: rotates with heading, colors
 * by status (brand highlight when selected/emphasized), and adds a subtle
 * pulse for active/selected units. Scales up slightly on zoom via CSS (see
 * globals.css --hawk-zoom-scale) so it stays crisp zoomed in without
 * covering the map zoomed out. Also applies a per-status animation class
 * (§1) so FLYING, ARRIVING, HOVERING, WORKING and MAINTENANCE each read as
 * visually distinct states, never one generic "drone icon".
 */
export function aircraftIconHtml({ heading, status, selected, size = 26 }: AircraftIconOptions): string {
  const color = selected ? SELECTED_COLOR : STATUS_COLOR[status];
  const pulsing = selected || status === "en-route" || status === "on-mission" || status === "arriving";
  const glow = `drop-shadow(0 0 4px ${color}) drop-shadow(0 1px 1px rgba(0,0,0,0.45))`;
  const animClass = STATUS_ANIMATION_CLASS[status];

  return `
    <span class="hawk-aircraft-marker${selected ? " hawk-aircraft-marker-selected" : ""}" style="width:${size}px;height:${size}px;">
      ${pulsing ? '<span class="hawk-aircraft-pulse" style="background:' + color + '"></span>' : ""}
      <span class="hawk-aircraft-bob${animClass ? " " + animClass : ""}">
        <span class="hawk-aircraft-glyph" style="transform:rotate(${heading}deg);filter:${glow};color:${color}">
          <svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <g>
              <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill="currentColor" transform="rotate(45 12 12)" />
              <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill="currentColor" transform="rotate(135 12 12)" />
              <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill="currentColor" transform="rotate(225 12 12)" />
              <rect x="10.85" y="2.1" width="2.3" height="8.6" rx="1.15" fill="currentColor" transform="rotate(315 12 12)" />
              <circle cx="12" cy="3.9" r="2.15" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(45 12 12)" />
              <circle cx="12" cy="3.9" r="2.15" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(135 12 12)" />
              <circle cx="12" cy="3.9" r="2.15" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(225 12 12)" />
              <circle cx="12" cy="3.9" r="2.15" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(315 12 12)" />
              <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.7" fill="currentColor" />
              <path d="M12 5.7 L13.15 8.15 L10.85 8.15 Z" fill="currentColor" />
            </g>
          </svg>
        </span>
      </span>
      ${status === "maintenance" ? '<span class="hawk-aircraft-badge hawk-aircraft-badge-maintenance">⚠</span>' : ""}
    </span>
  `;
}

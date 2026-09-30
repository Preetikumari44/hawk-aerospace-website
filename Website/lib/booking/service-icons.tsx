import type { SVGProps } from "react";

import type { ServiceKey } from "./types";

// ---------------------------------------------------------------------------
// Custom drone-illustration icons for the "Choose Service" selector.
//
// Replaces the previous generic lucide-react outline icons (video camera /
// sprout / map / shield) with a small quadcopter glyph shared across all
// four services, paired with a service-specific accessory underneath (a
// camera gimbal, a spray fan over a field, a surveyed plot grid, a
// surveillance scan cone) — echoing the isometric drone-illustration
// reference provided for this update. Built as plain `currentColor`
// stroke/fill SVG (same prop shape as the lucide icons it replaces:
// `className` + `strokeWidth`) so it keeps working with the existing
// selected/unselected color treatment in service-selector.tsx without any
// other changes.
// ---------------------------------------------------------------------------

interface DroneIconProps extends SVGProps<SVGSVGElement> {
  strokeWidth?: number;
}

function Quadcopter({ strokeWidth = 1.75 }: { strokeWidth?: number }) {
  return (
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* Arms */}
      <path d="M20 15 L9 6.5 M28 15 L39 6.5 M20 19 L9 27.5 M28 19 L39 27.5" fill="none" />
      {/* Rotor hubs */}
      <circle cx="9" cy="6.5" r="3.4" fill="none" />
      <circle cx="39" cy="6.5" r="3.4" fill="none" />
      <circle cx="9" cy="27.5" r="3.4" fill="none" />
      <circle cx="39" cy="27.5" r="3.4" fill="none" />
      {/* Blade ticks */}
      <path d="M5.2 6.5h7.6 M9 2.7v7.6 M35.2 6.5h7.6 M39 2.7v7.6" opacity={0.55} />
      <path d="M5.2 27.5h7.6 M9 23.7v7.6 M35.2 27.5h7.6 M39 23.7v7.6" opacity={0.55} />
      {/* Body */}
      <rect x="19" y="14" width="10" height="6" rx="2" fill="none" />
    </g>
  );
}

export function DroneVideographyIcon({ className, strokeWidth = 1.75, ...props }: DroneIconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <Quadcopter strokeWidth={strokeWidth} />
      {/* Gimbal strut + camera */}
      <path d="M24 20v4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <rect
        x="18.5"
        y="24"
        width="11"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle cx="24" cy="28" r="2.4" stroke="currentColor" strokeWidth={strokeWidth} fill="none" />
      <path
        d="M29.2 26.2 L33 24.5 V31.5 L29.2 29.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function DroneSprayingIcon({ className, strokeWidth = 1.75, ...props }: DroneIconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <Quadcopter strokeWidth={strokeWidth} />
      {/* Spray fan */}
      <path
        d="M24 20 L14 37 M24 20 L19.5 38.5 M24 20 L28.5 38.5 M24 20 L34 37"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
        opacity={0.65}
      />
      {/* Field rows */}
      <path
        d="M11 41h26 M13.5 44h21"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DroneMappingIcon({ className, strokeWidth = 1.75, ...props }: DroneIconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <Quadcopter strokeWidth={strokeWidth} />
      {/* Surveyed plot grid */}
      <path d="M24 20v6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <rect
        x="11"
        y="27"
        width="26"
        height="15"
        rx="1.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <path
        d="M20 27v15 M28 27v15 M11 32h26 M11 37h26"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.7}
        opacity={0.55}
      />
    </svg>
  );
}

export function DroneSurveillanceIcon({ className, strokeWidth = 1.75, ...props }: DroneIconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <Quadcopter strokeWidth={strokeWidth} />
      {/* Scan cone */}
      <path
        d="M24 20 L14 40 H34 Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <path
        d="M18.5 33h11"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.75}
        strokeLinecap="round"
        opacity={0.6}
      />
      {/* Watched structure */}
      <rect
        x="20.5"
        y="34.5"
        width="7"
        height="5.5"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        fill="none"
      />
    </svg>
  );
}

// Icon per service, kept alongside (not inside) the plain data module so
// lib/booking/data.ts stays JSX-free. Used by the Choose Service selector.
export const SERVICE_ICONS: Record<ServiceKey, (props: DroneIconProps) => React.JSX.Element> = {
  videography: DroneVideographyIcon,
  spraying: DroneSprayingIcon,
  mapping: DroneMappingIcon,
  surveillance: DroneSurveillanceIcon,
};

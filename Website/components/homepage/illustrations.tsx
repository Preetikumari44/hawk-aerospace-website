import { cn } from "@/lib/utils";

type IconProps = React.SVGProps<SVGSVGElement>;

const base = "size-8";

export function IconDrone({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <circle cx="24" cy="24" r="6" />
      <path d="M14 14 L20 20 M34 14 L28 20 M14 34 L20 28 M34 34 L28 28" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="36" cy="12" r="4" />
      <circle cx="12" cy="36" r="4" />
      <circle cx="36" cy="36" r="4" />
      <path d="M24 30 L24 40" strokeDasharray="1 3" opacity="0.6" />
    </svg>
  );
}

export function IconAiBrain({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <path d="M24 8c-6 0-10 4-10 9 0 3 1.5 5 3 6.5-1.5 1-3 3-3 6 0 5 4 8.5 10 8.5s10-3.5 10-8.5c0-3-1.5-5-3-6 1.5-1.5 3-3.5 3-6.5 0-5-4-9-10-9Z" />
      <path d="M24 8v30M18 15c2 1 3.5 2.5 3.5 4.5M30 15c-2 1-3.5 2.5-3.5 4.5M17 27c2-1 4-1 5.5.5M31 27c-2-1-4-1-5.5.5" />
      <circle cx="24" cy="38" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconGisLayers({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <path d="M24 8 42 18 24 28 6 18Z" />
      <path d="M6 26l18 10 18-10" opacity="0.7" />
      <path d="M6 34l18 10 18-10" opacity="0.4" />
    </svg>
  );
}

export function IconSatellite({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <rect x="18" y="18" width="12" height="12" rx="2" transform="rotate(45 24 24)" />
      <path d="M8 12 L16 20 M40 12 L32 20 M8 36 L16 28 M40 36 L32 28" />
      <rect x="4" y="8" width="8" height="8" rx="1" />
      <rect x="36" y="8" width="8" height="8" rx="1" />
      <rect x="4" y="32" width="8" height="8" rx="1" />
      <rect x="36" y="32" width="8" height="8" rx="1" />
      <path d="M27 21 L38 10" strokeDasharray="1 3" opacity="0.6" />
    </svg>
  );
}

export function IconDigitalTwin({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <path d="M10 30 L24 22 L38 30 L24 38 Z" />
      <path d="M10 30 L10 20 L24 12 L38 20 L38 30" opacity="0.5" />
      <path d="M24 22 L24 12" opacity="0.5" />
      <circle cx="24" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="20" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="38" cy="20" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCloud({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <path d="M15 32a7 7 0 0 1-1-13.9A9 9 0 0 1 31 14a7.5 7.5 0 0 1 3 14.4" />
      <path d="M15 32h18a5 5 0 0 0 0-10" />
      <path d="M20 37v4M28 37v4M24 37v6" opacity="0.6" />
    </svg>
  );
}

export function IconFlightPath({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <path d="M6 36c8-2 10-10 18-12s10 4 18-6" strokeDasharray="2 4" />
      <circle cx="6" cy="36" r="2" fill="currentColor" stroke="none" />
      <circle cx="42" cy="18" r="2.4" />
      <path d="M39 15 L42 18 L39 21 M42 18 L46 18" />
    </svg>
  );
}

export function IconSensors({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" />
      <circle cx="24" cy="24" r="9" opacity="0.7" />
      <circle cx="24" cy="24" r="16" opacity="0.35" />
      <path d="M24 8v4M24 36v4M8 24h4M36 24h4" />
    </svg>
  );
}

export function IconMapping({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <path d="M8 12l10-3 12 4 10-3v27l-10 3-12-4-10 3Z" />
      <path d="M18 9v27M30 13v27" />
      <circle cx="24" cy="24" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconAgriculture({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <path d="M24 40V22" />
      <path d="M24 26c0-7-6-9-11-9 0 7 4 11 11 9Z" />
      <path d="M24 22c0-8 7-10 13-10 0 8-5 12-13 10Z" />
      <path d="M8 40h32" />
    </svg>
  );
}

export function IconLidar({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <circle cx="24" cy="10" r="3" />
      <path d="M24 13v6" />
      <path d="M24 19 L10 40 M24 19 L18 40 M24 19 L24 40 M24 19 L30 40 M24 19 L38 40" opacity="0.7" />
    </svg>
  );
}

export function IconThermal({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <rect x="20" y="6" width="8" height="24" rx="4" />
      <circle cx="24" cy="36" r="6" />
      <path d="M24 30v-1" strokeWidth="3" />
    </svg>
  );
}

export function IconInspection({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={1.6}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(base, className)}
      {...props}
    >
      <circle cx="20" cy="20" r="12" />
      <path d="M29 29 L40 40" />
      <path d="M14 20 L18 24 L27 15" />
    </svg>
  );
}

// Line-icon set (ported from the react-native-svg version to plain SVG).
// Color comes from `currentColor`, so set it with a Tailwind text-* class.
import type { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number;
  strokeWidth?: number;
}

function Svg({ size = 18, strokeWidth = 1.8, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPerson = (p: IconProps) => (
  <Svg size={20} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </Svg>
);

// paper-plane style glyph used for the Pilot / drone role
export const IconDrone = (p: IconProps) => (
  <Svg size={20} {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </Svg>
);

export const IconTruck = (p: IconProps) => (
  <Svg size={20} {...p}>
    <path d="M2 8h11v8H2z" />
    <path d="M13 11h4l4 3v2h-8z" />
    <circle cx="6.5" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Svg>
);

export const IconWrench = (p: IconProps) => (
  <Svg size={20} {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
  </Svg>
);

export const IconGrid = ({ size = 18, ...rest }: IconProps) => {
  const dots = [3.5, 12, 20.5];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
      {dots.map((cy) => dots.map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" />))}
    </svg>
  );
};

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg size={20} {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg size={20} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h5v-6h4v6h5V10" />
  </Svg>
);

export const IconBookings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v15H4z" />
    <line x1="4" y1="9.5" x2="20" y2="9.5" />
    <line x1="7.5" y1="13.5" x2="16.5" y2="13.5" />
    <line x1="7.5" y1="17" x2="14" y2="17" />
  </Svg>
);

export const IconCommission = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 8h4.2a2 2 0 0 1 0 4H9.5" />
    <line x1="9.5" y1="10.5" x2="14.5" y2="10.5" />
    <path d="M9.5 12 14 17" />
  </Svg>
);

export const IconStore = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M5 12v8h14v-8" />
  </Svg>
);

export const IconChevronDown = ({ size = 12, strokeWidth = 2, ...rest }: IconProps) => (
  <Svg size={size} strokeWidth={strokeWidth} {...rest}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const IconChevronUp = ({ size = 12, strokeWidth = 2, ...rest }: IconProps) => (
  <Svg size={size} strokeWidth={strokeWidth} {...rest}>
    <path d="M6 15l6-6 6 6" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg size={16} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Svg>
);

export const IconUser = (p: IconProps) => <IconPerson size={16} {...p} />;

export const IconSettings = (p: IconProps) => (
  <Svg size={16} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg size={16} {...p}>
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M14 6l6 6-6 6" />
  </Svg>
);

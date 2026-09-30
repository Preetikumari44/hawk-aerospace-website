// src/components/icons/index.js
// Small line-icon set built with react-native-svg so the app never relies
// on emoji for functional UI (workspace switcher, sidebar, header).
// Each icon accepts { size, color, strokeWidth }.
import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';

const base = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconPerson({ size = 20, color = '#0B3D2E', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconDrone({ size = 20, color = '#0B3D2E', strokeWidth = 1.8 }) {
  // paper-plane style glyph used for the Pilot / drone role
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2 11 13" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M22 2 15 22l-4-9-9-4 20-7z" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconTruck({ size = 20, color = '#0B3D2E', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 8h11v8H2z" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M13 11h4l4 3v2h-8z" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Circle cx="6.5" cy="18" r="1.6" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Circle cx="17" cy="18" r="1.6" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconWrench({ size = 20, color = '#0B3D2E', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...base}
      />
    </Svg>
  );
}

export function IconGrid({ size = 18, color = '#374151' }) {
  const dots = [3.5, 12, 20.5];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {dots.map((cy) => dots.map((cx) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill={color} />))}
    </Svg>
  );
}

export function IconBell({ size = 18, color = '#374151', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconHome({ size = 18, color = '#FFFFFF', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11.5 12 4l9 7.5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M5 10v10h5v-6h4v6h5V10" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconBookings({ size = 18, color = '#FFFFFF', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16v15H4z" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Line x1="4" y1="9.5" x2="20" y2="9.5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Line x1="7.5" y1="13.5" x2="16.5" y2="13.5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Line x1="7.5" y1="17" x2="14" y2="17" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconCommission({ size = 18, color = '#FFFFFF', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M9.5 8h4.2a2 2 0 0 1 0 4H9.5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Line x1="9.5" y1="10.5" x2="14.5" y2="10.5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M9.5 12 14 17" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconChevronDown({ size = 12, color = '#6B7280', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconChevronUp({ size = 12, color = '#6B7280', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 15l6-6 6 6" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconLogout({ size = 16, color = '#DC2626', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M16 17l5-5-5-5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

export function IconUser({ size = 16, color = '#111827', strokeWidth = 1.8 }) {
  return <IconPerson size={size} color={color} strokeWidth={strokeWidth} />;
}

export function IconSettings({ size = 16, color = '#111827', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...base}
      />
    </Svg>
  );
}

export function IconArrowRight({ size = 16, color = '#111827', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M14 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

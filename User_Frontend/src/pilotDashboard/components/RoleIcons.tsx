import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

export const PersonIcon: React.FC<IconProps> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth={1.8} />
    <Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const TruckIcon: React.FC<IconProps> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="7" width="12" height="9" rx="1.2" stroke={color} strokeWidth={1.8} />
    <Path d="M14 10h4l3 3v3h-7v-6Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Circle cx="7" cy="18" r="1.6" stroke={color} strokeWidth={1.6} />
    <Circle cx="17.5" cy="18" r="1.6" stroke={color} strokeWidth={1.6} />
  </Svg>
);

export const PlaneIcon: React.FC<IconProps> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3v6.2L20 14v2l-8-2.4V18l2.6 1.8V21L12 20l-2.6 1v-1.2L12 18v-4.4L4 16v-2l8-4.8V3Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </Svg>
);

export const BagIcon: React.FC<IconProps> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="8" width="16" height="11" rx="1.4" stroke={color} strokeWidth={1.8} />
    <Path d="M8.5 8V6.5a2.5 2.5 0 0 1 2.5-2.5h2a2.5 2.5 0 0 1 2.5 2.5V8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const WrenchIcon: React.FC<IconProps> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.5 6.5a4 4 0 0 0-5.4 4.9L4 16.5V20h3.5l5.1-5.1a4 4 0 0 0 4.9-5.4l-2.7 2.7-2.1-2.1 2.8-2.6Z"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
);

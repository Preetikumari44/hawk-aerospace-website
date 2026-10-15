"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Vector "aerial capture" scenes.
 *
 * The project ships no aerial photography (public/images only contains the
 * four SkyMap screenshots), and no new binary assets were added, so these
 * scenes are drawn as SVG instead: an agricultural field mosaic, a
 * real-estate plot survey, and a contour terrain. They scale losslessly,
 * cost a few kB, and keep the homepage from reading as flat colour.
 *
 * Swap any of these for real photography by replacing the <AerialScene>
 * element with an <img>/<Image> — every caller already sits inside a fixed
 * aspect container with the green overlay applied on top.
 */

export type AerialVariant = "fields" | "estate" | "terrain";

const FIELD_TONES = [
  "#3f6b3a",
  "#4b7c41",
  "#5c8c49",
  "#6f9a52",
  "#87a95f",
  "#a2b874",
  "#7d9b4e",
  "#5a8544",
  "#46743e",
  "#9bb168",
];

function FieldsScene() {
  // Irregular quad parcels on a rotated grid — reads as farmland from above.
  const parcels: { d: string; tone: string }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const x = col * 180 - 60 + ((row % 2) * 40);
      const y = row * 150 - 40;
      const j = ((row * 7 + col) * 7) % FIELD_TONES.length;
      const skew = ((row * 13 + col * 29) % 40) - 20;
      parcels.push({
        d: `M${x} ${y} L${x + 172 + skew} ${y - 8} L${x + 166} ${y + 142} L${x - 6 + skew} ${y + 138} Z`,
        tone: FIELD_TONES[j],
      });
    }
  }

  return (
    <>
      <rect width="1200" height="700" fill="#2f5c33" />
      <g opacity="0.95">
        {parcels.map((parcel, index) => (
          <path key={index} d={parcel.d} fill={parcel.tone} opacity={0.9} />
        ))}
      </g>
      {/* Tractor / sprayer tracks */}
      <g stroke="#dfe7c8" strokeWidth="1" opacity="0.18">
        {Array.from({ length: 34 }).map((_, index) => (
          <line
            key={index}
            x1={index * 36 - 40}
            y1={0}
            x2={index * 36 + 30}
            y2={700}
          />
        ))}
      </g>
      {/* River */}
      <path
        d="M-20 520 C 180 470, 300 600, 520 540 S 900 430, 1220 490 L1220 700 L-20 700 Z"
        fill="#2a4f55"
        opacity="0.75"
      />
      <path
        d="M-20 520 C 180 470, 300 600, 520 540 S 900 430, 1220 490"
        fill="none"
        stroke="#7fb3ad"
        strokeWidth="3"
        opacity="0.5"
      />
      {/* Treeline */}
      <g fill="#24451f" opacity="0.6">
        {Array.from({ length: 26 }).map((_, index) => (
          <circle key={index} cx={index * 48 + 12} cy={640 + ((index * 17) % 30)} r={16 + ((index * 7) % 10)} />
        ))}
      </g>
    </>
  );
}

function EstateScene() {
  return (
    <>
      <rect width="1200" height="700" fill="#4a5c43" />
      {/* Ground blocks */}
      <g opacity="0.9">
        <rect x="-20" y="-20" width="640" height="420" fill="#56684c" />
        <rect x="620" y="-20" width="600" height="300" fill="#5d7052" />
        <rect x="-20" y="400" width="520" height="320" fill="#4f6147" />
        <rect x="500" y="280" width="720" height="440" fill="#596b4f" />
      </g>
      {/* Roads */}
      <g stroke="#cfcabc" strokeWidth="18" opacity="0.85" strokeLinecap="square">
        <line x1="-20" y1="392" x2="1220" y2="392" />
        <line x1="498" y1="-20" x2="498" y2="720" />
        <line x1="900" y1="280" x2="900" y2="720" />
      </g>
      <g stroke="#f0ede4" strokeWidth="2" strokeDasharray="14 16" opacity="0.6">
        <line x1="-20" y1="392" x2="1220" y2="392" />
        <line x1="498" y1="-20" x2="498" y2="720" />
      </g>
      {/* Building footprints with long aerial shadows */}
      <g>
        {[
          [60, 60, 180, 120],
          [280, 90, 140, 110],
          [70, 220, 150, 110],
          [300, 240, 150, 120],
          [700, 50, 160, 130],
          [920, 70, 220, 150],
          [600, 460, 210, 150],
          [960, 430, 190, 130],
          [120, 500, 180, 130],
          [320, 520, 120, 110],
        ].map(([x, y, w, h], index) => (
          <g key={index}>
            <rect x={x + 14} y={y + 16} width={w} height={h} fill="#26301f" opacity="0.4" />
            <rect x={x} y={y} width={w} height={h} fill={index % 3 === 0 ? "#d9d3c4" : "#c3bcad"} />
            <rect x={x} y={y} width={w} height={h * 0.28} fill="#8d8779" opacity="0.5" />
          </g>
        ))}
      </g>
      {/* Pool + landscaping */}
      <rect x="640" y="220" width="120" height="60" rx="10" fill="#4e9fb0" opacity="0.9" />
      <g fill="#33502b" opacity="0.75">
        {Array.from({ length: 22 }).map((_, index) => (
          <circle key={index} cx={((index * 97) % 1180) + 20} cy={((index * 211) % 660) + 20} r={13} />
        ))}
      </g>
    </>
  );
}

function TerrainScene() {
  return (
    <>
      <rect width="1200" height="700" fill="#2c4636" />
      <g fill="none" stroke="#8fbf9a" strokeWidth="1.4" opacity="0.35">
        {Array.from({ length: 16 }).map((_, index) => (
          <path
            key={index}
            d={`M-20 ${560 - index * 26} C 220 ${500 - index * 30}, 380 ${640 - index * 22}, 620 ${560 - index * 28} S 980 ${440 - index * 26}, 1220 ${520 - index * 30}`}
          />
        ))}
      </g>
      <g fill="none" stroke="#c9e2cd" strokeWidth="2.2" opacity="0.28">
        {[2, 7, 12].map((index) => (
          <path
            key={index}
            d={`M-20 ${560 - index * 26} C 220 ${500 - index * 30}, 380 ${640 - index * 22}, 620 ${560 - index * 28} S 980 ${440 - index * 26}, 1220 ${520 - index * 30}`}
          />
        ))}
      </g>
      {/* Transmission corridor */}
      <g stroke="#dfe7d8" strokeWidth="2" opacity="0.4">
        <line x1="-20" y1="180" x2="1220" y2="300" />
        {Array.from({ length: 9 }).map((_, index) => (
          <g key={index}>
            <line
              x1={index * 150 + 40}
              y1={195 + index * 14}
              x2={index * 150 + 40}
              y2={235 + index * 14}
            />
          </g>
        ))}
      </g>
    </>
  );
}

const SCENES: Record<AerialVariant, () => React.JSX.Element> = {
  fields: FieldsScene,
  estate: EstateScene,
  terrain: TerrainScene,
};

interface AerialSceneProps {
  variant?: AerialVariant;
  className?: string;
  /** Adds the drone flight path + radar ping overlay (hero only). */
  withFlightPath?: boolean;
}

export function AerialScene({
  variant = "fields",
  className,
  withFlightPath = false,
}: AerialSceneProps) {
  const Scene = SCENES[variant];
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
    >
      <Scene />
      {withFlightPath && (
        <g>
          <path
            d="M-20 600 C 240 540, 340 240, 600 280 S 940 460, 1220 180"
            fill="none"
            stroke="#d7f0dd"
            strokeWidth="2"
            strokeDasharray="10 12"
            opacity="0.7"
            className="hawk-flight-path"
          />
          <g transform="translate(600 280)">
            <circle r="34" fill="none" stroke="#d7f0dd" strokeWidth="1.5" opacity="0.35" />
            <circle r="18" fill="none" stroke="#d7f0dd" strokeWidth="1.5" opacity="0.5" />
            <circle r="30" fill="#d7f0dd" opacity="0.25" className="hawk-pulse-ring" />
            <circle r="5" fill="#ffffff" />
          </g>
        </g>
      )}
    </svg>
  );
}

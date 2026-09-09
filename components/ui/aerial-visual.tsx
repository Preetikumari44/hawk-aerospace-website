import { cn } from "@/lib/utils";

export function AerialVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 640"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full", className)}
      role="img"
      aria-label="Illustration of aerial reality capture converting terrain into a 3D geospatial digital twin"
    >
      <defs>
        <radialGradient id="skyGlow" cx="70%" cy="10%" r="70%">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="terrainFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="twinFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-foreground)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <rect width="1200" height="640" fill="url(#skyGlow)" />

      {/* Left half: physical terrain, drawn as a soft topographic contour field */}
      <g opacity="0.9">
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M0 ${120 + i * 42} C 150 ${100 + i * 42}, 300 ${150 + i * 42}, 480 ${110 + i * 42}`}
            stroke="url(#terrainFade)"
            strokeWidth="1.5"
            fill="none"
          />
        ))}
      </g>

      {/* Drone glyph + capture beam over the terrain */}
      <g transform="translate(360,150)">
        <line x1="0" y1="0" x2="0" y2="380" stroke="var(--brand)" strokeOpacity="0.35" strokeDasharray="4 6" />
        <circle cx="0" cy="0" r="5" fill="var(--brand-foreground)" />
        <circle cx="0" cy="0" r="12" stroke="var(--brand)" strokeOpacity="0.5" fill="none" />
        <path
          d="M-26 -4 h14 M12 -4 h14 M-4 -26 v14 M-4 12 v14"
          stroke="var(--foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform="translate(4,4)"
        />
        {[[-22, -22], [22, -22], [-22, 22], [22, 22]].map(([x, y], i) => (
          <circle key={i} cx={x + 4} cy={y + 4} r="6" fill="var(--foreground)" opacity="0.8" />
        ))}
      </g>

      {/* Right half: reconstructed 3D / GIS mesh grid (the digital twin) */}
      <g transform="translate(560,60)" opacity="0.95">
        {Array.from({ length: 11 }).map((_, row) => {
          const y = row * 32;
          const skew = row * 3;
          return (
            <path
              key={`h-${row}`}
              d={`M${skew} ${y + 40} L${560 - skew} ${y + 40}`}
              stroke="url(#twinFade)"
              strokeWidth="1"
              opacity={0.25 + row * 0.03}
            />
          );
        })}
        {Array.from({ length: 15 }).map((_, col) => {
          const x = col * 40;
          return (
            <path
              key={`v-${col}`}
              d={`M${x} 40 L${x + 30} 400`}
              stroke="url(#twinFade)"
              strokeWidth="1"
              opacity="0.2"
            />
          );
        })}
        {/* raised "building" blocks to suggest a digital twin */}
        {[
          [80, 260, 40, 90],
          [180, 220, 34, 130],
          [260, 280, 30, 70],
          [360, 200, 46, 150],
          [440, 250, 32, 100],
        ].map(([x, y, w, h], i) => (
          <rect
            key={i}
            x={x}
            y={y - h}
            width={w}
            height={h}
            fill="var(--brand)"
            fillOpacity="0.18"
            stroke="var(--brand-foreground)"
            strokeOpacity="0.7"
            strokeWidth="1"
          />
        ))}
        {/* scan points */}
        {[[100, 150], [260, 120], [420, 170], [500, 300], [150, 340]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="var(--brand-foreground)" />
            <circle cx={x} cy={y} r="9" stroke="var(--brand-foreground)" strokeOpacity="0.35" fill="none" />
          </g>
        ))}
      </g>

      {/* Base line separating "world" from "grid" */}
      <line x1="0" y1="560" x2="1200" y2="560" stroke="var(--border)" strokeOpacity="0.5" />
    </svg>
  );
}

"use client";

// Light "aerial cityscape at soft daylight" backdrop for the homepage hero /
// Book-a-Raider section, built entirely from CSS gradients + SVG shapes —
// there is no licensed aerial drone photograph available to drop in here, so
// this is a denser, more photographic-leaning illustrated stand-in matching
// the supplied reference: pale blue-to-warm sky, a layered hazy skyline with
// lit windows, a soft mountain ridge, a glass tower on the right edge, and a
// textured tree-line/park foreground. Swapping in a real photo later is a
// one-line change: replace this component's render with an <img>/next/image
// using the same absolute inset-0 wrapper.
//
// Purely decorative: aria-hidden, pointer-events-none, sits behind the
// hero's text and glass cards (negative z-index) and never intercepts
// clicks/scroll. No new dependencies, no client state — same drop-in
// footprint as before, so nothing else in the section changes.

// Two fixed skyline layouts (far / near) — plain data, no Math.random(), so
// server-rendered and client-rendered markup always match exactly (avoids
// any hydration mismatch).
const SKYLINE_LAYOUTS: Record<
  number,
  { x: number; y: number; w: number; h: number; windows: [number, number][] }[]
> = {
  0: [
    { x: 20, y: 60, w: 24, h: 100, windows: [[6, 12], [15, 12], [6, 24], [15, 24], [6, 36]] },
    { x: 60, y: 40, w: 18, h: 120, windows: [[5, 10], [5, 22], [5, 34], [5, 46]] },
    { x: 95, y: 75, w: 28, h: 85, windows: [[8, 14], [17, 14], [8, 26]] },
    { x: 205, y: 30, w: 20, h: 130, windows: [[6, 8], [6, 20], [6, 32], [6, 44], [6, 56]] },
    { x: 240, y: 55, w: 16, h: 105, windows: [[4, 12], [4, 24], [4, 36]] },
    { x: 270, y: 20, w: 24, h: 140, windows: [[7, 10], [7, 22], [7, 34], [7, 46], [7, 58]] },
    { x: 570, y: 50, w: 22, h: 110, windows: [[6, 12], [13, 12], [6, 24]] },
    { x: 605, y: 15, w: 18, h: 145, windows: [[5, 10], [5, 22], [5, 34], [5, 46]] },
    { x: 635, y: 65, w: 28, h: 95, windows: [[8, 14], [17, 14], [8, 26]] },
    { x: 870, y: 55, w: 20, h: 105, windows: [[6, 12], [6, 24], [6, 36]] },
    { x: 900, y: 25, w: 24, h: 135, windows: [[7, 10], [7, 22], [7, 34], [7, 46]] },
    { x: 940, y: 75, w: 16, h: 85, windows: [[4, 14], [4, 26]] },
    { x: 1040, y: 45, w: 20, h: 115, windows: [[6, 12], [6, 24], [6, 36]] },
    { x: 1075, y: 65, w: 26, h: 95, windows: [[7, 14], [15, 14]] },
  ],
  1: [
    { x: 5, y: 90, w: 34, h: 110, windows: [[8, 16], [20, 16], [8, 32], [20, 32], [8, 48], [20, 48]] },
    { x: 55, y: 60, w: 22, h: 140, windows: [[6, 12], [6, 28], [6, 44], [6, 60]] },
    { x: 100, y: 100, w: 30, h: 100, windows: [[8, 18], [18, 18], [8, 34]] },
    { x: 300, y: 45, w: 26, h: 155, windows: [[7, 12], [16, 12], [7, 28], [16, 28], [7, 44]] },
    { x: 340, y: 85, w: 20, h: 115, windows: [[5, 14], [5, 30], [5, 46]] },
    { x: 950, y: 70, w: 24, h: 130, windows: [[6, 14], [15, 14], [6, 30]] },
    { x: 990, y: 40, w: 30, h: 160, windows: [[8, 12], [18, 12], [8, 28], [18, 28], [8, 44]] },
    { x: 1130, y: 90, w: 22, h: 110, windows: [[6, 16], [6, 32]] },
  ],
};

// A row of simple lit-window buildings, rendered at different scales,
// opacities and tints (via the wrapping <svg>'s className) to fake
// depth-of-field haze between a far and a near skyline layer.
function Skyline({ seed, color, windowColor }: { seed: 0 | 1; color: string; windowColor: string }) {
  const buildings = SKYLINE_LAYOUTS[seed];
  return (
    <>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={color} />
          {b.windows.map(([wx, wy], wi) => (
            <rect key={wi} x={b.x + wx} y={b.y + wy} width="3" height="4" fill={windowColor} opacity="0.8" />
          ))}
        </g>
      ))}
    </>
  );
}

export function AerialHeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Sky — cooler blue on the left, warm haze on the right, matching the
          reference's soft-daylight gradient. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, #bcd2e0 0%, #cfdfe3 24%, #dde6dc 45%, #e9ecda 62%, #f2ecd9 80%, #f4ecd6 100%)",
        }}
      />

      {/* Atmospheric sun-haze glow, upper right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 36% at 84% 14%, rgba(255,248,228,0.75) 0%, transparent 68%), radial-gradient(30% 26% at 8% 4%, rgba(255,255,255,0.4) 0%, transparent 70%)",
        }}
      />

      {/* Far, softer mountain ridge behind the skyline */}
      <svg
        className="absolute inset-x-0 bottom-[34%] h-[20%] w-full opacity-30"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 120 L110 45 L240 90 L380 25 L560 80 L740 18 L920 70 L1080 35 L1200 60 V120 Z"
          fill="#93a9a0"
        />
      </svg>

      {/* Far skyline layer — smaller, hazier, cooler tint */}
      <svg
        className="absolute inset-x-0 bottom-[29%] h-[22%] w-full opacity-30"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        fill="none"
      >
        <Skyline seed={1} color="#8fa2ae" windowColor="#fdf6e3" />
      </svg>

      {/* Near skyline layer — larger, denser, slightly warmer/darker so it
          reads in front of the far layer */}
      <svg
        className="absolute inset-x-0 bottom-[27%] h-[24%] w-full opacity-45"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        fill="none"
      >
        <Skyline seed={0} color="#76899a" windowColor="#fff3d6" />
      </svg>

      {/* Tall glass tower, right edge — echoes the glass high-rise on the
          right side of the reference image */}
      <svg
        className="absolute right-0 bottom-[24%] h-[46%] w-[10%] opacity-80"
        viewBox="0 0 100 420"
        preserveAspectRatio="xMaxYMax meet"
        fill="none"
      >
        <rect x="30" y="0" width="70" height="420" fill="#aebfc2" />
        <rect x="30" y="0" width="70" height="420" fill="url(#hawkGlassGradient)" />
        {Array.from({ length: 18 }).map((_, row) => (
          <line
            key={row}
            x1="30"
            x2="100"
            y1={row * 24 + 6}
            y2={row * 24 + 6}
            stroke="#e8f0ee"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}
        <defs>
          <linearGradient id="hawkGlassGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dce8e6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#8fa5a8" stopOpacity="0.35" />
          </linearGradient>
        </defs>
      </svg>

      {/* Muted green foreground landscape base */}
      <div
        className="absolute inset-x-0 bottom-0 h-[36%]"
        style={{
          background: "linear-gradient(180deg, #d3ddc4 0%, #bccbab 32%, #a3b995 66%, #87a077 100%)",
        }}
      />

      {/* Rolling foreground terrain */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[28%] w-full opacity-75"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M0 60 C 180 20, 320 90, 520 50 S 900 10, 1200 55 V200 H0 Z" fill="#8fa580" />
        <path d="M0 110 C 220 80, 420 140, 640 95 S 980 70, 1200 120 V200 H0 Z" fill="#7c9668" opacity="0.85" />
      </svg>

      {/* Tree clusters along the foreground edge — soft rounded blobs,
          bottom-left and bottom-right, matching the tree line in the
          reference photo. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[16%] w-full opacity-90"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {[
          [10, 55, 46],
          [55, 60, 38],
          [95, 50, 50],
          [140, 62, 34],
          [1060, 58, 44],
          [1105, 50, 52],
          [1150, 62, 36],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 === 0 ? "#5f7a54" : "#6d8760"} opacity="0.9" />
        ))}
      </svg>

      {/* Soft light overlay so foreground text/UI panels stay fully readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 22%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.22) 100%)",
        }}
      />
    </div>
  );
}

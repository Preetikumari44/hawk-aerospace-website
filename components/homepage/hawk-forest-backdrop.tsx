"use client";

// Purely decorative background layer for the two dark-green ".hawk-forest"
// homepage sections (Book a Raider, CTA). This is a BACKGROUND-ONLY change —
// it renders as an absolutely-positioned sibling behind each section's
// existing content (negative z-index, pointer-events-none) and never
// touches that section's own JSX, copy, layout or order.
//
// Layers, back to front:
//   1. soft layered green radial gradients (depth)
//   2. topographic contour rings (existing .hawk-contours utility)
//   3. faint aerial/survey grid (existing .hawk-grid utility)
//   4. two curved flight-path lines (slow one-shot draw, matches
//      .hawk-flight-path used elsewhere on the site)
//   5. a few soft glowing nodes (slow pulse, matches .hawk-pulse-ring)
//
// All motion is slow, subtle and fully disabled under
// prefers-reduced-motion (see the @media block added in globals.css).

export function HawkForestBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* 1. layered depth gradients, very slow ambient drift */}
      <div
        className="hawk-forest-drift absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 42% at 12% 8%, color-mix(in srgb, var(--brand) 22%, transparent) 0%, transparent 72%)," +
            "radial-gradient(55% 50% at 92% 88%, color-mix(in srgb, var(--hawk-green-400) 16%, transparent) 0%, transparent 74%)," +
            "radial-gradient(38% 34% at 80% 10%, color-mix(in srgb, var(--hawk-blue) 10%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* 2. topographic contour rings */}
      <div className="hawk-contours absolute inset-0 text-[color:var(--hawk-green-300)] opacity-45" />

      {/* 3. faint survey grid */}
      <div className="hawk-grid absolute inset-0 text-[color:var(--hawk-green-300)] opacity-20" />

      {/* 4. curved flight paths */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 700"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M-40 560 C 220 460, 360 620, 560 480 S 940 260, 1260 340"
          stroke="var(--hawk-green-400)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.4"
          className="hawk-flight-path hawk-forest-path-slow"
        />
        <path
          d="M-60 140 C 200 220, 420 40, 660 150 S 1040 340, 1260 160"
          stroke="var(--hawk-blue)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.28"
          className="hawk-flight-path hawk-forest-path-slow"
          style={{ animationDelay: "0.6s" }}
        />
      </svg>

      {/* 5. soft glowing nodes */}
      {[
        { top: "18%", left: "14%", delay: "0s" },
        { top: "64%", left: "78%", delay: "1.1s" },
        { top: "40%", left: "58%", delay: "2s" },
      ].map((node, i) => (
        <span
          key={i}
          className="hawk-pulse-ring absolute size-2.5 rounded-full"
          style={{
            top: node.top,
            left: node.left,
            backgroundColor: "var(--hawk-green-400)",
            animationDelay: node.delay,
          }}
        />
      ))}
    </div>
  );
}

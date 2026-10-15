"use client";

import { useInView } from "framer-motion";
import * as React from "react";

/**
 * Animates from 0 to the numeric portion of `value` once the element
 * scrolls into view, preserving any non-numeric prefix/suffix (e.g. "98.5%",
 * "Sub-5 cm", "24-48 hrs"). Falls back to the raw string when nothing
 * numeric can be parsed.
 */
export function useCountUp(value: string, duration = 1400) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = React.useState<string>(() =>
    value.replace(/[0-9.]+/, (m) => (m.includes(".") ? "0.0" : "0")),
  );

  React.useEffect(() => {
    if (!inView) return;

    const match = value.match(/[0-9]+(\.[0-9]+)?/);
    if (!match) {
      // No numeric portion to animate — the initializer already set
      // `display` to `value` as-is, so nothing further to do here.
      return;
    }

    const target = parseFloat(match[0]);
    const decimals = match[0].includes(".") ? match[0].split(".")[1].length : 0;
    const start = performance.now();

    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = (target * eased).toFixed(decimals);
      setDisplay(value.replace(match[0], current));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return { ref, display };
}

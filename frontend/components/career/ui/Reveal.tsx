"use client";

import { type ElementType, type ReactNode,useEffect, useRef } from "react";

/**
 * Lightweight on-scroll reveal. Content is visible by default (no JS / reduced motion);
 * the hidden state only applies once the `js` class is on <html> (see globals.css).
 */
export function Reveal({ as: Tag = "div", className, children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      el.dataset.in = "true";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.dataset.in = "true"; io.disconnect(); } },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} data-reveal className={className}>{children}</Tag>;
}

"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Wraps the career page content (NOT the shared Hawk header/footer). It supplies the career page's original
 * light "ground" surface, base text colour and skip link, and flags itself as JS-enabled so scroll-reveal sections are
 * only hidden when scripts run (content stays visible without JS).
 *
 * The JS flag is applied in an effect (previously an inline <script>, which React rejects inside components).
 */
export function CareerShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("career-js");
    return () => el.classList.remove("career-js");
  }, []);
  return (
    <div ref={ref} className="career-scope bg-[#f8fafc] text-[#263442]" suppressHydrationWarning>
      <a href="#main" className="absolute left-4 top-[-60px] z-[200] rounded-[10px] bg-[#a9cde9] px-4 py-2.5 font-semibold text-[#17324a] no-underline transition-[top] duration-200 focus:top-3">Skip to content</a>
      {children}
    </div>
  );
}

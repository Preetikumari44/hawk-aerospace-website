import type { ReactNode } from "react";

/**
 * Wraps the career page content (NOT the shared Hawk header/footer). It supplies the career page's original
 * light "ground" surface, base text colour and skip link, and flags itself as JS-enabled so scroll-reveal sections are
 * only hidden when scripts run (content stays visible without JS).
 */
export function CareerShell({ children }: { children: ReactNode }) {
  return (
    <div className="career-scope bg-[#ebeee3] text-[#17211b]" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: 'document.currentScript.parentElement.classList.add("career-js")' }} />
      <a href="#main" className="absolute left-4 top-[-60px] z-[200] rounded-[10px] bg-[#a6d7b4] px-4 py-2.5 font-semibold text-[#0b2418] no-underline transition-[top] duration-200 focus:top-3">Skip to content</a>
      {children}
    </div>
  );
}

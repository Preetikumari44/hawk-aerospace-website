"use client";

import { useCallback, useEffect, useState } from "react";

import { Reveal } from "@/components/career/ui/Reveal";
import { h2Class,Section } from "@/components/career/ui/Section";
import { cn } from "@/lib/career/cn";
import { faqItems } from "@/lib/career/faq";

/** Accessible accordion: real buttons with aria-expanded/aria-controls, smooth grid-row height transition. */
export function Faq() {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setOpen((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const openFromHash = useCallback(() => {
    const m = /^#faq-q(\d+)$/.exec(window.location.hash);
    if (m) setOpen((prev) => new Set(prev).add(Number(m[1])));
  }, []);

  // "Why Join Hawk" cards link to #faq-qN: open that entry whether or not the hash changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- original career-page behaviour: open the FAQ entry named by the URL hash on mount
    openFromHash();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#faq-q"]');
      if (a) { const n = Number(a.getAttribute("href")!.slice(6)); setOpen((prev) => new Set(prev).add(n)); }
    };
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("hashchange", openFromHash); document.removeEventListener("click", onClick); };
  }, [openFromHash]);

  return (
    <Section id="faq" labelledBy="faq-title">
      <div className="grid items-start gap-[clamp(32px,6vw,88px)] lg:grid-cols-[4fr_8fr]">
        <Reveal className="lg:sticky lg:top-[110px]"><h2 id="faq-title" className={cn(h2Class, "max-w-[12ch]")}>Frequently Asked Questions</h2></Reveal>
        <Reveal className="border-t border-[#d3dacb]">
          {faqItems.map((item) => {
            const isOpen = open.has(item.id);
            return (
              <div key={item.id} className="border-b border-[#d3dacb]">
                <h3>
                  <button type="button" id={`faq-q${item.id}`} aria-expanded={isOpen} aria-controls={`faq-a${item.id}`} onClick={() => toggle(item.id)}
                    className="group flex w-full cursor-pointer items-start justify-between gap-5 rounded-lg px-1 py-6 text-left text-[clamp(1.1rem,1.9vw,1.35rem)] font-semibold leading-[1.3] tracking-tight text-[#17211b] transition-colors hover:text-[#1d6b3d] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#7fbf95]">
                    <span>{item.question}</span>
                    <span aria-hidden="true" className={cn("relative -mt-0.5 size-8 shrink-0 rounded-full border-[1.5px] transition-colors duration-[250ms]", isOpen ? "border-[#0b2418] bg-[#0b2418]" : "border-[#d3dacb]")}>
                      <span className={cn("absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm transition-colors", isOpen ? "bg-white" : "bg-[#17211b]")} />
                      <span className={cn("absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm transition-all duration-300 ease-[cubic-bezier(.22,.7,.2,1)]", isOpen ? "rotate-0 bg-white" : "rotate-90 bg-[#17211b]")} />
                    </span>
                  </button>
                </h3>
                <div id={`faq-a${item.id}`} role="region" aria-labelledby={`faq-q${item.id}`}
                  className={cn("grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(.22,.7,.2,1)] motion-reduce:transition-none", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="career-faq-answer max-w-[62ch] px-1 pb-[26px] text-[1.05rem] text-[#3f4d43]" {...(isOpen ? {} : { inert: true })}>
                      {item.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </Section>
  );
}

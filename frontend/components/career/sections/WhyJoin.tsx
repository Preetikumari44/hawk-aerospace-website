import type { ReactNode } from "react";

import { ArrowRightIcon, BriefcaseIcon, CapIcon, DocCheckIcon, RouteIcon, UsersIcon } from "@/components/career/ui/icons";
import { Reveal } from "@/components/career/ui/Reveal";
import { h2Class,Section } from "@/components/career/ui/Section";
import { cn } from "@/lib/career/cn";

/** Every card restates wording that already exists in the FAQ and links to that FAQ entry. No new claims. */
const cards: Array<{ icon: ReactNode; title: string; text: string; faq: number }> = [
  { icon: <CapIcon className="size-6" />, title: "EU-standard drone training", text: "We help you get EU-standard drone training, and our Fresher Pilot Offer includes drone pilot certification training.", faq: 1 },
  { icon: <BriefcaseIcon className="size-6" />, title: "Work assignments in Europe", text: "We help you secure work assignments with European agriculture & drone service companies.", faq: 13 },
  { icon: <DocCheckIcon className="size-6" />, title: "Visa & relocation support", text: "Work assignment letters, visa documentation & processing, and travel & relocation arrangements are included.", faq: 7 },
  { icon: <UsersIcon className="size-6" />, title: "Support after you arrive", text: "Local onboarding & EASA/CAA compliance, a community of Indian drone pilots in Europe, career growth & upskilling support, and visa renewal & settlement guidance.", faq: 10 },
  { icon: <RouteIcon className="size-6" />, title: "A route to settle", text: "Many operators move to long-term work permits or PR after 2\u20133 years depending on the country. We assist with guidance throughout your journey.", faq: 15 },
];

export function WhyJoin() {
  return (
    <Section id="why-hawk" labelledBy="why-title">
      <Reveal as="h2" className={cn(h2Class, "mb-[clamp(32px,5vw,56px)] max-w-[22ch]")}><span id="why-title">Why Join Hawk</span></Reveal>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
        {cards.map((c, i) => (
          <Reveal key={c.faq} as="div" className={cn("sm:col-span-3", i < 3 ? "lg:col-span-2" : "lg:col-span-3", i === 4 && "sm:col-span-6 lg:col-span-3")}>
            <a href={`#faq-q${c.faq}`} className="group flex h-full flex-col gap-3.5 rounded-[20px] border border-[#d3dacb] bg-[#fbfbf6] p-[clamp(24px,3vw,34px)] text-[#17211b] no-underline transition-all duration-[350ms] ease-[cubic-bezier(.22,.7,.2,1)] hover:-translate-y-1 hover:border-[#7fbf95] hover:shadow-[0_22px_44px_-26px_rgba(11,36,24,.45)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#7fbf95]">
              <span className="grid size-12 place-items-center rounded-[14px] bg-[#0b2418] text-[#a6d7b4]">{c.icon}</span>
              <h3 className="text-[1.3rem] font-bold leading-tight tracking-tight">{c.title}</h3>
              <p className="text-[#3f4d43]">{c.text}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-1.5 text-[.95rem] font-semibold text-[#1d6b3d]">
                Read the FAQ <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

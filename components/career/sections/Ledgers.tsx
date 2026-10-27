import Image from "next/image";

import { FlagIcon } from "@/components/career/ui/FlagIcon";
import { LedgerTable } from "@/components/career/ui/LedgerTable";
import { Reveal } from "@/components/career/ui/Reveal";
import { h2Class,Section } from "@/components/career/ui/Section";
import { cn } from "@/lib/career/cn";
import type { LedgerRow } from "@/lib/career/types";

const earnings: LedgerRow[] = [
  { label: "Guaranteed Monthly Income", value: "\u20AC1,000/month" },
  { label: "Starter Support Incentive", value: "\u20AC12,000 in first 12 months" },
  { label: "Weekly Guarantee", value: "\u20AC250 per available work week" },
];
const flyToOwn: LedgerRow[] = [
  { label: "Drone Package", value: "\u20AC20,000" },
  { label: "Down Payment", value: "\u20AC3,000" },
  { label: "Financed Amount", value: "\u20AC17,000" },
  { label: "EMI (30 Months)", value: "~ \u20AC570/month" },
  { label: "Service Plan", value: "\u20AC80/month" },
  { label: "Total Monthly Cost", value: "\u20AC650/month", total: true },
];
const costs: LedgerRow[] = [
  { label: "Global Drone Training", value: "\u20AC1,800\u2013\u20AC2,200" },
  { label: "EASA Certification", value: "\u20AC1,000\u2013\u20AC1,300" },
  { label: "UK-CAA Certification", value: "\u20AC1,000\u2013\u20AC1,200" },
  { label: "Visa & Placement Support", value: "\u20AC600\u2013\u20AC1,000" },
  { label: "Total Cost", value: "\u20AC4,000\u2013\u20AC4,500", total: true },
];

export function Earnings() {
  return (
    <Section id="earnings" tone="dark" labelledBy="earnings-title">
      <div className="grid items-center gap-[clamp(32px,6vw,88px)] lg:grid-cols-[5fr_7fr]">
        <Reveal as="h2" className={h2Class}><span id="earnings-title">Minimum Guaranteed Earnings</span></Reveal>
        <Reveal><LedgerTable rows={earnings} tone="dark" big caption="Minimum guaranteed earnings" /></Reveal>
      </div>
    </Section>
  );
}

export function FlyToOwn() {
  return (
    <Section id="fly-to-own" labelledBy="fto-title">
      <Reveal as="h2" className={cn(h2Class, "mb-[clamp(32px,5vw,56px)]")}><span id="fto-title">Fly to Own&trade;   Buy Now Pay Later</span></Reveal>
      <div className="grid items-center gap-[clamp(32px,6vw,88px)] lg:grid-cols-2">
        <Reveal className="group overflow-hidden rounded-[24px] bg-black">
          <Image src="/career/images/motor-render.webp" alt="Agricultural spraying drone on a black background" width={1100} height={744} sizes="(min-width:1024px) 560px, 100vw" className="h-auto w-full transition-transform duration-[900ms] ease-[cubic-bezier(.22,.7,.2,1)] group-hover:scale-[1.03]" />
        </Reveal>
        <Reveal><LedgerTable rows={flyToOwn} caption="Fly to Own cost breakdown" /></Reveal>
      </div>
    </Section>
  );
}

export function Pathways() {
  // Mumbai text is limited to what the Hawk Aerospace site footer states (registered office, India).
  // The UK card is unchanged from the original page.
  const locations = [
    { code: "in" as const, title: "Mumbai, India", text: "Home to the registered office of Hawk Aerospace Private Limited in India." },
    { code: "gb" as const, title: "United Kingdom", text: "Agri-tech skilled worker visa, high drone demand, long-term settlement options." },
  ];
  return (
    <Section id="locations" labelledBy="locations-title">
      <Reveal as="h2" className={cn(h2Class, "mb-[clamp(32px,5vw,56px)]")}><span id="locations-title">Career Locations</span></Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        {locations.map((l) => (
          <Reveal key={l.code} as="article" className="group grid content-start gap-3.5 rounded-[24px] bg-[#ffffff] p-[clamp(28px,4vw,48px)] transition-shadow duration-300 ease-[cubic-bezier(.22,.7,.2,1)] hover:shadow-[0_18px_40px_-18px_rgba(11,36,24,.35)]">
            <FlagIcon code={l.code} className="h-[54px] w-[72px] rounded-lg shadow-[0_2px_10px_rgba(0,0,0,.25)] transition-transform duration-500 ease-[cubic-bezier(.22,.7,.2,1)] group-hover:-translate-y-1" />
            <h3 className="text-[clamp(1.6rem,2.6vw,2.1rem)] font-bold leading-[1.1] tracking-tight">{l.title}</h3>
            <p className="max-w-[40ch] text-[#455666]">{l.text}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Costs() {
  return (
    <Section id="costs" tone="deep" labelledBy="costs-title">
      <div className="grid items-start gap-[clamp(32px,6vw,88px)] lg:grid-cols-[5fr_7fr]">
        <Reveal as="h2" className={h2Class}><span id="costs-title">Training &amp; Certification Cost</span></Reveal>
        <Reveal><LedgerTable rows={costs} tone="dark" caption="Training and certification cost" /></Reveal>
      </div>
    </Section>
  );
}

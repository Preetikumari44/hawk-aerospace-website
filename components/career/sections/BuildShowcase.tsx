import Image from "next/image";

import { Reveal } from "@/components/career/ui/Reveal";
import { h2Class,Section } from "@/components/career/ui/Section";
import { cn } from "@/lib/career/cn";

/**
 * Showcase of the work types already listed in the FAQ ("What kind of work will I do in Europe?"),
 * introduced with the company description used in the Hawk Aerospace site footer. No new claims.
 */
const tiles = [
  { src: "/career/images/spraying.webp", alt: "Drone Flying", w: 1024, h: 417, title: "Agricultural spraying & seeding", pos: "object-[60%_60%]", span: "lg:col-span-7" },
  { src: "/career/images/carrer1.webp", alt: "An operator using a tablet map and drone controller beside a wheat field", w: 1344, h: 768, title: "Crop mapping & NDVI analysis", pos: "object-center", span: "lg:col-span-5" },
  { src: "/career/images/c3.webp", alt: "A drone pilot with a tablet controller on a mountainside above a river valley", w: 1024, h: 1024, title: "Land surveying & environmental monitoring", pos: "object-center", span: "lg:col-span-5" },
  { src: "/career/images/c4.webp", alt: "A drone operator with a controller watching a survey drone hover above a city park", w: 1024, h: 1024, title: "Infrastructure inspection (bridges, pipelines, etc.)", sub: "Solar panel inspections", pos: "object-[50%_40%]", span: "lg:col-span-7" },
];

export function BuildShowcase() {
  return (
    <Section id="build" tone="sage" labelledBy="build-title">
      <Reveal as="h2" className={cn(h2Class, "mb-[clamp(32px,5vw,56px)]")}><span id="build-title">Be Part of What We Build</span></Reveal>
      <Reveal as="p" className="mb-[clamp(28px,4vw,48px)] -mt-4 max-w-[60ch] text-[clamp(1.1rem,1.8vw,1.35rem)] text-[#455666]">
        Drone-powered reality capture, AI analytics and cloud platforms for real estate and agriculture.
      </Reveal>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {tiles.map((t) => (
          <Reveal key={t.title} as="figure" className={cn("group relative isolate flex h-[260px] items-end overflow-hidden rounded-[24px] text-white sm:h-[320px]", t.span)}>
            <Image src={t.src} alt={t.alt} width={t.w} height={t.h} sizes="(min-width:1024px) 700px, 100vw" className={cn("absolute inset-0 -z-[2] h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.22,.7,.2,1)] group-hover:scale-105", t.pos)} />
            <div className="absolute inset-0 -z-[1] bg-linear-to-t from-[#07190f]/90 to-transparent to-[62%]" />
            <figcaption className="grid gap-1 px-[26px] py-[22px]">
              <h3 className="text-[1.3rem] font-bold leading-tight tracking-tight">{t.title}</h3>
              {t.sub && <p className="text-[.98rem] text-[#d4e4f1]">{t.sub}</p>}
            </figcaption>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

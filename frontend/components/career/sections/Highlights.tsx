import Image from "next/image";

import { Reveal } from "@/components/career/ui/Reveal";
import { h2Class,Section } from "@/components/career/ui/Section";
import { cn } from "@/lib/career/cn";

const zoom = "transition-transform duration-[900ms] ease-[cubic-bezier(.22,.7,.2,1)]";

export function Highlights() {
  return (
    <Section id="programme" labelledBy="highlights-title">
      <Reveal as="h2" className={cn(h2Class, "mb-[clamp(32px,5vw,56px)] max-w-[22ch]")}><span id="highlights-title">Programme Highlights</span></Reveal>
      <div className="grid grid-cols-12 gap-5">
        <Reveal as="article" className="group relative isolate col-span-12 flex min-h-[420px] items-end overflow-hidden rounded-[24px] text-white sm:min-h-[480px] lg:col-span-7">
          <Image src="/career/images/carrer2.webp" alt="A drone operator holding a tablet controller while an agricultural drone flies over a crop field at sunset" fill sizes="(min-width:1024px) 700px, 100vw" className={cn("-z-[2] object-cover group-hover:scale-[1.04]", zoom)} />
          <div className="absolute inset-0 -z-[1] bg-linear-to-t from-[#07190f]/90 via-[#07190f]/55 via-[38%] to-transparent to-[70%]" />
          <div className="max-w-[34rem] p-[clamp(24px,3.4vw,40px)]">
            <h3 className="mb-3 text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.02em]">Minimum Guaranteed Earnings</h3>
            <p className="text-[#e3eee5]">Earn at least <strong className="font-bold text-[#a6d7b4]">&euro;1,000/month for 12 months</strong> while you build flight hours.</p>
          </div>
        </Reveal>

        <Reveal as="article" className="group col-span-12 flex flex-col overflow-hidden rounded-[24px] bg-[#0e2a1d] text-white lg:col-span-5">
          <div className="relative aspect-[740/402] overflow-hidden bg-black">
            <Image src="/career/images/drone-render.webp" alt="Agricultural drone render" fill sizes="(min-width:1024px) 480px, 100vw" className={cn("object-cover group-hover:scale-[1.04]", zoom)} />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3 p-[clamp(24px,3vw,36px)]">
            <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-[1.1] tracking-[-0.02em]">Fly to Own&trade; <span className="block text-[#a6d7b4]">Buy Now Pay Later</span></h3>
            <p className="text-[#cfdfd2]">Finance your agriculture drone &amp; start flying immediately. Own it in 12&ndash;30 months.</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

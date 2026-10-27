import Image from "next/image";

import { HeroVideo } from "@/components/career/sections/HeroVideo";
import { ButtonLink } from "@/components/career/ui/Button";

const route = ["Work", "Fly", "Earn", "Settle in Europe"];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[clamp(560px,84vh,760px)] items-center overflow-hidden bg-[#17324a] text-white">
      <Image src="/career/images/hero-poster.jpg" alt="" aria-hidden priority fill sizes="100vw" className="-z-[3] object-cover" />
      <HeroVideo />
      <div className="absolute inset-0 -z-[1]" style={{ background: "linear-gradient(96deg, rgba(7,25,15,.95) 0%, rgba(7,25,15,.76) 40%, rgba(7,25,15,.2) 100%), linear-gradient(0deg, rgba(7,25,15,.8), transparent 45%)" }} />
      <div className="mx-auto flex w-[min(1180px,100%-36px)] flex-col items-center pb-20 pt-[calc(72px+56px)] text-center sm:w-[min(1180px,100%-48px)]">
        <h1 id="hero-title" className="mx-auto max-w-[16ch] text-[clamp(3.1rem,9vw,7.2rem)] font-bold leading-[0.95] tracking-[-0.04em] [text-shadow:0_2px_28px_rgba(0,0,0,.35)]">
          Fly to Europe<sup className="ml-[.08em] align-super text-[.26em] font-medium tracking-normal">&trade;</sup>
        </h1>
        <ol className="career-route career-route-center mt-7" aria-label="Work, Fly, Earn, Settle in Europe">
          {route.map((r) => <li key={r}>{r}</li>)}
        </ol>
        <p className="mx-auto mt-[22px] max-w-[46ch] text-center text-[clamp(1.05rem,1.6vw,1.25rem)] text-[#dbe7f1] [text-shadow:0_1px_18px_rgba(0,0,0,.4)]">
          For drone operators, students &amp; agri-professionals seeking European work-permit pathways.
        </p>
        <div className="mt-[34px] flex w-full flex-wrap justify-center gap-3.5">
          <ButtonLink href="/career/apply">Apply Now</ButtonLink>
          <ButtonLink href="#programme" variant="ghost" arrow="down">Explore the programme</ButtonLink>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";

import { ButtonLink } from "@/components/career/ui/Button";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-[#17324a] py-[clamp(80px,11vw,150px)] text-white">
      <Image src="/career/images/c3.webp" alt="" aria-hidden fill sizes="100vw" className="-z-[2] object-cover object-[50%_40%]" />
      <div className="absolute inset-0 -z-[1]" style={{ background: "linear-gradient(95deg, rgba(7,25,15,.94) 0%, rgba(7,25,15,.78) 50%, rgba(7,25,15,.35) 100%)" }} />
      <div className="mx-auto w-[min(1180px,100%-36px)] sm:w-[min(1180px,100%-48px)]">
        <h2 id="cta-title" className="max-w-[14ch] text-[clamp(2.3rem,6vw,4.6rem)] font-bold leading-none tracking-[-0.035em]">Start Your European Dream Career</h2>
        <ButtonLink href="/career/apply" className="mt-9">Apply Now</ButtonLink>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CareerShell } from "@/components/career/career-shell";
import { ApplicationForm } from "@/components/career/form/ApplicationForm";
import { ArrowLeftIcon } from "@/components/career/ui/icons";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";

export const metadata: Metadata = { title: "Agricultural Drone Pilot \u2013 Interview Form" };

export default function ApplyPage() {
  return (
    <div className="hawk-theme min-h-screen w-full">
      <Navbar />
      <CareerShell>
      <main id="main">
        <section aria-labelledby="form-title" className="relative isolate overflow-hidden bg-[#17324a] pb-24 pt-[calc(72px+56px)] text-white max-sm:pb-[84px] max-sm:pt-[calc(64px+40px)]">
          <Image src="/career/images/carrer2.webp" alt="" aria-hidden priority fill sizes="100vw" className="-z-[2] object-cover object-[50%_55%]" />
          <div className="absolute inset-0 -z-[1]" style={{ background: "linear-gradient(96deg, rgba(7,25,15,.95) 0%, rgba(7,25,15,.8) 48%, rgba(7,25,15,.45) 100%)" }} />
          <div className="mx-auto w-[min(1180px,100%-36px)] sm:w-[min(1180px,100%-48px)]">
            <Link href="/career" className="group mb-7 inline-flex items-center gap-2 text-[.95rem] font-medium text-[#a9cde9] no-underline">
              <ArrowLeftIcon className="size-4 transition-transform duration-200 group-hover:-translate-x-[3px]" />Back to the programme
            </Link>
            <div className="grid items-end gap-[clamp(28px,5vw,72px)] lg:grid-cols-[7fr_5fr]">
              <div>
                <h1 id="form-title" className="mb-[22px] max-w-[16ch] text-[clamp(2.2rem,5.2vw,4rem)] font-bold leading-[1.02] tracking-[-0.035em]">Agricultural Drone Pilot &mdash; Interview Web Form</h1>
                <p className="max-w-[46ch] text-[clamp(1.02rem,1.5vw,1.2rem)] text-[#dbe7f1]">We are hiring <strong className="text-white">experienced Agricultural Drone Pilots</strong> in the <strong className="text-white">EU or UK</strong>.</p>
                <p className="mt-2.5 max-w-[46ch] text-[clamp(1.02rem,1.5vw,1.2rem)] text-[#dbe7f1]">Please fill this form accurately. Only shortlisted candidates will be contacted.</p>
              </div>
              <div className="rounded-xl border border-white/[0.18] border-l-4 border-l-[#a9cde9] bg-white/[0.08] p-[24px_26px] text-[#e8f0f7] backdrop-blur-[10px]">
                <strong className="mb-2 block text-xl text-white">Important Notes:</strong>
                <ul className="ml-[1.2rem] grid list-disc gap-2">
                  <li>Valid EU/UK Visa or Residency Permit required.</li>
                  <li>Drone pilot license preferred.</li>
                  <li>Agricultural spraying/mapping experience is an advantage.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <ApplicationForm />
      </main>
      </CareerShell>
      <Footer />
    </div>
  );
}

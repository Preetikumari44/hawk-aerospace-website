import { Drone, Handshake, Route } from "lucide-react";
import Image from "next/image";

import HawkLogo from "@/components/logos/hawk";

const highlights = [
  {
    icon: Drone,
    title: "Advanced Drone Technology",
    text: "The H-series range, from the H32X (10L) to the H200 (100L).",
  },
  {
    icon: Handshake,
    title: "Distribution Opportunities",
    text: "Apply as a distributor or dealer and tell us which models you want to sell.",
  },
  {
    icon: Route,
    title: "Partner Collaboration",
    text: "Share your company profile and market so the Hawk Aerospace team can review your application.",
  },
];

const steps = ["Tell us where and how your business operates.", "Select the drone models you want to sell.", "Submit your details with your company profile."];

export function PartnerPanel() {
  return (
    <section aria-labelledby="partner-heading" className="hawk-forest relative isolate overflow-hidden">
      {/* Backdrop: depth wash, topographic contours, survey grid, one flight path (same utilities as the Hawk site). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 45% at 15% 5%, color-mix(in srgb, #9cc3e3 20%, transparent) 0%, transparent 72%), radial-gradient(55% 45% at 95% 85%, color-mix(in srgb, #7fa7c6 14%, transparent) 0%, transparent 74%), linear-gradient(180deg, #1b3a57 0%, #17324a 100%)",
          }}
        />
        <div className="hawk-contours absolute inset-0 text-[#a9cde9] opacity-45" />
        <div className="hawk-grid absolute inset-0 text-[#a9cde9] opacity-20 [mask-image:linear-gradient(180deg,transparent,black_30%,black_70%,transparent)]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 900" preserveAspectRatio="none" fill="none">
          <path d="M-40 250 C 120 150, 260 330, 420 210 S 560 140, 660 190" stroke="#7fa7c6" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.45" className="hawk-flight-path" />
        </svg>
      </div>

      <div className="panel-sticky mx-auto flex max-w-[34rem] flex-col gap-7 px-6 py-10 sm:px-10 lg:ml-auto lg:mr-0 lg:max-w-[36rem] lg:px-12 lg:py-14">
        <div className="flex items-center gap-2.5 text-[#d4e4f1]">
          <HawkLogo className="text-[#9cc3e3]" />
          <span className="text-sm font-semibold tracking-tight">Distributor / Dealer Application</span>
        </div>

        <div>
          <h1 id="partner-heading" className="text-[2.4rem] leading-[1.05] font-bold tracking-tight text-balance text-white sm:text-5xl">
            Partner With Hawk Aerospace
          </h1>
          <p className="mt-4 max-w-[30rem] text-[15px] leading-relaxed text-[#c8d9e8] sm:text-base">
            Hawk Aerospace builds drone-powered reality capture, AI analytics and cloud platforms for real estate and
            agriculture. Apply to bring the H-series agricultural drones to your market.
          </p>
        </div>

        <div className="relative mx-auto -my-2 w-full max-w-[22rem] sm:max-w-[26rem] lg:-my-4">
          <div aria-hidden className="absolute inset-x-[12%] bottom-[2%] h-6 rounded-[50%] bg-black/40 blur-xl" />
          <Image
            src="/images/hawk-h-series-drone.webp"
            alt="Hawk Aerospace H-series agricultural drone with a white tank, seen from the front"
            width={1536}
            height={864}
            priority
            sizes="(min-width: 1024px) 420px, 90vw"
            className="drone-hover relative h-auto w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.45)]"
          />
        </div>

        <ul className="grid gap-3.5">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-[2px]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#7fa7c6]/15 text-[#a9cde9]">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-[15px] leading-tight font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-snug text-[#b7cbdc]">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden lg:block">
          <h2 className="text-sm font-semibold text-white">How applying works</h2>
          <ol className="mt-3 grid gap-2.5">
            {steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-sm text-[#c8d9e8]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[#7fa7c6]/50 text-xs font-semibold text-[#a9cde9]">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-sm text-[#b7cbdc] lg:hidden">Complete the form below to apply.</p>
      </div>
    </section>
  );
}

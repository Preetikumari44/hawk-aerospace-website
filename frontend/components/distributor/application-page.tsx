import { ApplicationForm } from "@/components/distributor/application/application-form";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";

import { PartnerPanel } from "./partner-panel";

export function ApplicationPage() {
  return (
    <div className="hawk-theme flex min-h-screen flex-col">
      <a
        href="#application"
        className="sr-only z-[60] rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#14532d] focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to the application form
      </a>
      <Navbar />
      <main className="grid flex-1 pt-16 sm:pt-18 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <PartnerPanel />
        <div
          className="px-4 py-8 sm:px-8 lg:px-12 lg:py-14"
          style={{
            background:
              "radial-gradient(60% 40% at 90% 0%, rgba(20,83,45,0.07) 0%, transparent 70%), #ebeee3",
          }}
        >
          <div
            id="application"
            className="mx-auto max-w-[820px] scroll-mt-24 rounded-2xl border border-[#d5ddcd] bg-white p-5 shadow-[0_24px_60px_-28px_rgba(11,36,24,0.35)] sm:p-9 lg:mx-0 lg:mr-auto"
          >
            <header className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight text-[#0f2a1c] sm:text-[1.7rem]">
                Distributor / Dealer Application Form
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#45544b]">
                Tell us about your business and the drone models you want to sell. Fields marked
                <span aria-hidden className="mx-1 font-semibold text-[#a52a1f]">
                  *
                </span>
                <span className="sr-only">with an asterisk </span>
                are required.
              </p>
            </header>
            <ApplicationForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

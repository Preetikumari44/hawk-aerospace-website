import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ApplicationLauncher } from "@/components/applications/application-launcher";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";

export const metadata: Metadata = {
  title: { absolute: "Applications | Hawk Aerospace" },
  description: "Launch Hawk Aerospace applications — SkyMap for AI-powered 3D mapping and AgriSure for agricultural intelligence.",
};

// AGRISURE_URL is read at request time (see ApplicationLauncher), so it can be configured without a rebuild.
export const dynamic = "force-dynamic";

export default function ApplicationsPage() {
  return (
    <main className="hawk-theme bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />

      <section className="hawk-forest relative isolate overflow-hidden px-4 pt-28 pb-14 sm:pt-36 sm:pb-20">
        <div aria-hidden className="absolute inset-0 -z-30">
          <AerialScene variant="estate" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "linear-gradient(120deg, rgba(11,36,24,0.94) 0%, rgba(12,58,42,0.8) 60%, rgba(12,58,42,0.5) 100%)",
          }}
        />
        <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
        <div className="max-w-container mx-auto flex max-w-[760px] flex-col gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to Hawk Aerospace
          </Link>
          <span className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">Hawk Aerospace Applications</span>
          <h1 className="text-4xl leading-tight font-semibold text-balance text-white sm:text-5xl sm:leading-tight">
            Launch a Hawk application.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Open the platform you want to work in. Each one is built on the same end-to-end Hawk workflow — capture,
            process, map, analyse, deliver.
          </p>
        </div>
      </section>

      <div className="hawk-sage hawk-contours">
        <ApplicationLauncher />
      </div>
      <Footer />
    </main>
  );
}

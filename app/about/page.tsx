import type { Metadata } from "next";

import AboutCapabilities from "@/components/about/capabilities";
import AboutCTA from "@/components/about/cta";
import AboutEcosystem from "@/components/about/ecosystem";
import AboutHero from "@/components/about/hero";
import AboutIndustries from "@/components/about/industries";
import AboutOverview from "@/components/about/overview";
import AboutWhyHawk from "@/components/about/why-hawk";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { LayoutLines } from "@/components/ui/layout-lines";

export const metadata: Metadata = {
  title: { absolute: "About Us | Hawk Aerospace" },
  description:
    "Hawk Aerospace combines aerial capture, geospatial data, AI, 3D mapping and cloud-based software to turn real-world environments into actionable digital intelligence.",
};

export default function AboutPage() {
  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <AboutHero />
      <AboutOverview />
      <AboutCapabilities />
      <AboutEcosystem />
      <AboutIndustries />
      <AboutWhyHawk />
      <AboutCTA />
      <Footer />
    </main>
  );
}

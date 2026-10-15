import type { Metadata } from "next";

import { CareerShell } from "@/components/career/career-shell";
import { BuildShowcase } from "@/components/career/sections/BuildShowcase";
import { Faq } from "@/components/career/sections/Faq";
import { FinalCta } from "@/components/career/sections/FinalCta";
import { Hero } from "@/components/career/sections/Hero";
import { Highlights } from "@/components/career/sections/Highlights";
import { Costs, Earnings, FlyToOwn, Pathways } from "@/components/career/sections/Ledgers";
import { WhyJoin } from "@/components/career/sections/WhyJoin";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";

const title = "Fly-to-Europe\u2122 \u2013 Drone Operator Career | Work \u2022 Fly \u2022 Earn \u2022 Settle in Europe";
const description =
  "Fly-to-Europe\u2122 is a structured European career pathway for drone operators, students, and agri-professionals. Guaranteed income, EU work permits, drone financing, and settlement options in Estonia & the UK.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title: "Fly-to-Europe\u2122 \u2013 Drone Operator Career Programme",
    description: "Guaranteed income, drone financing (Fly-to-Own\u2122), and Europe work-permit opportunities for drone operators.",
    type: "website",
    url: "/career",
    images: ["https://www.hawkaerosystem.co.uk/career/images/carrer2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fly-to-Europe\u2122 \u2013 Drone Operator Career",
    description: "Work, Fly & Settle in Europe. Guaranteed \u20AC1000/month + drone financing + Europe work permit.",
    images: ["https://www.hawkaerosystem.co.uk/career/images/c4.png"],
  },
};

// /career - the original Fly-to-Europe career landing page inside the shared Hawk site shell.
export default function CareerPage() {
  return (
    <div className="hawk-theme min-h-screen w-full">
      <Navbar />
      <CareerShell>
        <main id="main">
          <Hero />
          <Highlights />
          <WhyJoin />
          <Earnings />
          <FlyToOwn />
          <BuildShowcase />
          <Pathways />
          <Costs />
          <Faq />
          <FinalCta />
        </main>
      </CareerShell>
      <Footer />
    </div>
  );
}

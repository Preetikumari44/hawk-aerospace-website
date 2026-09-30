import type { Metadata } from "next";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import MarketplaceCategories from "@/components/marketplace/categories";
import MarketplaceComingSoon from "@/components/marketplace/coming-soon";
import MarketplaceHero from "@/components/marketplace/hero";
import { LayoutLines } from "@/components/ui/layout-lines";

export const metadata: Metadata = {
  title: { absolute: "Marketplace | Hawk Aerospace" },
  description:
    "A future ecosystem for aerial technology, data and geospatial solutions from Hawk Aerospace — launching soon.",
};

export default function MarketplacePage() {
  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <MarketplaceHero />
      <MarketplaceComingSoon />
      <MarketplaceCategories />
      <Footer />
    </main>
  );
}

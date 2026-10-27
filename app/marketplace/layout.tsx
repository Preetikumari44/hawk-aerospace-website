import "@/components/marketplace/shop/marketplace-shop.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import HawkMarketplace from "@/components/marketplace/shop/components/MarketplaceShell";

export const metadata: Metadata = {
  title: { absolute: "Marketplace | Hawk Aerospace" },
  description:
    "Hawk Aerospace Marketplace — browse products, manage your cart and review orders. Currently a demo storefront with sample data.",
};

// The shared Hawk header and footer wrap every Marketplace route; HawkMarketplace
// adds only the marketplace bar (location, cart, order history) and the single cart provider.
export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="hawk-theme hawk-sand text-foreground min-h-screen w-full">
      <Navbar />
      <HawkMarketplace>{children}</HawkMarketplace>
      <Footer />
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Store } from "lucide-react";

import { fadeUp, viewport } from "@/lib/motion";

import { Badge } from "../ui/badge";
import { Section } from "../ui/section";

export default function MarketplaceComingSoon() {
  return (
    <Section className="line-t">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className="border-border/60 glass-2 max-w-container mx-auto flex flex-col items-center gap-4 rounded-2xl border p-10 text-center sm:p-16"
      >
        <div className="bg-brand/10 text-brand flex size-14 items-center justify-center rounded-full">
          <Store className="size-7" />
        </div>
        <Badge variant="secondary">Coming Soon</Badge>
        <h2 className="text-2xl font-semibold sm:text-3xl">Hawk Marketplace</h2>
        <p className="text-muted-foreground max-w-[520px] text-sm sm:text-base">
          A future ecosystem for aerial technology, data and geospatial
          solutions — bringing together relevant products, services and
          resources as the Hawk Aerospace ecosystem grows.
        </p>
        <p className="text-muted-foreground text-xs sm:text-sm">Stay tuned.</p>
      </motion.div>
    </Section>
  );
}

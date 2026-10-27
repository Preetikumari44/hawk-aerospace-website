"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon, Store } from "lucide-react";

import { fadeUp, viewport } from "@/lib/motion";

import { Badge } from "../../ui/badge";

export default function MarketplaceTeaser() {
  return (
    <div className="max-w-container mx-auto px-4 py-6 sm:py-8">
      <motion.a
        href="/marketplace"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        whileHover={{ y: -2 }}
        className="border-border/60 hover:border-brand/50 glass-1 flex flex-col items-start gap-3 rounded-2xl border p-5 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-center gap-4">
          <div className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Store className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold sm:text-base">Hawk Marketplace</span>
              <Badge variant="secondary" className="text-[10px]">
                Coming Soon
              </Badge>
            </div>
            <span className="text-muted-foreground text-xs sm:text-sm">
              A future ecosystem for aerial technology, data and geospatial solutions.
            </span>
          </div>
        </div>
        <span className="text-brand flex items-center gap-1 text-sm font-medium">
          Learn more
          <ArrowRightIcon className="size-4" />
        </span>
      </motion.a>
    </div>
  );
}

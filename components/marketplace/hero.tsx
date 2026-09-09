"use client";

import { motion } from "framer-motion";

import { fadeUp, stagger } from "@/lib/motion";

export default function MarketplaceHero() {
  return (
    <div className="relative overflow-hidden pt-28 pb-12 sm:pt-36 sm:pb-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 0%, var(--brand) 0%, transparent 70%)",
          opacity: 0.12,
        }}
      />
      <motion.div
        variants={stagger(0.1)}
        initial="hidden"
        animate="show"
        className="max-w-container mx-auto flex flex-col items-center gap-5 px-4 text-center"
      >
        <motion.span variants={fadeUp} className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">
          Marketplace
        </motion.span>
        <motion.h1
          variants={fadeUp}
          className="max-w-[680px] text-4xl leading-tight font-semibold text-balance sm:text-5xl sm:leading-tight"
        >
          Explore the Future of Aerial Technology and Geospatial Solutions
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-muted-foreground max-w-[560px] text-md font-medium sm:text-lg"
        >
          Hawk Marketplace will bring together the products, services and
          resources of the Hawk Aerospace ecosystem in one place.
        </motion.p>
      </motion.div>
    </div>
  );
}

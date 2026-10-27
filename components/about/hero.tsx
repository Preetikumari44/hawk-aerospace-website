"use client";

import { motion } from "framer-motion";

import { HeroVisual } from "@/components/homepage/hero/hero-visual";
import { fadeUp, stagger } from "@/lib/motion";

export default function AboutHero() {
  return (
    <div className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(50% 40% at 15% 0%, var(--brand) 0%, transparent 70%)",
          opacity: 0.12,
        }}
      />
      <div className="max-w-container mx-auto grid grid-cols-1 items-center gap-12 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6"
        >
          <motion.span variants={fadeUp} className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">
            About Hawk Aerospace
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className="text-4xl leading-tight font-semibold text-balance sm:text-5xl sm:leading-tight lg:text-6xl lg:leading-tight"
          >
            Building Intelligence From the Sky
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground max-w-[540px] text-md font-medium sm:text-lg"
          >
            Hawk Aerospace combines aerial capture, geospatial data, AI, 3D
            mapping and cloud-based software to turn real-world environments
            into actionable digital intelligence.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="border-border/60 glass-1 rounded-2xl border p-2"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </div>
  );
}

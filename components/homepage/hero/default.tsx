"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

import { fadeUp, stagger } from "@/lib/motion";

import { Button } from "../../ui/button";
import { HeroVisual } from "./hero-visual";

export default function Hero() {
  return (
    <div id="home" className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-20">
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
          <motion.h1
            variants={fadeUp}
            className="text-4xl leading-tight font-semibold text-balance sm:text-5xl sm:leading-tight lg:text-6xl lg:leading-tight"
          >
            From the Physical World to Digital Intelligence.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground max-w-[520px] text-md font-medium sm:text-lg"
          >
            Drone-powered reality capture, AI analytics and cloud platforms
            for smarter decisions across real estate and agriculture.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-1">
            <Button size="lg" asChild>
              <a href="#solutions">
                Explore Solutions
                <ArrowRightIcon className="size-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#contact">Request a Consultation</a>
            </Button>
          </motion.div>
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

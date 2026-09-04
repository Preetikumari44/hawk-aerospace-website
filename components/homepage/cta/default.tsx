"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon, PhoneCall } from "lucide-react";

import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Button } from "../../ui/button";
import Glow from "../../ui/glow";
import { Section } from "../../ui/section";

export default function CTA() {
  return (
    <Section id="contact" className="group relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50">
        <FinalSkyScene />
      </div>
      <motion.div
        variants={stagger(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className="max-w-container relative z-10 mx-auto flex flex-col items-center gap-5 text-center sm:gap-7"
      >
        <motion.h2
          variants={fadeUp}
          className="max-w-[620px] text-3xl leading-tight font-semibold text-balance sm:text-4xl sm:leading-tight"
        >
          Turn Aerial Data Into Actionable Intelligence.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-muted-foreground max-w-[520px] text-md font-medium sm:text-lg"
        >
          Talk to Hawk Aerospace about your next mapping, monitoring,
          property or agriculture project.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <a href="mailto:info@hawkaerospace.in">
              <PhoneCall className="size-4" />
              Request a Consultation
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#platforms">
              Explore Platforms
              <ArrowRightIcon className="size-4" />
            </a>
          </Button>
        </motion.div>
      </motion.div>
      <div className="absolute top-0 left-0 h-full w-full translate-y-[1rem] opacity-70 transition-all duration-500 ease-in-out group-hover:translate-y-[-2rem] group-hover:opacity-90">
        <Glow variant="bottom" />
      </div>
    </Section>
  );
}

function FinalSkyScene() {
  const lights = Array.from({ length: 8 }).map((_, i) => ({
    x: (i * 137.5) % 1200,
    y: 40 + ((i * 53) % 180),
    delay: i * 0.35,
  }));
  return (
    <svg viewBox="0 0 1200 320" className="h-full w-full" aria-hidden>
      {lights.map((l, i) => (
        <circle
          key={i}
          cx={l.x}
          cy={l.y}
          r="2"
          fill="var(--brand-foreground)"
          style={{ animation: `hero-twinkle ${3 + (i % 4)}s ease-in-out ${l.delay}s infinite` }}
        />
      ))}
      <path
        d="M60 280 C 260 220, 420 180, 620 160 S 940 100, 1140 60"
        stroke="var(--route)"
        strokeWidth="1.5"
        strokeDasharray="5 9"
        fill="none"
        opacity="0.4"
        style={{ animation: "hero-dash 7s linear infinite" }}
      />
    </svg>
  );
}

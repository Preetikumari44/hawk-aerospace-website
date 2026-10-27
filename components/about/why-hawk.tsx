"use client";

import { motion } from "framer-motion";

import { whyHawk } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../ui/section";
import { SectionHeading } from "../ui/section-heading";

export default function AboutWhyHawk() {
  return (
    <Section className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-10 sm:gap-14">
        <SectionHeading
          eyebrow="Why Hawk Aerospace"
          title="One Partner, One Connected Workflow"
          description="Hawk Aerospace owns the full chain from physical reality to actionable intelligence — hardware, data, software and SaaS, working as one system rather than a set of disconnected tools."
        />
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {whyHawk.map((item) => (
            <motion.div key={item.title} variants={fadeUp} className="glass-1 flex flex-col gap-1.5 rounded-xl p-5">
              <h3 className="text-sm font-semibold sm:text-base">{item.title}</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

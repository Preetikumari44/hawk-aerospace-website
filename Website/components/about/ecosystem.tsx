"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

import { ecosystemStages } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../ui/section";
import { SectionHeading } from "../ui/section-heading";

export default function AboutEcosystem() {
  return (
    <Section className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-10 sm:gap-14">
        <SectionHeading
          eyebrow="Our Technology Ecosystem"
          title="One Connected Workflow, End to End"
        />
        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="flex w-full flex-wrap items-stretch justify-center gap-x-1 gap-y-3"
        >
          {ecosystemStages.map((stage, i) => (
            <motion.div key={stage} variants={fadeUp} className="flex items-center gap-1">
              <div className="glass-1 flex h-full items-center rounded-lg px-3.5 py-2.5 text-xs font-semibold sm:text-sm">
                {stage}
              </div>
              {i < ecosystemStages.length - 1 && (
                <ArrowRightIcon className="text-brand/50 size-4 shrink-0" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

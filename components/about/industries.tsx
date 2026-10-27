"use client";

import { motion } from "framer-motion";
import { Building, Cable, TrainFront, Wheat } from "lucide-react";

import { aboutIndustries } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../ui/section";
import { SectionHeading } from "../ui/section-heading";

const ICONS = [Building, Wheat, TrainFront, Cable];

export default function AboutIndustries() {
  return (
    <Section className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-10 sm:gap-14">
        <SectionHeading eyebrow="Industries We Serve" title="Built for Real-World Sectors" />
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {aboutIndustries.map((industry, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <motion.div
                key={industry.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="border-border/60 hover:border-brand/50 flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-colors duration-300"
              >
                <div className="bg-brand/10 text-brand flex size-11 items-center justify-center rounded-full">
                  <Icon className="size-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold">{industry.title}</h3>
                <p className="text-muted-foreground text-xs">{industry.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </Section>
  );
}

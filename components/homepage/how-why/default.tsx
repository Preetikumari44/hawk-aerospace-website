"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

import { howItWorks, whyHawk } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Button } from "../../ui/button";
import { Reveal } from "../../ui/reveal";
import { Section } from "../../ui/section";
import { SectionHeading } from "../../ui/section-heading";

export default function HowWhy() {
  return (
    <Section id="why-hawk" className="line-t">
      <div className="max-w-container mx-auto flex flex-col gap-14 sm:gap-20">
        <div className="flex flex-col items-center gap-10 sm:gap-12">
          <SectionHeading eyebrow="How It Works" title="Capture. Process. Understand. Deliver." />
          <motion.div
            variants={stagger(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
            className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center"
          >
            {howItWorks.map((step, i) => (
              <motion.div key={step.n} variants={fadeUp} className="flex flex-1 items-center gap-2">
                <div className="flex flex-1 items-start gap-3 py-2">
                  <span className="text-brand text-sm font-bold">{step.n}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{step.title}</span>
                    <span className="text-muted-foreground text-xs">{step.desc}</span>
                  </div>
                </div>
                {i < howItWorks.length - 1 && (
                  <ArrowRightIcon className="text-brand/50 hidden size-4 shrink-0 sm:block" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-10 sm:gap-12">
          <SectionHeading eyebrow="Why Hawk" title="Why End-to-End Matters" />
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
          <Reveal>
            <Button variant="outline" asChild>
              <a href="/about">
                Learn About Hawk Aerospace
                <ArrowRightIcon className="size-4" />
              </a>
            </Button>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

import { pipelineFlow } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../ui/section";
import { SectionHeading } from "../ui/section-heading";

const CAPABILITY_AREAS = [
  "Aerial Data Capture",
  "Drone Technology",
  "3D Mapping",
  "Geospatial Intelligence",
  "AI & Computer Vision",
  "Digital Twins",
  "Cloud-Based Platforms",
  "Industry-Specific Analytics",
];

export default function AboutOverview() {
  return (
    <>
      <Section className="line-t">
        <div className="max-w-container mx-auto flex flex-col items-center gap-10 sm:gap-14">
          <SectionHeading
            eyebrow="Who We Are"
            title="A Technology Company Built Around Aerial Intelligence"
            description="Hawk Aerospace works across aerial data capture, drone technology, 3D mapping, geospatial intelligence, AI and computer vision, digital twins, cloud-based platforms and industry-specific analytics."
          />
          <div className="flex w-full flex-wrap justify-center gap-2">
            {CAPABILITY_AREAS.map((area) => (
              <span
                key={area}
                className="border-border/60 text-muted-foreground rounded-full border px-3.5 py-1.5 text-xs font-medium sm:text-sm"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section id="journey" className="line-t">
        <div className="max-w-container mx-auto flex flex-col items-center gap-12 sm:gap-16">
          <SectionHeading
            eyebrow="Our Journey"
            title="From Reality Capture to End-to-End Intelligence"
            description="Hawk Aerospace's story is a progression — from capturing the physical world to delivering a complete, connected intelligence ecosystem."
          />
          <motion.div
            variants={stagger(0.09)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
            className="flex w-full flex-col items-stretch gap-2 lg:flex-row lg:items-center"
          >
            {pipelineFlow.map((stage, i) => (
              <motion.div key={stage.n} variants={fadeUp} className="flex flex-1 items-center gap-2">
                <div className="glass-1 flex flex-1 flex-col gap-1.5 rounded-xl p-5">
                  <span className="text-brand text-xs font-bold tracking-[0.15em]">{stage.n}</span>
                  <h3 className="text-base font-semibold sm:text-lg">{stage.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">{stage.desc}</p>
                </div>
                {i < pipelineFlow.length - 1 && (
                  <ArrowRightIcon className="text-brand/50 hidden size-5 shrink-0 lg:block" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>
    </>
  );
}

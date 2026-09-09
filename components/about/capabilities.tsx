"use client";

import { motion } from "framer-motion";

import {
  IconAiBrain,
  IconCloud,
  IconDigitalTwin,
  IconDrone,
  IconGisLayers,
  IconLidar,
  IconMapping,
  IconSensors,
  IconThermal,
} from "@/components/homepage/illustrations";
import { aboutCapabilities } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../ui/section";
import { SectionHeading } from "../ui/section-heading";

const ICONS = {
  "aerial-capture": IconDrone,
  "3d-mapping": IconMapping,
  "ai-analytics": IconAiBrain,
  "geospatial-intelligence": IconGisLayers,
  "digital-twins": IconDigitalTwin,
  "cloud-saas": IconCloud,
  rgb: IconSensors,
  thermal: IconThermal,
  lidar: IconLidar,
};

export default function AboutCapabilities() {
  return (
    <Section className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-10 sm:gap-14">
        <SectionHeading eyebrow="What We Do" title="Capabilities Across the Full Stack" />
        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {aboutCapabilities.map((cap) => {
            const Icon = ICONS[cap.key as keyof typeof ICONS];
            return (
              <motion.div
                key={cap.key}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="border-border/60 hover:border-brand/50 flex flex-col gap-3 rounded-xl border p-5 transition-colors duration-300"
              >
                <div className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold sm:text-base">{cap.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">{cap.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </Section>
  );
}

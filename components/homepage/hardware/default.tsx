"use client";

import { motion } from "framer-motion";

import { hardwareItems } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../../ui/section";
import { SectionHeading } from "../../ui/section-heading";
import { IconDrone, IconLidar, IconSensors, IconThermal } from "../illustrations";

const ICONS = {
  drones: IconDrone,
  rgb: IconSensors,
  thermal: IconThermal,
  lidar: IconLidar,
};

export default function Hardware() {
  return (
    <Section id="hardware" className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-10 sm:gap-14">
        <SectionHeading
          title="Hardware That Captures the Real World"
          description="Hawk combines aerial platforms and specialized sensors to capture the physical world with precision."
        />
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {hardwareItems.map((item) => {
            const Icon = ICONS[item.key as keyof typeof ICONS];
            return (
              <motion.div
                key={item.key}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="border-border/60 hover:border-brand/50 flex flex-col gap-3 rounded-xl border p-5 transition-colors duration-300"
              >
                <div className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold sm:text-base">{item.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </Section>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  Cloud,
  Cpu,
  LayoutGrid,
  MapPin,
  Radar,
} from "lucide-react";

import { marketplaceCategories } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../ui/section";
import { SectionHeading } from "../ui/section-heading";

const ICONS = [Radar, Cpu, MapPin, Cloud, LayoutGrid];

export default function MarketplaceCategories() {
  return (
    <Section className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-10 sm:gap-14">
        <SectionHeading
          eyebrow="Future Ecosystem"
          title="Categories the Marketplace Will Bring Together"
          description="These are the categories Hawk Marketplace is planned to organize around — not yet available for browsing or purchase."
        />
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {marketplaceCategories.map((cat, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <motion.div
                key={cat.title}
                variants={fadeUp}
                className="border-border/60 flex flex-col gap-3 rounded-xl border p-5"
              >
                <div className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold">{cat.title}</h3>
                <p className="text-muted-foreground text-xs">{cat.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </Section>
  );
}

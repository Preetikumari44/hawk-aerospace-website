"use client";

import { motion } from "framer-motion";
import { PhoneCall } from "lucide-react";
import Link from "next/link";

import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Button } from "../ui/button";
import Glow from "../ui/glow";
import { Section } from "../ui/section";

export default function AboutCTA() {
  return (
    <Section id="contact" className="group relative line-t overflow-hidden">
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
          Let&apos;s Turn Aerial Data Into Intelligence.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-muted-foreground max-w-[520px] text-md font-medium sm:text-lg"
        >
          Talk to Hawk Aerospace about your next mapping, monitoring,
          property or agriculture project.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Button size="lg" asChild>
            <Link href="/#contact">
              <PhoneCall className="size-4" />
              Request a Consultation
            </Link>
          </Button>
        </motion.div>
      </motion.div>
      <div className="absolute top-0 left-0 h-full w-full translate-y-[1rem] opacity-70 transition-all duration-500 ease-in-out group-hover:translate-y-[-2rem] group-hover:opacity-90">
        <Glow variant="bottom" />
      </div>
    </Section>
  );
}

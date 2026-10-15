"use client";

import { motion } from "framer-motion";
import { CheckIcon } from "lucide-react";

import { platforms } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Button } from "../../ui/button";
import { Section } from "../../ui/section";
import { SectionHeading } from "../../ui/section-heading";

export default function Platforms() {
  return (
    <Section id="platforms" className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-12 sm:gap-16">
        <SectionHeading
          eyebrow="The Technology Behind These Solutions"
          title="From Aerial Data to Digital Intelligence"
        />

        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          {platforms.map((platform) => (
            <motion.div
              key={platform.key}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="border-border/60 flex flex-col gap-5 rounded-2xl border p-6 sm:p-8"
            >
              <div className="border-border/60 overflow-hidden rounded-xl border">
                {platform.key === "skymap" ? <SkyMapPreview /> : <AgriSurePreview />}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-brand text-2xl font-bold">{platform.name}</span>
                <span className="text-muted-foreground text-sm font-semibold">
                  {platform.tagline}
                </span>
              </div>
              <p className="text-foreground/90 text-sm sm:text-base">
                {platform.description}
              </p>
              <motion.ul
                variants={stagger(0.06)}
                initial="hidden"
                whileInView="show"
                viewport={viewport}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {platform.capabilities.map((cap) => (
                  <motion.li key={cap} variants={fadeUp} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="text-brand size-4 shrink-0" />
                    {cap}
                  </motion.li>
                ))}
              </motion.ul>
              <div className="border-border/60 flex gap-6 border-t pt-4">
                {platform.stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <span className="text-lg font-bold">{stat.value}</span>
                    <span className="text-muted-foreground text-xs">{stat.label}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" asChild className="mt-auto self-start">
                <a href={platform.href ?? "#contact"}>Explore Platform</a>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function SkyMapPreview() {
  return (
    <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="SkyMap dashboard preview">
      <rect width="400" height="220" fill="var(--card)" />
      {Array.from({ length: 6 }).map((_, row) => (
        <line key={row} x1="0" y1={row * 40} x2="400" y2={row * 40} stroke="var(--brand)" strokeOpacity="0.08" />
      ))}
      {Array.from({ length: 10 }).map((_, col) => (
        <line key={col} x1={col * 40} y1="0" x2={col * 40} y2="220" stroke="var(--brand)" strokeOpacity="0.08" />
      ))}
      <rect x="24" y="20" width="160" height="80" rx="6" fill="var(--secondary)" stroke="var(--border)" />
      <rect x="200" y="20" width="176" height="36" rx="6" fill="var(--secondary)" stroke="var(--border)" />
      <rect x="200" y="64" width="176" height="36" rx="6" fill="var(--secondary)" stroke="var(--border)" />
      <rect x="24" y="112" width="352" height="88" rx="6" fill="var(--secondary)" stroke="var(--border)" />
      {[[60, 170], [140, 140], [220, 175], [300, 130], [350, 160]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="var(--brand-foreground)" />
      ))}
      <path
        d="M60 170 L140 140 L220 175 L300 130 L350 160"
        stroke="var(--brand-foreground)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

function AgriSurePreview() {
  const colors = ["#3f7d4f", "#5c9a5c", "#8fbf6b", "#c9d96a", "#e2c95a"];
  return (
    <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="AgriSure crop health dashboard preview">
      <rect width="400" height="220" fill="var(--card)" />
      <g transform="translate(24,20)">
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 8 }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * 44}
              y={r * 30}
              width="40"
              height="26"
              fill={colors[(r + c) % colors.length]}
              opacity="0.6"
            />
          )),
        )}
      </g>
      <rect x="24" y="150" width="352" height="50" rx="6" fill="var(--secondary)" stroke="var(--border)" />
      <text x="36" y="172" fontSize="10" fill="var(--muted-foreground)" fontFamily="monospace">
        NDVI HEALTH SCORE
      </text>
      <text x="36" y="188" fontSize="14" fill="var(--foreground)" fontFamily="monospace" fontWeight="bold">
        Good
      </text>
    </svg>
  );
}

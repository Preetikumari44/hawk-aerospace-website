"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { solutionGroups } from "@/lib/data/hawk";
import { fadeUp, stagger, viewport } from "@/lib/motion";

import { Section } from "../../ui/section";
import { SectionHeading } from "../../ui/section-heading";
import {
  CropIntelligenceMotif,
  PrecisionAgricultureMotif,
  ProjectProgressMotif,
  PropertyTourMotif,
} from "./motifs";

const MOTIFS = [
  [PropertyTourMotif, ProjectProgressMotif],
  [CropIntelligenceMotif, PrecisionAgricultureMotif],
];

export default function Solutions() {
  return (
    <Section id="solutions" className="line-t">
      <div className="max-w-container mx-auto flex flex-col items-center gap-12 sm:gap-16">
        <SectionHeading
          eyebrow="Built for Real-World Operations"
          title="Solutions Built Around Real-World Use Cases"
        />

        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          {solutionGroups.map((group, gi) => (
            <motion.div
              key={group.key}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="border-border/60 flex flex-col gap-5 rounded-2xl border p-6 sm:p-8"
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-semibold">{group.name}</h3>
                <p className="text-muted-foreground text-sm">{group.tagline}</p>
              </div>

              <motion.div
                variants={stagger(0.1)}
                initial="hidden"
                whileInView="show"
                viewport={viewport}
                className="flex flex-col gap-4"
              >
                {group.useCases.map((useCase, ui) => {
                  const Motif = MOTIFS[gi][ui];
                  const cardClass =
                    "border-border/60 hover:border-brand/50 flex flex-col gap-4 rounded-xl border p-4 transition-colors duration-300 sm:flex-row sm:items-stretch";
                  const content = (
                    <>
                      <div className="aspect-[8/5] w-full shrink-0 overflow-hidden rounded-lg sm:aspect-auto sm:w-40">
                        <Motif />
                      </div>
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-brand text-xs font-bold tracking-[0.1em]">
                            {useCase.n}
                          </span>
                          {useCase.poweredBy && (
                            <span className="border-border/60 text-muted-foreground rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide">
                              Powered by {useCase.poweredBy}
                            </span>
                          )}
                        </div>
                        <h4 className="flex items-center gap-1.5 text-base font-semibold">
                          {useCase.title}
                          {useCase.href && (
                            <ArrowRightIcon className="text-brand size-3.5" />
                          )}
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {useCase.description}
                        </p>
                        <ul className="mt-1 flex flex-col gap-1">
                          {useCase.capabilities.map((cap) => (
                            <li key={cap} className="text-foreground/80 flex items-center gap-2 text-xs">
                              <CheckIcon className="text-brand size-3 shrink-0" />
                              {cap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  );

                  return useCase.href ? (
                    <motion.a
                      key={useCase.title}
                      href={useCase.href}
                      variants={fadeUp}
                      whileHover={{ y: -3 }}
                      className={cardClass}
                    >
                      {content}
                    </motion.a>
                  ) : (
                    <motion.div
                      key={useCase.title}
                      variants={fadeUp}
                      whileHover={{ y: -3 }}
                      className={cardClass}
                    >
                      {content}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}


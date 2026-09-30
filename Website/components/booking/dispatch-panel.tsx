"use client";

import { motion } from "framer-motion";
import { SatelliteDishIcon } from "lucide-react";

import { fadeUp, stagger } from "@/lib/motion";

import type { Operator } from "../../lib/booking/types";
import { OperatorCard } from "./operator-card";

interface DispatchPanelProps {
  operators: Operator[];
  selectedOperatorId: string | null;
  onSelectOperator: (id: string) => void;
}

export function DispatchPanel({
  operators,
  selectedOperatorId,
  onSelectOperator,
}: DispatchPanelProps) {
  const fastest = operators.reduce(
    (min, op) => Math.min(min, op.estimatedTakeoffMinutes),
    Infinity,
  );
  // Highest-suitability AVAILABLE Raider — the system's actual recommendation
  // (nearest + capable + battery), not just whichever is listed first (§6).
  const bestMatchId = operators
    .filter((op) => op.status === "available")
    .reduce<Operator | null>((best, op) => (!best || op.suitabilityScore > best.suitabilityScore ? op : best), null)
    ?.id;

  return (
    <motion.div
      variants={stagger(0.06)}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4"
    >
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SatelliteDishIcon className="text-brand size-4" />
          <span className="text-foreground text-xs font-semibold tracking-[0.2em] uppercase">
            Nearest Pilots
          </span>
        </div>
        <span className="text-muted-foreground text-[11px]">
          {operators.length} found · from{" "}
          <span className="text-foreground font-semibold">{fastest} min</span>
        </span>
      </motion.div>

      <motion.p variants={fadeUp} className="text-muted-foreground text-[11px]">
        Selecting a pilot is optional — your pilot is assigned by the Fleet Manager after admin
        approval. Tap again to deselect.
      </motion.p>

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        {operators.map((op) => (
          <OperatorCard
            key={op.id}
            operator={op}
            selected={op.id === selectedOperatorId}
            onSelect={() => onSelectOperator(op.id === selectedOperatorId ? "" : op.id)}
            isBestMatch={op.id === bestMatchId}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

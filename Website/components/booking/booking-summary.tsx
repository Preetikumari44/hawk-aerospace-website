"use client";

import { motion } from "framer-motion";
import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PriceEstimateResult } from "@/lib/booking/api-client";
import { fadeUp, stagger } from "@/lib/motion";

import type { DroneService, Operator, SubService } from "../../lib/booking/types";
import { formatINR, totalOf } from "./price-estimate";

interface BookingSummaryProps {
  service: DroneService;
  subService: SubService;
  location: string;
  date: string;
  time: string;
  /** Optional — pilot is assigned by the FM after admin approval. */
  operator: Operator | null;
  priceEstimate: PriceEstimateResult | null;
  priceLoading: boolean;
  isAuthenticated: boolean;
  onConfirm: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
        {label}
      </span>
      <span className="text-foreground text-sm font-semibold">{value}</span>
    </div>
  );
}

export function BookingSummary({
  service,
  subService,
  location,
  date,
  time,
  operator,
  priceEstimate,
  priceLoading,
  isAuthenticated,
  onConfirm,
}: BookingSummaryProps) {
  const total = totalOf(priceEstimate);
  return (
    <motion.div
      variants={stagger(0.05)}
      initial="hidden"
      animate="show"
      className="flex flex-col"
    >
      <motion.span
        variants={fadeUp}
        className="text-brand text-xs font-semibold tracking-[0.2em] uppercase"
      >
        Booking Summary
      </motion.span>

      <motion.div variants={fadeUp} className="divide-border/50 mt-2 flex flex-col divide-y">
        <Row label="Service" value={service.label} />
        <Row label="Sub-Service" value={subService.label} />
        <Row label="Location" value={location || "Selected project site"} />
        <Row label="Date" value={date || "—"} />
        <Row label="Time Slot" value={time || "—"} />
        <Row
          label="Pilot"
          value={operator ? `${operator.callsign} · ${operator.name}` : "Assigned after approval"}
        />
        {operator && (
          <Row label="Estimated Takeoff" value={`${operator.estimatedTakeoffMinutes} min`} />
        )}
        <Row
          label="Estimated Cost"
          value={
            priceLoading ? "Calculating…" : total != null ? formatINR(total) : "To be confirmed"
          }
        />
      </motion.div>

      {!isAuthenticated && (
        <motion.p
          variants={fadeUp}
          className="text-muted-foreground mt-4 flex items-center gap-2 text-xs"
        >
          <LockIcon className="size-3.5 shrink-0" />
          Login required to confirm your booking.
        </motion.p>
      )}

      <motion.div variants={fadeUp}>
        <Button size="lg" onClick={onConfirm} className="mt-4 w-full">
          {isAuthenticated ? "Confirm Booking" : "Login to Confirm"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

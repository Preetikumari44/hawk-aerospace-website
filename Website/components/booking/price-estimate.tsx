"use client";

import { motion } from "framer-motion";
import { IndianRupeeIcon, Loader2Icon } from "lucide-react";
import * as React from "react";

import { type PriceEstimateResult,pricingApi } from "@/lib/booking/api-client";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { buildScheduledDate, SLOT_HOUR_MAP, type SlotKey } from "./time-slot-picker";

interface PriceEstimateProps {
  /** Catalog serviceType for POST /pricing/estimate-service (e.g. monitoring for NDVI). */
  serviceType: string | null;
  /** Canonical catalog key, e.g. traffic_management_monitoring. */
  catalogKey?: string | null;
  /** Billing unit, e.g. per_hour. */
  unit?: string | null;
  /** Billing quantity, e.g. 3 hours. Drives the total — changes re-estimate. */
  quantity?: number | null;
  date: string;
  slot: string;
  latitude: number | null;
  longitude: number | null;
  onEstimate: (estimate: PriceEstimateResult | null) => void;
  compact?: boolean;
}

function amountOf(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

export function totalOf(estimate: PriceEstimateResult | null): number | null {
  if (!estimate) return null;
  return (
    amountOf(estimate.totalAmount) ??
    amountOf(estimate.estimatedAmount) ??
    amountOf(estimate.subtotal) ??
    null
  );
}

export function usePriceEstimate(
  serviceType: string | null,
  date: string,
  slot: string,
  latitude: number | null,
  longitude: number | null,
  extra?: { catalogKey?: string | null; unit?: string | null; quantity?: number | null },
): { estimate: PriceEstimateResult | null; loading: boolean } {
  const [estimate, setEstimate] = React.useState<PriceEstimateResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const requestIdRef = React.useRef(0);
  // String key stabilises the extras across renders — without this every
  // parent render re-fires the POST (→ HTTP 429 rate-limit).
  const extraKey = JSON.stringify({
    catalogKey: extra?.catalogKey ?? null,
    unit: extra?.unit ?? null,
    quantity: extra?.quantity ?? null,
  });

  React.useEffect(() => {
    const parsed = JSON.parse(extraKey) as { catalogKey: string | null; unit: string | null; quantity: number | null };
    if (!serviceType || !date || !slot || !parsed.catalogKey || parsed.quantity == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the estimate when inputs are incomplete; inputs come from the parent form.
      setEstimate(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const requestId = ++requestIdRef.current;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          // Catalog-based pricing (Excel price list). NOTE: this is NOT
          // estimate-booking (legacy crop-rate engine — ignores sub-service
          // and always returns the same ~₹354 figure).
          const scheduledDate = buildScheduledDate(date, slot);
          const hour = SLOT_HOUR_MAP[slot as SlotKey] ?? 8;
          const result = await pricingApi.estimateService({
            serviceType,
            key: parsed.catalogKey,
            ...(parsed.unit ? { unit: parsed.unit } : {}),
            quantity: parsed.quantity,
            scheduledDate,
            preferredTime: String(hour),
          });
          if (requestIdRef.current !== requestId) return;
          setEstimate(result);
        } catch {
          if (requestIdRef.current !== requestId) return;
          setEstimate(null);
        } finally {
          if (requestIdRef.current === requestId) setLoading(false);
        }
      })();
    }, 500);
    return () => window.clearTimeout(handle);
  }, [serviceType, date, slot, latitude, longitude, extraKey]);

  return { estimate, loading };
}

export function PriceEstimate({
  serviceType,
  catalogKey,
  unit,
  quantity,
  date,
  slot,
  latitude,
  longitude,
  onEstimate,
  compact,
}: PriceEstimateProps) {
  const { estimate, loading } = usePriceEstimate(serviceType, date, slot, latitude, longitude,
    { catalogKey, unit, quantity });

  React.useEffect(() => {
    onEstimate(estimate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- propagate estimate snapshots only.
  }, [estimate]);

  const total = totalOf(estimate);

  if (loading) {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="border-border/60 glass-1 flex items-center gap-2 rounded-xl border p-3.5"
      >
        <Loader2Icon className="text-brand size-4 animate-spin" />
        <span className="text-muted-foreground text-xs">Calculating estimated cost…</span>
      </motion.div>
    );
  }

  if (total == null) return null;

  const rows: Array<{ label: string; value: number }> = [];
  const base = amountOf(estimate?.baseAmount);
  if (base != null) rows.push({ label: "Base", value: base });
  const discount = amountOf(estimate?.discount);
  if (discount != null && discount > 0) rows.push({ label: "Discount", value: -discount });
  const coupon = amountOf(estimate?.couponDiscount);
  if (coupon != null && coupon > 0) rows.push({ label: "Coupon", value: -coupon });
  const tax = amountOf(estimate?.taxAmount);
  if (tax != null && tax > 0) rows.push({ label: "GST (18%)", value: tax });

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn(
        "border-brand/40 glass-1 rounded-xl border p-3.5",
        compact ? "flex flex-col gap-1" : "flex flex-col gap-2",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] text-brand uppercase">
        <IndianRupeeIcon className="size-3.5" />
        Estimated Cost
      </span>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="text-foreground font-semibold">
            {r.value < 0 ? `− ${formatINR(Math.abs(r.value))}` : formatINR(r.value)}
          </span>
        </div>
      ))}
      {Array.isArray(estimate?.lineItems) &&
        estimate.lineItems
          .filter((li) => typeof li?.amount === "number")
          .slice(0, 4)
          .map((li, i) => (
            <div key={`${li.label}-${i}`} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{li.label}</span>
              <span className="text-foreground font-semibold">{formatINR(li.amount)}</span>
            </div>
          ))}
      <div className="border-border/50 flex items-center justify-between border-t pt-2">
        <span className="text-foreground text-sm font-semibold">Total</span>
        <span className="text-foreground gradient-text text-lg font-bold">{formatINR(total)}</span>
      </div>
      <p className="text-muted-foreground text-[11px]">
        Final price is confirmed at payment — coupons and site extras may adjust it.
      </p>
    </motion.div>
  );
}

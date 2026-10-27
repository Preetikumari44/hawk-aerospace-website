"use client";

// Single source of truth for pricing inputs shared by the estimate callers
// (homepage hub, per-service page) and the booking payload builder (payment
// page). The backend prices the booking from serviceDetails, so the estimate
// MUST use the identical {serviceType, key, unit, quantity, scheduledDate,
// preferredTime} — any divergence blocks payment at the mismatch guard.

import {
  SERVICE_CATALOG,
  SURVEILLANCE_QUANTITY_META,
  VIDEO_QUANTITY_META,
} from "@/lib/booking/data";
import type { BookingDraft, ServiceKey } from "@/lib/booking/types";

export const AREA_TO_ACRES: Record<string, number> = {
  acre: 1,
  hectare: 2.47105,
  sq_m: 1 / 4046.8564224,
};

export function areaInAcres(draft: BookingDraft): number {
  return (
    Math.round(
      Number(draft.areaValue ?? 1) * (AREA_TO_ACRES[draft.areaUnit ?? "acre"] ?? 1) * 100,
    ) / 100
  );
}

/** Backend hour mapping for peak-hour pricing (mirrors hourForTimeSlot). */
export function backendPreferredTime(slotLabel: string): string {
  if (slotLabel === "Morning") return "08:00";
  if (slotLabel === "Evening") return "14:00";
  if (slotLabel === "Night") return "18:00";
  return "08:00";
}

/** Canonical backend labels for mapping tiers (the only labels the backend
 *  price list resolves — every mapping sub prices as one of these tiers). */
export const MAPPING_TIER_LABEL: Record<string, string> = {
  basic_aerial_mapping: "Basic Aerial Mapping",
  advanced_mapping: "Advanced Mapping (DTM/DSM + contours)",
};

export interface PricingInput {
  /** Backend serviceType actually billed (NDVI → monitoring). */
  serviceType: string;
  /** Catalog key the backend will resolve (estimateKey tier). */
  catalogKey: string | null;
  unit: string | null;
  quantity: number | null;
  /** serviceDetails exactly as sent on POST /bookings. */
  serviceDetails: Record<string, unknown>;
}

export function isNdviDraft(draft: BookingDraft): boolean {
  return draft.service === "spraying" && draft.subService === "crop-health-monitoring-ndvi";
}

export function billingServiceType(draft: BookingDraft): string {
  if (isNdviDraft(draft)) return "monitoring";
  if (draft.service === "videography") return "videography";
  if (draft.service === "spraying") return "spraying";
  if (draft.service === "mapping") return "mapping";
  if (draft.service === "surveillance") return "surveillance";
  return "spraying";
}

/** Billing unit + quantity for the draft — mirrors the payload builder. */
export function billingUnitAndQuantity(
  service: ServiceKey | null,
  subService: string | null,
  draft: Pick<BookingDraft, "areaValue" | "videographyQuantity" | "surveillanceQuantity">,
  areaAcres: number,
): { unit: string | null; quantity: number | null } {
  if (service === "videography" && subService) {
    const meta = VIDEO_QUANTITY_META[subService];
    if (meta) return { unit: meta.unit, quantity: draft.videographyQuantity ?? meta.defaultQty };
  }
  if (service === "surveillance" && subService) {
    const meta = SURVEILLANCE_QUANTITY_META[subService];
    if (meta) return { unit: meta.unit, quantity: draft.surveillanceQuantity ?? 1 };
  }
  if (service === "spraying" || service === "mapping") {
    return { unit: "per_acre", quantity: areaAcres };
  }
  return { unit: null, quantity: null };
}

export function buildPricingInput(draft: BookingDraft): PricingInput {
  const service = SERVICE_CATALOG.find((s) => s.key === draft.service) ?? null;
  const sub = service?.subServices.find((s) => s.key === draft.subService) ?? null;
  const serviceType = billingServiceType(draft);
  const acres = areaInAcres(draft);
  const { unit, quantity } = billingUnitAndQuantity(draft.service, draft.subService, draft, acres);
  const serviceDetails: Record<string, unknown> = {};
  if (draft.instructions?.trim()) serviceDetails.specialInstructions = draft.instructions.trim();

  let catalogKey: string | null = sub?.estimateKey ?? sub?.detailsValue ?? null;

  if (serviceType === "spraying") {
    serviceDetails.sprayingSubType = sub?.detailsValue ?? "precision_spraying";
    serviceDetails.unit = "per_acre";
    serviceDetails.quantity = acres;
  } else if (serviceType === "monitoring") {
    serviceDetails.monitoringSubType = "crop_health_monitoring";
    serviceDetails.unit = "per_acre";
    serviceDetails.quantity = acres;
  } else if (serviceType === "mapping") {
    // Backend resolves mapping ONLY by label, and only the two tier labels
    // exist in its price list — every sub bills at its estimate tier.
    const tierKey = sub?.estimateKey ?? sub?.detailsValue ?? "basic_aerial_mapping";
    catalogKey = tierKey;
    serviceDetails.mappingType =
      MAPPING_TIER_LABEL[tierKey] ?? "Basic Aerial Mapping";
    if (sub?.detailsKey && sub?.detailsValue) serviceDetails[sub.detailsKey] = sub.detailsValue;
    serviceDetails.unit = "per_acre";
    serviceDetails.quantity = acres;
  } else if (serviceType === "surveillance") {
    if (sub?.label) serviceDetails.surveillanceType = sub.label;
    if (sub?.detailsKey && sub?.detailsValue) serviceDetails[sub.detailsKey] = sub.detailsValue;
    const meta = (draft.subService && SURVEILLANCE_QUANTITY_META[draft.subService]) || undefined;
    serviceDetails.unit = meta?.unit ?? "per_visit";
    serviceDetails.quantity = Number(draft.surveillanceQuantity ?? 1);
  } else if (serviceType === "videography") {
    if (sub?.label) {
      serviceDetails.videographyType = sub.label;
      serviceDetails.eventType = sub.label;
    }
    if (sub?.detailsKey && sub?.detailsValue) serviceDetails[sub.detailsKey] = sub.detailsValue;
    const meta = (draft.subService && VIDEO_QUANTITY_META[draft.subService]) || undefined;
    serviceDetails.unit = meta?.unit ?? "min";
    serviceDetails.quantity = Number(draft.videographyQuantity ?? meta?.defaultQty ?? 30);
  }

  return { serviceType, catalogKey, unit, quantity, serviceDetails };
}

// Preserves in-progress booking state (service, location, detailed address,
// date, time slot, the operators returned by the last scan, and the selected
// operator) across the trip to the dedicated /login page and back. Login is a
// real route change, so this can't be held in a React closure — it has to
// survive an unmount.
//
// Only ever written right before navigating to /login, and always cleared
// after being read once, so a stale draft never resurfaces on an unrelated
// visit.

import type { BookingDraft, Operator } from "./types";

const RESUME_KEY = "hawk_booking_resume_v1";
const INTENT_KEY = "hawk_booking_intent_v1";

export interface BookingResumeState {
  draft: BookingDraft;
  operators: Operator[];
  selectedOperatorId: string | null;
  /** Estimated cost snapshot so the payment step can render instantly. */
  priceEstimate?: Record<string, unknown> | null;
}

function normalizeDraft(raw: unknown): BookingDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const detailed =
    d.detailedAddress && typeof d.detailedAddress === "object"
      ? (d.detailedAddress as Record<string, unknown>)
      : {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const coords =
    d.coordinates && typeof d.coordinates === "object"
      ? (d.coordinates as { lat?: unknown; lng?: unknown })
      : null;
  const areaUnitRaw = d.areaUnit;
  return {
    service: (d.service as BookingDraft["service"]) ?? null,
    subService: (d.subService as BookingDraft["subService"]) ?? null,
    // User_Frontend parity fields — ALL of these affect backend pricing.
    // Dropping any of them silently reverts the booking to quantity 1 while
    // the payment page still displays the in-memory estimate (fatal mismatch).
    crop: typeof d.crop === "string" ? d.crop : null,
    infraType: typeof d.infraType === "string" ? d.infraType : null,
    areaValue: num(d.areaValue, 1),
    areaUnit: areaUnitRaw === "hectare" || areaUnitRaw === "sq_m" ? areaUnitRaw : "acre",
    videographyQuantity: num(d.videographyQuantity, 30),
    surveillanceQuantity: num(d.surveillanceQuantity, 1),
    instructions: str(d.instructions),
    location: str(d.location),
    coordinates:
      coords && typeof coords.lat === "number" && typeof coords.lng === "number"
        ? { lat: coords.lat, lng: coords.lng }
        : null,
    detailedAddress: {
      addressLine1: str(detailed.addressLine1),
      addressLine2: str(detailed.addressLine2),
      city: str(detailed.city),
      state: str(detailed.state),
      pincode: str(detailed.pincode),
    },
    date: str(d.date),
    time: str(d.time),
    preferredTimeSlot: (d.preferredTimeSlot as BookingDraft["preferredTimeSlot"]) ?? null,
  };
}

export function saveBookingResumeState(state: BookingResumeState): void {
  try {
    window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(state));
  } catch {
    /* ignore storage errors — worst case the user re-fills the form */
  }
}

export function takeBookingResumeState(): BookingResumeState | null {
  try {
    const raw = window.sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(RESUME_KEY);
    const parsed = JSON.parse(raw) as BookingResumeState;
    const draft = normalizeDraft(parsed.draft);
    if (!draft) return null;
    return {
      draft,
      operators: Array.isArray(parsed.operators) ? parsed.operators : [],
      selectedOperatorId: parsed.selectedOperatorId ?? null,
      priceEstimate: parsed.priceEstimate ?? null,
    };
  } catch {
    return null;
  }
}

/** Authenticated booking intent carried from #booking to /booking/payment. */
export function saveBookingIntent(state: BookingResumeState): void {
  try {
    window.sessionStorage.setItem(INTENT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function takeBookingIntent(): BookingResumeState | null {
  try {
    const raw = window.sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(INTENT_KEY);
    const parsed = JSON.parse(raw) as BookingResumeState;
    const draft = normalizeDraft(parsed.draft);
    if (!draft) return null;
    return {
      draft,
      operators: Array.isArray(parsed.operators) ? parsed.operators : [],
      selectedOperatorId: parsed.selectedOperatorId ?? null,
      priceEstimate: parsed.priceEstimate ?? null,
    };
  } catch {
    return null;
  }
}

export function peekBookingIntent(): BookingResumeState | null {
  try {
    const raw = window.sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingResumeState;
    const draft = normalizeDraft(parsed.draft);
    if (!draft) return null;
    return {
      draft,
      operators: Array.isArray(parsed.operators) ? parsed.operators : [],
      selectedOperatorId: parsed.selectedOperatorId ?? null,
      priceEstimate: parsed.priceEstimate ?? null,
    };
  } catch {
    return null;
  }
}

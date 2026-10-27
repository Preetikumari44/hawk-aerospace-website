"use client";

// Complaint taxonomy + DTO mapping — Super App SelectComplaintTypeScreen
// parity (10 types) mapped onto the backend ComplaintType enum, with
// booking-linked relatedEntity flow (NewComplaintFormScreen parity).

export type BackendComplaintType =
  | "SERVICE_QUALITY"
  | "PAYMENT"
  | "BEHAVIOR"
  | "TECHNICAL"
  | "OTHER";

export interface ComplaintTypeOption {
  title: string;
  desc: string;
  backend: BackendComplaintType;
}

export const COMPLAINT_TYPES: ComplaintTypeOption[] = [
  {
    title: "Booking or Scheduling Issue",
    desc: "A problem with your confirmed, pending, or upcoming booking",
    backend: "OTHER",
  },
  {
    title: "Service Not Delivered",
    desc: "Your drone service didn't happen as planned",
    backend: "SERVICE_QUALITY",
  },
  {
    title: "Incomplete or Poor Service",
    desc: "The service happened but didn't meet expectations",
    backend: "SERVICE_QUALITY",
  },
  {
    title: "Payment or Billing Problem",
    desc: "An incorrect charge, failed payment, or missing refund",
    backend: "PAYMENT",
  },
  {
    title: "Cancellation & Refund Request",
    desc: "You want to cancel and get your money back",
    backend: "PAYMENT",
  },
  {
    title: "Safety Incident or Accident",
    desc: "Damage, injury, or unsafe behaviour during a flight",
    backend: "OTHER",
  },
  {
    title: "Pilot or Operator Conduct",
    desc: "Concerns about how your pilot behaved or communicated",
    backend: "BEHAVIOR",
  },
  {
    title: "Privacy or Data Concern",
    desc: "Footage or data was captured, shared, or stored without your consent",
    backend: "OTHER",
  },
  {
    title: "App or Technical Issue",
    desc: "A bug, crash, or error in the Hawk Aerospace app",
    backend: "TECHNICAL",
  },
  {
    title: "Something Else",
    desc: "My issue doesn't fit any of the above",
    backend: "OTHER",
  },
];

export interface ComplaintSummary {
  id: string;
  subject: string;
  type: string;
  status: string;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

function str(v: unknown, fb = ""): string {
  return typeof v === "string" && v ? v : fb;
}

export function normalizeComplaint(c: Record<string, unknown>): ComplaintSummary {
  const desc = str(c.description);
  return {
    id: String(c.id ?? c._id ?? ""),
    subject: str(c.subject ?? c.title) || `${desc.slice(0, 60)}${desc.length > 60 ? "…" : ""}` || "Complaint",
    type: str(c.type, "OTHER"),
    status: str(c.status, "OPEN"),
    createdAt: str(c.createdAt),
    relatedEntityType: str(c.relatedEntityType) || undefined,
    relatedEntityId: str(c.relatedEntityId) || undefined,
  };
}

export function normalizeComplaints(v: unknown): ComplaintSummary[] {
  if (Array.isArray(v)) return (v as Record<string, unknown>[]).map(normalizeComplaint);
  const o = (v ?? {}) as Record<string, unknown>;
  const items = o.items ?? o.complaints;
  if (Array.isArray(items)) return (items as Record<string, unknown>[]).map(normalizeComplaint);
  return [];
}

export function typeLabel(backendType: string): string {
  return COMPLAINT_TYPES.find((t) => t.backend === backendType)?.title ?? backendType;
}

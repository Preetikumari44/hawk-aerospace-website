"use client";

// ---------------------------------------------------------------------------
// Isolated API client for the standalone /pilot-form + /technician-form pages.
// Mirrors roleApplicationsApi (same payload shape) but posts to the isolated
// backend endpoints that write to the named `pilot-tech` Firestore database
// (same Firebase project) — never to the default database. Like
// /service-center, these pages stay fully unrelated to the booking/role flow.
// File uploads + OTP + referral-lookup still use the shared project services.
// ---------------------------------------------------------------------------

import { apiRequest } from "@/lib/booking/api-client";
import { normalizeBackendRole } from "@/lib/booking/roles";

export interface PilotTechApplicationPayload {
  role: string;
  roleLabel?: string;
  formData: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
  referralCode?: string;
  source?: string;
}

export const pilotTechApplicationsApi = {
  submit: (payload: PilotTechApplicationPayload) =>
    apiRequest<unknown>("/pilot-tech-applications", {
      method: "POST",
      body: { ...payload, role: normalizeBackendRole(payload.role) },
    }),
  submitGuest: (
    payload: PilotTechApplicationPayload & { firebaseIdToken: string; phone?: string },
  ) =>
    apiRequest<unknown>("/pilot-tech-applications/guest", {
      method: "POST",
      body: { ...payload, role: normalizeBackendRole(payload.role) },
      auth: false,
    }),
};

// ---------------------------------------------------------------------------
// DEMO-ONLY phone -> role lookup for the Raider System's role-based access
// (customer / pilot / admin / sales). These four numbers are explicitly
// documented demo credentials for local testing of the FlightRadar24-style
// live tracking upgrade — never production accounts, never secrets.
//
//   Demo User  (customer):      +91 98765 43210 · OTP 123456
//   Demo Pilot:                  +91 98765 43211 · OTP 123456
//   Demo Admin:                  +91 98765 43212 · OTP 123456
//   Demo Sales:                  +91 98765 43213 · OTP 123456
//   Demo Fleet Manager:          +91 98765 43214 · OTP 123456
//   Demo Technician:             +91 98765 43215 · OTP 123456
//
// See lib/booking/sms-otp-provider.ts / app/api/auth/otp/* for how these are
// wired into the existing OTP architecture without touching real Twilio
// verification for any other number.
// ---------------------------------------------------------------------------

import type { BookingRole } from "./types";

export const DEMO_OTP_CODE = "123456";

export const DEMO_ACCOUNTS: Record<string, BookingRole> = {
  "+919876543210": "customer",
  "+919876543211": "pilot",
  "+919876543212": "admin",
  "+919876543213": "sales",
  "+919876543214": "fleet-manager",
  "+919876543215": "technician",
};

export function isDemoPhone(phoneE164: string): boolean {
  return phoneE164 in DEMO_ACCOUNTS;
}

export function roleForPhone(phoneE164: string): BookingRole {
  return DEMO_ACCOUNTS[phoneE164] ?? "customer";
}

/** Fixed demo drone this "Demo Pilot" account flies, for app/pilot. */
export const DEMO_PILOT_RAIDER_ID = "raider-07";

// ---------------------------------------------------------------------------
// Role -> workspace route. The single source of truth for "where does this
// role's authorized workspace live" — used by the 9-dot launcher (to show
// only the caller's own workspace), and by every workspace's access-denied
// state (to send an unauthorized visitor to the workspace they DO have,
// instead of a hardcoded page).
// ---------------------------------------------------------------------------
export const WORKSPACE_ROUTE_FOR_ROLE: Record<BookingRole, string> = {
  customer: "/my-bookings",
  pilot: "/pilot",
  admin: "/admin",
  sales: "/sales",
  "fleet-manager": "/fleet",
  fleet: "/fleet",
  technician: "/technician",
};

export function workspaceRouteForRole(role: BookingRole): string {
  return WORKSPACE_ROUTE_FOR_ROLE[role];
}

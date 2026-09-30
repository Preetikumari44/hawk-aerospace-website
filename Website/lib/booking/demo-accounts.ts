// ---------------------------------------------------------------------------
// DEMO-ONLY phone -> role lookup for the Raider System's role-based access
// (customer / pilot / admin). These three numbers are explicitly documented
// demo credentials for local testing of the FlightRadar24-style live
// tracking upgrade — never production accounts, never secrets.
//
//   Demo User  (customer): +91 98765 43210 · OTP 123456
//   Demo Pilot:             +91 98765 43211 · OTP 123456
//   Demo Admin:             +91 98765 43212 · OTP 123456
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
};

export function isDemoPhone(phoneE164: string): boolean {
  return phoneE164 in DEMO_ACCOUNTS;
}

export function roleForPhone(phoneE164: string): BookingRole {
  return DEMO_ACCOUNTS[phoneE164] ?? "customer";
}

/** Fixed demo drone this "Demo Pilot" account flies, for app/pilot. */
export const DEMO_PILOT_RAIDER_ID = "raider-07";

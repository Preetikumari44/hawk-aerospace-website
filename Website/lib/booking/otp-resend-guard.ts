// ---------------------------------------------------------------------------
// Resend-cooldown guard for POST /api/auth/otp/send.
//
// This module stores NO OTP codes — the actual one-time code is generated,
// sent, and verified entirely by the SMS provider (see sms-otp-provider.ts).
// All this tracks is "when did we last ask the provider to send a code to
// this number", purely to give the existing "OTP already sent, please wait"
// response and add a floor against rapid repeated sends, on top of the
// provider's own abuse protection.
//
// DEMO STORAGE NOTE: like the rest of this preview app, this lives in a
// module-level Map for the lifetime of the server process. Swap for a
// shared store (e.g. Redis) behind this same two-function contract for a
// multi-instance deployment.
// ---------------------------------------------------------------------------

const RESEND_COOLDOWN_MS = 30 * 1000;

const lastSentAt = new Map<string, number>();

export type ResendGuardResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkResendAllowed(phone: string): ResendGuardResult {
  const last = lastSentAt.get(phone);
  if (last == null) return { allowed: true };
  const elapsed = Date.now() - last;
  if (elapsed >= RESEND_COOLDOWN_MS) return { allowed: true };
  return { allowed: false, retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000) };
}

export function recordSent(phone: string): void {
  lastSentAt.set(phone, Date.now());
}

// ---------------------------------------------------------------------------
// Indian mobile number helpers shared by the login page and the OTP API
// routes, so both sides agree on what counts as a valid number.
// ---------------------------------------------------------------------------

/** Strips everything but digits, and a leading "91" country code if present. */
export function normalizeIndianMobile(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
}

/** Indian mobile numbers are 10 digits, starting 6–9. */
export function isValidIndianMobile(raw: string): boolean {
  const digits = normalizeIndianMobile(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

/** "9876543210" -> "+91 98765 43210" */
export function formatIndianMobile(raw: string): string {
  const digits = normalizeIndianMobile(raw);
  if (digits.length !== 10) return raw;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** "9876543210" -> "+919876543210" (E.164), the identity used for storage/session. */
export function toE164IndianMobile(raw: string): string {
  const digits = normalizeIndianMobile(raw);
  return `+91${digits}`;
}

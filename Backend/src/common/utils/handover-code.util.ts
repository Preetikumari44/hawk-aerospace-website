/**
 * Drone handover verification codes.
 *
 * Two codes per booking that proves physical drone custody:
 * 1. ISSUE code  — generated when the FM assigns a drone; the pilot must
 *    enter it before starting the mission (proves the FM handed over the drone).
 * 2. RETURN code — generated when the pilot ends the service; the FM must
 *    enter it on the booking details screen before the service can be
 *    marked completed (proves the pilot handed the drone back).
 *
 * Codes are 4 characters, uppercase alphanumeric without visually ambiguous
 * characters (0/O, 1/I) so they are easy to read out loud on site.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateHandoverCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[idx];
  }
  return code;
}

export function normalizeHandoverCode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase();
}

export function isHandoverCodeFormat(raw: unknown): boolean {
  return /^[A-HJ-NP-Z2-9]{4}$/.test(normalizeHandoverCode(raw));
}

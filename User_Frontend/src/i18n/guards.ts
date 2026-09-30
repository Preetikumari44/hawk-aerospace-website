/**
 * Configurable translation guards.
 *
 * Edit `NEVER_TRANSLATE_PATTERNS` / `NEVER_TRANSLATE_WORDS` to control which
 * text is NEVER sent to the translator. Everything else (English text) is
 * auto-translated on the fly into the active language.
 */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Patterns whose matches should never be translated (technical values). */
export const NEVER_TRANSLATE_PATTERNS: RegExp[] = [
  // Pure numbers / currencies / units / coordinates / percentages
  /^[\d\s.,+\-/%°₹$]+$/,
  // URLs
  /^https?:\/\//i,
  // Emails
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Phone numbers
  /^[+\d][\d\s\-()]{5,}$/,
  // Coordinates "lat, lng"
  /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/,
  // IDs / serial numbers / codes (e.g. DRN-MH05-123456, PLT-123456)
  /^[A-Z0-9]+(?:[-_][A-Z0-9]+)+$/,
  // Time ranges
  /^\d{1,2}\s*(?:AM|PM)\s*-\s*\d{1,2}\s*(?:AM|PM)$/i,
];

/** Exact words/phrases (case-insensitive) that must stay in English. */
export const NEVER_TRANSLATE_WORDS: string[] = [
  'N/A',
  'DJI',
  'Mavrick',
  'BioGrow',
  'AgriSupply',
  'Razorpay',
  'UPI',
  'COD',
  'OTP',
  'GPS',
  'GST',
  'Aadhar',
  'NOTAM',
];

const WORD_PATTERNS = NEVER_TRANSLATE_WORDS.map(
  (word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'),
);

/**
 * Returns true when `text` is English text that SHOULD be translated into
 * `lang`. Non-English (already translated) text, numbers, technical values,
 * and the denylisted words/patterns are never translated.
 */
export function shouldTranslate(text: string, lang: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }
  if (lang === 'en') {
    return false;
  }
  const trimmed = text.trim();
  // Only pure ASCII (English) text with at least one Latin letter qualifies.
  // This also prevents re-translating text that is already in another script.
  if (!/[A-Za-z]/.test(trimmed)) {
    return false;
  }
  if (!/^[\x00-\x7F]*$/.test(trimmed)) {
    return false;
  }
  if (text.length > 1800) {
    return false;
  }
  for (const pattern of NEVER_TRANSLATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  for (const pattern of WORD_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  return true;
}

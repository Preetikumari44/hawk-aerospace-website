/**
 * On-device document-number extractor (zero backend / zero AWS load).
 *
 * Pure regex + normalisation — instant (<1ms), no network, no native deps.
 * Used together with `documentOcr.js` which supplies the raw OCR text.
 *
 * Supported: aadhaar, pan, passport, driving_license, voter_id,
 * drone_license, gst (+ generic fallbacks for `others`).
 */

const GROUPED_DIGITS = /[0-9][0-9\s-]{10,}[0-9]/g;

/** Normalise raw OCR text for reliable matching. */
export function normalizeOcrText(raw) {
  if (!raw) return '';
  return String(raw)
    .toUpperCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[|]/g, 'I')
    .replace(/\s+/g, ' ');
}

/**
 * Repair common single-character OCR confusions.
 * `forDigits=true` biases ambiguous glyphs toward digits — ONLY safe for
 * all-digit targets (Aadhaar). Mixed alphanumeric IDs use the dedicated
 * position-aware finders below (a blind A→4 would destroy state codes).
 */
export function correctOcrConfusions(text, forDigits) {
  let s = String(text || '').toUpperCase();
  if (forDigits) {
    s = s
      .replace(/O/g, '0')
      .replace(/D/g, '0')
      .replace(/Q/g, '0')
      .replace(/[IL|]/g, '1')
      .replace(/Z/g, '2')
      .replace(/A/g, '4')
      .replace(/S/g, '5')
      .replace(/G/g, '6')
      .replace(/T/g, '7')
      .replace(/B/g, '8');
  } else {
    s = s.replace(/0/g, 'O');
  }
  return s;
}

/** Fix confusions only inside digit-heavy runs (≥3 digits) — letters in
 *  pure-letter runs (state codes, names) are left untouched. */
function correctDigitRuns(text) {
  return String(text || '')
    .toUpperCase()
    .replace(/[A-Z0-9]+/g, (run) => {
      const digits = (run.match(/[0-9]/g) || []).length;
      if (digits < 3) return run;
      return run
        .replace(/O|D|Q/g, '0')
        .replace(/I|L/g, '1')
        .replace(/Z/g, '2')
        .replace(/A/g, '4')
        .replace(/S/g, '5')
        .replace(/G/g, '6')
        .replace(/T/g, '7')
        .replace(/B/g, '8');
    });
}

/** Bias a single character toward a letter (for known letter positions). */
function toLetter(ch) {
  return { 0: 'O', 1: 'I', 5: 'S', 8: 'B' }[ch] || ch;
}

/** Bias a single character toward a digit (for known digit positions). */
function toDigit(ch) {
  return { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', A: '4', S: '5', G: '6', T: '7', B: '8' }[ch] || ch;
}

function fixByPositions(candidate, letterIdx) {
  return String(candidate)
    .split('')
    .map((ch, i) => (letterIdx.has(i) ? toLetter(ch) : toDigit(ch)))
    .join('');
}

/** PAN: 5 letters + 4 digits + 1 letter (I↔1 in the digit block is the top miss). */
function findPan(text) {
  const direct = firstMatch(text, PATTERNS.pan);
  if (direct) return direct;
  const cands = String(text || '').toUpperCase().match(/\b[A-Z0-9]{10}\b/g) || [];
  const letters = new Set([0, 1, 2, 3, 4, 9]);
  for (const c of cands) {
    const fixed = fixByPositions(c, letters);
    if (PATTERNS.pan.test(fixed)) return fixed;
  }
  return null;
}

/** Passport: 1 letter + 7 digits. */
function findPassport(text) {
  const direct = firstMatch(text, PATTERNS.passport);
  if (direct) return direct;
  const cands = String(text || '').toUpperCase().match(/\b[A-Z0-9]{8}\b/g) || [];
  const letters = new Set([0]);
  for (const c of cands) {
    const fixed = fixByPositions(c, letters);
    if (PATTERNS.passport.test(fixed)) return fixed;
  }
  return null;
}

/** Voter ID (EPIC): 3 letters + 7 digits. */
function findVoter(text) {
  const direct = firstMatch(text, PATTERNS.voter_id);
  if (direct) return direct;
  const cands = String(text || '').toUpperCase().match(/\b[A-Z0-9]{10}\b/g) || [];
  const letters = new Set([0, 1, 2]);
  for (const c of cands) {
    const fixed = fixByPositions(c, letters);
    if (PATTERNS.voter_id.test(fixed)) return fixed;
  }
  return null;
}

/** Driving / drone licence: 2-letter state code + digit blocks. */
function findDl(pattern, text) {
  const direct = firstMatch(text, pattern);
  if (direct) return direct.replace(/\s+/g, ' ').trim();
  const repaired = correctDigitRuns(text);
  if (repaired !== text) {
    const hit = firstMatch(repaired, pattern);
    if (hit) return hit.replace(/\s+/g, ' ').trim();
  }
  return null;
}

/** Remove spaces/dashes for compact comparison. */
export function compactNumber(value) {
  return String(value || '').toUpperCase().replace(/[\s-]/g, '');
}

function firstMatch(text, regex) {
  const m = String(text || '').match(regex);
  return m ? m[0] : null;
}

function cleanAadhaar(candidate) {
  if (!candidate) return null;
  const digits = String(candidate).replace(/\D/g, '');
  // Aadhaar = 12 digits; VID = 16 digits — accept 12-digit groups only.
  if (digits.length === 12) return digits.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  return null;
}

function findAadhaar(text) {
  // Prefer explicit 4-4-4 grouping, then any 12-digit run (avoid phone numbers
  // starting with 6-9 followed by extra digits by checking word boundaries).
  const grouped = firstMatch(text, /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/);
  const cleaned = cleanAadhaar(grouped);
  if (cleaned) return cleaned;
  // Fallback: scan digit runs and pick the first 12-digit run.
  const runs = String(text).replace(/[^0-9]/g, ' ').split(/\s+/).filter(Boolean);
  for (const run of runs) {
    if (/^[2-9]\d{11}$/.test(run)) return run.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  }
  // Last resort: retry on confusion-corrected text (O→0, I→1, S→5, B→8 …).
  const corrected = correctOcrConfusions(text, true);
  if (corrected !== text) {
    const grouped2 = firstMatch(corrected, /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/);
    const cleaned2 = cleanAadhaar(grouped2);
    if (cleaned2) return cleaned2;
    const runs2 = corrected.replace(/[^0-9]/g, ' ').split(/\s+/).filter(Boolean);
    for (const run of runs2) {
      if (/^[2-9]\d{11}$/.test(run)) return run.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    }
  }
  return null;
}

/** Longest plausible ID-like token — guarantees a best-effort hit on any readable text. */
function longestIdToken(text, minLen = 6) {
  const tokens = String(text || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= minLen && /[0-9]/.test(w) && /[A-Z0-9]{4,}/.test(w));
  tokens.sort((a, b) => b.length - a.length);
  return tokens.length ? tokens[0] : null;
}

const PATTERNS = {
  pan: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/,
  passport: /\b[A-PR-WY][1-9]\d{6}\b/,
  voter_id: /\b[A-Z]{3}[0-9]{7}\b/,
  gst: /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/,
  // Indian DL: e.g. "KA05 20190012345" / "KA-05 20190012345" (state + RTO + year + serial)
  driving_license: /\b[A-Z]{2}\s?-?\d{2}\s?\d{4}\s?\d{7}\b/,
  drone_license: /\b[A-Z]{2}\s?-?\d{2}\s?\d{4}\s?\d{7}\b/,
};

/** Aliases so every DOCUMENT_OPTIONS id resolves to a pattern set. */
const DOC_ALIASES = {
  aadhaar: 'aadhaar',
  aadhar: 'aadhaar',
  aadhar_front: 'aadhaar',
  aadhar_back: 'aadhaar',
  pan: 'pan',
  pan_card: 'pan',
  passport: 'passport',
  driving_license: 'driving_license',
  voter_id: 'voter_id',
  drone_license: 'drone_license',
  drone_pilot_license: 'drone_license',
  remote_pilot_certificate: 'drone_license',
  gst: 'gst',
  gst_registration: 'gst',
  gst_certificate: 'gst',
};

export function resolveDocKind(docType) {
  const key = String(docType || '').toLowerCase();
  return DOC_ALIASES[key] || key;
}

/**
 * Extract the most likely document number for `docType` from OCR text.
 * Returns the formatted number string or null.
 */
export function extractDocumentNumber(rawText, docType) {
  const text = normalizeOcrText(rawText);
  if (!text) return null;
  const kind = resolveDocKind(docType);

  if (kind === 'aadhaar') {
    return findAadhaar(text);
  }
  if (kind === 'pan') {
    return findPan(text) || longestIdToken(text, 10);
  }
  if (kind === 'passport') {
    return findPassport(text) || longestIdToken(text, 8);
  }
  if (kind === 'voter_id') {
    return findVoter(text) || longestIdToken(text, 10);
  }
  if (kind === 'driving_license' || kind === 'drone_license') {
    return findDl(PATTERNS[kind], text) || longestIdToken(correctDigitRuns(text), 8);
  }
  if (PATTERNS[kind]) {
    const hit = firstMatch(text, PATTERNS[kind]);
    if (hit) return hit.replace(/\s+/g, ' ').trim();
    // Per-type best-effort fallback so a readable card still yields its number.
    return longestIdToken(text, 8);
  }
  // Generic fallback for `others` / unknown types: prefer PAN-like, then
  // passport-like, then Aadhaar-like, then the longest digit run (>=6).
  const panLike = firstMatch(text, PATTERNS.pan);
  if (panLike) return panLike;
  const passLike = firstMatch(text, PATTERNS.passport);
  if (passLike) return passLike;
  const aadhaarLike = findAadhaar(text);
  if (aadhaarLike) return aadhaarLike;
  const voterLike = firstMatch(text, PATTERNS.voter_id);
  if (voterLike) return voterLike;
  const token = longestIdToken(text, 6);
  if (token) return token;
  const digitRuns = text.match(GROUPED_DIGITS) || [];
  const digitsOnly = digitRuns
    .map((r) => r.replace(/\D/g, ''))
    .filter((d) => d.length >= 6)
    .sort((a, b) => b.length - a.length);
  return digitsOnly.length ? digitsOnly[0] : null;
}

/** Lightweight format/validity check for manual entry (instant UX feedback). */
export function validateDocumentNumber(value, docType) {
  const v = compactNumber(value);
  if (!v) return false;
  const kind = resolveDocKind(docType);
  switch (kind) {
    case 'aadhaar':
      return /^[2-9]\d{11}$/.test(v);
    case 'pan':
      return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v);
    case 'passport':
      return /^[A-PR-WY][1-9]\d{6}$/.test(v);
    case 'voter_id':
      return /^[A-Z]{3}[0-9]{7}$/.test(v);
    case 'gst':
      return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v);
    case 'driving_license':
    case 'drone_license':
      return /^[A-Z]{2}-?\d{13}$/.test(v);
    default:
      return v.length >= 4;
  }
}

export default {
  normalizeOcrText,
  correctOcrConfusions,
  compactNumber,
  resolveDocKind,
  extractDocumentNumber,
  validateDocumentNumber,
};

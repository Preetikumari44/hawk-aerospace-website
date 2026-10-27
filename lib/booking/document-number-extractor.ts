"use client";

// On-device document-number extractor — verbatim TypeScript port of
// User_Frontend/src/utils/documentNumberExtractor.js (pure regex, zero deps).

const GROUPED_DIGITS = /[0-9][0-9\s-]{10,}[0-9]/g;

export function normalizeOcrText(raw: unknown): string {
  if (!raw) return "";
  return String(raw)
    .toUpperCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ");
}

export function correctOcrConfusions(text: unknown, forDigits: boolean): string {
  let s = String(text || "").toUpperCase();
  if (forDigits) {
    s = s
      .replace(/O/g, "0")
      .replace(/D/g, "0")
      .replace(/Q/g, "0")
      .replace(/[IL|]/g, "1")
      .replace(/Z/g, "2")
      .replace(/A/g, "4")
      .replace(/S/g, "5")
      .replace(/G/g, "6")
      .replace(/T/g, "7")
      .replace(/B/g, "8");
  } else {
    s = s.replace(/0/g, "O");
  }
  return s;
}

function correctDigitRuns(text: unknown): string {
  return String(text || "")
    .toUpperCase()
    .replace(/[A-Z0-9]+/g, (run) => {
      const digits = (run.match(/[0-9]/g) || []).length;
      if (digits < 3) return run;
      return run
        .replace(/O|D|Q/g, "0")
        .replace(/I|L/g, "1")
        .replace(/Z/g, "2")
        .replace(/A/g, "4")
        .replace(/S/g, "5")
        .replace(/G/g, "6")
        .replace(/T/g, "7")
        .replace(/B/g, "8");
    });
}

function toLetter(ch: string): string {
  return ({ 0: "O", 1: "I", 5: "S", 8: "B" } as Record<string, string>)[ch] || ch;
}

function toDigit(ch: string): string {
  return (
    ({ O: "0", D: "0", Q: "0", I: "1", L: "1", Z: "2", A: "4", S: "5", G: "6", T: "7", B: "8" } as Record<
      string,
      string
    >)[ch] || ch
  );
}

function fixByPositions(candidate: string, letterIdx: Set<number>): string {
  return String(candidate)
    .split("")
    .map((ch, i) => (letterIdx.has(i) ? toLetter(ch) : toDigit(ch)))
    .join("");
}

const PATTERNS = {
  pan: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/,
  passport: /\b[A-PR-WY][1-9]\d{6}\b/,
  voter_id: /\b[A-Z]{3}[0-9]{7}\b/,
  gst: /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/,
  driving_license: /\b[A-Z]{2}\s?-?\d{2}\s?\d{4}\s?\d{7}\b/,
  drone_license: /\b[A-Z]{2}\s?-?\d{2}\s?\d{4}\s?\d{7}\b/,
};

function firstMatch(text: unknown, regex: RegExp): string | null {
  const m = String(text || "").match(regex);
  return m ? m[0] : null;
}

function findPan(text: string): string | null {
  const direct = firstMatch(text, PATTERNS.pan);
  if (direct) return direct;
  const cands = String(text || "").toUpperCase().match(/\b[A-Z0-9]{10}\b/g) || [];
  const letters = new Set([0, 1, 2, 3, 4, 9]);
  for (const c of cands) {
    const fixed = fixByPositions(c, letters);
    if (PATTERNS.pan.test(fixed)) return fixed;
  }
  return null;
}

function findPassport(text: string): string | null {
  const direct = firstMatch(text, PATTERNS.passport);
  if (direct) return direct;
  const cands = String(text || "").toUpperCase().match(/\b[A-Z0-9]{8}\b/g) || [];
  const letters = new Set([0]);
  for (const c of cands) {
    const fixed = fixByPositions(c, letters);
    if (PATTERNS.passport.test(fixed)) return fixed;
  }
  return null;
}

function findVoter(text: string): string | null {
  const direct = firstMatch(text, PATTERNS.voter_id);
  if (direct) return direct;
  const cands = String(text || "").toUpperCase().match(/\b[A-Z0-9]{10}\b/g) || [];
  const letters = new Set([0, 1, 2]);
  for (const c of cands) {
    const fixed = fixByPositions(c, letters);
    if (PATTERNS.voter_id.test(fixed)) return fixed;
  }
  return null;
}

function findDl(pattern: RegExp, text: string): string | null {
  const direct = firstMatch(text, pattern);
  if (direct) return direct.replace(/\s+/g, " ").trim();
  const repaired = correctDigitRuns(text);
  if (repaired !== text) {
    const hit = firstMatch(repaired, pattern);
    if (hit) return hit.replace(/\s+/g, " ").trim();
  }
  return null;
}

export function compactNumber(value: unknown): string {
  return String(value || "").toUpperCase().replace(/[\s-]/g, "");
}

function cleanAadhaar(candidate: string | null): string | null {
  if (!candidate) return null;
  const digits = String(candidate).replace(/\D/g, "");
  if (digits.length === 12) return digits.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
  return null;
}

function findAadhaar(text: string): string | null {
  const grouped = firstMatch(text, /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/);
  const cleaned = cleanAadhaar(grouped);
  if (cleaned) return cleaned;
  const runs = String(text).replace(/[^0-9]/g, " ").split(/\s+/).filter(Boolean);
  for (const run of runs) {
    if (/^[2-9]\d{11}$/.test(run)) return run.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
  }
  const corrected = correctOcrConfusions(text, true);
  if (corrected !== text) {
    const grouped2 = firstMatch(corrected, /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/);
    const cleaned2 = cleanAadhaar(grouped2);
    if (cleaned2) return cleaned2;
    const runs2 = corrected.replace(/[^0-9]/g, " ").split(/\s+/).filter(Boolean);
    for (const run of runs2) {
      if (/^[2-9]\d{11}$/.test(run)) return run.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
    }
  }
  return null;
}

function longestIdToken(text: unknown, minLen = 6): string | null {
  const tokens = String(text || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= minLen && /[0-9]/.test(w) && /[A-Z0-9]{4,}/.test(w));
  tokens.sort((a, b) => b.length - a.length);
  return tokens.length ? tokens[0] : null;
}

const DOC_ALIASES: Record<string, string> = {
  aadhaar: "aadhaar",
  aadhar: "aadhaar",
  aadhar_front: "aadhaar",
  aadhar_back: "aadhaar",
  pan: "pan",
  pan_card: "pan",
  passport: "passport",
  driving_license: "driving_license",
  voter_id: "voter_id",
  drone_license: "drone_license",
  drone_pilot_license: "drone_license",
  remote_pilot_certificate: "drone_license",
  gst: "gst",
  gst_registration: "gst",
  gst_certificate: "gst",
};

export function resolveDocKind(docType: unknown): string {
  const key = String(docType || "").toLowerCase();
  return DOC_ALIASES[key] || key;
}

export function extractDocumentNumber(rawText: unknown, docType: unknown): string | null {
  const text = normalizeOcrText(rawText);
  if (!text) return null;
  const kind = resolveDocKind(docType);

  if (kind === "aadhaar") return findAadhaar(text);
  if (kind === "pan") return findPan(text) || longestIdToken(text, 10);
  if (kind === "passport") return findPassport(text) || longestIdToken(text, 8);
  if (kind === "voter_id") return findVoter(text) || longestIdToken(text, 10);
  if (kind === "driving_license" || kind === "drone_license") {
    return findDl(PATTERNS[kind], text) || longestIdToken(correctDigitRuns(text), 8);
  }
  if (PATTERNS[kind as keyof typeof PATTERNS]) {
    const hit = firstMatch(text, PATTERNS[kind as keyof typeof PATTERNS]);
    if (hit) return hit.replace(/\s+/g, " ").trim();
    return longestIdToken(text, 8);
  }
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
    .map((r) => r.replace(/\D/g, ""))
    .filter((d) => d.length >= 6)
    .sort((a, b) => b.length - a.length);
  return digitsOnly.length ? digitsOnly[0] : null;
}

export function validateDocumentNumber(value: unknown, docType: unknown): boolean {
  const v = compactNumber(value);
  if (!v) return false;
  const kind = resolveDocKind(docType);
  switch (kind) {
    case "aadhaar":
      return /^[2-9]\d{11}$/.test(v);
    case "pan":
      return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v);
    case "passport":
      return /^[A-PR-WY][1-9]\d{6}$/.test(v);
    case "voter_id":
      return /^[A-Z]{3}[0-9]{7}$/.test(v);
    case "gst":
      return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v);
    case "driving_license":
    case "drone_license":
      return /^[A-Z]{2}-?\d{13}$/.test(v);
    default:
      return v.length >= 4;
  }
}

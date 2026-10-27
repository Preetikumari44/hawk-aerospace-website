import { type ApplicationValues, FILE_RULES, formatBytes, REQUIRED_FIELDS } from "./application";
import { COUNTRIES } from "./countries";

export type FieldKey = keyof ApplicationValues;
export type Errors = Partial<Record<FieldKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Accepts digits with common separators and an optional leading "+": "98765 43210", "(020) 7946-0958", "+44 20 7946 0958".
const PHONE_CHARS_RE = /^\+?[\d\s().-]+$/;
// Optional field. Accepts "example.com", "www.example.com/path" and full http(s):// URLs.
const WEBSITE_RE = /^(https?:\/\/)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

export function validateField(key: FieldKey, v: ApplicationValues): string | undefined {
  switch (key) {
    case "country":
      if (!v.country) return "Select your country.";
      if (!COUNTRIES.includes(v.country)) return "Select a country from the list.";
      return;
    case "city":
      if (!v.city.trim()) return "Enter your city or region.";
      return;
    case "companyName":
      if (!v.companyName.trim()) return "Enter your company name.";
      return;
    case "website":
      if (v.website.trim() && !WEBSITE_RE.test(v.website.trim())) {
        return "Enter a valid website address, for example www.example.com.";
      }
      return;
    case "name":
      if (!v.name.trim()) return "Enter your name.";
      return;
    case "email":
      if (!v.email.trim()) return "Enter your business email.";
      if (!EMAIL_RE.test(v.email.trim())) return "Enter a valid email address, for example name@company.com.";
      return;
    case "phone": {
      const raw = v.phone.trim();
      if (!raw) return "Enter your phone or WhatsApp number.";
      if (!PHONE_CHARS_RE.test(raw)) return "Use digits only. Spaces, dashes and brackets are fine.";
      const digits = raw.replace(/\D/g, "");
      if (digits.length < 4 || digits.length > 15) return "Enter between 4 and 15 digits.";
      return;
    }
    case "file": {
      const f = v.file;
      if (!f) return;
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(FILE_RULES.extensions as readonly string[]).includes(ext)) {
        return `This file type is not supported. Use ${FILE_RULES.typeLabel}.`;
      }
      if (f.size > FILE_RULES.maxBytes) {
        return `This file is ${formatBytes(f.size)}. The maximum size is ${FILE_RULES.maxLabel}.`;
      }
      return;
    }
    default:
      return;
  }
}

const VALIDATED: FieldKey[] = ["country", "city", "companyName", "website", "name", "email", "phone", "file"];

export function validateAll(v: ApplicationValues): Errors {
  const errors: Errors = {};
  for (const key of VALIDATED) {
    const msg = validateField(key, v);
    if (msg) errors[key] = msg;
  }
  return errors;
}

/** Number of blocking required fields that currently hold a valid value (for the progress bar). */
export function completedRequiredCount(v: ApplicationValues): number {
  return REQUIRED_FIELDS.filter((k) => !validateField(k, v)).length;
}

/** DOM order of the fields, used to move focus to the first problem after a failed submit. */
export const FIELD_ORDER: FieldKey[] = ["country", "city", "companyName", "website", "name", "email", "phone", "file"];

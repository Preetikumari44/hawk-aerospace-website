import { COUNTRIES, DRONE_OPTIONS } from "@/lib/contact/contact-options";

export interface ContactFormValues {
  name: string;
  email: string;
  /** Dial-code option key (see DIAL_OPTIONS); the code itself is sent to the API. */
  dialKey: string;
  phone: string;
  company: string;
  country: string;
  drone: string;
  message: string;
}

export type FieldName = keyof ContactFormValues;
export type FieldErrors = Partial<Record<FieldName, string>>;

// Limits mirror the Spring Boot DTO (ContactRequest.java) and the DB columns.
export const LIMITS = {
  name: 255,
  email: 255,
  phone: 20,
  company: 255,
  message: 5000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9 ()+\-.]+$/;

export function validateField(field: FieldName, values: ContactFormValues): string | undefined {
  const v = values[field].trim();
  switch (field) {
    case "name":
      if (!v) return "Please enter your name.";
      if (v.length > LIMITS.name) return `Name must be at most ${LIMITS.name} characters.`;
      return undefined;
    case "email":
      if (!v) return "Please enter your email address.";
      if (v.length > LIMITS.email) return `Email must be at most ${LIMITS.email} characters.`;
      if (!EMAIL_RE.test(v)) return "Please enter a valid email address.";
      return undefined;
    case "phone": {
      if (!v) return "Please enter your phone number.";
      if (!PHONE_RE.test(v) || v.length > LIMITS.phone || v.replace(/\D/g, "").length < 6)
        return "Enter a valid phone number (6\u201320 characters; digits, spaces, + ( ) - . only).";
      return undefined;
    }
    case "company":
      if (v.length > LIMITS.company) return `Company must be at most ${LIMITS.company} characters.`;
      return undefined;
    case "country":
      if (!v) return "Please select your country.";
      if (!COUNTRIES.includes(v)) return "Please select a country from the list.";
      return undefined;
    case "drone":
      if (!v) return "Please tell us whether you are using a drone.";
      if (!(DRONE_OPTIONS as readonly string[]).includes(v)) return "Please choose Yes or No.";
      return undefined;
    case "message":
      if (v.length > LIMITS.message) return `Message must be at most ${LIMITS.message} characters.`;
      return undefined;
    default:
      return undefined;
  }
}

export const FIELD_ORDER: FieldName[] = [
  "name",
  "email",
  "phone",
  "company",
  "country",
  "drone",
  "message",
];

export function validateAll(values: ContactFormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}

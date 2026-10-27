// Central API client for the Contact Us backend (Java Spring Boot, POST /api/v1/contact).
//
// The browser posts to the same-origin route /api/contact (app/api/contact/route.ts), which forwards to
// ${CONTACT_API_URL}/api/v1/contact on the server. A success is shown only when the backend answers 2xx with
// { success: true }; every other outcome (validation, duplicate, rate limit, backend down) is reported as such.

import { DIAL_OPTIONS } from "@/lib/contact/contact-options";
import type { ContactFormValues, FieldName } from "@/lib/contact/validation";

const CONTACT_ENDPOINT = "/api/contact";
const REQUEST_TIMEOUT_MS = 20_000;

/** JSON body accepted by POST /api/v1/contact (same names as the original PHP form). */
export interface ContactRequestBody {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  company: string;
  country: string;
  drone: string;
  message: string;
  /** Honeypot - must stay empty. Real users never see or fill it. */
  website: string;
}

export type SubmitFailureKind =
  | "validation"
  | "duplicate"
  | "rate_limited"
  | "server"
  | "network"
  | "timeout"
  | "unknown";

export type SubmitResult =
  | { ok: true; message: string; referenceId?: string }
  | {
      ok: false;
      kind: SubmitFailureKind;
      message: string;
      fieldErrors?: Partial<Record<FieldName, string>>;
    };

interface ApiSuccessBody {
  success: true;
  message?: string;
  referenceId?: string;
}

interface ApiErrorBody {
  success: false;
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const API_FIELDS: Record<string, FieldName> = {
  name: "name",
  email: "email",
  phone: "phone",
  company: "company",
  country: "country",
  drone: "drone",
  message: "message",
  countryCode: "phone",
};

export function toRequestBody(values: ContactFormValues, honeypot: string): ContactRequestBody {
  const dial = DIAL_OPTIONS.find((o) => o.key === values.dialKey);
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    countryCode: dial?.code ?? "",
    phone: values.phone.trim(),
    company: values.company.trim(),
    country: values.country,
    drone: values.drone,
    message: values.message.trim(),
    website: honeypot,
  };
}

function mapFieldErrors(raw?: Record<string, string>) {
  if (!raw) return undefined;
  const out: Partial<Record<FieldName, string>> = {};
  for (const [key, message] of Object.entries(raw)) {
    const field = API_FIELDS[key];
    if (field && !out[field]) out[field] = message;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function submitContact(body: ContactRequestBody): Promise<SubmitResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return aborted
      ? {
          ok: false,
          kind: "timeout",
          message: "The server took too long to respond. Please try again in a moment.",
        }
      : {
          ok: false,
          kind: "network",
          message:
            "We couldn\u2019t reach the server. Please check your internet connection and try again.",
        };
  } finally {
    clearTimeout(timer);
  }

  let json: ApiSuccessBody | ApiErrorBody | null = null;
  try {
    json = (await response.json()) as ApiSuccessBody | ApiErrorBody;
  } catch {
    json = null;
  }

  if (response.ok && json && json.success === true) {
    return {
      ok: true,
      message: json.message ?? "Message submitted successfully!",
      referenceId: json.referenceId,
    };
  }

  const err = json && json.success === false ? json : undefined;

  if (response.status === 400 || response.status === 422) {
    return {
      ok: false,
      kind: "validation",
      message: err?.message ?? "Please check the highlighted fields and try again.",
      fieldErrors: mapFieldErrors(err?.fieldErrors),
    };
  }
  if (response.status === 409) {
    return {
      ok: false,
      kind: "duplicate",
      message:
        err?.message ??
        "It looks like you already sent this exact message a moment ago. We have it and will be in touch.",
    };
  }
  if (response.status === 429) {
    return {
      ok: false,
      kind: "rate_limited",
      message: err?.message ?? "Too many requests. Please wait a few minutes and try again.",
    };
  }
  if (response.status >= 500) {
    return {
      ok: false,
      kind: "server",
      message:
        err?.message ??
        "Something went wrong on our side and your message was not sent. Please try again shortly.",
    };
  }
  return {
    ok: false,
    kind: "unknown",
    message: err?.message ?? "We couldn\u2019t send your message. Please try again.",
  };
}

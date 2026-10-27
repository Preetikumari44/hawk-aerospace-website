import { type ApplicationValues, callingCodeFor } from "./application";

/**
 * Builds the multipart payload with the EXACT field names the Spring Boot backend binds
 * (the same names the legacy distributor.php used): country, city, models[], companyName, website, businessType,
 * turnover, name, jobTitle, email, countryCode, phone, brands, message, file.
 *
 * NOTE (defect in the original page, corrected here): the original checkboxes had no `name`,
 * so the browser never sent any drone model. They are now sent as repeated `models[]` parts.
 */
export function buildFormData(v: ApplicationValues): FormData {
  const fd = new FormData();
  fd.append("country", v.country);
  fd.append("city", v.city.trim());
  v.models.forEach((m) => fd.append("models[]", m));
  fd.append("companyName", v.companyName.trim());
  fd.append("website", v.website.trim());
  fd.append("businessType", v.businessType);
  fd.append("turnover", v.turnover);
  fd.append("name", v.name.trim());
  fd.append("jobTitle", v.jobTitle.trim());
  fd.append("email", v.email.trim());
  fd.append("countryCode", callingCodeFor(v.callingCodeId).code);
  fd.append("phone", v.phone.trim());
  fd.append("brands", v.brands.trim());
  fd.append("message", v.message.trim());
  if (v.file) fd.append("file", v.file, v.file.name);
  return fd;
}

export interface FieldProblem {
  field: string;
  message: string;
}

export type SubmitResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldProblems?: FieldProblem[] };

/**
 * The browser posts to the same-origin route /api/distributor/applications (app/api/distributor/applications/route.ts),
 * which forwards the untouched multipart body to the Java Spring Boot API (DISTRIBUTOR_API_URL, server-side only).
 * There is no preview mode any more: every submission goes to the real backend or is reported as failed.
 */
export const APPLICATION_PATH = "/api/distributor/applications";
const ENDPOINT = APPLICATION_PATH;

export const isBackendConnected = true;
export const isPreviewMode = false;

function problemsFrom(json: unknown): FieldProblem[] | undefined {
  const list = (json as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(list)) return undefined;
  const out = list
    .filter((e): e is FieldProblem => typeof e?.field === "string" && typeof e?.message === "string")
    .map((e) => ({ field: e.field, message: e.message }));
  return out.length > 0 ? out : undefined;
}

/**
 * The only function that talks to the backend: POST multipart/form-data to the Spring Boot API, which answers JSON
 * `{ success: boolean, message: string, ... }` (failures also carry `code` and, for validation, `errors[]`).
 * What is shown to the applicant is the backend's own message; nothing is invented on the client.
 */
export async function submitApplication(values: ApplicationValues): Promise<SubmitResult> {
  try {
    // No manual Content-Type: the browser must add the multipart boundary itself.
    const res = await fetch(ENDPOINT, { method: "POST", body: buildFormData(values), headers: { Accept: "application/json" } });
    const text = (await res.text()).trim();

    let json: { success?: boolean; message?: string } | null = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (json && typeof json.success === "boolean") {
      return json.success
        ? { status: "success", message: json.message ?? "Your application was submitted." }
        : {
            status: "error",
            message: json.message ?? "The server could not accept your application.",
            fieldProblems: problemsFrom(json),
          };
    }
    if (res.status === 429) {
      return { status: "error", message: "Too many submissions from your network. Please wait a few minutes and try again." };
    }
    return { status: "error", message: `The server responded with an unexpected error (${res.status}).` };
  } catch {
    return { status: "error", message: "We could not reach the server. Check your connection and try again." };
  }
}

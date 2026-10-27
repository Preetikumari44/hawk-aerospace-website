import { SUBMIT_ENDPOINT } from "@/lib/career/site";
import type { SubmitResult } from "@/lib/career/types";

interface ApiBody {
  status?: string;
  message?: string;
  errors?: { field: string; message: string }[];
}

/**
 * Posts the application as multipart/form-data to /api/career/applications (forwarded to the Java Spring Boot backend).
 * The browser sets the multipart boundary itself, so no Content-Type header is set here.
 * Success is reported only when the backend answers 2xx with status "CREATED" - never optimistically.
 */
export async function submitApplication(data: FormData): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch(SUBMIT_ENDPOINT, { method: "POST", body: data });
  } catch {
    return { status: "failed" };
  }

  let body: ApiBody | null = null;
  try {
    body = (await res.json()) as ApiBody;
  } catch {
    return { status: "failed" };
  }

  if (res.ok && body?.status === "CREATED") return { status: "ok" };

  switch (body?.status) {
    case "DUPLICATE":
      return { status: "duplicate" };
    // Problems the applicant can fix: show the server's message ("Error: ...").
    case "VALIDATION_ERROR":
    case "INVALID_UPLOAD":
    case "FILE_TOO_LARGE":
    case "UNSUPPORTED_MEDIA_TYPE":
      return { status: "error", message: body.errors?.[0]?.message ?? body.message ?? "Please check your details." };
    // DATABASE_UNAVAILABLE, DATABASE_ERROR, STORAGE_ERROR, INTERNAL_ERROR, BACKEND_UNAVAILABLE, BACKEND_TIMEOUT, ...
    default:
      return { status: "failed" };
  }
}

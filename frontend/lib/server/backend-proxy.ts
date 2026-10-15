import { NextResponse } from "next/server";

/**
 * Shared server-side forwarder for the three Hawk backends (Contact, Careers, Distributor).
 *
 * The browser only ever talks to this Next.js server (same origin: no CORS, no public backend URL).
 * The backend origin comes from a server-only environment variable that is read at request time.
 * Nothing is stored here and nothing is reported as a success unless the backend itself said so.
 */

export interface ProxyOptions {
  /** Name of the server-only env var holding the backend origin (for the error log only). */
  envName: string;
  /** Backend origin, e.g. http://contact-api:8080 (no trailing slash). Empty = not configured. */
  baseUrl: string;
  /** Backend path, part of that backend's API contract. */
  path: string;
  /** Accepted request media type prefix. */
  accept: "application/json" | "multipart/form-data";
  /** Largest request body forwarded, in bytes. */
  maxBytes: number;
  /** Which service this is, used in log lines. */
  service: string;
  timeoutMs?: number;
}

/**
 * One error shape that every Hawk form client understands:
 *  - Contact / Distributor clients read `success` + `message`
 *  - Careers client reads `status` + `message`
 */
function failure(httpStatus: number, code: string, message: string) {
  return NextResponse.json({ success: false, status: code, code, message }, { status: httpStatus });
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || null;
  return req.headers.get("x-real-ip");
}

export async function forwardToBackend(req: Request, opts: ProxyOptions): Promise<Response> {
  const base = opts.baseUrl.replace(/\/+$/, "");
  if (!base) {
    console.error(`[${opts.service}] ${opts.envName} is not set; refusing to pretend the submission worked.`);
    return failure(503, "BACKEND_UNAVAILABLE", "This form is temporarily unavailable. Please try again later.");
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith(opts.accept)) {
    return failure(415, "UNSUPPORTED_MEDIA_TYPE", `Send the request as ${opts.accept}.`);
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > opts.maxBytes) return failure(413, "FILE_TOO_LARGE", "The submission is too large.");

  let body: ArrayBuffer;
  try {
    body = await req.arrayBuffer();
  } catch {
    return failure(400, "BAD_REQUEST", "The submission could not be read. Please try again.");
  }
  if (body.byteLength > opts.maxBytes) return failure(413, "FILE_TOO_LARGE", "The submission is too large.");

  const headers: Record<string, string> = {
    "content-type": contentType, // keeps the original multipart boundary
    accept: "application/json",
  };
  const ip = clientIp(req);
  if (ip) headers["x-forwarded-for"] = ip; // lets the backend rate limiter see the visitor, not this server

  let upstream: Response;
  try {
    upstream = await fetch(`${base}${opts.path}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error(`[${opts.service}] backend ${timedOut ? "timed out" : "unreachable"}`);
    return timedOut
      ? failure(504, "BACKEND_TIMEOUT", "The service took too long to respond. Please try again.")
      : failure(502, "BACKEND_UNAVAILABLE", "We could not reach the service. Please try again shortly.");
  }

  const text = await upstream.text();
  try {
    JSON.parse(text); // relay only genuine JSON from the Java API; never raw error pages or stack traces
  } catch {
    console.error(`[${opts.service}] backend answered HTTP ${upstream.status} with a non-JSON body`);
    return failure(502, "BACKEND_ERROR", "The service returned an unexpected response. Please try again.");
  }

  const out = new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) out.headers.set("retry-after", retryAfter);
  return out;
}

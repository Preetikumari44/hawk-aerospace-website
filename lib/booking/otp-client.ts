"use client";

// Thin fetch wrapper around POST /api/auth/otp/send and
// POST /api/auth/otp/verify, used only by app/login/page.tsx.

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  expiresInSeconds?: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  attemptsRemaining?: number;
  user?: { phone: string };
}

// Same-origin by default (the Next.js route handlers in app/api/auth/otp/*).
// Set NEXT_PUBLIC_API_BASE_URL only if the page is served from a different
// origin/port than the Next.js server that hosts these routes.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

async function postJson<T extends { success: boolean; message?: string; error?: string }>(
  url: string,
  body: unknown,
): Promise<T> {
  // A rejected fetch (server unreachable, offline) still throws, so the login
  // page's "Network error" message stays reserved for real network failures.
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }

  // The API answered with JSON (success, or a 4xx/5xx with error/message):
  // hand it to the caller as-is so the page can show the real message.
  if (data && typeof data === "object") {
    return data;
  }

  // The server answered, but not with JSON (HTML error page, empty body...).
  // A 404 here means this origin isn't running the Next.js API routes (stale
  // dev server / .next cache, or the page is served from another port).
  if (res.status === 404) {
    return {
      success: false,
      error: "HTTP_404",
      message:
        "OTP service not found (HTTP 404). Restart the app with `npm run dev` from the project folder, or set NEXT_PUBLIC_API_BASE_URL.",
    } as T;
  }
  return {
    success: false,
    error: `HTTP_${res.status}`,
    message: `Server returned an unexpected response (HTTP ${res.status}). Please try again.`,
  } as T;
}

export function sendOtp(phone: string): Promise<SendOtpResponse> {
  return postJson<SendOtpResponse>("/api/auth/otp/send", { phone });
}

export function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  return postJson<VerifyOtpResponse>("/api/auth/otp/verify", { phone, otp });
}

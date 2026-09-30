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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export function sendOtp(phone: string): Promise<SendOtpResponse> {
  return postJson<SendOtpResponse>("/api/auth/otp/send", { phone });
}

export function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  return postJson<VerifyOtpResponse>("/api/auth/otp/verify", { phone, otp });
}

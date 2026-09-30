// ---------------------------------------------------------------------------
// Real SMS OTP delivery via Twilio Verify — server-only module, imported
// only by the app/api/auth/otp/* route handlers (never bundled to the
// client). Replaces the previous demo/local-code otp-store.ts.
//
// Twilio Verify generates, sends, stores and checks the one-time code on
// Twilio's side, so this app never generates, stores, or returns an OTP
// value itself — there is nothing here for the frontend to read. Codes are
// time-limited and single-use by Twilio's service policy, and Twilio Verify
// applies its own send-rate and check-attempt abuse protection per number.
//
// Required env vars (see .env.example):
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_VERIFY_SERVICE_SID
//
// All three are read only from process.env on the server and are never
// sent to the browser.
// ---------------------------------------------------------------------------

const TWILIO_API_BASE = "https://verify.twilio.com/v2";

function getConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !verifyServiceSid) return null;
  return { accountSid, authToken, verifyServiceSid };
}

function basicAuthHeader(accountSid: string, authToken: string): string {
  const token =
    typeof Buffer !== "undefined"
      ? Buffer.from(`${accountSid}:${authToken}`).toString("base64")
      : btoa(`${accountSid}:${authToken}`);
  return `Basic ${token}`;
}

export type SendSmsOtpResult =
  | { status: "sent" }
  | { status: "not-configured" }
  | { status: "provider-error"; message: string };

export type CheckSmsOtpResult =
  | { status: "verified" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "max-attempts" }
  | { status: "not-configured" }
  | { status: "provider-error"; message: string };

/** Asks Twilio Verify to generate and text a fresh OTP to `phoneE164`. */
export async function sendSmsOtp(phoneE164: string): Promise<SendSmsOtpResult> {
  const config = getConfig();
  if (!config) {
    // No secrets are logged — this only tells the developer/server console
    // that setup is incomplete, it is never sent to the browser response.
    console.error(
      "[sms-otp] SMS provider is not configured — set TWILIO_ACCOUNT_SID, " +
        "TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID.",
    );
    return { status: "not-configured" };
  }

  const { accountSid, authToken, verifyServiceSid } = config;

  try {
    const res = await fetch(
      `${TWILIO_API_BASE}/Services/${verifyServiceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(accountSid, authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phoneE164, Channel: "sms" }),
      },
    );

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      const message =
        (detail && typeof detail.message === "string" && detail.message) ||
        "SMS provider rejected the request.";
      console.error("[sms-otp] Twilio send failed:", message);
      return { status: "provider-error", message };
    }

    return { status: "sent" };
  } catch (err) {
    console.error("[sms-otp] Twilio send error:", err);
    return { status: "provider-error", message: "Could not reach SMS provider." };
  }
}

/** Asks Twilio Verify to check `code` against the OTP it sent to `phoneE164`. */
export async function checkSmsOtp(
  phoneE164: string,
  code: string,
): Promise<CheckSmsOtpResult> {
  const config = getConfig();
  if (!config) {
    console.error(
      "[sms-otp] SMS provider is not configured — set TWILIO_ACCOUNT_SID, " +
        "TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID.",
    );
    return { status: "not-configured" };
  }

  const { accountSid, authToken, verifyServiceSid } = config;

  try {
    const res = await fetch(
      `${TWILIO_API_BASE}/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(accountSid, authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phoneE164, Code: code }),
      },
    );

    const body = await res.json().catch(() => null);

    if (res.status === 404) {
      // No pending verification for this number (never sent, or expired
      // and purged on Twilio's side).
      return { status: "expired" };
    }

    if (res.status === 429) {
      return { status: "max-attempts" };
    }

    if (!res.ok) {
      const message =
        (body && typeof body.message === "string" && body.message) ||
        "SMS provider rejected the request.";
      console.error("[sms-otp] Twilio check failed:", message);
      return { status: "provider-error", message };
    }

    if (body?.status === "approved") {
      return { status: "verified" };
    }

    return { status: "invalid" };
  } catch (err) {
    console.error("[sms-otp] Twilio check error:", err);
    return { status: "provider-error", message: "Could not reach SMS provider." };
  }
}

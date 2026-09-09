import { NextRequest, NextResponse } from "next/server";

import { checkResendAllowed, recordSent } from "@/lib/booking/otp-resend-guard";
import { isValidIndianMobile, toE164IndianMobile } from "@/lib/booking/phone";
import { sendSmsOtp } from "@/lib/booking/sms-otp-provider";

// POST /api/auth/otp/send — see Booking Module Documentation §5 "Key API
// Endpoints" and the OTP service section. The OTP itself is generated and
// delivered entirely by the configured SMS provider (Twilio Verify); this
// route never generates, stores, or returns a code to the client.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawPhone = typeof body?.phone === "string" ? body.phone : "";

  if (!isValidIndianMobile(rawPhone)) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number." },
      { status: 400 },
    );
  }

  const phone = toE164IndianMobile(rawPhone);

  const resend = checkResendAllowed(phone);
  if (!resend.allowed) {
    return NextResponse.json({
      success: true,
      message: "OTP already sent. Please check your SMS or wait for expiration.",
      expiresInSeconds: resend.retryAfterSeconds,
    });
  }

  const result = await sendSmsOtp(phone);

  if (result.status === "not-configured") {
    // Developer-facing only (also logged server-side) — never a fake/demo
    // OTP, and no secrets are included here.
    return NextResponse.json(
      {
        success: false,
        error: "SMS_NOT_CONFIGURED",
        message: "SMS service isn't configured yet. Please contact support.",
      },
      { status: 503 },
    );
  }

  if (result.status === "provider-error") {
    return NextResponse.json(
      {
        success: false,
        error: "SMS_SEND_FAILED",
        message: "Couldn't send the OTP right now. Please try again.",
      },
      { status: 502 },
    );
  }

  recordSent(phone);

  return NextResponse.json({
    success: true,
    message: "OTP sent.",
    expiresInSeconds: 300,
  });
}

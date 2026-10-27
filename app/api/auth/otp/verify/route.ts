import { NextRequest, NextResponse } from "next/server";

import { DEMO_OTP_CODE, isDemoPhone } from "@/lib/booking/demo-accounts";
import { isValidIndianMobile, toE164IndianMobile } from "@/lib/booking/phone";
import { checkSmsOtp } from "@/lib/booking/sms-otp-provider";

// POST /api/auth/otp/verify — see Booking Module Documentation §5. On
// success, returns the session user; the frontend calls
// useBookingAuth().login(phone) with this to persist the session. The code
// entered by the user is checked against the SMS provider (Twilio Verify),
// which is the sole source of truth for OTP validity — this route holds no
// codes of its own.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawPhone = typeof body?.phone === "string" ? body.phone : "";
  const code = typeof body?.otp === "string" ? body.otp : "";

  if (!isValidIndianMobile(rawPhone) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Enter the 6-digit code." }, { status: 400 });
  }

  const phone = toE164IndianMobile(rawPhone);

  // DEMO fallback — see app/api/auth/otp/send/route.ts. Only the three
  // documented demo numbers, only with the documented demo code; every
  // other number is verified against the real SMS provider as before.
  if (isDemoPhone(phone)) {
    if (code === DEMO_OTP_CODE) {
      return NextResponse.json({ success: true, user: { phone } });
    }
    return NextResponse.json(
      { success: false, error: "INVALID_OTP", message: "That code isn't right. Please try again." },
      { status: 400 },
    );
  }

  const result = await checkSmsOtp(phone, code);

  switch (result.status) {
    case "verified":
      return NextResponse.json({ success: true, user: { phone } });
    case "invalid":
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_OTP",
          message: "That code isn't right. Please try again.",
        },
        { status: 400 },
      );
    case "expired":
      return NextResponse.json(
        { success: false, error: "OTP_EXPIRED", message: "This code has expired. Request a new one." },
        { status: 400 },
      );
    case "max-attempts":
      return NextResponse.json(
        {
          success: false,
          error: "MAX_ATTEMPTS_EXCEEDED",
          message: "Too many incorrect attempts. Request a new code.",
        },
        { status: 429 },
      );
    case "not-configured":
      return NextResponse.json(
        {
          success: false,
          error: "SMS_NOT_CONFIGURED",
          message: "SMS service isn't configured yet. Please contact support.",
        },
        { status: 503 },
      );
    case "provider-error":
      return NextResponse.json(
        {
          success: false,
          error: "SMS_VERIFY_FAILED",
          message: "Couldn't verify the OTP right now. Please try again.",
        },
        { status: 502 },
      );
  }
}

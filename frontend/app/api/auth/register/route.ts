import { NextRequest, NextResponse } from "next/server";

import { isValidIndianMobile, toE164IndianMobile } from "@/lib/booking/phone";
import { registerCustomer } from "@/lib/booking/user-store";

// POST /api/auth/register — Customer self-registration with username +
// password (§18), alongside the existing phone + OTP login. Every field is
// validated server-side; the password is hashed inside registerCustomer and
// never echoed back.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const rawPhone = typeof body?.phone === "string" ? body.phone : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!fullName) {
    return NextResponse.json({ success: false, message: "Enter your full name." }, { status: 400 });
  }
  if (!isValidIndianMobile(rawPhone)) {
    return NextResponse.json(
      { success: false, message: "Enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json(
      { success: false, message: "Username must be at least 3 characters." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, message: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const phone = toE164IndianMobile(rawPhone);
  const result = registerCustomer({ fullName, phone, email, username, password });

  if (!result.ok) {
    const message =
      result.error === "USERNAME_TAKEN"
        ? "That username is already taken."
        : result.error === "PHONE_TAKEN"
          ? "An account already exists for that mobile number."
          : "Password must be at least 8 characters.";
    return NextResponse.json({ success: false, error: result.error, message }, { status: 409 });
  }

  return NextResponse.json({ success: true, phone });
}

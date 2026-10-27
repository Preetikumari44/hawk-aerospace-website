import { NextRequest, NextResponse } from "next/server";

import { loginCustomer } from "@/lib/booking/user-store";

// POST /api/auth/login — username + password sign-in (§17), so a registered
// Customer doesn't need OTP on every visit. Returns the account's phone
// number so the client can reuse the existing BookingAuthProvider.login()
// session helper unchanged — this route never returns the password hash.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { success: false, message: "Enter your username and password." },
      { status: 400 },
    );
  }

  const result = loginCustomer(username, password);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, message: "Incorrect username or password." },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true, phone: result.phone });
}

import { NextRequest, NextResponse } from "next/server"

import { demoOwner, demoUser } from "@/lib/skymap/mock-data"

// DEMO ONLY — accepts any email/password and logs the user in as the demo
// buyer. Replace with real credential verification against your database.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
  }

  const role = body.role === "owner" ? "owner" : "buyer"
  const user = role === "owner" ? demoOwner : demoUser
  const token = `${role}-demo-token`
  const res = NextResponse.json({ user: { ...user, email: body.email }, token })
  res.cookies.set("skymap_session", token, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  })
  return res
}

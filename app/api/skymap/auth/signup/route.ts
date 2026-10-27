import { NextRequest, NextResponse } from "next/server"

import { demoOwner, updateDemoUser } from "@/lib/skymap/mock-data"

// DEMO ONLY — creates no real account, just updates the shared demo user's
// name/email and logs them in. Replace with real user creation + hashing.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 })
  }

  const role = body.role === "owner" ? "owner" : "buyer"
  const user = role === "owner" ? { ...demoOwner, name: body.name } : updateDemoUser({ name: body.name })
  const token = `${role}-demo-token`

  const res = NextResponse.json({ user: { ...user, email: body.email, role }, token })
  res.cookies.set("skymap_session", token, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  })
  return res
}

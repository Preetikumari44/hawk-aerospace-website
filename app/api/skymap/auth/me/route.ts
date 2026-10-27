import { NextRequest, NextResponse } from "next/server"

import { demoOwner, demoUser } from "@/lib/skymap/mock-data"

export async function GET(request: NextRequest) {
  const session = request.cookies.get("skymap_session")?.value
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }
  return NextResponse.json(session.startsWith("owner-") ? demoOwner : demoUser)
}

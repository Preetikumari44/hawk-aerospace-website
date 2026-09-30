import { NextRequest, NextResponse } from "next/server"

import { updateDemoUser } from "@/lib/skymap/mock-data"

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const user = updateDemoUser({ name: body?.name, phone: body?.phone })
  return NextResponse.json(user)
}

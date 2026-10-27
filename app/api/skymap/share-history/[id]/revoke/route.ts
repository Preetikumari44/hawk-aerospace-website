import { NextResponse } from "next/server"

import { revokeShare } from "@/lib/skymap/mock-data"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const share = revokeShare(id)
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(share)
}

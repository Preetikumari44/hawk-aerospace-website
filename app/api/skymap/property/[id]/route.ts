import { NextResponse } from "next/server"

import { getDemoProperty } from "@/lib/skymap/mock-data"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = getDemoProperty(id)
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(property, { headers: { "Cache-Control": "no-store" } })
}

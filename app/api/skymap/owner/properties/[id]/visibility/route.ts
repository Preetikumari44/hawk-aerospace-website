import { NextRequest, NextResponse } from "next/server"

import { getPropertyDefaultVisibility, updatePropertyDefaultVisibility } from "@/lib/skymap/mock-data"

export const dynamic = "force-dynamic"

// DEMO DATA ONLY.
//
// This mock route reads and writes field-level visibility in memory so the
// owner UI can behave like it has a backend. A real backend must authenticate
// the owner, verify property ownership/management rights, validate every field
// key against the property schema, and persist the result in durable storage.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const visibility = getPropertyDefaultVisibility(id)
  if (!visibility) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(visibility, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body?.visibility) {
    return NextResponse.json({ error: "visibility is required." }, { status: 400 })
  }

  const visibility = updatePropertyDefaultVisibility(id, body.visibility)
  if (!visibility) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(visibility, { headers: { "Cache-Control": "no-store" } })
}

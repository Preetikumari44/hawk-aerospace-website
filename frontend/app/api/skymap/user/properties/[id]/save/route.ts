import { NextResponse } from "next/server"

import { getDemoProperty } from "@/lib/skymap/mock-data"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = getDemoProperty(id)
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 })
  property.saved = true
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = getDemoProperty(id)
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 })
  property.saved = false
  return NextResponse.json({ ok: true })
}

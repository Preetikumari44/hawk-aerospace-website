import { NextResponse } from "next/server"

import { getDemoVastu } from "@/lib/skymap/mock-data"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = getDemoVastu(id)
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(report)
}

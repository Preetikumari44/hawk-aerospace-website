import { NextRequest, NextResponse } from "next/server"

import { createShare } from "@/lib/skymap/mock-data"

// DEMO ONLY. A real backend must additionally check here:
// - the sender is authenticated and owns/manages this property
// - the sender's own role allows sharing each requested field or section
// - the property itself has each requested field or section enabled
// before persisting the share and generating a token.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body?.recipientEmail || !body?.recipientName || !body?.visibility) {
    return NextResponse.json({ error: "recipientName, recipientEmail and visibility are required." }, { status: 400 })
  }
  const share = createShare({
    propertyId: id,
    recipientName: body.recipientName,
    recipientEmail: body.recipientEmail,
    recipientPhone: body.recipientPhone,
    visibility: body.visibility,
    message: body.message,
    sharingMethod: body.sharingMethod || "link",
  })
  return NextResponse.json(share)
}

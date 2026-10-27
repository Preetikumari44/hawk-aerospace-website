import { NextResponse } from "next/server"

import { getShareByToken } from "@/lib/skymap/mock-data"

// DEMO ONLY.
//
// THIS is the endpoint a real backend must harden the most: it is the entry
// point for an unauthenticated client following a shared link. A production
// implementation must, at minimum:
//   1. Look up the token and 404 if it doesn't exist.
//   2. Reject (401/410) if the share has been revoked or expired.
//   3. Return ONLY the recipient's permitted field visibility allow-lists.
//   4. Every subsequent call the client view makes (tour/vastu/dimensions)
//      must independently re-check this token's visibility server-side
//      before returning that data. Hiding a tab in the UI is not access control.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const share = getShareByToken(token)
  if (!share) return NextResponse.json({ error: "This link is invalid." }, { status: 404 })
  if (share.status === "revoked") return NextResponse.json({ error: "This link has been revoked." }, { status: 410 })
  return NextResponse.json(share)
}

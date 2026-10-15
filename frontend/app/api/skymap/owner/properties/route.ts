import { NextResponse } from "next/server"

import { demoProperties } from "@/lib/skymap/mock-data"

export const dynamic = "force-dynamic"

// DEMO DATA ONLY.
//
// This returns every mock property as the seller's listed inventory. A real
// backend must authenticate the owner, filter by properties they own/manage,
// and return only records that role is allowed to administer.
export async function GET() {
  return NextResponse.json(demoProperties, { headers: { "Cache-Control": "no-store" } })
}

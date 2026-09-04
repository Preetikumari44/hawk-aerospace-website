import { NextResponse } from "next/server"

import { getShareHistory } from "@/lib/skymap/mock-data"

export async function GET() {
  return NextResponse.json(getShareHistory())
}

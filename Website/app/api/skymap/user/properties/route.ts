import { NextResponse } from "next/server"

import { demoProperties } from "@/lib/skymap/mock-data"

export async function GET() {
  return NextResponse.json(demoProperties)
}

"use client";

// Client host so server-component homepages (e.g. /my-bookings) can mount
// the dashboard back-block guard without becoming client components.

import { DashboardBackBlock } from "@/lib/booking/use-dashboard-back-block";

export function DashboardBackBlockHost({ enabled = true }: { enabled?: boolean }) {
  return <DashboardBackBlock enabled={enabled} />;
}

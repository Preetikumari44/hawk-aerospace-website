import type { ReactNode } from "react";

import FleetSection from "@/components/fleet/section";

export default function FleetLayout({ children }: { children: ReactNode }) {
  return <FleetSection>{children}</FleetSection>;
}

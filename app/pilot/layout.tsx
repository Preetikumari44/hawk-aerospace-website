import type { ReactNode } from "react";

import PilotSection from "@/components/pilot/section";

export default function PilotLayout({ children }: { children: ReactNode }) {
  return <PilotSection>{children}</PilotSection>;
}

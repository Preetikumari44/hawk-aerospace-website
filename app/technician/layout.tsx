import type { ReactNode } from "react";

import TechSection from "@/components/tech/section";

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return <TechSection>{children}</TechSection>;
}

import type { Metadata } from "next";

import { ApplicationPage } from "@/components/distributor/application-page";

export const metadata: Metadata = {
  title: { absolute: "Become a Distributor | Hawk Aerospace" },
};

// Distributor / Dealer application, inside the shared Hawk site shell (header + footer).
// Submissions go to the same-origin route /api/distributor/applications, which forwards them to the existing
// Java Spring Boot API (DISTRIBUTOR_API_URL, server-side only; see .env.example).
export default function Page() {
  return <ApplicationPage />;
}

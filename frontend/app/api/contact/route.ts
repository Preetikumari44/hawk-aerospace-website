import { forwardToBackend } from "@/lib/server/backend-proxy";

// Same-origin forwarder: browser -> /api/contact -> ${CONTACT_API_URL}/api/v1/contact (Java Spring Boot).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return forwardToBackend(req, {
    service: "contact",
    envName: "CONTACT_API_URL",
    baseUrl: process.env.CONTACT_API_URL ?? "",
    path: "/api/v1/contact",
    accept: "application/json",
    maxBytes: 64 * 1024,
    timeoutMs: 25_000,
  });
}

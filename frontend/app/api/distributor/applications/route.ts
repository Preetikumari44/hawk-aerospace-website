import { forwardToBackend } from "@/lib/server/backend-proxy";

// Same-origin forwarder: browser -> /api/distributor/applications -> ${DISTRIBUTOR_API_URL}/api/distributor/applications.
// Repeated `models[]` parts and the optional `file` part are forwarded untouched (raw multipart body).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return forwardToBackend(req, {
    service: "distributor",
    envName: "DISTRIBUTOR_API_URL",
    baseUrl: process.env.DISTRIBUTOR_API_URL ?? "",
    path: "/api/distributor/applications",
    accept: "multipart/form-data",
    maxBytes: 12 * 1024 * 1024, // backend limit is 11 MB per request
  });
}

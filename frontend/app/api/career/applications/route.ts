import { forwardToBackend } from "@/lib/server/backend-proxy";

// Same-origin forwarder: browser -> /api/career/applications -> ${CAREER_API_URL}/api/applications (Java Spring Boot).
// The backend validates, stores the CV / licence files, writes MySQL and queues the admin e-mail.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return forwardToBackend(req, {
    service: "career",
    envName: "CAREER_API_URL",
    baseUrl: process.env.CAREER_API_URL ?? "",
    path: "/api/applications",
    accept: "multipart/form-data",
    maxBytes: 13 * 1024 * 1024, // backend limit is 12 MB per request
  });
}

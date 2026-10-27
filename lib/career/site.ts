/** Interview scheduling link used after a successful application (unchanged from the original career page). */
export const CALENDLY_URL = "https://calendly.com/hr-hawkaerosystem/30min";

/**
 * Same-origin proxy route (app/api/career/applications/route.ts). It forwards the untouched multipart body to the
 * Java Spring Boot Careers backend (POST {CAREER_API_URL}/api/applications). Replaces the old "/submit_interview.php" path.
 */
export const SUBMIT_ENDPOINT = "/api/career/applications";

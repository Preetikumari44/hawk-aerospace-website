import { StandaloneApplicationForm } from "@/components/pilot-tech/standalone-application-form";

// Standalone pilot application page — isolated like /service-center (own
// back-block, never part of the booking/role-switch flow). UI + features are
// 1:1 with the pilot role application form; submissions persist in the named
// `pilot-tech` Firestore database (same Firebase project).
export default function PilotFormPage() {
  return <StandaloneApplicationForm role="pilot" />;
}

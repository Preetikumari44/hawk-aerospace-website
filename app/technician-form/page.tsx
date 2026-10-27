import { StandaloneApplicationForm } from "@/components/pilot-tech/standalone-application-form";

// Standalone technician application page — isolated like /service-center (own
// back-block, never part of the booking/role-switch flow). UI + features are
// 1:1 with the technician role application form; submissions persist in the
// named `pilot-tech` Firestore database (same Firebase project).
export default function TechnicianFormPage() {
  return <StandaloneApplicationForm role="technician" />;
}

// Client-side validation exactly as in the original page (same order, same rules, same messages).
export const MESSAGES = {
  email: "Please enter a valid email address.",
  phone: "Phone number must be 7\u201315 digits and contain only numbers.",
  name: "Please enter your full name.",
  duplicate: "You are already registered. Our team will contact you soon.",
  success: "Application submitted successfully! Please schedule your interview.",
  failed: "Submission failed. Please try again.",
  errorPrefix: "Error: ",
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9]{7,15}$/;

export type FieldError = { field: "email" | "phone" | "fullName"; message: string };

export function validateApplication(values: { fullName: string; email: string; phone: string }): FieldError | null {
  if (!EMAIL.test(values.email.trim())) return { field: "email", message: MESSAGES.email };
  if (!PHONE.test(values.phone.trim())) return { field: "phone", message: MESSAGES.phone };
  if (values.fullName.trim().length < 3) return { field: "fullName", message: MESSAGES.name };
  return null;
}

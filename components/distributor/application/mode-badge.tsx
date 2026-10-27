/**
 * Kept as a no-op so the form layout is unchanged. The old "Preview mode" / "Connected" badge described a
 * build-time switch that no longer exists: submissions always go to the real backend, and the outcome
 * (saved or not) is reported by SubmitStatus after the backend has answered.
 */
export function ModeBadge() {
  return null;
}

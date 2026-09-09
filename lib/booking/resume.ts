// Preserves in-progress booking state (service, location, date, time, the
// operators returned by the last scan, and the selected operator) across the
// trip to the dedicated /login page and back. Login is a real route change,
// so this can't be held in a React closure — it has to survive an unmount.
//
// Only ever written right before navigating to /login, and always cleared
// after being read once, so a stale draft never resurfaces on an unrelated
// visit.

import type { BookingDraft, Operator } from "./types";

const RESUME_KEY = "hawk_booking_resume_v1";

export interface BookingResumeState {
  draft: BookingDraft;
  operators: Operator[];
  selectedOperatorId: string | null;
}

export function saveBookingResumeState(state: BookingResumeState): void {
  try {
    window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(state));
  } catch {
    /* ignore storage errors — worst case the user re-fills the form */
  }
}

export function takeBookingResumeState(): BookingResumeState | null {
  try {
    const raw = window.sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(RESUME_KEY);
    return JSON.parse(raw) as BookingResumeState;
  } catch {
    return null;
  }
}

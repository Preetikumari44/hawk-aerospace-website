import type { Booking } from "./types";

// Demo persistence only. No backend exists yet, so confirmed bookings are
// kept in localStorage, scoped by userId, so a refresh doesn't lose them.
// Swap this module for real API calls later — callers only depend on the
// function signatures below, not on localStorage itself.

const STORAGE_KEY = "hawk_bookings_v1";

function readAll(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

function writeAll(bookings: Booking[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function getBookingsForUser(userId: string): Booking[] {
  return readAll()
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveBooking(booking: Booking): void {
  const all = readAll();
  all.push(booking);
  writeAll(all);
}

export function generateBookingId(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `HK-${year}-${suffix}`;
}

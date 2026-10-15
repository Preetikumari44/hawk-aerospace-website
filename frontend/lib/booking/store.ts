import type { Booking } from "./types";

// Demo persistence only. No backend exists yet, so confirmed bookings are
// kept in localStorage, scoped by userId, so a refresh doesn't lose them.
// Swap this module for real API calls later — callers only depend on the
// function signatures below, not on localStorage itself.

// Bumped from "hawk_bookings_v1" -> "hawk_bookings_v2" to retire the old
// default/demo booking that had accumulated under the old key during
// testing (Part 18/19) — this does NOT clear localStorage (that would wipe
// unrelated app data too); it simply stops reading the old key, so a fresh
// session starts with no bookings and new ones save/read normally from here
// on. The old key's data, if any, is left untouched on disk.
const STORAGE_KEY = "hawk_bookings_v2";

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

/** All bookings across every customer — admin-only (§24/§27). */
export function getAllBookings(): Booking[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBookingById(id: string): Booking | null {
  return readAll().find((b) => b.id === id) ?? null;
}

/** Advances a booking's lifecycle status — admin demo action (§21/§41). */
export function updateBookingStatus(id: string, status: Booking["status"]): Booking | null {
  const all = readAll();
  const index = all.findIndex((b) => b.id === id);
  if (index === -1) return null;
  const paymentAvailable = status === "pending" ? false : all[index].paymentAvailable || status !== "cancelled";
  all[index] = { ...all[index], status, paymentAvailable };
  writeAll(all);
  return all[index];
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

"use client";

// Frontend session wrapper for the Live Drone Booking flow's phone number +
// OTP login. The actual OTP send/verify round trip lives in
// lib/booking/otp-client.ts (talking to app/api/auth/otp/*, mirroring the
// documented POST /api/auth/otp/send and /api/auth/otp/verify contract) —
// this context only holds the resulting session once verification succeeds,
// so a user can confirm a booking and later view "My Bookings".
//
// Login is a dedicated page (/login), not a modal. Because navigating to
// /login unmounts the calling component, any in-progress booking state that
// needs to survive the round trip is persisted by the caller (see
// lib/booking/resume.ts + booking-hub.tsx) rather than held here as a
// closure — closures can't survive a full route change.

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { roleForPhone } from "./demo-accounts";
import type { BookingUser } from "./types";

interface BookingAuthContextValue {
  user: BookingUser | null;
  isAuthenticated: boolean;
  /** Navigates to the dedicated /login page. `returnTo` is where the user lands after a successful login. */
  requestLogin: (returnTo?: string) => void;
  /** Called once OTP verification succeeds — phone number is the login identity.
   * Role is looked up from the demo phone -> role table (customer for any
   * non-demo number); see lib/booking/demo-accounts.ts. */
  login: (phone: string) => void;
  /** Clears the session only (stays on the current page). */
  logout: () => void;
  /** Real sign-out used by every dashboard: clears the session AND every
   * piece of session-scoped state, then replaces the current history entry
   * with the login page so Back cannot return to an authenticated screen. */
  signOut: () => void;
  /** False until the stored session has been read on the client. Protected
   * screens wait for this so they neither flash a sign-in prompt at a signed-in
   * user nor render content before the session is known. */
  isReady: boolean;
}

const BookingAuthContext = createContext<BookingAuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hawk_booking_user";
export const LOGIN_RETURN_KEY = "hawk_login_return";
// Session-scoped keys written by the booking flow (lib/booking/resume.ts).
// Cleared on sign-out so nothing from the previous account survives.
const SESSION_SCOPED_KEYS = ["hawk_booking_resume_v1", LOGIN_RETURN_KEY];

export function BookingAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BookingUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as BookingUser;
        // Backfills `role` for sessions cached before role-based access existed.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe cache hydration: localStorage is only readable client-side, so this must run post-mount.
        setUser(parsed.role ? parsed : { ...parsed, role: roleForPhone(parsed.phone) });
      }
    } catch {
      /* ignore malformed cache */
    }
     
    setIsReady(true);
  }, []);

  // Keep every open tab in step: signing out (or in) in one tab updates the
  // others, so a stale authenticated tab cannot keep using the dashboards.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        setUser(raw ? (JSON.parse(raw) as BookingUser) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const requestLogin = useCallback(
    (returnTo?: string) => {
      try {
        window.sessionStorage.setItem(
          LOGIN_RETURN_KEY,
          returnTo ?? window.location.pathname + window.location.search,
        );
      } catch {
        /* ignore storage errors — /login will just fall back to "/" */
      }
      router.push("/login");
    },
    [router],
  );

  const login = useCallback((phone: string) => {
    const demoUser: BookingUser = { id: phone, phone, role: roleForPhone(phone) };
    setUser(demoUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — in-memory state is already cleared */
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      for (const key of SESSION_SCOPED_KEYS) window.sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable — in-memory state is already cleared */
    }
    // replace (not push): the dashboard the user just left must not stay one
    // Back press away. Returning to it re-runs the auth gate regardless.
    router.replace("/login");
  }, [router]);

  return (
    <BookingAuthContext.Provider
      value={{ user, isAuthenticated: !!user, isReady, requestLogin, login, logout, signOut }}
    >
      {children}
    </BookingAuthContext.Provider>
  );
}

export function useBookingAuth() {
  const ctx = useContext(BookingAuthContext);
  if (!ctx) throw new Error("useBookingAuth must be used within a BookingAuthProvider");
  return ctx;
}

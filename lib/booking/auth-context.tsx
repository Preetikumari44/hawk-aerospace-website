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

import type { BookingUser } from "./types";

interface BookingAuthContextValue {
  user: BookingUser | null;
  isAuthenticated: boolean;
  /** Navigates to the dedicated /login page. `returnTo` is where the user lands after a successful login. */
  requestLogin: (returnTo?: string) => void;
  /** Called once OTP verification succeeds — phone number is the login identity. */
  login: (phone: string) => void;
  logout: () => void;
}

const BookingAuthContext = createContext<BookingAuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hawk_booking_user";
export const LOGIN_RETURN_KEY = "hawk_login_return";

export function BookingAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BookingUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe cache hydration: localStorage is only readable client-side, so this must run post-mount.
      if (cached) setUser(JSON.parse(cached) as BookingUser);
    } catch {
      /* ignore malformed cache */
    }
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
    const demoUser: BookingUser = { id: phone, phone };
    setUser(demoUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <BookingAuthContext.Provider
      value={{ user, isAuthenticated: !!user, requestLogin, login, logout }}
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

"use client";

// Frontend session for the customer-service booking flow.
//
// Login is Firebase phone-OTP (project aerosystem-2d36c): the Firebase ID
// token is exchanged at the deployed backend POST /auth/verify-otp for the
// app JWT, which is attached to every API call (see lib/booking/api-client).
// Demo numbers (+91 98765 43210/211/212) keep working via the backend dev-OTP
// path without Firebase SMS.
//
// Login is a dedicated page (/login), not a modal. Because navigating to
// /login unmounts the calling component, any in-progress booking state that
// needs to survive the round trip is persisted by the caller (see
// lib/booking/resume.ts + booking-hub.tsx) rather than held here.

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { authApi, getAuthToken, getRefreshToken, setAuthTokens } from "./api-client";
import { roleForPhone } from "./demo-accounts";
import { setFirebaseTestMode } from "./firebase-client";
import type { BookingRole, BookingUser } from "./types";

interface BookingAuthContextValue {
  user: BookingUser | null;
  isAuthenticated: boolean;
  authToken: string | null;
  /** Navigates to the dedicated /login page. `returnTo` is where the user lands after a successful login. */
  requestLogin: (returnTo?: string) => void;
  /** Called once OTP verification succeeds — exchanges Firebase token (or dev OTP) for the backend JWT. */
  loginWithBackend: (params: {
    phone: string;
    otpCode?: string;
    firebaseIdToken?: string;
  }) => Promise<void>;
  /** Legacy local-only login (demo fallback when backend is unreachable). */
  login: (phone: string) => void;
  logout: () => void;
}

const BookingAuthContext = createContext<BookingAuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hawk_booking_user";
export const LOGIN_RETURN_KEY = "hawk_login_return";

function userFromBackendUser(phone: string, backendUser?: unknown): BookingUser {
  const u = (backendUser ?? {}) as { uid?: unknown; id?: unknown; role?: unknown };
  const id =
    typeof u.uid === "string" ? u.uid : typeof u.id === "string" ? u.id : phone;
  const role =
    u.role === "pilot" || u.role === "admin" || u.role === "customer"
      ? (u.role as BookingRole)
      : roleForPhone(phone);
  return { id, phone, role };
}

export function BookingAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BookingUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
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
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }
    } catch {
      /* ignore malformed cache */
    }
  }, []);

  const requestLogin = useCallback(
    (returnTo?: string) => {
      try {
        window.sessionStorage.setItem(
          LOGIN_RETURN_KEY,
          returnTo ?? window.location.pathname + window.location.search + window.location.hash,
        );
      } catch {
        /* ignore storage errors — /login will just fall back to "/" */
      }
      router.push("/login");
    },
    [router],
  );

  const loginWithBackend = useCallback(async (params: {
    phone: string;
    otpCode?: string;
    firebaseIdToken?: string;
  }) => {
    const res = await authApi.verifyOtp({
      phone: params.phone,
      ...(params.otpCode ? { otpCode: params.otpCode } : {}),
      ...(params.firebaseIdToken ? { firebaseIdToken: params.firebaseIdToken } : {}),
    });
    let accessToken = res.accessToken;
    let refreshToken = res.refreshToken;
    let backendUser = userFromBackendUser(params.phone, res.user);
    // The booking flow requires the customer role (POST /bookings is
    // @Roles('customer','aggregator')). Dev/test accounts often verify onto
    // another primary role (e.g. fleet_manager) — switching to customer is
    // always allowed server-side, so do it automatically.
    if (accessToken && backendUser.role !== "customer") {
      setAuthTokens(accessToken, refreshToken ?? null);
      try {
        const switched = await authApi.switchRole("customer");
        if (switched.accessToken) {
          accessToken = switched.accessToken;
          refreshToken = switched.refreshToken ?? refreshToken;
          backendUser = userFromBackendUser(params.phone, switched.user ?? res.user);
          backendUser = { ...backendUser, role: "customer" };
        }
      } catch {
        // Keep the verified session — role-gated calls will surface 403s.
      }
    }
    setUser(backendUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backendUser));
    if (accessToken) {
      setAuthTokens(accessToken, refreshToken ?? null);
      setAuthToken(accessToken);
    }
  }, []);

  const login = useCallback((phone: string) => {
    const demoUser: BookingUser = { id: phone, phone, role: roleForPhone(phone) };
    setUser(demoUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
  }, []);

  const logout = useCallback(() => {
    const refresh = getRefreshToken();
    setUser(null);
    setAuthToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthTokens(null, null);
    // Leave no fake-token mode behind for the next login on this browser.
    setFirebaseTestMode(false);
    if (refresh) {
      authApi.logout(refresh).catch(() => {
        /* ignore — local session already cleared */
      });
    } else {
      authApi.logout(null).catch(() => {
        /* ignore */
      });
    }
  }, []);

  return (
    <BookingAuthContext.Provider
      value={{ user, isAuthenticated: !!user, authToken, requestLogin, loginWithBackend, login, logout }}
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

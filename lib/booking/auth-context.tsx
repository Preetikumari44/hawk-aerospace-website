"use client";

// Unified session for the web platform — single login for ALL roles.
//
// Flow (Super App parity): Firebase phone-OTP -> Firebase ID token exchanged
// at POST /auth/verify-otp for the backend JWT -> land on the STICKY role
// (last-used dashboard saved per browser, like the Super App's @user_role;
// first-ever login uses the backend primaryRole). If the sticky role differs
// from the verified session, we immediately POST /auth/switch-role so the
// JWT is scoped to the landed role (a customer-scoped token gets 403 on
// /pilots/*, a pilot-scoped token gets 401 on /fleet/*, etc.).
// Role switching via POST /auth/switch-role. 401s refresh silently and NEVER
// auto-logout (see api-client).

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { authApi, getAuthToken, getRefreshToken, setAuthTokens } from "./api-client";
import { roleForPhone } from "./demo-accounts";
import { setFirebaseTestMode } from "./firebase-client";
import {
  approvedFrontendRoles,
  type BackendUser,
  type FrontendRole,
  landingForFrontendRole,
  normalizeBackendRole,
  normalizeFrontendRole,
  primaryFrontendRole,
} from "./roles";
import type { BookingRole, BookingUser } from "./types";

interface UnifiedAuthContextValue {
  user: BookingUser | null;
  backendUser: BackendUser | null;
  frontendRole: FrontendRole;
  isAuthenticated: boolean;
  authToken: string | null;
  requestLogin: (returnTo?: string) => void;
  loginWithBackend: (params: {
    phone: string;
    otpCode?: string;
    firebaseIdToken?: string;
    name?: string;
    referralCode?: string;
  }) => Promise<{ role: FrontendRole; needsName: boolean }>;
  switchRole: (role: FrontendRole) => Promise<void>;
  refreshUser: () => Promise<void>;
  ensureBookingRole: () => Promise<boolean>;
  login: (phone: string) => void;
  logout: () => void;
  signOut: () => void;
  isReady: boolean;
}

const AuthContext = createContext<UnifiedAuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hawk_booking_user";
const BACKEND_USER_KEY = "hawk_backend_user_v1";
/** Sticky last-used role — survives logout, exactly like @user_role in the app. */
const LAST_ROLE_KEY = "hawk_last_role_v1";
export const LOGIN_RETURN_KEY = "hawk_login_return";

function legacyRoleToFrontend(role: BookingRole): FrontendRole {
  if (role === "pilot" || role === "admin" || role === "customer") return role;
  return "customer";
}

function backendUserToBookingUser(phone: string, backendUser?: BackendUser | null): BookingUser {
  const u = (backendUser ?? {}) as BackendUser;
  const id = typeof u.uid === "string" ? u.uid : typeof u.id === "string" ? u.id : phone;
  const f = normalizeFrontendRole(u.primaryRole ?? u.role);
  const role: BookingRole = f === "pilot" ? "pilot" : f === "admin" ? "admin" : "customer";
  return { id, phone, role };
}

function readStoredBackendUser(): BackendUser | null {
  try {
    const raw = window.localStorage.getItem(BACKEND_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackendUser;
  } catch {
    return null;
  }
}

export function readLastRole(): FrontendRole | null {
  try {
    const raw = window.localStorage.getItem(LAST_ROLE_KEY);
    return normalizeFrontendRole(raw) || null;
  } catch {
    return null;
  }
}

function writeLastRole(role: FrontendRole) {
  try {
    window.localStorage.setItem(LAST_ROLE_KEY, role);
  } catch {
    /* ignore storage errors */
  }
}

/** Strip any #hash (dashboard back-guards use hashes) so it never leaks into returnTo/landing. */
export function stripHash(url: string): string {
  const i = url.indexOf("#");
  return i >= 0 ? url.slice(0, i) || "/" : url;
}

export function BookingAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BookingUser | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const router = useRouter();

  // Refs keep callbacks stable (no dep loops) while always seeing fresh state.
  const backendUserRef = useRef<BackendUser | null>(null);
  const userRef = useRef<BookingUser | null>(null);
  useEffect(() => {
    backendUserRef.current = backendUser;
  }, [backendUser]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    try {
      const bu = readStoredBackendUser();
      if (bu) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration from localStorage post-mount.
        setBackendUser(bu);
        backendUserRef.current = bu;
      }
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as BookingUser;
        const fixed = parsed.role ? parsed : { ...parsed, role: roleForPhone(parsed.phone) };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- same hydration reason.
        setUser(fixed);
        userRef.current = fixed;
        if (!bu) {
          const fb: BackendUser = {
            phone: fixed.phone,
            role:
              fixed.role === "pilot" ? "pilot" : fixed.role === "admin" ? "admin" : "customer",
            primaryRole:
              fixed.role === "pilot" ? "pilot" : fixed.role === "admin" ? "admin" : "customer",
          };
          // eslint-disable-next-line react-hooks/set-state-in-effect -- same hydration reason.
          setBackendUser(fb);
          backendUserRef.current = fb;
        }
      }
      const token = getAuthToken();
      if (token) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- same hydration reason.
        setAuthToken(token);
      }
    } catch {
      /* ignore malformed cache */
    }
  }, []);

  const persistSession = useCallback(
    (
      phone: string,
      bu: BackendUser | null,
      accessToken: string | null,
      refreshToken?: string | null,
    ) => {
      const bookingUser = backendUserToBookingUser(phone, bu);
      setUser(bookingUser);
      userRef.current = bookingUser;
      setBackendUser(bu);
      backendUserRef.current = bu;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookingUser));
        if (bu) window.localStorage.setItem(BACKEND_USER_KEY, JSON.stringify(bu));
      } catch {
        /* ignore storage errors */
      }
      if (accessToken) {
        setAuthTokens(accessToken, refreshToken ?? null);
        setAuthToken(accessToken);
      }
    },
    [],
  );

  const requestLogin = useCallback(
    (returnTo?: string) => {
      try {
        const raw =
          returnTo ?? window.location.pathname + window.location.search + window.location.hash;
        window.sessionStorage.setItem(LOGIN_RETURN_KEY, stripHash(raw));
      } catch {
        /* ignore storage errors — /login will just fall back to role landing */
      }
      router.push("/login");
    },
    [router],
  );

  // Single login: verify OTP, then land on the STICKY role (last-used approved
  // role, else the backend primaryRole). When the landed role differs from the
  // verified session we switch-role immediately so the JWT is scoped to it —
  // without this, role endpoints answer 401/403.
  const loginWithBackend = useCallback(
    async (params: {
      phone: string;
      otpCode?: string;
      firebaseIdToken?: string;
      name?: string;
      referralCode?: string;
    }): Promise<{ role: FrontendRole; needsName: boolean }> => {
      let pendingReferral: string | null = params.referralCode ?? null;
      try {
        pendingReferral ??= window.localStorage.getItem("@pending_referral_code");
      } catch {
        /* ignore */
      }
      // Best-effort detailed address captured pre-auth (Super App parity:
      // stashed by location/farm screens, forwarded at verify).
      let detailedAddress: string | null = null;
      try {
        for (const k of ["@hawk_detailed_address", "@hawk_live_address", "@user_address"]) {
          const v = window.localStorage.getItem(k);
          if (v && v.trim()) {
            detailedAddress = v.trim();
            break;
          }
        }
      } catch {
        /* ignore */
      }
      const res = await authApi.verifyOtp({
        phone: params.phone,
        ...(params.otpCode ? { otpCode: params.otpCode } : {}),
        ...(params.firebaseIdToken ? { firebaseIdToken: params.firebaseIdToken } : {}),
        ...(params.name ? { name: params.name } : {}),
        ...(pendingReferral ? { referralCode: pendingReferral } : {}),
        ...(detailedAddress ? { detailedAddress, address: detailedAddress } : {}),
      });
      let bu = (res.user ?? null) as BackendUser | null;
      let accessToken = res.accessToken ?? null;
      let refreshToken = res.refreshToken ?? null;
      persistSession(params.phone, bu, accessToken, refreshToken);
      // NOTE: do NOT clear "@pending_referral_code" here. The code is needed
      // AFTER login to prefill the /apply/[role] referral field (and /welcome).
      // verifyOtp already attached it server-side; the stash is cleared by
      // the welcome/apply screens once consumed.
      const approved = approvedFrontendRoles(bu);
      const primary = primaryFrontendRole(bu);
      const sticky = readLastRole();
      let target: FrontendRole = primary;
      if (sticky && sticky !== primary && approved.includes(sticky)) {
        // Land where the user last worked — with a token scoped to that role.
        try {
          setAuthTokens(accessToken, refreshToken);
          const switched = await authApi.switchRole(normalizeBackendRole(sticky));
          if (switched.accessToken) {
            accessToken = switched.accessToken;
            refreshToken = switched.refreshToken ?? refreshToken;
            bu = (switched.user ?? bu) as BackendUser | null;
            if (bu) {
              bu = {
                ...bu,
                primaryRole: normalizeBackendRole(sticky),
                role: normalizeBackendRole(sticky),
              };
            }
            persistSession(params.phone, bu, accessToken, refreshToken);
          }
          target = sticky;
        } catch {
          // Switch failed (role revoked?) — stay on the verified primary role.
          target = primary;
        }
      }
      writeLastRole(target);
      const needsName = !(
        typeof bu?.name === "string" && bu.name.trim()
      );
      return { role: target, needsName };
    },
    [persistSession],
  );

  const switchRole = useCallback(
    async (role: FrontendRole) => {
      const res = await authApi.switchRole(normalizeBackendRole(role));
      const bu = (res.user ?? backendUserRef.current ?? null) as BackendUser | null;
      const merged: BackendUser | null = bu
        ? {
            ...bu,
            primaryRole:
              ((res.user as BackendUser)?.primaryRole as string | undefined) ??
              normalizeBackendRole(role),
            role: normalizeBackendRole(role),
          }
        : bu;
      const phone =
        (merged?.phone as string | undefined) ?? userRef.current?.phone ?? "";
      persistSession(
        phone,
        merged,
        res.accessToken ?? getAuthToken(),
        res.refreshToken ?? getRefreshToken(),
      );
      writeLastRole(role);
      router.replace(landingForFrontendRole(role));
    },
    [persistSession, router],
  );

  const refreshUser = useCallback(async () => {
    try {
      const me = (await (await import("./role-apis")).sessionApi.getCurrentUser()) as BackendUser;
      if (me && typeof me === "object") {
        const phone =
          (me.phone as string | undefined) ??
          (backendUserRef.current?.phone as string | undefined) ??
          userRef.current?.phone ??
          "";
        persistSession(phone, me, getAuthToken(), getRefreshToken());
      }
    } catch {
      /* keep cached session — 401s are handled silently in api-client */
    }
  }, [persistSession]);

  // Booking flows (create/pay/checks) are customer-scoped server-side. Any
  // signed-in user may book regardless of current role: silently scope the
  // token to customer first (always permitted server-side). No navigation —
  // the caller stays on the booking flow; the role switcher restores staff
  // roles afterwards. Resolves true when booking APIs will accept the token.
  const ensureBookingRole = useCallback(async (): Promise<boolean> => {
    const current =
      normalizeFrontendRole(
        backendUserRef.current?.primaryRole ?? backendUserRef.current?.role,
      ) || "customer";
    if (current === "customer" || current === "sales") return true;
    try {
      const res = await authApi.switchRole("customer");
      const bu = (res.user ?? backendUserRef.current ?? null) as BackendUser | null;
      const merged: BackendUser | null = bu
        ? { ...bu, primaryRole: "customer", role: "customer" }
        : bu;
      const phone =
        (merged?.phone as string | undefined) ?? userRef.current?.phone ?? "";
      persistSession(
        phone,
        merged,
        res.accessToken ?? getAuthToken(),
        res.refreshToken ?? getRefreshToken(),
      );
      return true;
    } catch {
      return false;
    }
  }, [persistSession]);

  const login = useCallback(
    (phone: string) => {
      const demoUser: BookingUser = { id: phone, phone, role: roleForPhone(phone) };
      const f = legacyRoleToFrontend(demoUser.role);
      const bu: BackendUser = { phone, role: f, primaryRole: f };
      persistSession(phone, bu, null, null);
      writeLastRole(f);
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    const refresh = getRefreshToken();
    setUser(null);
    userRef.current = null;
    setBackendUser(null);
    backendUserRef.current = null;
    setAuthToken(null);
    try {
      // NOTE: LAST_ROLE_KEY intentionally survives logout (sticky landing).
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(BACKEND_USER_KEY);
      window.localStorage.removeItem("hawk_home_location_v1");
      window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
      window.sessionStorage.removeItem("hawk_booking_resume_v1");
      window.sessionStorage.removeItem("hawk_booking_intent_v1");
    } catch {
      /* ignore */
    }
    setAuthTokens(null, null);
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

  const frontendRole: FrontendRole =
    normalizeFrontendRole(backendUser?.primaryRole ?? backendUser?.role) ||
    legacyRoleToFrontend(user?.role ?? "customer");

  const signOut = useCallback(() => {
    try {
      window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
    } catch {
      /* ignore */
    }
    router.replace("/login");
    logout();
  }, [logout, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        backendUser,
        frontendRole,
        isAuthenticated: !!user,
        authToken,
        requestLogin,
        loginWithBackend,
        switchRole,
        refreshUser,
        ensureBookingRole,
        login,
        logout,
        signOut,
        isReady: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useBookingAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useBookingAuth must be used within a BookingAuthProvider");
  return ctx;
}

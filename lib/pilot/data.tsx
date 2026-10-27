"use client";

// Pilot workspace data — backend-first with graceful fallback (withFallback,
// same as the pilot-dashboard branch). Screens consume only this provider.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "@/lib/booking/api-client";
import { pilotApi, teamApi } from "@/lib/booking/role-apis";

export interface PilotMission {
  id: string;
  serviceType: string;
  status: string;
  scheduledDate: string;
  preferredTimeSlot: string;
  estimatedEarnings: string;
  address: string;
  customerName: string;
  fleetManagerName: string;
  drone: string;
  paymentStatus: string;
}

export interface PilotProfile {
  name: string;
  phone: string;
  email: string;
  availability: "active" | "offDuty";
  rating: number | null;
  ratingCount: number | null;
}

export interface PendingEarning {
  id: string;
  title: string;
  description: string;
  date: string;
  address: string;
  amount: number | null;
  missionId: string;
}

export interface TeamEntry {
  id: string;
  name: string;
  detail: string;
  kind: "suggested" | "pending" | "invite" | "joined";
  distanceKm?: number | null;
  phone?: string;
}

function toList(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["data", "items", "results", "missions", "requests", "products", "notifications", "teams", "managers", "history", "methods"]) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
  }
  return [];
}

async function tryCall<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch {
    return null;
  }
}

const str = (v: unknown, fb = ""): string => (typeof v === "string" && v ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);
const inr = (v: unknown): string =>
  `₹${num(typeof v === "string" ? Number(String(v).replace(/[^0-9.-]/g, "")) || 0 : v).toLocaleString("en-IN")}`;

function mapMission(m: Record<string, unknown>): PilotMission {
  return {
    id: str(m.id ?? m._id ?? m.bookingId ?? m.bookingNumber),
    serviceType: str(m.serviceType ?? m.type, "Mission"),
    status: str(m.status, "assigned"),
    scheduledDate: str(m.scheduledDate ?? m.date, ""),
    preferredTimeSlot: str(m.preferredTimeSlot ?? m.timeSlot ?? m.time, ""),
    estimatedEarnings: inr(m.estimatedEarnings ?? m.earnings ?? m.amount),
    address: str(m.address ?? m.location, ""),
    customerName: str(m.customerName ?? m.client ?? m.clientName, ""),
    fleetManagerName: str(m.fleetManagerName ?? m.manager, ""),
    drone: str(m.assignedDrone ?? m.assignedDroneId ?? m.droneId ?? m.droneName ?? m.drone, ""),
    paymentStatus: str(m.paymentStatus ?? (m.paid ? "paid" : "pending"), "pending"),
  };
}

function mapPendingEarning(m: Record<string, unknown>): PendingEarning {
  const id = str(m.missionId ?? m.id ?? m._id);
  return {
    id,
    missionId: id,
    title: str(m.serviceType ?? m.title, "Mission"),
    description: str(m.description ?? m.summary, "Pending settlement…"),
    date: str(m.scheduledDate ?? m.completedAt ?? m.date, ""),
    address: str(m.address ?? (m.location as string | undefined) ?? ""),
    amount:
      typeof m.amount === "number"
        ? m.amount
        : typeof m.pendingAmount === "number"
          ? m.pendingAmount
          : null,
  };
}

export interface PilotData {
  profile: PilotProfile;
  setAvailable: (on: boolean) => Promise<void>;
  toggling: boolean;
  missions: PilotMission[];
  incoming: PilotMission[];
  rejected: PilotMission[];
  earnings: { total: number; pending: number };
  pendingEarnings: PendingEarning[];
  earningHistory: Record<string, unknown>[];
  earningsSummary: Record<string, unknown> | null;
  rewards: Record<string, unknown>[];
  payouts: Record<string, unknown>[];
  products: Record<string, unknown>[];
  maintenanceTickets: Record<string, unknown>[];
  promotions: { id: string; badge: string; title: string; subtitle: string; ctaLabel: string; tone: string }[];
  notifications: { id: string; title: string; body: string; read: boolean }[];
  unread: number;
  teams: TeamEntry[];
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
  act: (id: string, fn: (mid: string) => Promise<unknown>, ok: string) => Promise<void>;
}

const PilotContext = createContext<PilotData | null>(null);

export function usePilot(): PilotData {
  const ctx = useContext(PilotContext);
  if (!ctx) throw new Error("usePilot must be used within PilotProvider");
  return ctx;
}

const FALLBACK_PROMOS = [
  { id: "pr1", badge: "AGRI OFFER", title: "10% OFF", subtitle: "Your First Spray Mission", ctaLabel: "Redeem Now", tone: "green" },
  { id: "pr2", badge: "FLEET BONUS", title: "₹500 Credit", subtitle: "On completing 5 missions", ctaLabel: "View Details", tone: "amber" },
];

export function PilotProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: { name: string; phone: string; email: string };
}) {
  const [profile, setProfile] = useState<PilotProfile>({
    name: session.name,
    phone: session.phone,
    email: session.email,
    availability: "active",
    rating: null,
    ratingCount: null,
  });
  const [toggling, setToggling] = useState(false);
  const [missions, setMissions] = useState<PilotMission[]>([]);
  const [incoming, setIncoming] = useState<PilotMission[]>([]);
  const [rejected, setRejected] = useState<PilotMission[]>([]);
  const [earnings, setEarnings] = useState({ total: 0, pending: 0 });
  const [pendingEarnings, setPendingEarnings] = useState<PendingEarning[]>([]);
  const [earningHistory, setEarningHistory] = useState<Record<string, unknown>[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<Record<string, unknown> | null>(null);
  const [rewards, setRewards] = useState<Record<string, unknown>[]>([]);
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState<Record<string, unknown>[]>([]);
  const [notifications, setNotifications] = useState<PilotData["notifications"]>([]);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    // One-shot GPS persist (drives the FM 150km radius, Super App parity).
    const locate: Promise<{ lat: number; lng: number } | null> = new Promise((resolve) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          pilotApi.updateLocation(coords).catch(() => undefined);
          resolve(coords);
        },
        () => resolve(null),
        { timeout: 8000 },
      );
    });
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const coords = await locate;
        const [prof, ms, inc, rej, earn, pend, hist, summ, rew, pays, prods, notes, managers, suggested, tin, tout, tickets] =
          await Promise.all([
            tryCall(() => pilotApi.getProfile()),
            tryCall(() => pilotApi.getMissions()),
            tryCall(() => pilotApi.getIncomingRequests()),
            tryCall(() => pilotApi.getRejectedMissions()),
            tryCall(() => pilotApi.getEarnings()),
            tryCall(() => pilotApi.getPendingEarnings()),
            tryCall(() => pilotApi.getEarningHistory()),
            tryCall(() => pilotApi.getEarningsSummary()),
            tryCall(() => pilotApi.getRewards()),
            tryCall(() => pilotApi.getPayoutMethods()),
            tryCall(() => apiRequest<unknown>("/marketplace/products")),
            tryCall(() => apiRequest<unknown>("/notifications")),
            tryCall(() => teamApi.getMyManagers()),
            tryCall(() =>
              teamApi.getSuggestedManagers(5, coords ? { lat: coords.lat, lng: coords.lng, radiusKm: 150 } : {}),
            ),
            tryCall(() => teamApi.incoming()),
            tryCall(() => teamApi.outgoing()),
            tryCall(() => pilotApi.getMaintenanceTickets()),
          ]);
        if (cancelled) return;
        const anyLive = [prof, ms, inc, rej, earn, pend, hist, summ, rew, pays, prods, notes, managers, suggested, tin, tout, tickets].some(
          (r) => r !== null,
        );
        setLive(anyLive);
        if (prof && typeof prof === "object") {
          const p = prof as Record<string, unknown>;
          const stats = (p.stats ?? {}) as Record<string, unknown>;
          const profileData = (p.profileData ?? {}) as Record<string, unknown>;
          const online =
            (p.isAvailable as boolean | undefined) ??
            (p.available as boolean | undefined) ??
            (profileData.isOnline as boolean | undefined) ??
            true;
          setProfile({
            name: str(p.name ?? p.displayName, session.name),
            phone: str(p.phone ?? p.phoneNumber, session.phone),
            email: str(p.email, session.email),
            availability:
              online === false || /off/i.test(str(p.availability ?? p.status))
                ? "offDuty"
                : "active",
            rating:
              typeof p.averageRating === "number"
                ? p.averageRating
                : typeof stats.averageRating === "number"
                  ? (stats.averageRating as number)
                  : typeof p.rating === "number"
                    ? (p.rating as number)
                    : null,
            ratingCount:
              typeof p.totalRatings === "number"
                ? p.totalRatings
                : typeof stats.totalRatings === "number"
                  ? (stats.totalRatings as number)
                  : null,
          });
        }
        setMissions(toList(ms).map(mapMission));
        setIncoming(toList(inc).map(mapMission));
        setRejected(toList(rej).map(mapMission));
        const summary = (summ ?? null) as Record<string, unknown> | null;
        if (earn && typeof earn === "object") {
          const e = earn as Record<string, unknown>;
          setEarnings({
            total: num(e.total ?? e.totalEarnings ?? summary?.totalEarnings, 0),
            pending: num(e.pending ?? e.pendingEarnings ?? summary?.pendingEarnings, 0),
          });
        } else if (summary) {
          setEarnings({
            total: num(summary.totalEarnings, 0),
            pending: num(summary.pendingEarnings, 0),
          });
        }
        setEarningsSummary(summary);
        setPendingEarnings(toList(pend).map(mapPendingEarning));
        setRewards(toList(rew));
        setEarningHistory(toList(hist));
        setMaintenanceTickets(toList(tickets));
        setPayouts(toList(pays));
        setProducts(toList(prods));
        setNotifications(
          toList(notes).map((n, i) => ({
            id: str(n.id ?? n._id, `n${i}`),
            title: str(n.title, "Notification"),
            body: str(n.body ?? n.message, ""),
            read: Boolean(n.read ?? n.isRead),
          })),
        );
        const teamList: TeamEntry[] = [
          ...toList(suggested).map((t, i) => ({
            id: str(t.id ?? t._id ?? t.fmUid ?? t.managerId, `s${i}`),
            name: str(t.name ?? t.managerName, "Fleet Manager"),
            detail: str(t.address ?? (typeof t.distanceKm === "number" ? `${t.distanceKm} km away` : "")),
            kind: "suggested" as const,
            distanceKm: typeof t.distanceKm === "number" ? (t.distanceKm as number) : null,
            phone: str(t.phone ?? t.phoneNumber ?? ""),
          })),
          ...toList(tout).map((t, i) => ({
            id: str(t.id ?? t._id, `p${i}`),
            name: str(t.name ?? t.managerName, "Request"),
            detail: "Awaiting approval",
            kind: "pending" as const,
          })),
          ...toList(tin).map((t, i) => ({
            id: str(t.id ?? t._id, `v${i}`),
            name: str(t.name ?? t.managerName, "Invite"),
            detail: "Invited you",
            kind: "invite" as const,
          })),
          ...toList(managers).map((t, i) => ({
            id: str(t.id ?? t._id ?? t.fmUid ?? t.managerId, `m${i}`),
            name: str(t.name ?? t.managerName, "Fleet Manager"),
            detail: str(t.address ?? t.phone ?? "", "") || "Your fleet manager",
            kind: "joined" as const,
            phone: str(t.phone ?? t.phoneNumber ?? ""),
          })),
        ];
        setTeams(teamList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load pilot data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + manual reload only.
  }, [attempt]);

  // Realtime: mission + team events refresh lists.
  useEffect(() => {
    let cancelled = false;
    let off: (() => void) | null = null;
    void import("@/lib/booking/socket").then((mod) => {
      if (cancelled) return;
      const s = mod.connectSocket();
      if (!s) return;
      const refresh = () => setAttempt((a) => a + 1);
      const events = ["mission:created", "team:inviteReceived", "team:updated"] as const;
      events.forEach((e) => s.on(e, refresh));
      off = () => events.forEach((e) => s.off(e, refresh));
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  const setAvailable = useCallback(
    async (on: boolean) => {
      setToggling(true);
      setProfile((p) => ({ ...p, availability: on ? "active" : "offDuty" }));
      try {
        await pilotApi.updateAvailability({ isOnline: on });
      } catch (err) {
        setProfile((p) => ({ ...p, availability: on ? "offDuty" : "active" }));
        throw err;
      } finally {
        setToggling(false);
      }
    },
    [],
  );

  const act = useCallback(
    async (id: string, fn: (mid: string) => Promise<unknown>, ok: string) => {
      setActing(id);
      try {
        await fn(id);
        showToast(ok);
        setAttempt((a) => a + 1);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setActing(null);
      }
    },
    [showToast],
  );

  void acting;

  const value: PilotData = useMemo(
    () => ({
      profile,
      setAvailable,
      toggling,
      missions,
      incoming,
      rejected,
      earnings,
      pendingEarnings,
      earningHistory,
      earningsSummary,
      rewards,
      payouts,
      products,
      maintenanceTickets,
      promotions: FALLBACK_PROMOS,
      notifications,
      unread: notifications.filter((n) => !n.read).length,
      teams,
      live,
      loading,
      error,
      reload,
      toast,
      showToast,
      act,
    }),
    [profile, setAvailable, toggling, missions, incoming, rejected, earnings, pendingEarnings, earningHistory, earningsSummary, rewards, payouts, products, maintenanceTickets, notifications, teams, live, loading, error, reload, toast, showToast, act],
  );

  return <PilotContext.Provider value={value}>{children}</PilotContext.Provider>;
}

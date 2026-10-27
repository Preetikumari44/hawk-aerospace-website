"use client";

// Fleet workspace data — backend-first, mock fallback (same withFallback
// pattern as the pilot branch). Every loader tries the live Super App
// endpoint and falls back to the teammate's mock data ONLY on failure, so the
// UI keeps its exact shape with real data whenever the backend answers.

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
import { fleetApi, teamApi } from "@/lib/booking/role-apis";
import {
  mockFleetDrones,
  mockFleetMissions,
  mockFleetNotifications,
  mockFleetPilots,
  mockFleetProducts,
  mockFleetTickets,
} from "./mock";
import type {
  FleetDrone,
  FleetMission,
  FleetNotification,
  FleetPilot,
  FleetProduct,
  FleetTicket,
  FleetUser,
} from "./types";

export type { FleetPilot };

export function toList<T>(v: unknown, keys: string[] = []): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of [
      ...keys,
      "data",
      "items",
      "results",
      "missions",
      "pilots",
      "drones",
      "tickets",
      "products",
      "notifications",
      "requests",
    ]) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

async function withFallback<T>(call: () => Promise<T>, fallback: T): Promise<{ value: T; live: boolean }> {
  try {
    return { value: await call(), live: true };
  } catch {
    return { value: fallback, live: false };
  }
}

const str = (v: unknown, fb = ""): string => (typeof v === "string" && v ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);

function mapPilot(p: Record<string, unknown>, i: number): FleetPilot {
  const raw = str(p.status ?? p.availability, "Available");
  const status = /off/i.test(raw) ? "Off-Duty" : /assign|busy|mission/i.test(raw) ? "Assigned" : "Available";
  const name = str(p.name ?? p.displayName, `Pilot ${i + 1}`);
  return {
    id: str(p.id ?? p.uid ?? p.pilotId, `PLT-${i + 1}`),
    name,
    phone: str(p.phone ?? p.phoneNumber, ""),
    skills: Array.isArray(p.skills)
      ? (p.skills as string[])
      : Array.isArray(p.serviceTypes)
        ? (p.serviceTypes as string[])
        : [],
    serviceTags: Array.isArray(p.serviceTags) ? (p.serviceTags as string[]) : [],
    status,
    rating: num(p.rating, 4.5),
    avatarInitial: name.charAt(0).toUpperCase(),
  };
}

function mapDrone(d: Record<string, unknown>, i: number): FleetDrone {
  const raw = str(d.status, "Deployable");
  const status = /maint|repair|service/i.test(raw)
    ? "Maintenance"
    : /assign|busy|mission|active/i.test(raw)
      ? "Assigned"
      : "Deployable";
  const model = str(d.model ?? d.name, "Hawk Drone");
  return {
    id: str(d.id ?? d.droneId, `DRN-${i + 1}`),
    model,
    code: str(d.code ?? d.registrationNumber ?? d.callsign, model),
    status,
    flightHours: num(d.flightHours ?? d.hours, 0),
    lastServiced: str(d.lastServiced ?? d.lastMaintenance, ""),
  };
}

function mapMission(m: Record<string, unknown>, i: number): FleetMission {
  const raw = str(m.status, "").toLowerCase();
  // Terminal states never leak into Active/Upcoming: rejected + cancelled
  // belong to the Completed tab (which also merges the rejected endpoint).
  // Pending (unassigned, awaiting FM action) is Upcoming, not Active.
  const tab = /complet|cancel|reject/.test(raw)
    ? "Completed"
    : /await|pending|confirm|assign|upcoming|schedul/.test(raw)
      ? "Upcoming"
      : "Active";
  const status =
    /complet/.test(raw)
      ? "Completed"
      : /cancel/.test(raw)
        ? "Cancelled"
        : /reject/.test(raw)
          ? "Rejected"
          : /progress|active|start/.test(raw)
            ? "In Progress"
            : /assign/.test(raw)
              ? "Pilot Assigned"
              : /confirm/.test(raw)
                ? "Booking Confirmed"
                : "Awaiting Approval";
  return {
    id: str(m.id ?? m._id ?? m.bookingNumber ?? m.bookingId, `MSN-${i + 1}`),
    type: str(m.serviceType ?? m.type, "Mission"),
    client: str(m.client ?? m.clientName ?? m.customerName ?? m.address, ""),
    location: str(m.location ?? m.address, ""),
    date: str(m.scheduledDate ?? m.date, ""),
    time: str(m.preferredTimeSlot ?? m.time, ""),
    pilot: (m.assignedPilot ?? m.pilotName ?? m.pilot ?? null) as string | null,
    drone: (m.assignedDrone ?? m.droneName ?? m.drone ?? null) as string | null,
    status,
    tab,
  };
}

function mapTicket(t: Record<string, unknown>, i: number): FleetTicket {
  const pr = str(t.priority, "Medium");
  const st = str(t.status, "");
  return {
    id: str(t.id ?? t._id ?? t.ticketId, `TKT-${i + 1}`),
    resource: str(t.resource ?? t.droneName ?? t.droneId, "Drone"),
    raisedBy: str(t.raisedBy ?? t.raisedByName ?? t.technicianName, ""),
    issue: str(t.issue ?? t.title ?? t.mainProblem ?? t.description, ""),
    priority: /critical/i.test(pr)
      ? "Critical"
      : /high/i.test(pr)
        ? "High"
        : /low/i.test(pr)
          ? "Low"
          : "Medium",
    date: str(t.date ?? t.createdAt ?? t.scheduledDate, ""),
    status: /progress|repair/i.test(st)
      ? "In Progress"
      : /resolv/i.test(st)
        ? "Resolved"
        : /complet|clos|done/i.test(st)
          ? "Closed"
          : "Open",
  };
}

function mapProduct(p: Record<string, unknown>, i: number): FleetProduct {
  return {
    id: str(p.id ?? p._id, `PRD-${i + 1}`),
    name: str(p.name, `Product ${i + 1}`),
    description: str(p.description, ""),
    price: num(p.price, 0),
    category: str(p.category, "General"),
    image: str(p.image ?? p.emoji, "📦"),
  };
}

function mapNotification(n: Record<string, unknown>, i: number): FleetNotification {
  return {
    id: str(n.id ?? n._id, `N${i + 1}`),
    title: str(n.title, "Notification"),
    description: str(n.body ?? n.message ?? n.description, ""),
    time: str(n.time ?? n.createdAt, ""),
    read: Boolean(n.read ?? n.isRead),
  };
}

export interface TeamPilot {
  id: string;
  name: string;
  phone: string;
  detail: string;
  kind: "invite" | "pending" | "request" | "member";
}

export interface FleetData {
  user: FleetUser;
  dutyOn: boolean | null;
  setDuty: (on: boolean) => Promise<void>;
  togglingDuty: boolean;
  pilots: FleetPilot[];
  drones: FleetDrone[];
  missions: FleetMission[];
  rejectedMissions: FleetMission[];
  requests: Record<string, unknown>[];
  requestHistory: Record<string, unknown>[];
  team: TeamPilot[];
  teamTabCounts: { invite: number; pending: number; request: number };
  tickets: FleetTicket[];
  products: FleetProduct[];
  notifications: FleetNotification[];
  overview: {
    totalEarnings: number;
    completedMissions: number;
    upcomingMissions: number;
    rejectedMissions: number;
  };
  earnings: { total: number; pending: number };
  commissionHistory: Record<string, unknown>[];
  earningsSummary: Record<string, unknown> | null;
  payouts: Record<string, unknown>[];
  withdrawals: Record<string, unknown>[];
  refunds: Record<string, unknown>[];
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
  cart: (FleetProduct & { quantity: number })[];
  addToCart: (p: FleetProduct) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  cartCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const FleetDataContext = createContext<FleetData | null>(null);

export function useFleetData(): FleetData {
  const ctx = useContext(FleetDataContext);
  if (!ctx) throw new Error("useFleetData must be used within FleetDataProvider");
  return ctx;
}

interface Snapshot {
  pilots: FleetPilot[];
  drones: FleetDrone[];
  missions: FleetMission[];
  rejectedMissions: FleetMission[];
  requests: Record<string, unknown>[];
  requestHistory: Record<string, unknown>[];
  team: TeamPilot[];
  tickets: FleetTicket[];
  products: FleetProduct[];
  notifications: FleetNotification[];
  overview: FleetData["overview"];
  earnings: FleetData["earnings"];
  commissionHistory: Record<string, unknown>[];
  earningsSummary: Record<string, unknown> | null;
  payouts: Record<string, unknown>[];
  withdrawals: Record<string, unknown>[];
  refunds: Record<string, unknown>[];
  live: boolean;
}

export function FleetDataProvider({
  children,
  sessionUser,
}: {
  children: ReactNode;
  sessionUser: FleetUser;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [dutyOn, setDutyOn] = useState<boolean | null>(null);
  const [togglingDuty, setTogglingDuty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cart, setCart] = useState<(FleetProduct & { quantity: number })[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  const setDuty = useCallback(
    async (on: boolean) => {
      setTogglingDuty(true);
      try {
        await fleetApi.updateAvailability({ isOnline: on });
        setDutyOn(on);
      } finally {
        setTogglingDuty(false);
      }
    },
    [],
  );

  // Realtime: FM request + team events refresh lists.
  useEffect(() => {
    let cancelled = false;
    let off: (() => void) | null = null;
    void import("@/lib/booking/socket").then((mod) => {
      if (cancelled) return;
      const s = mod.connectSocket();
      if (!s) return;
      const refresh = () => setAttempt((a) => a + 1);
      const events = [
        "fleetManager:request:sent",
        "fleetManager:request:accepted",
        "fleetManager:request:rejected",
        "fleetManager:request:timeout",
        "fleetManager:request:cancelled",
        "booking:fleetManager:assigned",
        "team:requestReceived",
        "team:updated",
      ] as const;
      events.forEach((e) => s.on(e, refresh));
      off = () => events.forEach((e) => s.off(e, refresh));
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  // Backend-first load. Runs on mount + manual reload only (attempt is the
  // sole dep) — never loops: nothing in here feeds back into attempt.
  useEffect(() => {
    let cancelled = false;
    const locate: Promise<{ lat: number; lng: number } | null> = new Promise((resolve) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000 },
      );
    });
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const coords = await locate;
        if (coords && !cancelled) {
          apiRequest<unknown>("/users/me", {
            method: "PATCH",
            body: { location: { lat: coords.lat, lng: coords.lng } },
          }).catch(() => undefined);
        }
        const [pilots, drones, missions, rejectedM, requests, history, unassigned, tin, tout, tickets, products, notes, dash, comm, pendComm, commHist, summary, pays, withdrawals, refunds, profile] =
          await Promise.all([
            withFallback(async () => toList<Record<string, unknown>>(await fleetApi.getPilots()), []),
            withFallback(async () => toList<Record<string, unknown>>(await fleetApi.getDrones()), []),
            withFallback(async () => toList<Record<string, unknown>>(await fleetApi.getMissions()), []),
            withFallback(async () => toList<Record<string, unknown>>(await fleetApi.getRejectedMissions()), []),
            withFallback(
              async () => toList<Record<string, unknown>>(await fleetApi.getFleetManagerRequests()),
              [],
            ),
            withFallback(
              async () => toList<Record<string, unknown>>(await fleetApi.getFleetManagerRequestHistory()),
              [],
            ),
            withFallback(
              async () =>
                toList<Record<string, unknown>>(
                  await teamApi.getUnassignedPilots(
                    undefined,
                    coords ? { lat: coords.lat, lng: coords.lng, radiusKm: 150 } : {},
                  ),
                ),
              [],
            ),
            withFallback(async () => toList<Record<string, unknown>>(await teamApi.incoming()), []),
            withFallback(async () => toList<Record<string, unknown>>(await teamApi.outgoing()), []),
            withFallback(
              async () => toList<Record<string, unknown>>(await fleetApi.getMaintenanceTickets()),
              [],
            ),
            withFallback(
              async () => toList<Record<string, unknown>>(await apiRequest<unknown>("/marketplace/products")),
              [],
            ),
            withFallback(
              async () => toList<Record<string, unknown>>(await apiRequest<unknown>("/notifications")),
              [],
            ),
            withFallback(
              async () => ((await fleetApi.getDashboard()) ?? {}) as Record<string, unknown>,
              {},
            ),
            withFallback(async () => ((await fleetApi.getCommission().catch(() => null)) ?? {}) as Record<string, unknown>, {}),
            withFallback(async () => ((await fleetApi.getPendingCommission().catch(() => null)) ?? {}) as Record<string, unknown>, {}),
            withFallback(async () => toList<Record<string, unknown>>(await fleetApi.getCommissionHistory({ limit: 12 }).catch(() => [])), []),
            withFallback(async () => ((await apiRequest<unknown>("/payouts/earnings").catch(() => null)) ?? {}) as Record<string, unknown>, {}),
            withFallback(async () => toList<Record<string, unknown>>(await apiRequest<unknown>("/payouts/methods").catch(() => [])), []),
            withFallback(async () => toList<Record<string, unknown>>(await apiRequest<unknown>("/payouts/withdrawals").catch(() => [])), []),
            withFallback(async () => toList<Record<string, unknown>>(await fleetApi.getMyRefunds().catch(() => [])), []),
            withFallback(async () => ((await fleetApi.getProfile().catch(() => null)) ?? {}) as Record<string, unknown>, {}),
          ]);
        if (cancelled) return;
        const live = [pilots, drones, missions, rejectedM, requests, history, unassigned, tin, tout, tickets, products, notes, dash, comm, profile].some(
          (r) => r.live,
        );
        const mappedMissions = missions.value.length
          ? missions.value.map((m, i) => mapMission(m, i))
          : mockFleetMissions;
        const d = (dash.value ?? {}) as Record<string, unknown>;
        const c = (comm.value ?? {}) as Record<string, unknown>;
        const s = (summary.value ?? {}) as Record<string, unknown>;
        const p = (profile.value ?? {}) as Record<string, unknown>;
        const prof = (p.profile ?? {}) as Record<string, unknown>;
        const online = p.isOnline ?? prof.isOnline;
        if (typeof online === "boolean") setDutyOn(online);
        const team: TeamPilot[] = [
          ...unassigned.value.map((t, i) => {
            const exp = str(
              (t as Record<string, unknown>).experienceText ??
                (t as Record<string, unknown>).experience ??
                "",
            );
            const loc = str(t.address ?? (typeof t.distanceKm === "number" ? `${t.distanceKm} km away` : ""));
            return {
              id: str(t.uid ?? t.id ?? t._id ?? `u${i}`),
              name: str(t.name ?? t.displayName ?? "Pilot"),
              phone: str(t.phone ?? t.phoneNumber ?? ""),
              detail: [exp ? `Exp: ${exp}` : "", loc].filter(Boolean).join(" · "),
              kind: "invite" as const,
            };
          }),
          ...tout.value.map((t, i) => ({
            id: str(t.id ?? t._id ?? `o${i}`),
            name: str(t.name ?? t.pilotName ?? "Request"),
            phone: "",
            detail: "Awaiting pilot approval",
            kind: "pending" as const,
          })),
          ...tin.value.map((t, i) => ({
            id: str(t.id ?? t._id ?? `i${i}`),
            name: str(t.name ?? t.pilotName ?? "Request"),
            phone: "",
            detail: "Wants to join your fleet",
            kind: "request" as const,
          })),
        ];
        setSnapshot({
          pilots: pilots.value.length ? pilots.value.map((p, i) => mapPilot(p, i)) : mockFleetPilots,
          drones: drones.value.length ? drones.value.map((x, i) => mapDrone(x, i)) : mockFleetDrones,
          missions: mappedMissions,
          rejectedMissions: rejectedM.value.length
            ? rejectedM.value.map((m, i) => ({ ...mapMission(m, i), tab: "Completed" as const, status: "Rejected" as const }))
            : [],
          requests: requests.value,
          requestHistory: history.value,
          team,
          tickets: tickets.value.length ? tickets.value.map((t, i) => mapTicket(t, i)) : mockFleetTickets,
          products: products.value.length
            ? products.value.map((p, i) => mapProduct(p, i))
            : mockFleetProducts,
          notifications: notes.value.length
            ? notes.value.map((n, i) => mapNotification(n, i))
            : mockFleetNotifications,
          overview: {
            totalEarnings: num(d.totalEarnings ?? c.totalRevenue ?? s.totalEarnings, 0),
            completedMissions: num(
              d.completedMissions,
              mappedMissions.filter((m) => m.tab === "Completed").length,
            ),
            upcomingMissions: num(
              d.upcomingMissions,
              mappedMissions.filter((m) => m.tab === "Upcoming").length,
            ),
            rejectedMissions: num(d.rejectedMissions, 0),
          },
          earnings: {
            total: num(c.totalRevenue ?? c.total ?? s.totalEarnings ?? d.totalEarnings, 0),
            pending: num(c.pendingRevenue ?? c.pending ?? s.pendingEarnings ?? pendComm.value ?? 0),
          },
          commissionHistory: commHist.value,
          earningsSummary: Object.keys(s).length ? s : null,
          payouts: pays.value,
          withdrawals: withdrawals.value,
          refunds: refunds.value,
          live,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load fleet data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + manual reload only.
  }, [attempt]);

  const addToCart = useCallback((p: FleetProduct) => {
    setCart((prev) => {
      const found = prev.find((c) => c.id === p.id);
      if (found) return prev.map((c) => (c.id === p.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...p, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    apiRequest(`/notifications/${id}/read`, { method: "PATCH" }).catch(() => undefined);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setReadIds((prev) => {
      const all = snapshot?.notifications.map((n) => n.id) ?? [];
      return [...new Set([...prev, ...all])];
    });
  }, [snapshot?.notifications]);

  const value: FleetData = useMemo(() => {
    const notes = (snapshot?.notifications ?? mockFleetNotifications).map((n) =>
      readIds.includes(n.id) ? { ...n, read: true } : n,
    );
    const team = snapshot?.team ?? [];
    return {
      user: sessionUser,
      dutyOn,
      setDuty,
      togglingDuty,
      pilots: snapshot?.pilots ?? mockFleetPilots,
      drones: snapshot?.drones ?? mockFleetDrones,
      missions: snapshot?.missions ?? mockFleetMissions,
      rejectedMissions: snapshot?.rejectedMissions ?? [],
      requests: snapshot?.requests ?? [],
      requestHistory: snapshot?.requestHistory ?? [],
      team,
      teamTabCounts: {
        invite: team.filter((t) => t.kind === "invite").length,
        pending: team.filter((t) => t.kind === "pending").length,
        request: team.filter((t) => t.kind === "request").length,
      },
      tickets: snapshot?.tickets ?? mockFleetTickets,
      products: snapshot?.products ?? mockFleetProducts,
      notifications: notes,
      overview: snapshot?.overview ?? {
        totalEarnings: 0,
        completedMissions: 0,
        upcomingMissions: 0,
        rejectedMissions: 0,
      },
      earnings: snapshot?.earnings ?? { total: 0, pending: 0 },
      commissionHistory: snapshot?.commissionHistory ?? [],
      earningsSummary: snapshot?.earningsSummary ?? null,
      payouts: snapshot?.payouts ?? [],
      withdrawals: snapshot?.withdrawals ?? [],
      refunds: snapshot?.refunds ?? [],
      live: snapshot?.live ?? false,
      loading,
      error,
      reload,
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      cartCount: cart.reduce((s, c) => s + c.quantity, 0),
      markNotificationRead,
      markAllNotificationsRead,
      toast,
      showToast,
    };
  }, [
    snapshot,
    sessionUser,
    dutyOn,
    setDuty,
    togglingDuty,
    loading,
    error,
    reload,
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    markNotificationRead,
    markAllNotificationsRead,
    toast,
    showToast,
    readIds,
  ]);

  return <FleetDataContext.Provider value={value}>{children}</FleetDataContext.Provider>;
}

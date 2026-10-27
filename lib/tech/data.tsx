"use client";

// Technician workspace data — backend-first, empty-state fallback. Queues
// (serviceCentreApi.queues) are primary like the Super App; accept/reject go
// through techDecision with the max-3 guard surfaced. Duty toggle is local
// state (mobile parity). Earnings merge technician endpoints + wallet.

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
import { serviceCentreApi, technicianApi } from "@/lib/booking/role-apis";
import type {
  TechCartItem,
  TechNotification,
  TechOrder,
  TechProduct,
  TechProfile,
  TechTicket,
} from "./types";

export type { TechTicket };

function toList(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["data", "items", "results", "tickets", "products", "notifications", "orders", "queues", "active", "next", "incoming", "history", "methods", "charges"]) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
  }
  return [];
}

async function tryCall<T>(call: () => Promise<T>, fallback: T): Promise<{ value: T; live: boolean }> {
  try {
    return { value: await call(), live: true };
  } catch {
    return { value: fallback, live: false };
  }
}

const str = (v: unknown, fb = ""): string => (typeof v === "string" && v ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);

function mapTicket(t: Record<string, unknown>): TechTicket {
  const id = str(t.id ?? t._id ?? t.ticketId);
  const title = str(t.title ?? t.issue ?? t.mainProblem ?? id);
  return {
    id,
    title,
    issue: str(t.issue ?? t.description ?? title),
    status: str(t.status, "Open"),
    priority: str(t.priority, "Medium"),
    date: str(t.date ?? t.createdAt ?? t.scheduledDate, ""),
    droneName: str(t.droneName ?? t.droneId ?? t.resource, ""),
    raisedBy: str(t.raisedBy ?? t.raisedByName, ""),
    meta: str(t.scheduledDate ?? t.date ?? t.createdAt, ""),
  };
}

function mapProduct(p: Record<string, unknown>, i: number): TechProduct {
  return {
    id: str(p.id ?? p._id, `p${i}`),
    name: str(p.name, `Product ${i + 1}`),
    description: str(p.description, ""),
    startingFrom: num(p.startingFrom ?? p.price, 2000),
    category: str(p.category, "General"),
    vendorUid: str(p.vendorUid ?? p.vendorId, "marketplace"),
    rating: typeof p.rating === "number" ? (p.rating as number) : undefined,
  };
}

const FALLBACK_PRODUCTS: TechProduct[] = [
  { id: "biogrow-pro", name: "BioGrow Pro Organic Fertilizer — All-Crop Formula", description: "100% natural, slow-release fertilizer for healthier yields.", startingFrom: 2000 },
  { id: "organic-fertilizer", name: "Organic Fertilizer", description: "A elaborative Description of the product", startingFrom: 2000 },
];

export interface PendingEarning {
  id: string;
  title: string;
  amount: number | null;
  date: string;
  location: string;
}

export interface TechData {
  profile: TechProfile;
  rating: number | null;
  ratingCount: number | null;
  dutyOn: boolean;
  setDuty: (on: boolean) => void;
  duty: string;
  setDutySchedule: (d: string) => void;
  incoming: TechTicket[];
  tickets: TechTicket[];
  rejected: TechTicket[];
  activeQueue: TechTicket[];
  nextQueue: TechTicket[];
  products: TechProduct[];
  notifications: TechNotification[];
  orders: TechOrder[];
  earnings: { total: number; pending: number };
  pendingList: PendingEarning[];
  earningHistory: { label: string; value: number }[];
  wallet: Record<string, unknown> | null;
  payouts: Record<string, unknown>[];
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
  acceptTicket: (id: string) => Promise<void>;
  rejectTicket: (id: string) => Promise<void>;
  cartItems: TechCartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (p: TechProduct) => void;
  updateQty: (id: string, q: number) => void;
  removeItem: (id: string) => void;
  checkout: () => Promise<string>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const TechContext = createContext<TechData | null>(null);

export function useTech(): TechData {
  const ctx = useContext(TechContext);
  if (!ctx) throw new Error("useTech must be used within TechProvider");
  return ctx;
}

export function TechProvider({
  children,
  sessionProfile,
}: {
  children: ReactNode;
  sessionProfile: TechProfile;
}) {
  const [incoming, setIncoming] = useState<TechTicket[]>([]);
  const [tickets, setTickets] = useState<TechTicket[]>([]);
  const [rejected, setRejected] = useState<TechTicket[]>([]);
  const [activeQueue, setActiveQueue] = useState<TechTicket[]>([]);
  const [nextQueue, setNextQueue] = useState<TechTicket[]>([]);
  const [products, setProducts] = useState<TechProduct[]>(FALLBACK_PRODUCTS);
  const [notifications, setNotifications] = useState<TechNotification[]>([]);
  const [orders, setOrders] = useState<TechOrder[]>([]);
  const [earnings, setEarnings] = useState({ total: 0, pending: 0 });
  const [pendingList, setPendingList] = useState<PendingEarning[]>([]);
  const [earningHistory, setEarningHistory] = useState<{ label: string; value: number }[]>([]);
  const [wallet, setWallet] = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number | null>(null);
  const [dutyOn, setDutyOn] = useState(true);
  const [duty, setDutyScheduleState] = useState("full_active");
  const [profile, setProfile] = useState<TechProfile>(sessionProfile);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cartItems, setCartItems] = useState<TechCartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const setDuty = useCallback((on: boolean) => setDutyOn(on), []);
  const setDutySchedule = useCallback((d: string) => setDutyScheduleState(d), []);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          apiRequest<unknown>("/users/me", {
            method: "PATCH",
            body: { location: { lat: pos.coords.latitude, lng: pos.coords.longitude } },
          }).catch(() => undefined);
        },
        () => undefined,
        { timeout: 8000 },
      );
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [q, inc, tks, rej, prods, notes, ords, earn, pend, hist, bal, pays, prof] = await Promise.all([
          tryCall(async () => ((await serviceCentreApi.queues()) ?? {}) as Record<string, unknown>, {}),
          tryCall(async () => toList(await technicianApi.getIncomingTickets()), []),
          tryCall(async () => toList(await technicianApi.getTickets()), []),
          tryCall(async () => toList(await technicianApi.getRejectedTickets()), []),
          tryCall(async () => toList(await apiRequest<unknown>("/marketplace/products")), []),
          tryCall(async () => toList(await apiRequest<unknown>("/notifications")), []),
          tryCall(async () => toList(await apiRequest<unknown>("/marketplace/orders")), []),
          tryCall(async () => ((await technicianApi.getEarnings().catch(() => null)) ?? {}) as Record<string, unknown>, {}),
          tryCall(async () => toList(await technicianApi.getPendingEarnings().catch(() => [])), []),
          tryCall(async () => toList(await technicianApi.getEarningHistory().catch(() => [])), []),
          tryCall(async () => ((await apiRequest<unknown>("/wallet").catch(() => null)) ?? {}) as Record<string, unknown>, {}),
          tryCall(async () => toList(await apiRequest<unknown>("/payouts/methods").catch(() => [])), []),
          tryCall(async () => ((await technicianApi.getProfile().catch(() => null)) ?? {}) as Record<string, unknown>, {}),
        ]);
        if (cancelled) return;
        const qv = q.value as Record<string, unknown>;
        const qActive = Array.isArray(qv.active) ? (qv.active as Record<string, unknown>[]) : [];
        const qNext = Array.isArray(qv.next) ? (qv.next as Record<string, unknown>[]) : [];
        const qIncoming = Array.isArray(qv.incoming) ? (qv.incoming as Record<string, unknown>[]) : [];
        setActiveQueue(qActive.map(mapTicket));
        setNextQueue(qNext.map(mapTicket));
        setIncoming((qIncoming.length ? qIncoming : inc.value).map(mapTicket));
        setTickets(tks.value.map(mapTicket));
        setRejected(rej.value.map(mapTicket));
        setProducts(prods.value.length ? prods.value.map(mapProduct) : FALLBACK_PRODUCTS);
        setNotifications(
          notes.value.map((n, i) => ({
            id: str(n.id ?? n._id, `n${i}`),
            title: str(n.title, "Notification"),
            body: str(n.body ?? n.message, ""),
            time: str(n.time ?? n.createdAt, ""),
            read: Boolean(n.read ?? n.isRead),
          })),
        );
        setOrders(
          ords.value.map((o, i) => ({
            id: str(o.id ?? o.orderId, `ORD-${Date.now()}-${i}`),
            items: [],
            total: num(o.total ?? o.amount, 0),
            placedAt: str(o.placedAt ?? o.createdAt, ""),
          })),
        );
        const e = earn.value as Record<string, unknown>;
        const b = bal.value as Record<string, unknown>;
        setEarnings({
          total: num(e.totalEarnings ?? e.total ?? b.totalEarnings ?? b.total, 0),
          pending: num(e.pendingEarnings ?? e.pending ?? b.pendingEarnings ?? b.pending, 0),
        });
        setWallet(Object.keys(b).length ? b : null);
        setPendingList(
          pend.value.map((p, i) => ({
            id: str(p.id ?? p._id ?? p.ticketId, `pe${i}`),
            title: str(p.title ?? p.issue ?? p.mainProblem ?? "Ticket"),
            amount: typeof p.amount === "number" ? p.amount : typeof p.pendingAmount === "number" ? (p.pendingAmount as number) : null,
            date: str(p.date ?? p.createdAt, ""),
            location: str(p.location ?? p.address, ""),
          })),
        );
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        setEarningHistory(
          hist.value.length
            ? hist.value.slice(0, 12).map((h, i) => ({
                label: str(h.label ?? h.month ?? months[i % 12]),
                value: num(h.amount ?? h.value ?? h.total, 0),
              }))
            : [],
        );
        setPayouts(pays.value);
        if (prof && typeof prof === "object") {
          const p = prof as Record<string, unknown>;
          setRating(
            typeof p.rating === "number"
              ? (p.rating as number)
              : typeof p.averageRating === "number"
                ? (p.averageRating as number)
                : null,
          );
          setRatingCount(typeof p.ratingCount === "number" ? (p.ratingCount as number) : null);
          setProfile((prev) => ({
            ...prev,
            name: str(p.name ?? p.displayName, prev.name),
            phone: str(p.phone ?? p.phoneNumber, prev.phone),
            email: str(p.email, prev.email),
          }));
        }
        setLive([q, inc, tks, rej, prods, notes, ords, earn, prof].some((r) => r.live));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + manual reload only.
  }, [attempt]);

  // Realtime ticket events.
  useEffect(() => {
    let cancelled = false;
    let off: (() => void) | null = null;
    void import("@/lib/booking/socket").then((mod) => {
      if (cancelled) return;
      const s = mod.connectSocket();
      if (!s) return;
      const refresh = () => setAttempt((a) => a + 1);
      const events = [
        "ticket:created",
        "ticket:assigned",
        "ticket:status",
        "ticket:tech:decision",
        "ticket:toolkit",
        "ticket:payment",
        "ticket:location",
      ] as const;
      events.forEach((e) => s.on(e, refresh));
      off = () => events.forEach((e) => s.off(e, refresh));
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  const acceptTicket = useCallback(
    async (id: string) => {
      await serviceCentreApi.techDecision(id, { decision: "accepted" });
      setIncoming((prev) => prev.filter((t) => t.id !== id));
      reload();
    },
    [reload],
  );

  const rejectTicket = useCallback(
    async (id: string) => {
      await serviceCentreApi.techDecision(id, { decision: "rejected" });
      setIncoming((prev) => prev.filter((t) => t.id !== id));
      reload();
    },
    [reload],
  );

  const addToCart = useCallback((product: TechProduct) => {
    setCartItems((prev) => {
      const found = prev.find((c) => c.product.id === product.id);
      if (found)
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: string, q: number) => {
    setCartItems((prev) =>
      q <= 0
        ? prev.filter((c) => c.product.id !== id)
        : prev.map((c) => (c.product.id === id ? { ...c, quantity: q } : c)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((c) => c.product.id !== id));
  }, []);

  const checkout = useCallback(async () => {
    const total = cartItems.reduce((s, c) => s + c.product.startingFrom * c.quantity, 0);
    let id = `ORD-${Date.now()}`;
    try {
      const res = (await apiRequest<unknown>("/marketplace/orders", {
        method: "POST",
        body: { items: cartItems.map((c) => ({ productId: c.product.id, quantity: c.quantity })) },
      })) as Record<string, unknown>;
      id = str(res.id ?? res.orderId, id);
    } catch {
      /* local fallback below */
    }
    const order: TechOrder = {
      id,
      items: cartItems.map((c) => ({ product: c.product, quantity: c.quantity })),
      total,
      placedAt: new Date().toISOString(),
    };
    setOrders((prev) => [order, ...prev]);
    setCartItems([]);
    return id;
  }, [cartItems]);

  const value: TechData = useMemo(
    () => ({
      profile,
      rating,
      ratingCount,
      dutyOn,
      setDuty,
      duty,
      setDutySchedule,
      incoming,
      tickets,
      rejected,
      activeQueue,
      nextQueue,
      products,
      notifications,
      orders,
      earnings,
      pendingList,
      earningHistory,
      wallet,
      payouts,
      live,
      loading,
      error,
      reload,
      acceptTicket,
      rejectTicket,
      cartItems,
      cartCount: cartItems.reduce((s, c) => s + c.quantity, 0),
      cartSubtotal: cartItems.reduce((s, c) => s + c.product.startingFrom * c.quantity, 0),
      addToCart,
      updateQty,
      removeItem,
      checkout,
      toast,
      showToast,
    }),
    [
      profile,
      rating,
      ratingCount,
      dutyOn,
      setDuty,
      duty,
      incoming,
      tickets,
      rejected,
      activeQueue,
      nextQueue,
      products,
      notifications,
      orders,
      earnings,
      pendingList,
      earningHistory,
      wallet,
      payouts,
      live,
      loading,
      error,
      reload,
      acceptTicket,
      rejectTicket,
      cartItems,
      addToCart,
      updateQty,
      removeItem,
      checkout,
      toast,
      showToast,
    ],
  );

  return <TechContext.Provider value={value}>{children}</TechContext.Provider>;
}

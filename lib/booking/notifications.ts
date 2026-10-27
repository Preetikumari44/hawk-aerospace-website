"use client";

import { apiRequest } from "./api-client";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type?: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const SNOOZE_KEY = "@hawk_notif_snooze_until";
const PERMISSION_KEY = "@hawk_notif_permission";

export type NotifPermission = "granted" | "denied" | "default" | "unsupported";

export function getPermission(): NotifPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifPermission;
}

export async function requestPermission(): Promise<NotifPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result as NotifPermission;
  } catch {
    return Notification.permission as NotifPermission;
  }
}

export function isSnoozed(): boolean {
  try {
    const until = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function snooze(days = 3): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86400000));
  } catch {
    /* ignore */
  }
}

export function clearSnooze(): void {
  try {
    window.localStorage.removeItem(SNOOZE_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredPermission(): string | null {
  try {
    return window.localStorage.getItem(PERMISSION_KEY);
  } catch {
    return null;
  }
}

export function storePermission(p: NotifPermission): void {
  try {
    window.localStorage.setItem(PERMISSION_KEY, p);
  } catch {
    /* ignore */
  }
}

export async function listNotifications(): Promise<NotificationItem[]> {
  const res = await apiRequest("/notifications");
  const raw = Array.isArray(res) ? res : (res as Record<string, unknown>)?.notifications ?? [];
  return (raw as Record<string, unknown>[]).map((n) => ({
    id: String(n.id ?? n._id ?? ""),
    title: String(n.title ?? ""),
    body: String(n.body ?? n.message ?? ""),
    type: String(n.type ?? ""),
    read: Boolean(n.read ?? n.isRead),
    createdAt: String(n.createdAt ?? n.created_at ?? ""),
    data: (n.data ?? {}) as Record<string, unknown>,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function deleteNotification(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}`, { method: "DELETE" });
}

export function showLocalNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* ignore */
  }
}

export function filter30Day(items: NotificationItem[]): NotificationItem[] {
  const cutoff = Date.now() - 30 * 86400000;
  return items.filter((n) => {
    const t = new Date(n.createdAt).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
}

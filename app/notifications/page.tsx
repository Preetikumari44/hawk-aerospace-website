"use client";

import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { useBookingAuth } from "@/lib/booking/auth-context";
import {
  deleteNotification,
  filter30Day,
  getPermission,
  isSnoozed,
  listNotifications,
  markNotificationRead,
  requestPermission,
  showLocalNotification,
  snooze,
  storePermission,
  type NotificationItem,
  type NotifPermission,
} from "@/lib/booking/notifications";

export default function NotificationsPage() {
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [perm, setPerm] = React.useState<NotifPermission>("default");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setPerm(getPermission());
    void load();
  }, [isAuthenticated]);

  async function load() {
    setLoading(true);
    try {
      const all = await listNotifications();
      setItems(filter30Day(all));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function enableNotifications() {
    setBusy(true);
    try {
      const result = await requestPermission();
      setPerm(result);
      storePermission(result);
      if (result === "granted") {
        showLocalNotification("Notifications enabled", "You'll now receive updates from Hawk Aerospace.");
      } else if (result === "denied") {
        snooze(3);
      }
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch { /* ignore */ }
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch { /* ignore */ }
  }

  if (!isAuthenticated) {
    return (
      <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
              <AerialScene variant="terrain" />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 -z-20"
              style={{
                background:
                  "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
              }}
            />
            <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <span className="eyebrow">Notifications</span>
          <p className="text-muted-foreground text-sm">Log in to see your notifications.</p>
          <Button size="lg" onClick={() => requestLogin("/notifications")}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="hawk-theme hawk-forest relative min-h-screen w-full overflow-hidden">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
        }}
      />
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold sm:text-4xl">Notifications</h1>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {perm === "default" && !isSnoozed() && (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-foreground font-semibold">Enable notifications</p>
                <p className="text-muted-foreground text-sm">Get booking updates, mission alerts, and more.</p>
              </div>
              <Button onClick={() => void enableNotifications()} disabled={busy}>
                {busy ? "Enabling…" : "Enable"}
              </Button>
            </div>
          )}

          {perm === "denied" && (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md rounded-3xl border p-6">
              <p className="text-foreground font-semibold">Notifications blocked</p>
              <p className="text-muted-foreground text-sm mt-1">
                You denied notification permission. Re-enable it in your browser settings, or try again later.
              </p>
            </div>
          )}

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No notifications in the last 30 days.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-2 rounded-xl border p-4 ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-foreground font-semibold text-sm">{n.title}</p>
                      <p className="text-muted-foreground text-sm mt-0.5">{n.body}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {new Date(n.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!n.read && (
                        <Button variant="ghost" size="sm" onClick={() => void markRead(n.id)}>
                          Mark read
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => void remove(n.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

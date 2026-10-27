"use client";

// Shared chat — conversation list (GET /chat/conversations). Per-booking chat
// lives at /chat/[id] (GET …/messages, POST …/messages, PATCH …/read).

import Link from "next/link";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { chatApi } from "@/lib/booking/role-apis";

interface Conv {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

function toList(v: unknown): Conv[] {
  const raw = Array.isArray(v) ? v : (v as Record<string, unknown>)?.conversations;
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((c, i) => ({
    id: String(c.id ?? c._id ?? c.conversationId ?? i),
    title: String(c.title ?? c.bookingNumber ?? c.bookingId ?? "Conversation"),
    lastMessage: String(c.lastMessage ?? c.preview ?? ""),
    updatedAt: String(c.updatedAt ?? ""),
  }));
}

export default function ChatListPage() {
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [list, setList] = React.useState<Conv[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    chatApi
      .getConversations()
      .then((v) => {
        if (!cancelled) setList(toList(v));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

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
          <span className="eyebrow">Chat</span>
          <p className="text-muted-foreground text-sm">Log in to view your conversations.</p>
          <Button size="lg" onClick={() => requestLogin("/chat")}>
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
          <Reveal className="flex flex-col gap-2">
            <span className="eyebrow">Chat</span>
            <h1 className="text-3xl font-semibold sm:text-4xl">Conversations</h1>
            <p className="text-muted-foreground text-sm">Per-booking chat with pilots, managers and support.</p>
          </Reveal>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : list.length === 0 ? (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md rounded-3xl border p-8 text-center">
              <p className="text-muted-foreground text-sm">No conversations yet. Conversations open from your bookings.</p>
            </div>
          ) : (
            list.map((c) => (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="border-border bg-card shadow-2xl backdrop-blur-md rounded-3xl border p-4 transition-colors hover:border-brand/50"
              >
                <p className="text-foreground font-medium">{c.title}</p>
                <p className="text-muted-foreground truncate text-sm">{c.lastMessage}</p>
              </Link>
            ))
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

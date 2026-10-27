"use client";

// Support bookings picker — Super App SupportBookingsScreen parity: pick a
// booking → open a booking-scoped support chat (admin + BOOKING ref).

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { type BackendBooking, customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { chatApi } from "@/lib/booking/role-apis";

export default function SupportBookingsPage() {
  const router = useRouter();
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [bookings, setBookings] = React.useState<BackendBooking[] | null>(null);
  const [opening, setOpening] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    customerApi
      .listBookings()
      .then((v) => {
        if (!cancelled) setBookings(Array.isArray(v) ? v : (v.bookings ?? []));
      })
      .catch(() => {
        if (!cancelled) setBookings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function openChat(b: BackendBooking) {
    const id = String(b.bookingNumber ?? b.id);
    setOpening(id);
    try {
      const conv = (await chatApi.createConversation({
        participantUid: "admin",
        participantRole: "admin",
        type: "support",
        supportCategory: "booking",
        bookingId: id,
      })) as Record<string, unknown>;
      const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? "");
      router.push(
        cid
          ? `/chat/${cid}?refId=${encodeURIComponent(id)}&refTitle=${encodeURIComponent(typeof b.serviceType === "string" ? b.serviceType : id)}`
          : "/chat",
      );
    } catch {
      setOpening(null);
    }
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
          <span className="eyebrow">Booking Support</span>
          <Button size="lg" onClick={() => requestLogin("/support/bookings")}>
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
          <Link href="/support" className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline">
            <ArrowLeftIcon className="size-4" />
            Back to Support
          </Link>
          <h1 className="text-foreground text-3xl font-semibold sm:text-4xl">Which booking needs help?</h1>
          {bookings === null ? (
            <p className="text-muted-foreground text-sm">Loading bookings…</p>
          ) : bookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings yet.</p>
          ) : (
            bookings.map((b) => {
              const id = String(b.bookingNumber ?? b.id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={opening === id}
                  onClick={() => void openChat(b)}
                  className="border-border bg-card shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 rounded-3xl border p-6 text-left transition-colors hover:border-brand/50"
                >
                  <div>
                    <p className="text-foreground font-medium">{id}</p>
                    <p className="text-muted-foreground text-xs">
                      {typeof b.serviceType === "string" ? b.serviceType : ""} · {String(b.status ?? "")}
                    </p>
                  </div>
                  <span className="text-brand text-xs font-semibold">
                    {opening === id ? "Opening…" : "Chat →"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

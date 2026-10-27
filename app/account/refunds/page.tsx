"use client";

// Refunds — Super App CustomerRefundsScreen parity: refunds derived from
// cancelled / refund-bearing bookings, linking back to tracking.

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { formatINR } from "@/components/booking/price-estimate";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { type BackendBooking, customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";

function hasRefund(b: BackendBooking): boolean {
  if (String(b.status ?? "").toLowerCase() === "cancelled") return true;
  const price = (b.priceBreakdown ?? {}) as Record<string, unknown>;
  return (
    typeof b.refund === "object" ||
    typeof price.refund === "number" ||
    typeof price.refundAmount === "number"
  );
}

function refundAmount(b: BackendBooking): number | null {
  const pick = (v: unknown): number | null => (typeof v === "number" ? v : null);
  const price = (b.priceBreakdown ?? {}) as Record<string, unknown>;
  const r = b.refund as Record<string, unknown> | undefined;
  return (
    pick(r?.amount) ?? pick(price.refund) ?? pick(price.refundAmount) ?? pick(price.totalAmount) ?? null
  );
}

export default function RefundsPage() {
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [list, setList] = React.useState<BackendBooking[] | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    customerApi
      .listBookings()
      .then((v) => {
        if (cancelled) return;
        const all = Array.isArray(v) ? v : (v.bookings ?? []);
        setList(all.filter(hasRefund));
      })
      .catch(() => {
        if (!cancelled) setList([]);
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
          <span className="eyebrow">Refunds</span>
          <Button size="lg" onClick={() => requestLogin("/account/refunds")}>
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
          <Link href="/account" className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline">
            <ArrowLeftIcon className="size-4" />
            Back to Account
          </Link>
          <h1 className="text-foreground text-3xl font-semibold sm:text-4xl">Refunds</h1>
          {list === null ? (
            <p className="text-muted-foreground text-sm">Loading refunds…</p>
          ) : list.length === 0 ? (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md rounded-3xl border p-8 text-center">
              <p className="text-muted-foreground text-sm">No refunds on your bookings.</p>
            </div>
          ) : (
            list.map((b) => {
              const id = String(b.bookingNumber ?? b.id);
              const amt = refundAmount(b);
              return (
                <Link
                  key={id}
                  href={`/track/${id}`}
                  className="border-border bg-card shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 rounded-3xl border p-6 transition-colors hover:border-brand/50"
                >
                  <div>
                    <p className="text-foreground font-medium">{id}</p>
                    <p className="text-muted-foreground text-xs">
                      {typeof b.serviceType === "string" ? b.serviceType : ""} · {String(b.status ?? "")}
                    </p>
                  </div>
                  <span className="text-foreground text-sm font-bold">
                    {amt != null ? formatINR(amt) : "Refund due"}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

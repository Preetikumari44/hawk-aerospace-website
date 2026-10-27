"use client";

// Support orders picker — Super App SupportOrdersScreen parity: pick an
// order → open an order-scoped support chat (admin + MARKETPLACE ref).

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { fetchOrders, type ShopOrder } from "@/lib/booking/marketplace";
import { chatApi } from "@/lib/booking/role-apis";
import Link from "next/link";

export default function SupportOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [orders, setOrders] = React.useState<ShopOrder[] | null>(null);
  const [opening, setOpening] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetchOrders(50)
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function openChat(o: ShopOrder) {
    setOpening(o.id);
    try {
      const conv = (await chatApi.createConversation({
        participantUid: "admin",
        participantRole: "admin",
        type: "support",
        supportCategory: "marketplace",
        orderId: o.id,
      })) as Record<string, unknown>;
      const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? "");
      router.push(
        cid ? `/chat/${cid}?refId=${encodeURIComponent(o.id)}&refTitle=${encodeURIComponent("Order")}` : "/chat",
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
          <span className="eyebrow">Order Support</span>
          <Button size="lg" onClick={() => requestLogin("/support/orders")}>
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
          <h1 className="text-foreground text-3xl font-semibold sm:text-4xl">Which order needs help?</h1>
          {orders === null ? (
            <p className="text-muted-foreground text-sm">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          ) : (
            orders.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={opening === o.id}
                onClick={() => void openChat(o)}
                className="border-border bg-card shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 rounded-3xl border p-6 text-left transition-colors hover:border-brand/50"
              >
                <div>
                  <p className="text-foreground font-medium">{o.id}</p>
                  <p className="text-muted-foreground text-xs">
                    {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")} · {o.status}
                  </p>
                </div>
                <span className="text-brand text-xs font-semibold">
                  {opening === o.id ? "Opening…" : "Chat →"}
                </span>
              </button>
            ))
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

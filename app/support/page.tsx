"use client";

// Support center — Super App support parity: topic router (booking /
// account / marketplace / other), 10-type taxonomy picker, booking-linked
// complaint composer (type enum + relatedEntity BOOKING/GENERAL), history
// with tap-through to detail.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";
import {
  COMPLAINT_TYPES,
  normalizeComplaints,
  type BackendComplaintType,
  type ComplaintSummary,
} from "@/lib/booking/complaints";
import { complaintApi } from "@/lib/booking/role-apis";

function SupportInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [list, setList] = React.useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [topic, setTopic] = React.useState<"booking" | "account" | "marketplace" | "other">("booking");
  const [typeIndex, setTypeIndex] = React.useState(0);
  const [showTypes, setShowTypes] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [bookingId, setBookingId] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setList(normalizeComplaints(await complaintApi.my()));
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
    const preset = search.get("bookingId");
    if (preset) {
      setBookingId(preset);
      setTopic("booking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only.
  }, [isAuthenticated]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || sending) return;
    const selected: BackendComplaintType = COMPLAINT_TYPES[typeIndex]?.backend ?? "OTHER";
    setSending(true);
    setMsg(null);
    try {
      await complaintApi.create({
        type: selected,
        description: description.trim(),
        relatedEntityType: bookingId.trim() ? "BOOKING" : "GENERAL",
        ...(bookingId.trim() ? { relatedEntityId: bookingId.trim() } : {}),
      });
      setMsg("Complaint raised. Our team will respond shortly.");
      setDescription("");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not raise complaint.");
    } finally {
      setSending(false);
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
          <span className="eyebrow">Support</span>
          <p className="text-muted-foreground text-sm">Log in to raise and track complaints.</p>
          <Button size="lg" onClick={() => requestLogin("/support")}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

  const input =
    "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

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
            <span className="eyebrow">Support</span>
            <h1 className="text-3xl font-semibold sm:text-4xl">How can we help?</h1>
          </Reveal>

          {/* Topic router (SupportOptionsScreen parity) */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Support topic">
            {(
              [
                { key: "booking", label: "Booking" },
                { key: "account", label: "Account" },
                { key: "marketplace", label: "Marketplace" },
                { key: "other", label: "Other" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTopic(t.key)}
                aria-pressed={topic === t.key}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  topic === t.key
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {topic === "booking" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/support/bookings">Pick a booking → chat</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/my-bookings">My bookings</Link>
              </Button>
            </div>
          ) : null}
          {topic === "marketplace" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/support/orders">Pick an order → chat</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/marketplace/orders">My orders</Link>
              </Button>
            </div>
          ) : null}
          {topic === "account" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/account">Account settings</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/account/edit">Edit details</Link>
              </Button>
            </div>
          ) : null}

          <form onSubmit={submit} className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6">
            <h2 className="text-foreground font-semibold">New complaint</h2>
            <button
              type="button"
              onClick={() => setShowTypes((s) => !s)}
              className="border-input bg-card focus:border-brand focus:ring-ring flex h-12 w-full items-center justify-between rounded-xl border px-3.5 text-base focus:ring-2"
            >
              <span className="text-foreground">{COMPLAINT_TYPES[typeIndex]?.title}</span>
              <span className="text-muted-foreground">{showTypes ? "▲" : "▼"}</span>
            </button>
            {showTypes ? (
              <div className="border-border bg-card flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl border p-2 shadow-2xl">
                {COMPLAINT_TYPES.map((t, i) => (
                  <button
                    key={t.title}
                    type="button"
                    onClick={() => {
                      setTypeIndex(i);
                      setShowTypes(false);
                    }}
                    className={`rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent ${
                      i === typeIndex ? "bg-accent" : ""
                    }`}
                  >
                    <span className="text-foreground block text-sm font-semibold">{t.title}</span>
                    <span className="text-muted-foreground block text-xs">{t.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">{COMPLAINT_TYPES[typeIndex]?.desc}</p>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue…"
              rows={4}
              className={`${input} h-auto py-2`}
            />
            <input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Booking ID (if related to a booking)"
              className={input}
            />
            {msg ? <p className="text-muted-foreground text-sm">{msg}</p> : null}
            <Button type="submit" disabled={sending || !description.trim()}>
              {sending ? "Raising…" : "Submit"}
            </Button>
          </form>

          <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6">
            <h2 className="text-foreground font-semibold">Complaint history</h2>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground text-sm">No complaints yet.</p>
            ) : (
              list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/support/${c.id}`)}
                  className="border-border bg-card flex items-center justify-between rounded-2xl border p-3 text-left text-sm transition-colors hover:border-brand/50"
                >
                  <div>
                    <p className="text-foreground font-medium">{c.subject}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.type} · {c.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">{c.status}</span>
                </button>
              ))
            )}
          </div>

          <Button variant="outline" asChild className="w-fit">
            <Link href="/account">Back to My Roles</Link>
          </Button>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function SupportPage() {
  return (
    <React.Suspense
      fallback={
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

          <p className="text-muted-foreground text-sm">Loading…</p>
        </main>
      }
    >
      <SupportInner />
    </React.Suspense>
  );
}

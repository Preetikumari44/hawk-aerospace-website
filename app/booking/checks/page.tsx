"use client";

import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CloudSunIcon,
  Loader2Icon,
  OctagonAlertIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Reveal } from "@/components/ui/reveal";
import { customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { peekBookingIntent } from "@/lib/booking/resume";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Verdict = "GREEN" | "YELLOW" | "RED" | null;

function verdictOf(value: unknown): Verdict {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const raw =
    typeof o.status === "string"
      ? o.status
      : typeof o.verdict === "string"
        ? o.verdict
        : typeof o.overall === "string"
          ? o.overall
          : null;
  if (raw === "GREEN" || raw === "YELLOW" || raw === "RED") return raw;
  return null;
}

function summaryOf(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  for (const key of ["summary", "message", "reason", "details"]) {
    if (typeof o[key] === "string" && (o[key] as string).trim()) return o[key] as string;
  }
  return null;
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const styles: Record<string, string> = {
    GREEN: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    YELLOW: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    RED: "border-destructive/30 bg-destructive/10 text-destructive",
  };
  const Icon =
    verdict === "GREEN" ? CheckCircle2Icon : verdict === "YELLOW" ? TriangleAlertIcon : OctagonAlertIcon;
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase", styles[verdict ?? ""] ?? "border-border text-muted-foreground")}>
      {verdict ? <Icon className="size-3.5" /> : <Loader2Icon className="size-3.5 animate-spin" />}
      {verdict ?? "Checking…"}
    </span>
  );
}

export default function ChecksPage() {
  return (
    <React.Suspense
      fallback={
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
          <section className="px-4 pt-28 pb-16 sm:pt-36">
            <div className="max-w-container mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
              <p className="text-muted-foreground text-sm">Loading flight checks…</p>
            </div>
          </section>
          <Footer />
        </main>
      }
    >
      <ChecksContent />
    </React.Suspense>
  );
}

function ChecksContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, requestLogin, ensureBookingRole } = useBookingAuth();
  const bookingId = params.get("bookingId") ?? "";

  const [weather, setWeather] = React.useState<unknown>(null);
  const [restrictions, setRestrictions] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) requestLogin(`/booking/checks?bookingId=${encodeURIComponent(bookingId)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect once when unauthenticated.
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!bookingId || !isAuthenticated) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot flight-condition fetch against the external backend API; results arrive in async callbacks.
    setLoading(true);
    setError(null);

    const intent = peekBookingIntent();
    const draft = intent?.draft;

    async function run() {
      // Checks are customer-scoped server-side — any signed-in role may
      // view them (token is silently scoped to customer first).
      await ensureBookingRole().catch(() => false);
      if (cancelled) return;
      // Prefer booking-scoped endpoints (authoritative, server-computed).
      try {
        const [w, r] = await Promise.all([
          customerApi.getWeather(bookingId).catch(() => null),
          customerApi.getRestrictions(bookingId).catch(() => null),
        ]);
        if (cancelled) return;
        if (w || r) {
          setWeather(w);
          setRestrictions(r);
          setLoading(false);
          return;
        }
      } catch {
        /* fall through to coordinate-based checks */
      }
      // Coordinate-based fallback using the intent draft.
      try {
        const lat = draft?.coordinates?.lat;
        const lng = draft?.coordinates?.lng;
        if (lat == null || lng == null) {
          setError("Location coordinates are missing — showing booking without live checks.");
          setLoading(false);
          return;
        }
        const [w, r] = await Promise.all([
          customerApi.checkWeather({ latitude: lat, longitude: lng }).catch(() => null),
          customerApi
            .checkRestrictions({
              latitude: lat,
              longitude: lng,
              ...(draft?.service ? { serviceType: draft.service } : {}),
            })
            .catch(() => null),
        ]);
        if (!cancelled) {
          setWeather(w);
          setRestrictions(r);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Checks failed. You can still view your booking.");
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [bookingId, isAuthenticated]);

  const weatherVerdict = verdictOf(weather);
  const restrictionVerdict = verdictOf(restrictions);
  const worst: Verdict =
    weatherVerdict === "RED" || restrictionVerdict === "RED"
      ? "RED"
      : weatherVerdict === "YELLOW" || restrictionVerdict === "YELLOW"
        ? "YELLOW"
        : weatherVerdict === "GREEN" && restrictionVerdict === "GREEN"
          ? "GREEN"
          : weatherVerdict ?? restrictionVerdict;
  const canProceed = worst !== "RED";

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
        <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-8">
          <Reveal className="flex flex-col gap-3">
            <span className="eyebrow">Flight Checks</span>
            <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Weather & fly-zone checks.
            </h1>
            <p className="text-muted-foreground text-md font-medium">
              Booking {bookingId || "—"} · {loading ? "running checks…" : worst === "RED" ? "conditions look unfavourable" : "looking good"}
            </p>
          </Reveal>

          <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="flex flex-col gap-4">
            <motion.div variants={fadeUp} className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <CloudSunIcon className="text-brand size-4" />
                  Weather Forecast
                </span>
                <VerdictBadge verdict={loading ? null : weatherVerdict} />
              </div>
              {!loading && (
                <p className="text-muted-foreground text-xs">
                  {summaryOf(weather) ?? "Wind, gusts, precipitation, visibility and cloud cover evaluated for your slot."}
                </p>
              )}
            </motion.div>

            <motion.div variants={fadeUp} className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheckIcon className="text-brand size-4" />
                  Flying Restrictions
                </span>
                <VerdictBadge verdict={loading ? null : restrictionVerdict} />
              </div>
              {!loading && (
                <p className="text-muted-foreground text-xs">
                  {summaryOf(restrictions) ?? "Airspace zones and no-fly buffers checked along your site."}
                </p>
              )}
            </motion.div>

            {error && <motion.p variants={fadeUp} className="text-muted-foreground text-xs">{error}</motion.p>}

            {!loading && worst === "RED" && (
              <motion.div variants={fadeUp} className="border-destructive/30 bg-destructive/10 flex flex-col gap-2 rounded-3xl border p-5">
                <p className="text-foreground text-sm font-semibold">Conditions aren&apos;t safe for this slot.</p>
                <p className="text-muted-foreground text-xs">
                  Your booking is saved and stays pending — pick another date or time slot to fly
                  safely.
                </p>
              </motion.div>
            )}

            {!loading && worst === "YELLOW" && (
              <motion.div variants={fadeUp} className="border-amber-400/30 bg-amber-400/10 flex flex-col gap-2 rounded-3xl border p-5">
                <p className="text-foreground text-sm font-semibold">Flyable with caution.</p>
                <p className="text-muted-foreground text-xs">
                  Some factors need a go/no-go call on the day. You can proceed — the operations
                  team will confirm before takeoff.
                </p>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
              {worst === "RED" ? (
                <Button size="lg" variant="outline" onClick={() => router.push("/#booking")} className="flex-1">
                  Choose Another Slot
                </Button>
              ) : null}
              <Button
                size="lg"
                onClick={() => router.push("/my-bookings")}
                disabled={loading || !canProceed}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Running Checks…
                  </>
                ) : (
                  <>
                    View My Bookings
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

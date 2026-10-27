"use client";

// Application status — web parity of ApplicationStatusScreen: polls
// GET /role-applications/my?role= + shows pending/approved/rejected with
// reason, and offers one-tap switch once approved.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { roleApplicationsApi } from "@/lib/booking/role-apis";
import { normalizeBackendRole, normalizeFrontendRole, ROLE_APPLICATION_CONFIG, ROLE_META } from "@/lib/booking/roles";

export default function ApplicationStatusPage() {
  return (
    <React.Suspense fallback={<StatusFallback />}>
      <StatusInner />
    </React.Suspense>
  );
}

function StatusFallback() {
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

      <p className="text-muted-foreground text-sm">Loading…</p>
    </main>
  );
}

function StatusInner() {
  const search = useSearchParams();
  const role = String(search.get("role") ?? "").toLowerCase();
  const fresh = search.get("fresh") === "1";
  const { isAuthenticated, requestLogin, switchRole, refreshUser } = useBookingAuth();
  const [state, setState] = React.useState<{ status: string; reason?: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [switching, setSwitching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const config = ROLE_APPLICATION_CONFIG[role];

  React.useEffect(() => {
    if (!isAuthenticated || !role) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    async function poll() {
      try {
        const app = (await roleApplicationsApi.getMyApplicationForRole(role)) as {
          status?: string;
          reason?: string;
          reviewReason?: string;
        } | null;
        if (!cancelled) {
          setState({
            status: String(app?.status ?? "none"),
            reason: (app?.reason ?? app?.reviewReason ?? undefined) as string | undefined,
          });
          setLoading(false);
          if (String(app?.status ?? "").toLowerCase() === "approved") {
            await refreshUser();
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    void poll();
    timer = setInterval(() => void poll(), 10000);
    // Live approval push (Super App role-application:updated parity):
    // approved → refresh + auto-switch to the new dashboard.
    let off: (() => void) | null = null;
    void import("@/lib/booking/socket").then((mod) => {
      if (cancelled) return;
      const s = mod.connectSocket();
      if (!s) return;
      const onUpdate = (payload: unknown) => {
        const p = (payload ?? {}) as Record<string, unknown>;
        const statusNow = String(p.status ?? p.newStatus ?? "").toLowerCase();
        const payloadRole =
          normalizeFrontendRole(p.role ?? p.targetRole ?? p.backendRole ?? "") ||
          normalizeFrontendRole(normalizeBackendRole(role));
        if (payloadRole && payloadRole !== normalizeFrontendRole(normalizeBackendRole(role))) return;
        if (statusNow === "approved") {
          void (async () => {
            await refreshUser().catch(() => undefined);
            if (cancelled) return;
            setSwitching(true);
            switchRole(role as keyof typeof ROLE_META).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Switch failed.");
              setSwitching(false);
            });
          })();
        } else if (statusNow === "rejected") {
          void poll();
        }
      };
      s.on("role-application:updated", onUpdate);
      s.on("role-application:submitted", onUpdate);
      off = () => {
        s.off("role-application:updated", onUpdate);
        s.off("role-application:submitted", onUpdate);
      };
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      off?.();
    };
  }, [isAuthenticated, role, refreshUser]);

  if (!config) {
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
          <span className="eyebrow">Application status</span>
          <p className="text-muted-foreground text-sm">Missing ?role=pilot|sales|fleet|technician.</p>
          <Button asChild>
            <Link href="/account">My Roles</Link>
          </Button>
        </div>
      </main>
    );
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
          <span className="eyebrow">{config.title}</span>
          <Button size="lg" onClick={() => requestLogin(`/application-status?role=${role}`)}>
            Log In to Check Status
          </Button>
        </div>
      </main>
    );
  }

  const status = String(state?.status ?? "none").toLowerCase();

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
        <div className="max-w-container mx-auto flex max-w-xl flex-col gap-6">
          <span className="eyebrow">{config.title} · Application</span>
          <h1 className="text-3xl font-semibold sm:text-4xl">Application Status</h1>
          {fresh && status !== "rejected" ? (
            <p className="text-muted-foreground text-sm">{config.successSubtitle}.</p>
          ) : null}
          {loading ? (
            <p className="text-muted-foreground text-sm">Checking status…</p>
          ) : status === "approved" ? (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6">
              <p className="text-emerald-500 text-sm font-semibold">Approved — welcome aboard!</p>
              <p className="text-muted-foreground text-sm">
                Your {config.title} access is active. Switch now to open your dashboard.
              </p>
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
              <Button
                size="lg"
                disabled={switching}
                onClick={() => {
                  setSwitching(true);
                  setError(null);
                  switchRole(role as keyof typeof ROLE_META).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Switch failed.");
                    setSwitching(false);
                  });
                }}
              >
                {switching ? "Switching…" : `Switch to ${config.title}`}
              </Button>
            </div>
          ) : status === "rejected" ? (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6">
              <p className="text-destructive text-sm font-semibold">Not approved yet</p>
              {state?.reason ? (
                <p className="text-muted-foreground text-sm">Reason: {state.reason}</p>
              ) : null}
              <Button asChild>
                <Link href={`/apply/${role}`}>Re-apply</Link>
              </Button>
            </div>
          ) : status === "pending" ? (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6">
              <p className="text-amber-500 text-sm font-semibold">Under review</p>
              <p className="text-muted-foreground text-sm">
                An admin is reviewing your {config.title} application. This page refreshes
                automatically — approval switches you over instantly.
              </p>
            </div>
          ) : (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6">
              <p className="text-muted-foreground text-sm">No application found for this role yet.</p>
              <Button asChild>
                <Link href={`/apply/${role}`}>Apply now</Link>
              </Button>
            </div>
          )}
          <Button variant="outline" asChild className="w-fit">
            <Link href="/account">Back to My Roles</Link>
          </Button>
        </div>
      </section>
      <Footer />
    </main>
  );
}

"use client";

// Accounts hub — web parity of User_Frontend/src/commonScreens/AccountsScreen:
// shows current role, approved roles to switch between (POST /auth/switch-role),
// and apply/status entry points for the rest (GET /role-applications/my).

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { AccountPreferences } from "@/components/booking/account-preferences";
import { AccountProfileCard } from "@/components/booking/account-profile-card";
import { DeleteAccount } from "@/components/booking/delete-account";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { roleApplicationsApi } from "@/lib/booking/role-apis";
import {
  APPLICATION_ROLES,
  approvedFrontendRoles,
  type FrontendRole,
  primaryFrontendRole,
  ROLE_APPLICATION_CONFIG,
  ROLE_META,
} from "@/lib/booking/roles";

type AppStatus = "none" | "pending" | "approved" | "rejected";

export default function AccountPage() {
  const router = useRouter();
  const { backendUser, user, isAuthenticated, requestLogin, switchRole, logout, refreshUser } =
    useBookingAuth();
  const [statuses, setStatuses] = React.useState<Record<string, { status: AppStatus; reason?: string }>>(
    {},
  );
  const [switching, setSwitching] = React.useState<FrontendRole | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) void refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once on mount.
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, { status: AppStatus; reason?: string }> = {};
      await Promise.all(
        APPLICATION_ROLES.map(async (r) => {
          try {
            const app = (await roleApplicationsApi.getMyApplicationForRole(r)) as {
              status?: string;
              reason?: string;
              reviewReason?: string;
            } | null;
            const s = String(app?.status ?? "none").toLowerCase();
            next[r] = {
              status: s === "approved" ? "approved" : s === "rejected" ? "rejected" : s === "pending" ? "pending" : "none",
              reason: (app?.reason ?? app?.reviewReason ?? undefined) as string | undefined,
            };
          } catch {
            next[r] = { status: "none" };
          }
        }),
      );
      if (!cancelled) setStatuses(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, backendUser]);

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
          <span className="eyebrow">My Roles</span>
          <p className="text-muted-foreground text-sm">Log in to manage your roles.</p>
          <Button size="lg" onClick={() => requestLogin("/account")}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

  const current = primaryFrontendRole(backendUser);
  const approved = approvedFrontendRoles(backendUser);

  async function handleSwitch(role: FrontendRole) {
    if (role === current) return;
    setError(null);
    setSwitching(role);
    try {
      await switchRole(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role switch failed.");
      setSwitching(null);
    }
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
        <div className="max-w-container mx-auto flex max-w-3xl flex-col gap-8">
          <Reveal className="flex flex-col gap-3">
            <span className="eyebrow">My Roles</span>
            <h1 className="text-3xl font-semibold sm:text-4xl">Accounts</h1>
            <p className="text-muted-foreground text-sm">
              Signed in as {user?.phone ?? backendUser?.phone ?? "unknown"} · current role:{" "}
              {ROLE_META[current]?.label ?? current}
            </p>
          </Reveal>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <AccountProfileCard />

          <AccountPreferences />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(Object.keys(ROLE_META) as FrontendRole[])
              .filter((r) => r !== "admin")
              .map((role) => {
                const isCurrent = role === current;
                const isApproved = approved.includes(role);
                const st = statuses[role]?.status ?? "none";
                return (
                  <div
                    key={role}
                    className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-semibold">{ROLE_META[role].label}</span>
                      {isCurrent ? (
                        <span className="text-brand text-xs font-semibold tracking-widest uppercase">
                          Current
                        </span>
                      ) : isApproved ? (
                        <span className="text-xs text-emerald-500 font-semibold">Approved</span>
                      ) : st === "pending" ? (
                        <span className="text-xs text-amber-500 font-semibold">Pending</span>
                      ) : st === "rejected" ? (
                        <span className="text-destructive text-xs font-semibold">Rejected</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not applied</span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Dashboard: {ROLE_META[role].dashboard}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {isCurrent ? (
                        <Button variant="outline" asChild>
                          <Link href={ROLE_META[role].dashboard}>Open dashboard</Link>
                        </Button>
                      ) : isApproved ? (
                        <Button disabled={switching === role} onClick={() => void handleSwitch(role)}>
                          {switching === role ? "Switching…" : `Switch to ${ROLE_META[role].label}`}
                        </Button>
                      ) : st === "pending" || st === "rejected" ? (
                        <Button variant="outline" asChild>
                          <Link href={`/application-status?role=${role}`}>Check status</Link>
                        </Button>
                      ) : (
                        <Button variant="outline" asChild>
                          <Link href={`/apply/${role}`}>
                            Apply for {ROLE_META[role].label}
                          </Link>
                        </Button>
                      )}
                    </div>
                    {role !== "customer" && ROLE_APPLICATION_CONFIG[role] ? (
                      <p className="text-muted-foreground text-[11px]">
                        {ROLE_APPLICATION_CONFIG[role].description}
                      </p>
                    ) : null}
                  </div>
                );
              })}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/account/refunds">Refunds</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/chat">Chat</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">Support</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/refer">Refer & Earn</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                router.replace("/");
              }}
            >
              Log out
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>

          <DeleteAccount />
        </div>
      </section>
      <Footer />
    </main>
  );
}

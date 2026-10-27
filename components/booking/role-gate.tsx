"use client";

// Role gate for dashboards — mirrors the Super App's renderScreen switch:
// unauthenticated -> login gate; authenticated but role not approved ->
// apply/status prompt; approved -> children. Customer is always allowed.

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { approvedFrontendRoles, type FrontendRole,ROLE_META } from "@/lib/booking/roles";
import { DashboardBackBlock } from "@/lib/booking/use-dashboard-back-block";

export function RoleGate({
  role,
  children,
  title,
  subtitle,
}: {
  role: FrontendRole;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { user, backendUser, isAuthenticated, requestLogin } = useBookingAuth();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Wait one tick for localStorage hydration so we don't flash the gate.
    const t = window.setTimeout(() => setReady(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="bg-background text-foreground flex min-h-screen w-full items-center justify-center px-4">
        <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
          <span className="eyebrow">{title}</span>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
          <p className="text-muted-foreground text-sm">
            Log in to access your {ROLE_META[role]?.label ?? role} dashboard.
          </p>
          <Button size="lg" onClick={() => requestLogin(window.location.pathname)}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

  const approved = approvedFrontendRoles(backendUser);
  const allowed = role === "customer" || approved.includes(role);

  if (!allowed) {
    return (
      <main className="bg-background text-foreground flex min-h-screen w-full items-center justify-center px-4">
        <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
          <span className="eyebrow">Access required</span>
          <p className="text-foreground text-lg font-semibold">
            You don&apos;t have access to the {ROLE_META[role]?.label} dashboard yet.
          </p>
          <p className="text-muted-foreground text-sm">
            Apply for the role — approval lands you here automatically, exactly like the Super App.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href={`/apply/${role}`}>Apply for {ROLE_META[role]?.label}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/account">My Roles</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Signed in as {user?.phone ?? "unknown"} · role: {ROLE_META[role]?.label}
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <DashboardBackBlock enabled />
      {children}
    </>
  );
}

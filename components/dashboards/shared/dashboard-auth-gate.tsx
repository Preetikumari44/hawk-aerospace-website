"use client";

import Link from "next/link";
import * as React from "react";

import HawkLogo from "@/components/logos/hawk";
import { Button } from "@/components/ui/button";
import { useBookingAuth } from "@/lib/booking/auth-context";

// The same login gate as components/workspace/workspace-shell.tsx (§23 —
// reuse the existing auth infrastructure), but WITHOUT that shell's own
// sidebar/top bar: each supplied dashboard (Pilot, Fleet Manager, Technician,
// Sales Aggregator) already ships its own header/sidebar and must not get a
// second one stacked on top of it (§14).
//
// NOTE: this intentionally checks ONLY `isAuthenticated`, not the signed-in
// account's own role. During this platform-integration phase, selecting a
// workspace from the 9-dot Role Switch and confirming IS the authorization
// for opening it — a signed-in Customer account must be able to open Pilot /
// Fleet Manager / Technician / Sales Aggregator this way without holding a
// separate account of that type. See the "Role Access + Customer Header"
// integration fix, §2/§18/§19: authentication and active workspace are two
// different things, and the account's fixed `role` is not used to block the
// explicitly-confirmed switch. `requiredRole` is accepted for future use
// (e.g. a later phase with real per-role accounts) but no longer enforced
// here.
export function DashboardAuthGate({
  workspace,
  returnTo,
  children,
}: {
  workspace: string;
  requiredRole?: string;
  returnTo: string;
  children: React.ReactNode;
}) {
  const { isAuthenticated, isReady, requestLogin } = useBookingAuth();

  // Session not read yet (first client render): neither dashboard content nor
  // the sign-in prompt — avoids flashing either one.
  if (!isReady) return <DashboardLoading workspace={workspace} />;

  if (!isAuthenticated) {
    return (
      <main className="hawk-theme hawk-forest hawk-contours flex min-h-screen w-full items-center justify-center px-4 text-white">
        <div className="border-border bg-card w-full max-w-md rounded-2xl border p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mb-5 flex items-center justify-center gap-2">
            <HawkLogo className="text-brand" />
            <span className="text-lg font-bold">Hawk Aerospace</span>
          </div>
          <h1 className="text-xl font-semibold">{workspace} workspace</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to your Hawk Aerospace account to open this workspace.
          </p>
          <Button size="lg" className="mt-6 h-12 w-full text-base" onClick={() => requestLogin(returnTo)}>
            Log In
          </Button>
          <Button variant="ghost" className="mt-2 h-11 w-full" asChild>
            <Link href="/">Back to homepage</Link>
          </Button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

// Generic full-screen loading state shown while a dashboard's client-only
// bundle (react-native-web, etc.) loads in the browser.
export function DashboardLoading({ workspace }: { workspace: string }) {
  return (
    <main className="hawk-theme hawk-forest flex min-h-screen w-full items-center justify-center px-4 text-white">
      <p className="text-sm">Loading {workspace} workspace…</p>
    </main>
  );
}


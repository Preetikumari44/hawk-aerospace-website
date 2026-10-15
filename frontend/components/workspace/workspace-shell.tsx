"use client";

import { LayoutDashboardIcon, LogOutIcon, PlaneTakeoffIcon, RadioTowerIcon, SquareStackIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { DashboardLoading } from "@/components/dashboards/shared/dashboard-auth-gate";
import Navbar from "@/components/homepage/navbar/default";
import HawkLogo from "@/components/logos/hawk";
import { Button } from "@/components/ui/button";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { cn } from "@/lib/utils";

// Nav items cross the Server → Client boundary (workspace pages such as
// app/my-bookings/page.tsx are Server Components, this shell is a Client
// Component). Only plain, serializable data may cross that boundary — a
// React component reference (the old `icon: LucideIcon` field) is a function
// and triggers "Only plain objects can be passed to Client Components from
// Server Components." So `icon` is a string key here, and the lookup into an
// actual icon component happens ONLY inside this client file, never in a
// server-rendered page.
const WORKSPACE_NAV_ICONS = {
  dashboard: LayoutDashboardIcon,
  bookings: SquareStackIcon,
  "book-a-raider": PlaneTakeoffIcon,
  operations: RadioTowerIcon,
} as const;

export type WorkspaceNavIcon = keyof typeof WORKSPACE_NAV_ICONS;

// Shared chrome for every authenticated workspace: deep-emerald sidebar,
// forest top bar, sage working area. Operational rather than marketing — it
// reuses the existing auth context and the 9-dot launcher, and adds no data
// of its own.
//
// The top bar is the SAME common Hawk Aerospace Header used on the Front
// Page (components/homepage/navbar/default.tsx) — Solutions / Technology /
// Platforms / Marketplace / 9-dot Role Switch — rather than a second,
// workspace-only header. See the "Role Access + Customer Header" integration
// fix §7/§11/§14: reuse the existing Header component, don't build a new one,
// and never a Customer-only Header alongside a Pilot-only Header etc.
//
// `requiredRole` is accepted for future use but no longer gates rendering —
// see components/dashboards/shared/dashboard-auth-gate.tsx for why: the
// 9-dot switch + its confirmation dialog IS the authorization for opening a
// workspace during this integration phase, not the signed-in account's own
// fixed role.

export interface WorkspaceNavItem {
  label: string;
  href: string;
  icon: WorkspaceNavIcon;
}

interface WorkspaceShellProps {
  /** Workspace name shown in the sidebar. */
  workspace: string;
  /** Accepted for future use; no longer enforced (see above). */
  requiredRole?: string;
  nav: WorkspaceNavItem[];
  /** Where to return after logging in. */
  returnTo: string;
  children: React.ReactNode;
}

export function WorkspaceShell({ workspace, nav, returnTo, children }: WorkspaceShellProps) {
  const { isAuthenticated, isReady, signOut, requestLogin } = useBookingAuth();
  const pathname = usePathname();

  // Protected workspace — never render the dashboard chrome to a signed-out
  // visitor (§10).
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

  return (
    <>
      <Navbar />
      <div className="hawk-theme hawk-sage text-foreground flex min-h-screen w-full pt-16 sm:pt-18">
        {/* Sidebar — desktop */}
        <aside className="hawk-emerald hidden w-[248px] shrink-0 flex-col border-r border-white/10 lg:flex">
          <div className="flex h-18 items-center gap-2 border-b border-white/10 px-5">
            <HawkLogo className="text-brand" />
            <span className="text-sm font-bold text-white">Hawk Aerospace</span>
          </div>
          <nav aria-label={`${workspace} workspace`} className="flex flex-1 flex-col gap-1 p-3">
            <span className="text-muted-foreground px-3 py-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
              {workspace}
            </span>
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = WORKSPACE_NAV_ICONS[item.icon];
              return (
                <a
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-ring flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  {item.label}
                </a>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-3">
            <Button
              variant="ghost"
              onClick={signOut}
              className="h-11 w-full justify-start gap-3 text-[15px] hover:bg-white/10"
            >
              <LogOutIcon className="size-[18px]" />
              Log out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile / tablet nav — horizontal scroll, no hidden controls.
              Workspace-specific (Dashboard/My Bookings/...), distinct from
              the site-wide Navbar above it — sidebar's equivalent on small
              screens, not a second platform header. */}
          <nav
            aria-label={`${workspace} workspace`}
            className="hawk-forest flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 lg:hidden"
          >
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = WORKSPACE_NAV_ICONS[item.icon];
              return (
                <a
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-[#cfe2d3] hover:bg-white/10",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <main className="hawk-contours min-w-0 flex-1 px-4 py-6 text-[color:var(--brand)] sm:px-6 sm:py-8">
            <div className="text-foreground mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}

"use client";

// Unified dashboard shell — one design system for every role (per owner
// decision: unify, not pixel-preserve). Teammate layouts (fleet sidebar,
// sales DashboardLayout, technician mirror, pilot RN-Web) informed the
// information architecture; this shell gives them one Navbar + tab bar +
// role switcher + back-block.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { approvedFrontendRoles, type FrontendRole,ROLE_META } from "@/lib/booking/roles";
import { cn } from "@/lib/utils";

export interface DashboardTab {
  key: string;
  label: string;
  href: string;
}

export function DashboardShell({
  role,
  eyebrow,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
}: {
  role: FrontendRole;
  eyebrow: string;
  title: string;
  subtitle?: string;
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { backendUser, user, logout, switchRole } = useBookingAuth();
  const [switchOpen, setSwitchOpen] = React.useState(false);
  const approved = approvedFrontendRoles(backendUser);

  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <section className="px-4 pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-container mx-auto flex flex-col gap-6">
          <Reveal className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex max-w-[640px] flex-col gap-2">
                <span className="eyebrow">{eyebrow}</span>
                <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">{title}</h1>
                {subtitle ? (
                  <p className="text-muted-foreground text-md font-medium">{subtitle}</p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  {ROLE_META[role]?.label} · {user?.phone ?? backendUser?.phone ?? ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {actions}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setSwitchOpen((o) => !o)}>
                    Switch role
                  </Button>
                  {switchOpen ? (
                    <div className="border-border/60 bg-background absolute right-0 z-30 mt-2 flex w-52 flex-col gap-1 rounded-xl border p-2 shadow-xl">
                      {approved.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setSwitchOpen(false);
                            if (r !== role) void switchRole(r);
                            else router.push(ROLE_META[r].dashboard);
                          }}
                          className={cn(
                            "rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5",
                            r === role && "text-brand font-semibold",
                          )}
                        >
                          {ROLE_META[r].label}
                          {r === role ? " · current" : ""}
                        </button>
                      ))}
                      <Link
                        href="/account"
                        onClick={() => setSwitchOpen(false)}
                        className="text-muted-foreground rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                      >
                        My Roles…
                      </Link>
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    router.replace("/");
                  }}
                >
                  Log out
                </Button>
              </div>
            </div>
          </Reveal>

          <nav className="border-border/60 glass-1 flex gap-1 overflow-x-auto rounded-xl border p-1">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                onClick={(e) => {
                  // Same-page tabs switch client-side without a full nav.
                  if (pathname === t.href || t.href.startsWith("#")) {
                    e.preventDefault();
                    onTabChange(t.key);
                  }
                }}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === t.key
                    ? "bg-brand text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {children}
        </div>
      </section>
      <Footer />
    </main>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-border/60 glass-2 rounded-2xl border p-5">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">{label}</p>
      <p className="text-foreground mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="border-border/60 glass-1 flex flex-col items-center gap-3 rounded-2xl border p-8 text-center">
      <p className="text-foreground font-semibold">{title}</p>
      {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border-destructive/40 flex flex-col items-center gap-3 rounded-2xl border p-8 text-center">
      <p className="text-destructive text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

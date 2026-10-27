"use client";

// Pilot workspace section — single-navbar chrome (WorkspaceShell, same as
// /my-bookings) + RoleGate + backend-first provider. No custom PilotShell:
// every page uses the ONE navbar without fail.

import * as React from "react";

import { RoleGate } from "@/components/booking/role-gate";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/workspace/workspace-shell";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { PilotProvider } from "@/lib/pilot/data";

const NAV: WorkspaceNavItem[] = [
  { label: "Dashboard", href: "/pilot", icon: "dashboard" },
  { label: "Missions", href: "/pilot/missions", icon: "bookings" },
  { label: "Earnings", href: "/pilot/earnings", icon: "operations" },
  { label: "Book a Raider", href: "/#booking", icon: "book-a-raider" },
];

export default function PilotSection({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="pilot" title="Pilot Dashboard" subtitle="Log in with your Pilot account.">
      <PilotAuthed>{children}</PilotAuthed>
    </RoleGate>
  );
}

function PilotAuthed({ children }: { children: React.ReactNode }) {
  const { backendUser, user } = useBookingAuth();
  const session = React.useMemo(
    () => ({
      name: (backendUser?.name as string | undefined) || "Pilot",
      phone: (backendUser?.phone as string | undefined) ?? user?.phone ?? "",
      email: (backendUser?.email as string | undefined) || "",
    }),
    [backendUser, user?.phone],
  );
  return (
    <PilotProvider session={session}>
      <WorkspaceShell workspace="Pilot" requiredRole="pilot" nav={NAV} returnTo="/pilot">
        {children}
      </WorkspaceShell>
    </PilotProvider>
  );
}

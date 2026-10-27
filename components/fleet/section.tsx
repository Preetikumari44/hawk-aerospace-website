"use client";

// Fleet workspace section — single-navbar chrome (WorkspaceShell, same as
// /my-bookings) + RoleGate + backend-first data provider. No custom FleetShell.

import * as React from "react";

import { RoleGate } from "@/components/booking/role-gate";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/workspace/workspace-shell";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { FleetDataProvider } from "@/lib/fleet/data";
import { mockFleetUser } from "@/lib/fleet/mock";
import type { FleetUser } from "@/lib/fleet/types";

const NAV: WorkspaceNavItem[] = [
  { label: "Dashboard", href: "/fleet/dashboard", icon: "dashboard" },
  { label: "Bookings", href: "/fleet/bookings", icon: "bookings" },
  { label: "Earnings", href: "/fleet/earnings", icon: "operations" },
  { label: "Book a Raider", href: "/#booking", icon: "book-a-raider" },
];

export default function FleetSection({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="fleet" title="Fleet Manager Dashboard" subtitle="Log in with your Fleet Manager account.">
      <FleetAuthed>{children}</FleetAuthed>
    </RoleGate>
  );
}

function FleetAuthed({ children }: { children: React.ReactNode }) {
  const { backendUser, user } = useBookingAuth();
  const sessionUser: FleetUser = React.useMemo(
    () => ({
      name: (backendUser?.name as string | undefined) || mockFleetUser.name,
      phone: (backendUser?.phone as string | undefined) ?? user?.phone ?? mockFleetUser.phone,
      email: (backendUser?.email as string | undefined) || mockFleetUser.email,
      role: "Fleet Manager",
      id: (backendUser?.uid as string | undefined) || mockFleetUser.id,
      address: (backendUser?.address as string | undefined) || mockFleetUser.address,
    }),
    [backendUser, user?.phone],
  );
  return (
    <FleetDataProvider sessionUser={sessionUser}>
      <WorkspaceShell workspace="Fleet Manager" requiredRole="fleet" nav={NAV} returnTo="/fleet/dashboard">
        {children}
      </WorkspaceShell>
    </FleetDataProvider>
  );
}

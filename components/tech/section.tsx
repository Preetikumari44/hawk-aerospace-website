"use client";

// Technician workspace section — single-navbar chrome (WorkspaceShell, same as
// /my-bookings) + RoleGate + backend-first provider. No custom TechShell.

import * as React from "react";

import { RoleGate } from "@/components/booking/role-gate";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/workspace/workspace-shell";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { TechProvider } from "@/lib/tech/data";
import type { TechProfile } from "@/lib/tech/types";

const NAV: WorkspaceNavItem[] = [
  { label: "Dashboard", href: "/technician/dashboard", icon: "dashboard" },
  { label: "Jobs", href: "/technician/jobs", icon: "bookings" },
  { label: "Earnings", href: "/technician/earnings", icon: "operations" },
  { label: "Book a Raider", href: "/#booking", icon: "book-a-raider" },
];

export default function TechSection({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="technician" title="Technician Dashboard" subtitle="Log in with your Technician account.">
      <TechAuthed>{children}</TechAuthed>
    </RoleGate>
  );
}

function TechAuthed({ children }: { children: React.ReactNode }) {
  const { backendUser, user } = useBookingAuth();
  const profile: TechProfile = React.useMemo(
    () => ({
      name: (backendUser?.name as string | undefined) || "Technician",
      phone: (backendUser?.phone as string | undefined) ?? user?.phone ?? "",
      email: (backendUser?.email as string | undefined) || "",
      role: "Technician",
      id: (backendUser?.uid as string | undefined) || "",
      address: (backendUser?.address as string | undefined) || "Address unavailable",
      rating: "0.0 (0)",
      status: "Active",
      statusDescription: "You are Active Full Day",
    }),
    [backendUser, user?.phone],
  );
  return (
    <TechProvider sessionProfile={profile}>
      <WorkspaceShell workspace="Technician" requiredRole="technician" nav={NAV} returnTo="/technician/dashboard">
        {children}
      </WorkspaceShell>
    </TechProvider>
  );
}

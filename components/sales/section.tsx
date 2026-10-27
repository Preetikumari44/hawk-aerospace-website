'use client';

// Sales workspace section — single-navbar chrome (WorkspaceShell, same as
// /my-bookings) + RoleGate + providers. No custom DashboardLayout.

import type { ReactNode } from 'react';
import { RoleGate } from '@/components/booking/role-gate';
import { WorkspaceShell, type WorkspaceNavItem } from '@/components/workspace/workspace-shell';
import SalesProviders from '@/components/sales/SalesProviders';

const NAV: WorkspaceNavItem[] = [
  { label: "Dashboard", href: "/sales/dashboard", icon: "dashboard" },
  { label: "Bookings", href: "/sales/bookings", icon: "bookings" },
  { label: "Commission", href: "/sales/commission", icon: "operations" },
  { label: "Book a Raider", href: "/#booking", icon: "book-a-raider" },
];

export default function SalesSection({ children }: { children: ReactNode }) {
  return (
    <RoleGate role="sales" title="Sales Aggregator Dashboard" subtitle="Log in with your Sales Aggregator account.">
      <SalesProviders>
        <WorkspaceShell workspace="Sales Aggregator" requiredRole="sales" nav={NAV} returnTo="/sales/dashboard">
          {children}
        </WorkspaceShell>
      </SalesProviders>
    </RoleGate>
  );
}

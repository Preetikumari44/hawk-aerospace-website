import type { Metadata } from "next";

import { MyBookingsList } from "@/components/booking/my-bookings-list";
import { CustomerWelcome } from "@/components/workspace/customer-welcome";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/workspace/workspace-shell";

export const metadata: Metadata = {
  title: { absolute: "Customer Workspace | Hawk Aerospace" },
  description: "Book, manage and track your Hawk Aerospace aerial operations.",
};

// Customer workspace. The route is unchanged (/my-bookings) so every existing
// link, login redirect and booking-resume path keeps working — only the
// presentation became a proper dashboard. Every nav entry points at a route
// that already exists; nothing here fabricates a destination.
//
// This page is a Server Component (it exports `metadata`), so `icon` below
// is a plain string key — never a lucide-react component reference — because
// only serializable data may cross from a Server Component into the
// WorkspaceShell Client Component. WorkspaceShell maps the key to the actual
// icon internally.
const NAV: WorkspaceNavItem[] = [
  { label: "Dashboard", href: "/my-bookings", icon: "dashboard" },
  { label: "My Bookings", href: "/my-bookings#bookings", icon: "bookings" },
  { label: "Book a Raider", href: "/#booking", icon: "book-a-raider" },
  { label: "Track Operations", href: "/my-bookings#bookings", icon: "operations" },
];

export default function CustomerWorkspacePage() {
  return (
    <WorkspaceShell workspace="Customer" requiredRole="customer" nav={NAV} returnTo="/my-bookings">
      <div className="flex flex-col gap-7">
        <CustomerWelcome />

        <section id="bookings" aria-labelledby="bookings-title" className="flex flex-col gap-3">
          <h2 id="bookings-title" className="text-foreground text-lg font-semibold">
            Your bookings
          </h2>
          <MyBookingsList />
        </section>
      </div>
    </WorkspaceShell>
  );
}

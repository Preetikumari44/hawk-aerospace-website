"use client";

import { motion } from "framer-motion";
import { CalendarIcon, MapPinIcon, PlaneTakeoffIcon, RadioTowerIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { getBookingsForUser } from "@/lib/booking/store";
import type { Booking, BookingStatus } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { BookingStatusTimeline } from "./booking-status-timeline";

// Live tracking is available immediately after a booking is created — it
// runs on its own simulated dispatch clock, independent of the actual
// admin-approval status shown by BookingStatusTimeline below. Only a
// cancelled booking has nothing to track.
const TRACKABLE_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "pilot-assigned",
  "in-progress",
  "completed",
];

// Status colours carry a text label too, so status is never communicated by
// colour alone. Shades are chosen for contrast on the light workspace surface.
const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: "border-amber-600/35 bg-amber-500/15 text-amber-800",
  confirmed: "border-brand/45 bg-brand/12 text-brand",
  "pilot-assigned": "border-violet-600/35 bg-violet-500/12 text-violet-800",
  "in-progress": "border-emerald-700/35 bg-emerald-600/15 text-emerald-800",
  completed: "border-emerald-700/35 bg-emerald-600/15 text-emerald-800",
  cancelled: "border-destructive/35 bg-destructive/10 text-destructive",
};

// Customer bookings tabs — Active / Upcoming / Completed — grouped from the
// existing booking lifecycle (BookingStatus) already returned by the
// backend/store. No new status values are introduced.
type BookingTab = "active" | "upcoming" | "completed";

const TAB_STATUSES: Record<BookingTab, BookingStatus[]> = {
  active: ["confirmed", "pilot-assigned", "in-progress"],
  upcoming: ["pending"],
  completed: ["completed", "cancelled"],
};

const TABS: { key: BookingTab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

export function MyBookingsList() {
  const { user, isAuthenticated, requestLogin } = useBookingAuth();
  const [bookings, setBookings] = React.useState<Booking[] | null>(null);
  const [activeTab, setActiveTab] = React.useState<BookingTab>("active");

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, which is only available client-side post-mount.
    setBookings(isAuthenticated && user ? getBookingsForUser(user.id) : null);
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="border-border/70 bg-card mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center shadow-sm">
        <p className="text-muted-foreground text-sm">
          Log in to view the bookings tied to your account.
        </p>
        <Button size="lg" onClick={() => requestLogin("/my-bookings")}>
          Log In
        </Button>
      </div>
    );
  }

  if (!bookings) return null;

  if (bookings.length === 0) {
    return (
      <div className="border-border/70 bg-card mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center shadow-sm">
        <p className="text-muted-foreground text-sm">
          You don&apos;t have any bookings yet. Start one from the Live Drone Booking panel on
          the homepage.
        </p>
        <Button size="lg" variant="outline" asChild>
          <Link href="/#booking">Book a Flight</Link>
        </Button>
      </div>
    );
  }

  const tabCounts = TABS.reduce<Record<BookingTab, number>>(
    (acc, tab) => {
      acc[tab.key] = bookings.filter((b) => TAB_STATUSES[tab.key].includes(b.status)).length;
      return acc;
    },
    { active: 0, upcoming: 0, completed: 0 },
  );
  const visibleBookings = bookings.filter((b) => TAB_STATUSES[activeTab].includes(b.status));

  return (
    <div className="flex w-full flex-col gap-5">
      <div
        role="tablist"
        aria-label="Booking status"
        className="border-border/70 bg-secondary/60 inline-flex w-full max-w-md gap-1 self-start rounded-xl border p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              activeTab === tab.key
                ? "bg-card text-brand shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="ml-1.5 opacity-70">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {visibleBookings.length === 0 ? (
        <div className="border-border/70 bg-card mx-auto flex w-full max-w-lg flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center shadow-sm">
          <p className="text-muted-foreground text-sm">
            No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} bookings right now.
          </p>
        </div>
      ) : (
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col gap-4"
        >
          {visibleBookings.map((booking) => (
        <motion.div
          key={booking.id}
          variants={fadeUp}
          className="border-border/70 bg-card hover:border-brand/40 flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-brand text-xs font-semibold tracking-[0.15em] uppercase">
                {booking.id}
              </span>
              <span className="text-foreground text-lg font-semibold">
                {booking.serviceLabel}
              </span>
              <span className="text-muted-foreground text-sm">{booking.subServiceLabel}</span>
            </div>
            <Badge className={cn("border", STATUS_BADGE[booking.status])} variant="outline">
              {booking.status.replace("-", " ")}
            </Badge>
          </div>

          <div className="text-muted-foreground border-border/60 grid grid-cols-1 gap-2.5 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="text-brand size-4 shrink-0" />
              {booking.location}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="text-brand size-4 shrink-0" />
              {booking.date} · {booking.time}
            </span>
            <span className="flex items-center gap-1.5">
              <PlaneTakeoffIcon className="text-brand size-4 shrink-0" />
              Pilot · {booking.operatorName}
            </span>
            <span className="flex items-center gap-1.5">
              <RadioTowerIcon className="text-brand size-4 shrink-0" />
              Drone · {booking.droneId}
            </span>
          </div>

          <BookingStatusTimeline status={booking.status} />

          {TRACKABLE_STATUSES.includes(booking.status) && (
            <Button variant="outline" className="h-11 self-start px-5" asChild>
              <Link href={`/track/${booking.id}`}>
                <RadioTowerIcon className="size-3.5" />
                Track Live
              </Link>
            </Button>
          )}
        </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

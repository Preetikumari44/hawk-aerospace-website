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

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  confirmed: "border-brand/40 bg-brand/10 text-brand",
  "pilot-assigned": "border-violet-400/30 bg-violet-400/10 text-violet-400",
  "in-progress": "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function MyBookingsList() {
  const { user, isAuthenticated, requestLogin } = useBookingAuth();
  const [bookings, setBookings] = React.useState<Booking[] | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, which is only available client-side post-mount.
    setBookings(isAuthenticated && user ? getBookingsForUser(user.id) : null);
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
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
      <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border p-8 text-center">
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

  return (
    <motion.div
      variants={stagger(0.08)}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
    >
      {bookings.map((booking) => (
        <motion.div
          key={booking.id}
          variants={fadeUp}
          className="border-border/60 glass-1 flex flex-col gap-4 rounded-2xl border p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-brand text-xs font-semibold tracking-[0.15em] uppercase">
                {booking.id}
              </span>
              <span className="text-foreground text-lg font-semibold">
                {booking.serviceLabel}
              </span>
              <span className="text-muted-foreground text-xs">{booking.subServiceLabel}</span>
            </div>
            <Badge className={cn("border", STATUS_BADGE[booking.status])} variant="outline">
              {booking.status.replace("-", " ")}
            </Badge>
          </div>

          <div className="text-muted-foreground grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" />
              {booking.location}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 shrink-0" />
              {booking.date} · {booking.time}
            </span>
            <span className="flex items-center gap-1.5">
              <PlaneTakeoffIcon className="size-3.5 shrink-0" />
              Pilot · {booking.operatorName}
            </span>
            <span className="flex items-center gap-1.5">
              <RadioTowerIcon className="size-3.5 shrink-0" />
              Drone · {booking.droneId}
            </span>
          </div>

          <BookingStatusTimeline status={booking.status} />
        </motion.div>
      ))}
    </motion.div>
  );
}

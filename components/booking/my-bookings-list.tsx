"use client";

import { motion } from "framer-motion";
import { CalendarIcon, IndianRupeeIcon, MapPinIcon, PlaneTakeoffIcon, PlusIcon, RadioTowerIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type BackendBooking,customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { getBookingsForUser } from "@/lib/booking/store";
import type { Booking, BookingStatus } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { BookingStatusTimeline } from "./booking-status-timeline";
import { formatINR } from "./price-estimate";

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

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  confirmed: "border-brand/40 bg-brand/10 text-brand",
  "pilot-assigned": "border-violet-400/30 bg-violet-400/10 text-violet-400",
  "in-progress": "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

function normalizeStatus(raw: unknown): BookingStatus {
  if (raw === "confirmed" || raw === "pilot-assigned" || raw === "pilot_assigned") {
    return raw === "pilot_assigned" ? "pilot-assigned" : (raw as BookingStatus);
  }
  if (raw === "in-progress" || raw === "in_progress") return "in-progress";
  if (raw === "completed" || raw === "cancelled" || raw === "pending") return raw;
  return "pending";
}

function backendToCard(b: BackendBooking): {
  id: string;
  title: string;
  subtitle: string;
  status: BookingStatus;
  location: string;
  when: string;
  pilot: string;
  drone: string;
  total: number | null;
  approval: string | null;
} {
  const price = b.priceBreakdown as { totalAmount?: unknown; estimatedAmount?: unknown } | null;
  const total =
    typeof price?.totalAmount === "number"
      ? price.totalAmount
      : typeof price?.estimatedAmount === "number"
        ? price.estimatedAmount
        : null;
  const when =
    typeof b.scheduledDate === "string"
      ? `${b.scheduledDate.slice(0, 10)}${b.preferredTimeSlot ? ` · ${b.preferredTimeSlot}` : ""}`
      : "—";
  const pilot =
    typeof b.assignedPilot === "string" && b.assignedPilot
      ? b.assignedPilot
      : "To be assigned by Fleet Manager";
  const drone = typeof b.assignedDrone === "string" && b.assignedDrone ? b.assignedDrone : "TBD";
  return {
    id: String(b.bookingNumber ?? b.id),
    title: typeof b.serviceType === "string" ? b.serviceType : "Drone Service",
    subtitle:
      typeof b.adminApprovalStatus === "string" ? `Approval: ${b.adminApprovalStatus}` : "Awaiting admin approval",
    status: normalizeStatus(b.status),
    location: typeof b.address === "string" ? b.address : "Selected project site",
    when,
    pilot,
    drone,
    total,
    approval: typeof b.adminApprovalStatus === "string" ? b.adminApprovalStatus : null,
  };
}

export function MyBookingsList() {
  const { user, isAuthenticated, requestLogin } = useBookingAuth();
  const [bookings, setBookings] = React.useState<Booking[] | null>(null);
  const [backendBookings, setBackendBookings] = React.useState<BackendBooking[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, which is only available client-side post-mount.
    setBookings(isAuthenticated && user ? getBookingsForUser(user.id) : null);
  }, [isAuthenticated, user]);

  // Live backend bookings (authoritative). Falls back to local on failure.
  React.useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears backend data on logout; auth state lives outside React.
      setBackendBookings(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    customerApi
      .listBookings()
      .then((res) => {
        if (cancelled) return;
        // Backend envelope (unwrapped) shapes: array | { bookings } | { items }.
        const raw = res as unknown as
          | BackendBooking[]
          | { bookings?: BackendBooking[]; items?: BackendBooking[] };
        const list = Array.isArray(raw) ? raw : ((raw.bookings ?? raw.items) ?? []);
        setBackendBookings(list);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setBackendBookings(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="border-border bg-card shadow-2xl backdrop-blur-md mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Log in to view the bookings tied to your account.
        </p>
        <Button size="lg" onClick={() => requestLogin("/my-bookings")}>
          Log In
        </Button>
      </div>
    );
  }

  if (loading && !backendBookings && (!bookings || bookings.length === 0)) {
    return (
      <div className="border-border bg-card shadow-2xl backdrop-blur-md mx-auto flex max-w-lg flex-col items-center gap-3 rounded-3xl border p-6 text-center">
        <p className="text-muted-foreground text-sm">Loading your bookings…</p>
      </div>
    );
  }

  // Backend list wins when available; otherwise show local demo bookings.
  if (backendBookings && backendBookings.length > 0) {
    const cards = backendBookings.map(backendToCard);
    return (
      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-2xl flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
            {cards.length} booking{cards.length === 1 ? "" : "s"}
          </span>
          <Button size="sm" asChild>
            <Link href="/#booking">
              <PlusIcon className="size-3.5" />
              Book New Service
            </Link>
          </Button>
        </div>
        {cards.map((card) => (
          <motion.div
            key={card.id}
            variants={fadeUp}
            className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-brand text-xs font-semibold tracking-[0.15em] uppercase">
                  {card.id}
                </span>
                <span className="text-foreground text-lg font-semibold capitalize">{card.title}</span>
                <span className="text-muted-foreground text-xs">{card.subtitle}</span>
              </div>
              <Badge className={cn("border", STATUS_BADGE[card.status])} variant="outline">
                {card.status.replace("-", " ")}
              </Badge>
            </div>

            <div className="text-muted-foreground grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5 shrink-0" />
                {card.location}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 shrink-0" />
                {card.when}
              </span>
              <span className="flex items-center gap-1.5">
                <PlaneTakeoffIcon className="size-3.5 shrink-0" />
                Pilot · {card.pilot}
              </span>
              <span className="flex items-center gap-1.5">
                <RadioTowerIcon className="size-3.5 shrink-0" />
                Drone · {card.drone}
              </span>
              {card.total != null && (
                <span className="flex items-center gap-1.5 sm:col-span-2">
                  <IndianRupeeIcon className="size-3.5 shrink-0" />
                  <span className="text-foreground font-semibold">{formatINR(card.total)}</span>
                </span>
              )}
            </div>

            <BookingStatusTimeline status={card.status} />

            {TRACKABLE_STATUSES.includes(card.status) && (
              <Button size="sm" variant="outline" className="self-start" asChild>
                <Link href={`/track/${card.id}`}>
                  <RadioTowerIcon className="size-3.5" />
                  Track Live
                </Link>
              </Button>
            )}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (!bookings) return null;

  if (bookings.length === 0 && (!backendBookings || backendBookings.length === 0)) {
    return (
      <div className="border-border bg-card shadow-2xl backdrop-blur-md mx-auto flex max-w-lg flex-col items-center gap-3 rounded-3xl border p-6 text-center">
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
          {bookings.length} booking{bookings.length === 1 ? "" : "s"}
        </span>
        <Button size="sm" asChild>
          <Link href="/#booking">
            <PlusIcon className="size-3.5" />
            Book New Service
          </Link>
        </Button>
      </div>
      {bookings.map((booking) => (
        <motion.div
          key={booking.id}
          variants={fadeUp}
          className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6"
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
              Pilot · {booking.operatorName ?? "To be assigned"}
            </span>
            <span className="flex items-center gap-1.5">
              <RadioTowerIcon className="size-3.5 shrink-0" />
              Drone · {booking.droneId}
            </span>
          </div>

          <BookingStatusTimeline status={booking.status} />

          {TRACKABLE_STATUSES.includes(booking.status) && (
            <Button size="sm" variant="outline" className="self-start" asChild>
              <Link href={`/track/${booking.id}`}>
                <RadioTowerIcon className="size-3.5" />
                Track Live
              </Link>
            </Button>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

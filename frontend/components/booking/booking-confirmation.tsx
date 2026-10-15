"use client";

import { motion } from "framer-motion";
import { CheckIcon, ClockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fadeUp, scaleIn, stagger } from "@/lib/motion";

import type { Booking } from "../../lib/booking/types";
import { BookingStatusTimeline } from "./booking-status-timeline";

interface BookingConfirmationProps {
  booking: Booking;
  onViewBookings: () => void;
  onNewBooking: () => void;
}

export function BookingConfirmation({
  booking,
  onViewBookings,
  onNewBooking,
}: BookingConfirmationProps) {
  const pending = booking.status === "pending";

  return (
    <motion.div
      variants={stagger(0.06)}
      initial="hidden"
      animate="show"
      className="border-brand/40 glass-2 relative flex flex-col items-center gap-5 overflow-hidden rounded-2xl border p-6 text-center sm:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 70%)",
        }}
      />

      <motion.div
        variants={scaleIn}
        className={
          pending
            ? "bg-amber-400/15 border-amber-400/40 text-amber-400 flex size-14 items-center justify-center rounded-full border"
            : "bg-brand/15 border-brand/40 text-brand flex size-14 items-center justify-center rounded-full border"
        }
      >
        {pending ? <ClockIcon className="size-7" /> : <CheckIcon className="size-7" />}
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-1">
        <span
          className={
            pending
              ? "text-xs font-semibold tracking-[0.25em] text-amber-400 uppercase"
              : "text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase"
          }
        >
          {pending ? "Awaiting Admin Approval" : "Booking Confirmed"}
        </span>
        <span className="text-foreground gradient-text text-2xl font-bold sm:text-3xl">
          {booking.id}
        </span>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-1">
        <span className="text-foreground text-lg font-semibold">{booking.serviceLabel}</span>
        <span className="text-muted-foreground text-sm">{booking.subServiceLabel}</span>
        <span className="text-muted-foreground text-sm">{booking.location}</span>
        <span className="text-muted-foreground text-sm">
          {booking.date} · {booking.time}
        </span>
        <span className="text-muted-foreground text-sm">
          Assigned pilot · {booking.operatorName}
        </span>
        <span className="text-muted-foreground text-sm">Assigned drone · {booking.droneId}</span>
        <span className="text-muted-foreground text-sm">
          Estimated takeoff · {booking.estimatedTakeoffMinutes} min
        </span>
      </motion.div>

      {pending && (
        <motion.p variants={fadeUp} className="text-muted-foreground max-w-xs text-xs">
          Your booking has been submitted and is waiting for admin review. Payment opens up as
          soon as it&apos;s approved — you&apos;ll see it reflected in My Bookings.
        </motion.p>
      )}

      <motion.div variants={fadeUp} className="w-full pt-2">
        <BookingStatusTimeline status={booking.status} />
      </motion.div>

      {booking.paymentAvailable && (
        <motion.div variants={fadeUp} className="w-full">
          <Button size="lg" className="w-full">
            Pay Now
          </Button>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="flex w-full flex-wrap justify-center gap-3 pt-2">
        <Button size="lg" onClick={onViewBookings}>
          View My Bookings
        </Button>
        <Button size="lg" variant="outline" onClick={onNewBooking}>
          Book Another Flight
        </Button>
      </motion.div>
    </motion.div>
  );
}

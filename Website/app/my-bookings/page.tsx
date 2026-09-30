import type { Metadata } from "next";

import { LiveOpsCounts } from "@/components/booking/live-ops-strip";
import { MyBookingsList } from "@/components/booking/my-bookings-list";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { LayoutLines } from "@/components/ui/layout-lines";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: { absolute: "My Bookings | Hawk Aerospace" },
  description: "View your Hawk Aerospace live drone bookings and their status.",
};

// No separate Navigation page/CTA here — the main action is "Track Live" on
// each booking card (MyBookingsList), which opens the live tracking command
// center directly at /track/[bookingId] (§2/§3/§35).
export default function MyBookingsPage() {
  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex flex-col gap-8">
          <Reveal className="flex max-w-[640px] flex-col gap-3">
            <span className="eyebrow">My Bookings</span>
            <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Your live drone bookings.
            </h1>
            <p className="text-muted-foreground text-md font-medium">
              Track the status of every flight you&apos;ve booked with Hawk Aerospace.
            </p>
          </Reveal>

          <Reveal>
            <LiveOpsCounts />
          </Reveal>

          <MyBookingsList />
        </div>
      </section>
      <Footer />
    </main>
  );
}

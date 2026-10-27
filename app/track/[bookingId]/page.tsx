"use client";

import { useParams } from "next/navigation";
import * as React from "react";

import { BookingTrackingView } from "@/components/booking/booking-tracking-view";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";

export default function TrackBookingPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = decodeURIComponent(params.bookingId);
  const { user, isAuthenticated, requestLogin } = useBookingAuth();

  return (
    <main className="hawk-theme hawk-forest text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex flex-col gap-8">
          <Reveal className="flex max-w-[640px] flex-col gap-3">
            <span className="eyebrow">Raider System</span>
            <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Live tracking · {bookingId}
            </h1>
            <p className="text-muted-foreground text-md font-medium">
              Your assigned Raider&apos;s live position, route, and mission telemetry.
            </p>
          </Reveal>

          {!isAuthenticated ? (
            <div className="border-border/60 glass-2 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center">
              <p className="text-muted-foreground text-sm">Log in to view this booking&apos;s live tracking.</p>
              <Button size="lg" onClick={() => requestLogin(`/track/${bookingId}`)}>
                Log In
              </Button>
            </div>
          ) : (
            <BookingTrackingView bookingId={bookingId} userId={user!.id} />
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

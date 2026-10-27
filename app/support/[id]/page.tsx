"use client";

// Complaint details — Super App ComplaintDetailsScreen parity: ticket detail
// (GET /complaints/:id) + linked booking snapshot.

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { type BackendBooking,customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { normalizeComplaint, typeLabel } from "@/lib/booking/complaints";
import { complaintApi } from "@/lib/booking/role-apis";

export default function ComplaintDetailsPage() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [complaint, setComplaint] = React.useState<ReturnType<typeof normalizeComplaint> | null>(null);
  const [booking, setBooking] = React.useState<BackendBooking | null>(null);
  const [missing, setMissing] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    complaintApi
      .get(decodeURIComponent(id))
      .then(async (c) => {
        if (cancelled) return;
        const norm = normalizeComplaint((c ?? {}) as Record<string, unknown>);
        setComplaint(norm);
        if (norm.relatedEntityType === "BOOKING" && norm.relatedEntityId) {
          try {
            const b = await customerApi.getBooking(norm.relatedEntityId);
            if (!cancelled) setBooking(b);
          } catch {
            /* linked booking may be unavailable */
          }
        }
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
              <AerialScene variant="terrain" />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 -z-20"
              style={{
                background:
                  "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
              }}
            />
            <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <span className="eyebrow">Complaint</span>
          <Button size="lg" onClick={() => requestLogin(`/support/${id}`)}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="hawk-theme hawk-forest relative min-h-screen w-full overflow-hidden">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
        }}
      />
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-6">
          <Link href="/support" className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline">
            <ArrowLeftIcon className="size-4" />
            Back to Support
          </Link>
          {missing ? (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md rounded-3xl border p-8 text-center">
              <p className="text-muted-foreground text-sm">We couldn&apos;t find that complaint.</p>
            </div>
          ) : !complaint ? (
            <p className="text-muted-foreground text-sm">Loading complaint…</p>
          ) : (
            <>
              <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-2 rounded-3xl border p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-brand text-xs font-semibold tracking-[0.15em] uppercase">
                    {complaint.id}
                  </span>
                  <span className="text-muted-foreground text-xs">{complaint.status}</span>
                </div>
                <h1 className="text-xl font-semibold">{complaint.subject}</h1>
                <p className="text-muted-foreground text-sm">
                  {typeLabel(complaint.type)} · {complaint.createdAt.slice(0, 10)}
                </p>
                {complaint.relatedEntityType ? (
                  <p className="text-muted-foreground text-xs">
                    Linked: {complaint.relatedEntityType}
                    {complaint.relatedEntityId ? ` · ${complaint.relatedEntityId}` : ""}
                  </p>
                ) : null}
              </div>
              {booking ? (
                <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-2 rounded-3xl border p-6">
                  <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                    Linked Booking
                  </span>
                  <p className="text-foreground font-medium">
                    {String(booking.bookingNumber ?? booking.id)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {typeof booking.serviceType === "string" ? booking.serviceType : ""} ·{" "}
                    {String(booking.status ?? "")} · {typeof booking.address === "string" ? booking.address : ""}
                  </p>
                  <Link
                    href={`/track/${booking.bookingNumber ?? booking.id}`}
                    className="text-brand text-xs font-semibold hover:underline"
                  >
                    Open live tracking →
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

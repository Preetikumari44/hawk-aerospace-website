"use client";

// Booking command center — Super App BookingDetailsScreen parity for backend
// bookings: 7-stage timeline, service/personal details, weather + restriction
// summaries, cancellation chance, pricing breakdown, deliverables, cash
// banner, pay/cancel/rate/chat/complain/book-again. Live via Socket.IO
// booking room (booking:*, mission:*, payment:*) + 5s poll backup.

import { useRouter } from "next/navigation";
import * as React from "react";

import { BookingStatusTimeline } from "@/components/booking/booking-status-timeline";
import { formatINR } from "@/components/booking/price-estimate";
import { Button } from "@/components/ui/button";
import {
  type BackendBooking,
  customerApi,
  paymentApi,
} from "@/lib/booking/api-client";
import { chatApi } from "@/lib/booking/role-apis";
import { openRazorpayCheckout } from "@/lib/booking/razorpay-checkout";
import { saveBookingResumeState } from "@/lib/booking/resume";
import { joinBookingRoom, leaveBookingRoom, connectSocket } from "@/lib/booking/socket";
import { useBookingAuth } from "@/lib/booking/auth-context";
import type { BookingStatus } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

function normalizeStatus(raw: unknown): BookingStatus {
  const s = String(raw ?? "pending");
  if (s === "pilot_assigned") return "pilot-assigned";
  if (s === "in_progress") return "in-progress";
  if (["pending", "confirmed", "pilot-assigned", "in-progress", "completed", "cancelled"].includes(s)) {
    return s as BookingStatus;
  }
  return "pending";
}

function str(v: unknown, fb = ""): string {
  return typeof v === "string" && v ? v : fb;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-3xl border p-6 shadow-2xl backdrop-blur-md">
      <span className="text-muted-foreground mb-2 block text-[10px] font-semibold tracking-[0.12em] uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground text-right font-medium">{v}</span>
    </div>
  );
}

export function BookingCommandPanels({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { user, backendUser } = useBookingAuth();
  const [booking, setBooking] = React.useState<BackendBooking | null>(null);
  const [metadata, setMetadata] = React.useState<Record<string, unknown> | null>(null);
  const [progress, setProgress] = React.useState<Record<string, unknown> | null>(null);
  const [weather, setWeather] = React.useState<Record<string, unknown> | null>(null);
  const [restrictions, setRestrictions] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [showCancel, setShowCancel] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [feedback, setFeedback] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const b = await customerApi.getBooking(bookingId);
      setBooking(b);
      setLoading(false);
      customerApi
        .getMetadata(bookingId)
        .then((m) => setMetadata((m ?? null) as Record<string, unknown> | null))
        .catch(() => undefined);
      customerApi
        .getBookingProgress(bookingId)
        .then((p) => setProgress((p ?? null) as Record<string, unknown> | null))
        .catch(() => undefined);
      customerApi
        .getWeather(bookingId)
        .then((w) => setWeather((w ?? null) as Record<string, unknown> | null))
        .catch(() => undefined);
      customerApi
        .getRestrictions(bookingId)
        .then((r) => setRestrictions((r ?? null) as Record<string, unknown> | null))
        .catch(() => undefined);
    } catch {
      setLoading(false);
    }
  }, [bookingId]);

  // Initial load.
  React.useEffect(() => {
    void load();
  }, [load]);

  // Live updates: Socket.IO booking room + 5s poll backup.
  React.useEffect(() => {
    joinBookingRoom(bookingId);
    const s = connectSocket();
    const refresh = () => void load();
    const events = [
      "booking:status",
      "booking:status.changed",
      "booking:cancelled",
      "booking:completed",
      "booking:rated",
      "booking:assigned",
      "booking:confirmed",
      "mission:gpsUpdate",
      "mission:location",
      "mission:progressUpdate",
      "mission:started",
      "mission:completed",
      "payment:confirmed",
      "payment:failed",
      "payment:refunded",
    ];
    events.forEach((e) => s?.on(e, refresh));
    const t = window.setInterval(refresh, 5000);
    return () => {
      window.clearInterval(t);
      events.forEach((e) => s?.off(e, refresh));
      leaveBookingRoom(bookingId);
    };
  }, [bookingId, load]);

  async function act(key: string, fn: () => Promise<unknown>, ok?: string) {
    setActing(key);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <Section title="Booking Details">
        <p className="text-muted-foreground text-sm">Loading booking details…</p>
      </Section>
    );
  }
  if (!booking) return null;

  const status = normalizeStatus(booking.status);
  const price = (booking.priceBreakdown ?? {}) as Record<string, unknown>;
  const total =
    typeof price.totalAmount === "number"
      ? price.totalAmount
      : typeof price.estimatedAmount === "number"
        ? price.estimatedAmount
        : null;
  const serviceDetails = (booking.serviceDetails ?? {}) as Record<string, unknown>;
  const subService =
    serviceDetails.sprayingSubType ??
    serviceDetails.monitoringSubType ??
    serviceDetails.mappingType ??
    serviceDetails.surveillanceType ??
    serviceDetails.videographyType ??
    null;
  const meta = metadata ?? {};
  const cancelChance =
    (meta.cancellationChance as Record<string, unknown> | number | undefined) ??
    (booking.cancellationChance as Record<string, unknown> | number | undefined);
  const deliverables = Array.isArray(meta.deliverables) ? (meta.deliverables as unknown[]) : [];
  const payStatus = str(
    (price.paymentStatus as string | undefined) ??
      (booking.paymentStatus as string | undefined) ??
      "",
  ).toLowerCase();
  const payMethod = str(
    (price.paymentMethod as string | undefined) ?? (booking.paymentMethod as string | undefined) ?? "",
  ).toLowerCase();
  const cashPending = payStatus.includes("pending") && (payMethod.includes("cash") || payMethod === "");
  const existingRating =
    (booking.rating as number | undefined) ?? (meta.rating as number | undefined);
  const weatherSummary =
    (booking.weather as Record<string, unknown> | undefined) ?? weather ?? undefined;
  const restrictionSummary =
    (booking.flyingRestriction as Record<string, unknown> | undefined) ?? restrictions ?? undefined;
  const userName =
    (backendUser?.name as string | undefined) ?? user?.phone ?? "";

  async function payOnline() {
    const id = String(booking?.bookingNumber ?? booking?.id ?? bookingId);
    const order = await paymentApi.createRazorpayOrder({ bookingId: id });
    const keyId = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (!keyId) throw new Error("Razorpay key is not configured.");
    const result = await openRazorpayCheckout({
      keyId,
      orderId: order.orderId,
      amount: order.amount,
      prefill: user?.phone ? { contact: user.phone } : {},
    });
    await customerApi.completePayment(id, {
      method: "gateway",
      payment: {
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      },
    });
  }

  async function payCash() {
    const id = String(booking?.bookingNumber ?? booking?.id ?? bookingId);
    await customerApi.completePayment(id, { method: "cash" });
  }

  async function openChat() {
    const id = String(booking?.bookingNumber ?? booking?.id ?? bookingId);
    const conv = (await chatApi.createConversation({ bookingId: id })) as Record<string, unknown>;
    const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? "");
    const refTitle = str(booking?.serviceType, id);
    if (cid) router.push(`/chat/${cid}?refId=${encodeURIComponent(id)}&refTitle=${encodeURIComponent(refTitle)}`);
    else router.push("/chat");
  }

  function bookAgain() {
    const serviceRaw = str(booking?.serviceType, "spraying").toLowerCase();
    const service = (
      ["videography", "spraying", "mapping", "surveillance"].includes(serviceRaw) ? serviceRaw : "spraying"
    ) as "videography" | "spraying" | "mapping" | "surveillance";
    const coords =
      booking && typeof booking.location === "object" && booking.location !== null
        ? (booking.location as { lat?: unknown; lng?: unknown })
        : null;
    saveBookingResumeState({
      draft: {
        service,
        subService: null,
        crop: null,
        infraType: null,
        areaValue: 1,
        areaUnit: "acre",
        videographyQuantity: 30,
        surveillanceQuantity: 1,
        instructions: "",
        location: str(booking?.address, ""),
        coordinates:
          typeof coords?.lat === "number" && typeof coords?.lng === "number"
            ? { lat: coords.lat, lng: coords.lng }
            : null,
        detailedAddress: { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" },
        date: "",
        time: "",
        preferredTimeSlot: null,
      },
      operators: [],
      selectedOperatorId: null,
    });
    router.push("/#booking");
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Booking Status">
        <BookingStatusTimeline status={status} />
        {typeof booking.stage === "number" && (
          <p className="text-muted-foreground mt-1 text-xs">Stage {booking.stage} · Approval: {str(booking.adminApprovalStatus, "pending")}</p>
        )}
      </Section>

      <Section title="Service Details">
        <Row k="Service" v={str(booking.serviceType, "—")} />
        {subService != null && <Row k="Sub-service" v={String(subService)} />}
        <Row k="Location" v={str(booking.address, "—")} />
        <Row k="Scheduled" v={`${str(booking.scheduledDate, "—")}${booking.preferredTimeSlot ? ` · ${booking.preferredTimeSlot}` : ""}`} />
        <Row k="Booking No" v={str(booking.bookingNumber ?? booking.id, "—")} />
        {booking.assignedPilot ? <Row k="Pilot" v={String(booking.assignedPilot)} /> : null}
        {booking.assignedDrone ? <Row k="Drone" v={String(booking.assignedDrone)} /> : null}
        {userName ? <Row k="Booked by" v={userName} /> : null}
        {progress && typeof progress.percent === "number" ? (
          <div className="mt-2">
            <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
              <div className="bg-brand h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress.percent as number))}%` }} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Mission progress {progress.percent}%</p>
          </div>
        ) : null}
      </Section>

      {(weatherSummary || restrictionSummary) && (
        <Section title="Flight Conditions">
          {weatherSummary && (
            <p className="text-muted-foreground text-xs">
              Weather: {str(weatherSummary.condition ?? weatherSummary.summary, JSON.stringify(weatherSummary).slice(0, 120))}
            </p>
          )}
          {restrictionSummary && (
            <p className="text-muted-foreground mt-1 text-xs">
              Airspace: {str(restrictionSummary.status ?? restrictionSummary.verdict, JSON.stringify(restrictionSummary).slice(0, 120))}
            </p>
          )}
        </Section>
      )}

      {cancelChance != null && (
        <Section title="Cancellation Chance">
          <p className="text-foreground text-sm font-semibold">
            {typeof cancelChance === "number"
              ? `${Math.round(cancelChance * 100)}%`
              : str((cancelChance as Record<string, unknown>).label ?? (cancelChance as Record<string, unknown>).value, "—")}
          </p>
          {typeof cancelChance === "object" && str((cancelChance as Record<string, unknown>).reason) ? (
            <p className="text-muted-foreground text-xs">{str((cancelChance as Record<string, unknown>).reason)}</p>
          ) : null}
        </Section>
      )}

      {Object.keys(price).length > 0 && (
        <Section title="Pricing">
          {Object.entries(price)
            .filter(([k, v]) => typeof v === "number" && !["paymentStatus", "paymentMethod"].includes(k))
            .map(([k, v]) => (
              <Row key={k} k={k} v={formatINR(v as number)} />
            ))}
          {total != null && <Row k="Total" v={formatINR(total)} />}
        </Section>
      )}

      {deliverables.length > 0 && (
        <Section title="Deliverables">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {deliverables.map((d, i) => (
              <li key={i} className="text-muted-foreground">
                {typeof d === "string" ? d : JSON.stringify(d)}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {cashPending && (
        <div className="border-amber-400/40 bg-amber-400/10 rounded-xl border p-4">
          <p className="text-foreground text-sm font-semibold">Cash payment pending</p>
          <p className="text-muted-foreground text-xs">Please pay the pilot on site to complete this booking.</p>
        </div>
      )}

      {msg && <p className="text-muted-foreground text-xs">{msg}</p>}

      <Section title="Actions">
        <div className="flex flex-wrap gap-2">
          {status !== "cancelled" && status !== "completed" && (
            <>
              {(payStatus === "" || payStatus.includes("pending")) && (
                <>
                  <Button size="sm" disabled={acting === "pay"} onClick={() => void act("pay", payOnline, "Payment completed.")}>
                    {acting === "pay" ? "Processing…" : "Pay Online"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={acting === "cash"} onClick={() => void act("cash", payCash, "Cash booking confirmed.")}>
                    {acting === "cash" ? "Confirming…" : "Cash"}
                  </Button>
                </>
              )}
              {!showCancel ? (
                <Button size="sm" variant="outline" onClick={() => setShowCancel(true)}>
                  Cancel Booking
                </Button>
              ) : (
                <span className="flex w-full flex-col gap-2">
                  <input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
                  />
                  <span className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting === "cancel"}
                      onClick={() =>
                        void act("cancel", async () => {
                          await customerApi.cancelBooking(String(booking?.bookingNumber ?? booking?.id ?? bookingId), cancelReason.trim() || undefined);
                          setShowCancel(false);
                        }, "Booking cancelled.")
                      }
                    >
                      {acting === "cancel" ? "Cancelling…" : "Confirm Cancel"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)}>
                      Keep
                    </Button>
                  </span>
                </span>
              )}
            </>
          )}
          <Button size="sm" variant="outline" disabled={acting === "chat"} onClick={() => void act("chat", openChat)}>
            {acting === "chat" ? "Opening…" : "Chat"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/support?bookingId=${encodeURIComponent(String(booking?.bookingNumber ?? booking?.id ?? bookingId))}`)}
          >
            Raise Complaint
          </Button>
          <Button size="sm" variant="outline" onClick={bookAgain}>
            Book Again
          </Button>
        </div>
      </Section>

      {status === "completed" && (
        <Section title="Rate Service">
          {existingRating != null ? (
            <p className="text-muted-foreground text-sm">
              You rated this service {existingRating}/5. Thank you!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    aria-label={`Rate ${s}`}
                    className={cn("text-xl", s <= rating ? "text-amber-400" : "text-muted-foreground")}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Feedback (optional)"
                className="border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
              />
              <Button
                size="sm"
                className="w-fit"
                disabled={acting === "rate"}
                onClick={() =>
                  void act("rate", () =>
                    customerApi.rateBooking(String(booking?.bookingNumber ?? booking?.id ?? bookingId), rating, feedback.trim() || undefined),
                    "Thanks for rating!",
                  )
                }
              >
                {acting === "rate" ? "Submitting…" : "Submit Rating"}
              </Button>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

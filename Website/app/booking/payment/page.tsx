"use client";

import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  BanknoteIcon,
  CheckIcon,
  CreditCardIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { formatINR, totalOf } from "@/components/booking/price-estimate";
import { buildScheduledDate } from "@/components/booking/time-slot-picker";
import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { Reveal } from "@/components/ui/reveal";
import {
  type BackendBooking,
  couponApi,
  type CreateBookingPayload,
  customerApi,
  paymentApi,
} from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { SERVICE_CATALOG, SURVEILLANCE_QUANTITY_META, VIDEO_QUANTITY_META } from "@/lib/booking/data";
import { openRazorpayCheckout } from "@/lib/booking/razorpay-checkout";
import { peekBookingIntent, takeBookingIntent } from "@/lib/booking/resume";
import type { BookingDraft } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Method = "gateway" | "cash";

const SERVICE_TYPE_MAP: Record<string, string> = {
  videography: "videography",
  spraying: "spraying",
  mapping: "mapping",
  surveillance: "surveillance",
};

function buildBookingPayload(draft: BookingDraft): CreateBookingPayload {
  const d = draft.detailedAddress;
  const addressLine = [d.addressLine1, d.addressLine2, d.city, d.state, d.pincode]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  // Backend REQUIRES the typed sub-service enum per service (e.g.
  // serviceDetails.videographySubType) — resolved from the catalog.
  // Mirrors mobile PaymentSelectionScreen.buildBookingPayload exactly:
  // areaValue/areaUnit are ALWAYS real land-area units (DTO restricts to
  // acre/sq_m/hectare/sqkm/sqmi); billing unit+quantity live inside
  // serviceDetails. NDVI is booked as serviceType 'monitoring'.
  const service = SERVICE_CATALOG.find((s) => s.key === draft.service);
  const sub = service?.subServices.find((s) => s.key === draft.subService);
  const isNdvi = draft.service === "spraying" && draft.subService === "crop-health-monitoring-ndvi";
  const bookingServiceType = isNdvi ? "monitoring" : (SERVICE_TYPE_MAP[draft.service ?? ""] ?? "spraying");
  const serviceDetails: Record<string, unknown> = {};
  if (draft.instructions?.trim()) serviceDetails.specialInstructions = draft.instructions.trim();
  if (bookingServiceType === "spraying") {
    serviceDetails.sprayingSubType = sub?.detailsValue ?? "precision_spraying";
    serviceDetails.unit = "per_acre";
    serviceDetails.quantity = Number(draft.areaValue ?? 1);
  } else if (bookingServiceType === "monitoring") {
    serviceDetails.monitoringSubType = "crop_health_monitoring";
    serviceDetails.unit = "per_acre";
    serviceDetails.quantity = Number(draft.areaValue ?? 1);
  } else if (bookingServiceType === "mapping") {
    serviceDetails.mappingType = sub?.label ?? "Basic Aerial Mapping";
    if (sub?.detailsKey && sub?.detailsValue) serviceDetails[sub.detailsKey] = sub.detailsValue;
    serviceDetails.unit = "per_acre";
    serviceDetails.quantity = Number(draft.areaValue ?? 1);
  } else if (bookingServiceType === "surveillance") {
    if (sub?.label) serviceDetails.surveillanceType = sub.label;
    if (sub?.detailsKey && sub?.detailsValue) serviceDetails[sub.detailsKey] = sub.detailsValue;
    const meta = (draft.subService && SURVEILLANCE_QUANTITY_META[draft.subService]) || undefined;
    serviceDetails.unit = meta?.unit ?? "per_visit";
    serviceDetails.quantity = Number(draft.surveillanceQuantity ?? 1);
  } else if (bookingServiceType === "videography") {
    if (sub?.label) {
      serviceDetails.videographyType = sub.label;
      serviceDetails.eventType = sub.label;
    }
    if (sub?.detailsKey && sub?.detailsValue) serviceDetails[sub.detailsKey] = sub.detailsValue;
    const meta = (draft.subService && VIDEO_QUANTITY_META[draft.subService]) || undefined;
    serviceDetails.unit = meta?.unit ?? "min";
    serviceDetails.quantity = Number(draft.videographyQuantity ?? meta?.defaultQty ?? 30);
  }
  const areaValue = Number(draft.areaValue ?? 1);
  const areaUnit: string = draft.areaUnit ?? "acre";
  return {
    address: addressLine || draft.location || "Selected booking location",
    detailedAddress: {
      ...(d.addressLine1.trim() ? { addressLine1: d.addressLine1.trim() } : {}),
      ...(d.addressLine2.trim() ? { addressLine2: d.addressLine2.trim() } : {}),
      ...(d.city.trim() ? { city: d.city.trim() } : {}),
      ...(d.state.trim() ? { state: d.state.trim() } : {}),
      ...(d.pincode.trim() ? { pincode: d.pincode.trim() } : {}),
    },
    areaValue,
    areaUnit,
    cropType: draft.crop || draft.infraType || "other",
    serviceType: bookingServiceType,
    serviceDetails,
    location: draft.coordinates ?? { lat: 12.9716, lng: 77.5946 },
    scheduledDate: draft.date ? buildScheduledDate(draft.date, draft.time || "Morning") : new Date().toISOString(),
    ...(draft.preferredTimeSlot ? { preferredTimeSlot: draft.preferredTimeSlot } : {}),
  };
}

export default function PaymentPage() {
  const router = useRouter();
  const { user, isAuthenticated, requestLogin } = useBookingAuth();
  const [intent, setIntent] = React.useState<ReturnType<typeof peekBookingIntent>>(null);
  const [booking, setBooking] = React.useState<BackendBooking | null>(null);
  const [creating, setCreating] = React.useState(true);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [method, setMethod] = React.useState<Method>("gateway");
  const [coupon, setCoupon] = React.useState("");
  const [paying, setPaying] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);

  // Read the intent carried over from #booking (peek — consumed on success).
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is client-only; hydrate post-mount.
    setIntent(peekBookingIntent());
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      requestLogin("/booking/payment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect once when the session is known to be absent.
  }, [isAuthenticated]);

  // Create the real backend booking (re-runs on manual retry).
  // Payment NEVER proceeds without a backend booking: if creation fails we
  // block here with a retry instead of inventing a local booking that would
  // let the user skip the gateway.
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    if (!intent || !isAuthenticated || booking) return;
    if (attempt === 0 && createError) return; // wait for manual retry
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- booking creation against the external backend API on mount/retry; state only changes in async callbacks below.
    setCreating(true);
    setCreateError(null);
    customerApi
      .createBooking(buildBookingPayload(intent.draft))
      .then((res) => {
        if (cancelled) return;
        const created = (res as { booking?: BackendBooking }).booking ?? (res as BackendBooking);
        if (!created || !created.id) {
          setCreateError("Booking could not be created. Please retry.");
          setCreating(false);
          return;
        }
        setBooking(created);
        setCreating(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCreateError(
          err instanceof Error
            ? `Booking could not be created (${err.message}). Check that the API server is running, then retry.`
            : "Booking could not be created. Check that the API server is running, then retry.",
        );
        setCreating(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on mount and on manual retry via `attempt`.
  }, [intent, isAuthenticated, attempt]);

  const estimateTotal = intent?.priceEstimate
    ? totalOf(intent.priceEstimate as unknown as Parameters<typeof totalOf>[0])
    : null;

  // Authoritative payable amount: recomputed server-side at booking creation
  // (Razorpay charges booking.finalPrice ?? priceEstimation — never the
  // frontend figure). If it ever disagrees with the service-page estimate,
  // block payment loudly instead of charging a different amount silently.
  const bookingTotal =
    booking?.priceBreakdown && typeof (booking.priceBreakdown as Record<string, unknown>).totalAmount === "number"
      ? ((booking.priceBreakdown as Record<string, unknown>).totalAmount as number)
      : null;
  const priceMismatch =
    estimateTotal != null && bookingTotal != null && Math.abs(estimateTotal - bookingTotal) > 1;

  async function handlePay() {
    if (!booking || !booking.id || paying || creating || priceMismatch) return;
    setPaying(true);
    setPayError(null);
    try {
      const bookingId = String(booking.id);
      const couponCode = coupon.trim() || undefined;
      if (method === "cash") {
        if (couponCode) {
          try {
            await couponApi.validate(couponCode);
          } catch {
            /* coupon failure shouldn't block cash bookings */
          }
        }
        await customerApi.completePayment(bookingId, {
          method: "cash",
          ...(couponCode ? { couponCode } : {}),
        });
        takeBookingIntent();
        router.push(`/booking/checks?bookingId=${encodeURIComponent(bookingId)}&method=cash`);
        return;
      }
      // Gateway: Razorpay order → checkout → verify at complete-payment.
      const order = await paymentApi.createRazorpayOrder({ bookingId, ...(couponCode ? { couponCode } : {}) });
      const keyId = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
      if (!keyId) throw new Error("Razorpay key is not configured.");
      const result = await openRazorpayCheckout({
        keyId,
        orderId: order.orderId,
        amount: order.amount,
        prefill: user?.phone ? { contact: user.phone } : {},
      });
      await customerApi.completePayment(bookingId, {
        method: "gateway",
        ...(couponCode ? { couponCode } : {}),
        payment: {
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        },
      });
      takeBookingIntent();
      router.push(`/booking/checks?bookingId=${encodeURIComponent(bookingId)}&method=online`);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPaying(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="bg-background text-foreground min-h-screen w-full">
        <LayoutLines />
        <Navbar />
        <section className="px-4 pt-28 pb-16 sm:pt-36">
          <div className="max-w-container mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground text-sm">Login required to continue to payment.</p>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-8">
          <Reveal className="flex flex-col gap-3">
            <span className="eyebrow">Payment</span>
            <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Choose how you&apos;d like to pay.
            </h1>
            <p className="text-muted-foreground text-md font-medium">
              {intent?.draft
                ? `${SERVICE_CATALOG.find((s) => s.key === intent.draft.service)?.label ?? ""} · ${intent.draft.date} · ${intent.draft.time}`
                : "Your booking is being prepared."}
            </p>
          </Reveal>

          <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="flex flex-col gap-4">
            {creating && (
              <motion.div variants={fadeUp} className="border-border/60 glass-2 flex items-center gap-2 rounded-2xl border p-5">
                <Loader2Icon className="text-brand size-4 animate-spin" />
                <span className="text-muted-foreground text-sm">Creating your booking…</span>
              </motion.div>
            )}

            {createError && (
              <motion.div variants={fadeUp} className="border-destructive/30 bg-destructive/10 flex flex-col gap-3 rounded-2xl border p-5">
                <p className="text-foreground text-sm font-semibold">Couldn&apos;t reach the booking server.</p>
                <p className="text-muted-foreground text-xs">{createError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAttempt((a) => a + 1)}
                  disabled={creating}
                  className="self-start"
                >
                  {creating ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Retrying…
                    </>
                  ) : (
                    "Retry"
                  )}
                </Button>
              </motion.div>
            )}

            {booking && (
              <motion.div variants={fadeUp} className="border-border/60 glass-2 flex flex-col gap-2 rounded-2xl border p-5">
                <span className="text-brand text-xs font-semibold tracking-[0.15em] uppercase">
                  {String(booking.bookingNumber ?? booking.id)}
                </span>
                {estimateTotal != null && (
                  <span className="text-foreground text-lg font-semibold">
                    Estimated total · {formatINR(estimateTotal)}
                  </span>
                )}
                {bookingTotal != null && (
                  <span className="text-foreground text-sm font-medium">
                    Payable amount · {formatINR(bookingTotal)}
                  </span>
                )}
                {priceMismatch && (
                  <span className="text-destructive text-xs font-medium">
                    The confirmed booking total ({bookingTotal != null ? formatINR(bookingTotal) : "—"}) differs
                    from the estimate ({estimateTotal != null ? formatINR(estimateTotal) : "—"}). Payment is
                    blocked — please go back and re-submit the booking so the quantities carry over.
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  Weather and fly-zone checks run next — your booking stays pending until an admin
                  approves it.
                </span>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  { key: "gateway", label: "Pay Online", hint: "Razorpay · UPI / cards", Icon: CreditCardIcon },
                  { key: "cash", label: "Cash on Service", hint: "Pay the pilot on site", Icon: BanknoteIcon },
                ] as const
              ).map(({ key, label, hint, Icon }) => {
                const selected = method === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key)}
                    aria-pressed={selected}
                    className={cn(
                      "group border-border/60 glass-1 flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-300",
                      "hover:border-brand/50 hover:-translate-y-0.5",
                      selected &&
                        "border-brand/70 shadow-[0_0_0_1px_var(--brand),0_0_24px_-6px_var(--brand)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                        selected
                          ? "border-brand bg-brand/15 text-brand"
                          : "border-border/60 bg-secondary/60 text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-foreground text-sm font-semibold">{label}</span>
                      <span className="text-muted-foreground text-xs">{hint}</span>
                    </span>
                    {selected && <CheckIcon className="text-brand size-4" />}
                  </button>
                );
              })}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col gap-2">
              <label htmlFor="coupon" className="text-foreground text-sm font-medium">
                Coupon code <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="e.g. HAWK10"
                className="border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1"
              />
            </motion.div>

            {payError && <motion.p variants={fadeUp} className="text-destructive text-xs">{payError}</motion.p>}

            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="outline" onClick={() => router.push("/#booking")} className="flex-1">
                <ArrowLeftIcon className="size-4" />
                Back to Booking
              </Button>
              <Button size="lg" onClick={() => void handlePay()} disabled={!booking || creating || paying || priceMismatch} className="flex-1">
                {paying ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Processing…
                  </>
                ) : method === "cash" ? (
                  <>
                    <BanknoteIcon className="size-4" />
                    Confirm Cash Booking
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="size-4" />
                    Pay & Continue
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

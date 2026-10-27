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
import { MarketplacePayment } from "@/components/booking/marketplace-payment";
import { buildScheduledDate } from "@/components/booking/time-slot-picker";
import Footer from "@/components/homepage/footer/default";
import { buildPricingInput } from "@/lib/booking/pricing-units";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Reveal } from "@/components/ui/reveal";
import {
  type BackendBooking,
  couponApi,
  type CreateBookingPayload,
  customerApi,
  paymentApi,
} from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { SERVICE_CATALOG } from "@/lib/booking/data";
import { openRazorpayCheckout } from "@/lib/booking/razorpay-checkout";
import { peekBookingIntent, takeBookingIntent } from "@/lib/booking/resume";
import type { BookingDraft } from "@/lib/booking/types";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Method = "gateway" | "cash";

function buildBookingPayload(draft: BookingDraft): CreateBookingPayload {
  const d = draft.detailedAddress ?? { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" };
  const addressLine = [d.addressLine1, d.addressLine2, d.city, d.state, d.pincode]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  // Pricing inputs come from the shared builder so the estimate shown
  // earlier and this payload price identically server-side (same
  // serviceType/key/unit/quantity). See lib/booking/pricing-units.ts.
  const pricing = buildPricingInput(draft);
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
    serviceType: pricing.serviceType,
    serviceDetails: pricing.serviceDetails,
    location: draft.coordinates ?? { lat: 12.9716, lng: 77.5946 },
    scheduledDate: draft.date ? buildScheduledDate(draft.date, draft.time || "Morning") : new Date().toISOString(),
    ...(draft.preferredTimeSlot ? { preferredTimeSlot: draft.preferredTimeSlot } : {}),
  };
}

export default function PaymentPage() {
  const router = useRouter();
  const { user, isAuthenticated, requestLogin, ensureBookingRole } = useBookingAuth();
  // Marketplace-mode checkout (?mode=marketplace) renders the marketplace
  // payment flow instead of the service-booking flow (Super App
  // PaymentSelectionScreen dual-mode parity).
  const [marketMode] = React.useState(
    () => typeof window !== "undefined" && window.location.search.includes("mode=marketplace"),
  );
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
      requestLogin(marketMode ? "/booking/payment?mode=marketplace" : "/booking/payment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect once when the session is known to be absent.
  }, [isAuthenticated, marketMode]);

  // Create the real backend booking (re-runs on manual retry).
  // Payment NEVER proceeds without a backend booking: if creation fails we
  // block here with a retry instead of inventing a local booking that would
  // let the user skip the gateway.
  // A named farm/site is saved first (best-effort, FarmMapScreen parity) so
  // the booking carries its farmId.
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    if (!intent || !isAuthenticated || booking) return;
    if (attempt === 0 && createError) return; // wait for manual retry
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- booking creation against the external backend API on mount/retry; state only changes in async callbacks below.
    setCreating(true);
    setCreateError(null);
    void (async () => {
      try {
        // Any signed-in role may book: scope the token to customer first.
        const allowed = await ensureBookingRole();
        if (cancelled) return;
        if (!allowed) {
          setCreateError("Your account can't book services. Please contact support.");
          setCreating(false);
          return;
        }
        const payload = buildBookingPayload(intent.draft);
        const farmName = intent.draft.farmName?.trim();
        if (farmName && intent.draft.coordinates) {
          try {
            const farm = (await customerApi.createFarm({
              name: farmName,
              latitude: intent.draft.coordinates.lat,
              longitude: intent.draft.coordinates.lng,
              address: payload.address,
            })) as Record<string, unknown>;
            const farmId = String(farm.id ?? farm._id ?? farm.farmId ?? "");
            if (farmId) payload.farmId = farmId;
          } catch {
            /* farm save is best-effort — booking proceeds without it */
          }
        }
        const res = await customerApi.createBooking(payload);
        if (cancelled) return;
        const created = (res as { booking?: BackendBooking }).booking ?? (res as BackendBooking);
        if (!created || !created.id) {
          setCreateError("Booking could not be created. Please retry.");
          setCreating(false);
          return;
        }
        setBooking(created);
        setCreating(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setCreateError(
          err instanceof Error
            ? `Booking could not be created (${err.message}). Check that the API server is running, then retry.`
            : "Booking could not be created. Check that the API server is running, then retry.",
        );
        setCreating(false);
      }
    })();
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
        <section className="px-4 pt-28 pb-16 sm:pt-36">
          <div className="max-w-container mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground text-sm">Login required to continue to payment.</p>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  if (marketMode) {
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
          <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-8">
            <Reveal className="flex flex-col gap-3">
              <span className="eyebrow">Payment</span>
              <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                Choose how you&apos;d like to pay.
              </h1>
              <p className="text-muted-foreground text-md font-medium">
                Marketplace checkout · cash on delivery or online.
              </p>
            </Reveal>
            <MarketplacePayment />
          </div>
        </section>
        <Footer />
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
              <motion.div variants={fadeUp} className="border-border bg-card shadow-2xl backdrop-blur-md flex items-center gap-2 rounded-3xl border p-5">
                <Loader2Icon className="text-brand size-4 animate-spin" />
                <span className="text-muted-foreground text-sm">Creating your booking…</span>
              </motion.div>
            )}

            {createError && (
              <motion.div variants={fadeUp} className="border-destructive/30 bg-destructive/10 flex flex-col gap-3 rounded-3xl border p-5">
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
              <motion.div variants={fadeUp} className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-2 rounded-3xl border p-5">
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
                      "group border-border bg-card shadow-2xl backdrop-blur-md flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-300",
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
                          : "border-border bg-card text-muted-foreground",
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
                className="border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
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

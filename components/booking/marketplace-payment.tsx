"use client";

// Marketplace-mode payment — Super App PaymentSelectionScreen marketplace
// parity: delivery address, Cash/COD vs Razorpay gateway + coupons, per-item
// order creation, gateway verify, abandon-on-failure, existing-order Pay Now.

import { ArrowLeftIcon, BanknoteIcon, CheckIcon, CreditCardIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AddressFields } from "@/components/booking/address-fields";
import { formatINR } from "@/components/booking/price-estimate";
import { Button } from "@/components/ui/button";
import { customerApi, paymentApi } from "@/lib/booking/api-client";
import { useCart } from "@/lib/booking/cart-store";
import { fetchProducts, getExpectedDeliveryDate, isAddressValid } from "@/lib/booking/marketplace";
import { openRazorpayCheckout } from "@/lib/booking/razorpay-checkout";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { cn } from "@/lib/utils";

const MARKET_INTENT_KEY = "hawk_market_intent_v1";
interface MarketIntent { mode: "buy_now" | "cart" | "existing"; productId?: string; quantity?: number; orderId?: string }
function peekMarketIntent(): MarketIntent | null {
  try {
    const raw = window.sessionStorage.getItem(MARKET_INTENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MarketIntent;
  } catch { return null; }
}
function takeMarketIntent(): MarketIntent | null {
  const intent = peekMarketIntent();
  try { window.sessionStorage.removeItem(MARKET_INTENT_KEY); } catch { /* ignore */ }
  return intent;
}

type Method = "gateway" | "cash";

interface PendingItem {
  productId: string;
  productName: string;
  price: number;
  vendorUid: string;
  quantity: number;
}

export function MarketplacePayment() {
  const router = useRouter();
  const { user } = useBookingAuth();
  const cart = useCart();
  const [intent] = React.useState(peekMarketIntent);
  const [items, setItems] = React.useState<PendingItem[] | null>(null);
  const [method, setMethod] = React.useState<Method>("gateway");
  const [coupon, setCoupon] = React.useState("");
  const [address, setAddress] = React.useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Resolve buy_now / cart / existing intents into concrete line items.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!intent) {
        setItems([]);
        return;
      }
      if (intent.mode === "cart") {
        setItems(
          cart.items.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            price: i.product.price,
            vendorUid: i.product.vendorUid,
            quantity: i.quantity,
          })),
        );
        return;
      }
      if (intent.mode === "buy_now" && intent.productId) {
        try {
          const list = await fetchProducts();
          const found = list.find((p) => p.id === intent.productId);
          if (!found) {
            if (!cancelled) setItems([]);
            return;
          }
          if (!cancelled) {
            setItems([
              {
                productId: found.id,
                productName: found.name,
                price: found.price,
                vendorUid: found.vendorUid,
                quantity: intent.quantity ?? 1,
              },
            ]);
          }
        } catch {
          if (!cancelled) setItems([]);
        }
        return;
      }
      // existing order: nothing to create, pay for it directly.
      setItems([]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve intent once on mount.
  }, []);

  const subtotal = (items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
  const addressOk = isAddressValid(address);

  async function createOrders(paymentMethod: "cod" | "gateway", couponCode?: string): Promise<string[]> {
    const ids: string[] = [];
    const line1 = address.addressLine1.trim();
    const locationString = line1
      ? `${line1}${address.addressLine2.trim() ? `, ${address.addressLine2.trim()}` : ""}, ${address.city.trim()}, ${address.state.trim()} - ${address.pincode.trim()}`
      : "";
    for (const item of items ?? []) {
      const sub = item.price * item.quantity;
      const created = await customerApi.createOrder({
        productId: item.productId,
        productName: item.productName,
        price: sub,
        vendorUid: item.vendorUid,
        deliveryLocation: locationString,
        deliveryAddress: {
          addressLine1: address.addressLine1.trim(),
          ...(address.addressLine2.trim() ? { addressLine2: address.addressLine2.trim() } : {}),
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode.trim(),
        },
        deliveryDate: getExpectedDeliveryDate(),
        paymentMethod,
        ...(couponCode ? { couponCode, originalPrice: sub } : {}),
      });
      const id = String(
        (created as Record<string, unknown>).orderId ??
          (created as Record<string, unknown>).id ??
          "",
      );
      if (id) ids.push(id);
    }
    return ids;
  }

  function finish() {
    if (intent?.mode === "cart") cart.clearCart();
    takeMarketIntent();
  }

  async function handlePay() {
    if (processing) return;
    if (intent?.mode !== "existing" && !addressOk) {
      setError("Please fill in the delivery address (Address Line 1, City, State, Pincode).");
      return;
    }
    setProcessing(true);
    setError(null);
    const couponCode = coupon.trim().toUpperCase() || undefined;
    let createdIds: string[] = [];
    try {
      if (method === "cash") {
        if (intent?.mode === "existing" && intent.orderId) {
          // Existing pending order paid as cash: nothing to create.
        } else {
          await createOrders("cod", couponCode);
        }
        finish();
        router.push("/marketplace/orders");
        return;
      }
      // Gateway: create pending orders first, then one Razorpay order over them.
      const orderIds =
        intent?.mode === "existing" && intent.orderId ? [intent.orderId] : await createOrders("gateway", couponCode);
      createdIds = intent?.mode === "existing" ? [] : orderIds;
      if (orderIds.length === 0) throw new Error("No orders to pay for.");
      const order = await paymentApi.createRazorpayOrder({
        orderIds,
        ...(couponCode ? { couponCode } : {}),
      });
      const keyId = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
      if (!keyId) throw new Error("Razorpay key is not configured.");
      const result = await openRazorpayCheckout({
        keyId,
        orderId: order.orderId,
        amount: order.amount,
        prefill: user?.phone ? { contact: user.phone } : {},
      });
      await paymentApi.verifyMarketplacePayment({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
        orderIds,
      });
      finish();
      router.push("/marketplace/orders");
    } catch (err) {
      // Best-effort cleanup of unpaid gateway orders (abandon parity).
      if (createdIds.length > 0) {
        paymentApi.abandonMarketplaceOrders(createdIds).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setProcessing(false);
    }
  }

  if (items === null) {
    return (
      <div className="border-border bg-card flex items-center gap-2 rounded-3xl border p-6 shadow-2xl backdrop-blur-md">
        <Loader2Icon className="text-brand size-4 animate-spin" />
        <span className="text-muted-foreground text-sm">Preparing your order…</span>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="border-border bg-card flex flex-col items-center gap-3 rounded-3xl border p-6 text-center shadow-2xl backdrop-blur-md">
        <p className="text-muted-foreground text-sm">No marketplace checkout in progress.</p>
        <Button asChild>
          <Link href="/marketplace">Browse products</Link>
        </Button>
      </div>
    );
  }

  if (intent.mode !== "existing" && items.length === 0) {
    return (
      <div className="border-border bg-card flex flex-col items-center gap-3 rounded-3xl border p-6 text-center shadow-2xl backdrop-blur-md">
        <p className="text-muted-foreground text-sm">Your cart is empty.</p>
        <Button asChild>
          <Link href="/marketplace">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {intent.mode !== "existing" && (
        <div className="border-border bg-card flex flex-col gap-2 rounded-3xl border p-6 shadow-2xl backdrop-blur-md">
          <span className="text-foreground text-sm font-semibold">
            Order summary · {formatINR(subtotal)}
          </span>
          {items.map((i) => (
            <div key={i.productId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {i.quantity}× {i.productName}
              </span>
              <span className="text-muted-foreground">{formatINR(i.price * i.quantity)}</span>
            </div>
          ))}
          <span className="text-muted-foreground text-xs">
            Delivery by {getExpectedDeliveryDate()}
          </span>
        </div>
      )}

      {intent.mode !== "existing" && (
        <div className="border-border bg-card flex flex-col gap-2 rounded-3xl border p-6 shadow-2xl backdrop-blur-md">
          <span className="text-foreground text-sm font-semibold">Delivery address</span>
          <AddressFields value={address} onChange={setAddress} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            { key: "gateway", label: "Pay Online", hint: "Razorpay · UPI / cards", Icon: CreditCardIcon },
            { key: "cash", label: "Cash on Delivery", hint: "Pay on delivery", Icon: BanknoteIcon },
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
                "group border-border bg-card flex items-center gap-3 rounded-3xl border p-6 text-left shadow-2xl backdrop-blur-md transition-all duration-300",
                "hover:border-brand/50 hover:-translate-y-0.5",
                selected && "border-brand/70 shadow-[0_0_0_1px_var(--brand),0_0_24px_-6px_var(--brand)]",
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
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="mkt-coupon" className="text-foreground text-sm font-medium">
          Coupon code <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="mkt-coupon"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/\s/g, ""))}
          placeholder="e.g. HAWK10"
          className="border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
        />
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" variant="outline" asChild className="flex-1">
          <Link href="/marketplace">
            <ArrowLeftIcon className="size-4" />
            Back to Marketplace
          </Link>
        </Button>
        <Button size="lg" onClick={() => void handlePay()} disabled={processing} className="flex-1">
          {processing ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Processing…
            </>
          ) : method === "cash" ? (
            "Place COD Order"
          ) : (
            "Pay & Place Order"
          )}
        </Button>
      </div>
    </div>
  );
}

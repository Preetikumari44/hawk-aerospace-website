"use client";

// Razorpay checkout loader (web). Mirrors
// User_Frontend/src/utils/razorpayCheckout.js web path:
// lazy-loads https://checkout.razorpay.com/v1/checkout.js once, then opens
// the hosted checkout dialog and resolves with the payment credentials.

export interface RazorpayResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (err: unknown) => void) => void;
    };
  }
}

let checkoutScriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScriptPromise = null;
      reject(new Error("Could not load Razorpay checkout. Check your connection."));
    };
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}

export async function openRazorpayCheckout(options: {
  keyId: string;
  orderId: string;
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  prefill?: { contact?: string; email?: string; name?: string };
}): Promise<RazorpayResult> {
  await loadCheckoutScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Razorpay checkout failed to load.");
  return new Promise<RazorpayResult>((resolve, reject) => {
    const rzp = new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amount,
      currency: options.currency ?? "INR",
      name: options.name ?? "Hawk Aerospace",
      description: options.description ?? "Drone service booking",
      prefill: options.prefill ?? {},
      theme: { color: "#4f7cff" },
      handler: (response: unknown) => resolve(response as RazorpayResult),
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    rzp.on("payment.failed", (err: unknown) => reject(err instanceof Error ? err : new Error("Payment failed.")));
    rzp.open();
  });
}

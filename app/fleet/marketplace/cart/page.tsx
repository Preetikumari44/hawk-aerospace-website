"use client";

// Fleet cart — exact teammate layout + real checkout (POST
// /marketplace/orders) with local fallback confirmation.

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { apiRequest } from "@/lib/booking/api-client";
import { useFleetData } from "@/lib/fleet/data";

export default function FleetCart() {
  const { cart, updateQuantity, removeFromCart, showToast, reload } = useFleetData();
  const [placing, setPlacing] = React.useState(false);
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  async function checkout() {
    setPlacing(true);
    try {
      const res = (await apiRequest<unknown>("/marketplace/orders", {
        method: "POST",
        body: {
          items: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
        },
      })) as Record<string, unknown>;
      const id = String(res.id ?? res.orderId ?? `ORD-${Date.now()}`);
      showToast(`Order ${id} placed.`);
      cart.forEach((i) => removeFromCart(i.id));
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div>
      <div className="pageTitle">
        <div>
          <h1>Cart</h1>
          <p>Review fleet marketplace items before checkout.</p>
        </div>
        <Link href="/fleet/marketplace" className="btn secondary">
          Continue shopping
        </Link>
      </div>
      <div className="grid two">
        <div className="card">
          {cart.length ? (
            cart.map((i) => (
              <div className="cartLine" key={i.id}>
                <div className="resource">
                  <div className="resourceIcon">{i.image}</div>
                  <div>
                    <b>{i.name}</b>
                    <small>₹{i.price.toLocaleString("en-IN")} each</small>
                  </div>
                </div>
                <div className="qty">
                  <button onClick={() => updateQuantity(i.id, -1)}>
                    <Minus size={12} />
                  </button>
                  <b>{i.quantity}</b>
                  <button onClick={() => updateQuantity(i.id, 1)}>
                    <Plus size={12} />
                  </button>
                  <button onClick={() => removeFromCart(i.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Your cart is empty.</div>
          )}
        </div>
        <div className="card">
          <h2 className="mt-0" style={{ fontSize: 14 }}>Order Summary</h2>
          <div className="row">
            <span className="muted">Items</span>
            <b>{cart.reduce((s, i) => s + i.quantity, 0)}</b>
          </div>
          <div className="row mt-2.5">
            <span className="muted">Total</span>
            <b style={{ fontSize: 18 }}>₹{total.toLocaleString("en-IN")}</b>
          </div>
          <button
            className="btn primary mt-3.75"
            style={{ width: "100%" }}
            disabled={!cart.length || placing}
            onClick={() => void checkout()}
          >
            {placing ? "Placing order…" : "Checkout"}
          </button>
          <p className="muted mt-2">
            Orders are created live via the backend marketplace flow.
          </p>
        </div>
      </div>
    </div>
  );
}

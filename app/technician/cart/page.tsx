"use client";

// Technician cart — teammate layout with real checkout (POST
// /marketplace/orders, local fallback order).

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useTech } from "@/lib/tech/data";

export default function TechCart() {
  const { cartItems, cartSubtotal, updateQty, removeItem, checkout, showToast } = useTech();
  const [placing, setPlacing] = React.useState(false);
  const router = useRouter();

  async function place() {
    setPlacing(true);
    try {
      const id = await checkout();
      showToast(`Order ${id} placed.`);
      router.push("/technician/history");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <div className="title">Shopping Cart</div>
      {cartItems.length === 0 ? (
        <div className="empty mt-3.5">
          Your cart is empty. <Link href="/technician/marketplace">Shop products →</Link>
        </div>
      ) : (
        <div className="card mt-3.5">
          {cartItems.map((c) => (
            <div className="cartrow" key={c.product.id}>
              <div>
                <b>{c.product.name}</b>
                <p className="sub">₹{c.product.startingFrom.toLocaleString("en-IN")} each</p>
              </div>
              <div className="actions qty">
                <button onClick={() => updateQty(c.product.id, c.quantity - 1)}>−</button>
                <b>{c.quantity}</b>
                <button onClick={() => updateQty(c.product.id, c.quantity + 1)}>+</button>
                <button className="btn danger" onClick={() => removeItem(c.product.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="summary">
            <span>Subtotal</span>
            <span>₹{cartSubtotal.toLocaleString("en-IN")}</span>
          </div>
          <p className="sub">Delivery calculated at checkout.</p>
          <button className="btn mt-2.5" style={{ width: "100%" }} disabled={placing} onClick={() => void place()}>
            {placing ? "Placing…" : "Proceed to Checkout"}
          </button>
        </div>
      )}
    </>
  );
}

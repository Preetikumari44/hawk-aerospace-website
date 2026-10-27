"use client";

// Technician order history — teammate layout with live orders.

import { useTech } from "@/lib/tech/data";

export default function TechHistory() {
  const { orders, loading } = useTech();
  return (
    <>
      <div className="title">Order History</div>
      {loading ? (
        <div className="card mt-3.5">
          Loading…
        </div>
      ) : orders.length === 0 ? (
        <div className="empty mt-3.5">
          No orders yet.
        </div>
      ) : (
        orders.map((o) => (
          <div className="card mt-3" key={o.id}>
            <div className="cartrow">
              <b>{o.id}</b>
              <b>₹{o.total.toLocaleString("en-IN")}</b>
            </div>
            <p className="sub">{o.placedAt ? new Date(o.placedAt).toLocaleString() : ""}</p>
            {o.items.map((i, k) => (
              <p className="sub" key={k}>
                {i.quantity} × {i.product.name}
              </p>
            ))}
          </div>
        ))
      )}
    </>
  );
}

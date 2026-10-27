"use client";

// Pilot marketplace — port of MarketplaceScreen: search + category chips +
// product grid (live products with fallback).

import { Package } from "lucide-react";

import * as React from "react";

import { usePilot } from "@/lib/pilot/data";

export default function PilotMarketplace() {
  const { products, showToast } = usePilot();
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("All");

  const list = products;
  const cats = ["All", ...new Set(list.map((p) => String((p as Record<string, unknown>).category ?? "General")))];
  const filtered = list.filter(
    (p) =>
      (cat === "All" || String((p as Record<string, unknown>).category) === cat) &&
      String((p as Record<string, unknown>).name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <h1 className="p-h1">Marketplace</h1>
      <p className="p-sub">Parts, batteries and gear for your missions.</p>
      <input
        className="p-input"
        style={{ maxWidth: 420 }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products"
      />
      <div className="p-segment mt-3" style={{ maxWidth: 560 }}>
        {cats.map((c) => (
          <button key={c} className={cat === c ? "active" : ""} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="p-overview mt-3">
        {filtered.map((p, i) => {
          const o = p as Record<string, unknown>;
          return (
            <div className="p-mini" style={{ minWidth: 200 }} key={String(o.id ?? i)}>
              <div className="p-miniimg" style={{ height: 100 }}><Package size={40} aria-hidden="true" /></div>
              <b style={{ fontSize: 13 }}>{String(o.name ?? "Product")}</b>
              <div style={{ fontSize: 11, color: "var(--p-muted)" }}>{String(o.category ?? "")}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--p-forest)" }}>
                ₹{Number(o.price ?? 0).toLocaleString("en-IN")}
              </div>
              <button onClick={() => showToast("Purchasing coming soon.")}>Buy Now</button>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="p-card">No products found.</div>}
    </>
  );
}

"use client";

// Technician marketplace — live products with WORKING category filter,
// search, product-details nav, cart.

import Link from "next/link";
import { Sprout } from "lucide-react";
import * as React from "react";

import { useTech } from "@/lib/tech/data";

export default function TechMarketplace() {
  const { products, addToCart, showToast, loading } = useTech();
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("All");

  const cats = React.useMemo(() => {
    const set = new Set(products.map((p) => p.category || "General"));
    return ["All", ...set];
  }, [products]);

  const filtered = products.filter(
    (p) =>
      (cat === "All" || (p.category || "General") === cat) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.description.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <p className="sub">Delivering to</p>
      <b>Delivery address unavailable</b>
      <div className="title mt-2.5 mb-4">
        Marketplace Products
      </div>
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" />
      <h3 className="sectiontitle mt-4">
        Select Categories
      </h3>
      <div className="chips">
        {cats.map((c) => (
          <button key={c} className={"chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="card">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No products in this category.</div>
      ) : (
        <div className="products">
          {filtered.map((p) => (
            <div className="card product" key={p.id}>
              <div className="productimg"><Sprout size={22} aria-hidden="true" /></div>
              <div className="productbody">
                <Link href={`/technician/marketplace/${encodeURIComponent(p.id)}`} className="productname">
                  {p.name}
                </Link>
                <div className="sub">{p.description}</div>
                <div className="price">Starting from ₹{p.startingFrom.toLocaleString("en-IN")}</div>
                <button
                  className="btn"
                  style={{ width: "100%" }}
                  onClick={() => {
                    addToCart(p);
                    showToast(`${p.name} added to cart`);
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="card offer mt-4.5">
        <b style={{ fontSize: 13 }}>Promotions & Offers</b>
        <div style={{ fontSize: 22, fontWeight: 800 }}>10% OFF</div>
        <p className="sub">Your First Spray Mission</p>
        <Link href="/technician/cart" className="btn inline-block mt-2">
          Shop Now
        </Link>
      </div>
    </>
  );
}

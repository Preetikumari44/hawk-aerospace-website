"use client";

// Fleet marketplace — exact teammate layout, backend products + real order
// creation (POST /marketplace/orders) with mock fallback.

import Link from "next/link";
import { Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

import { useFleetData } from "@/lib/fleet/data";

const cats = ["All", "Spare Parts", "Batteries", "Agriculture", "Safety"];

export default function FleetMarketplace() {
  const { products, addToCart, cartCount, showToast } = useFleetData();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const filtered = useMemo(
    () =>
      products.filter(
        (p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q, cat],
  );
  return (
    <div>
      <div className="pageTitle">
        <div>
          <h1>Marketplace</h1>
          <p>Order fleet parts, batteries and equipment.</p>
        </div>
        <Link className="btn primary" href="/fleet/marketplace/cart">
          <ShoppingCart size={14} /> Cart {cartCount > 0 && `(${cartCount})`}
        </Link>
      </div>
      <div className="grid two mb-3">
        <div className="search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" />
        </div>
        <div className="actions">
          {cats.map((c) => (
            <button className={"btn " + (cat === c ? "primary" : "secondary")} key={c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid productGrid">
        {filtered.map((p) => (
          <div className="card product" key={p.id}>
            <div className="productImage">{p.image}</div>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <span className="badge">{p.category}</span>
            <div className="price">₹{p.price.toLocaleString("en-IN")}</div>
            <button
              className="btn primary"
              onClick={() => {
                addToCart(p);
                showToast(`${p.name} added to cart`);
              }}
            >
              Add to cart
            </button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="card empty">No products match your search.</div>}
    </div>
  );
}

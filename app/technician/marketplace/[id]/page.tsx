"use client";

// Technician product details — name, category, rating, quantity stepper,
// total, delivery ETA, Add to cart / Buy now (→ cart checkout).

import Link from "next/link";
import { Sprout, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { useTech } from "@/lib/tech/data";

export default function TechProductDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { products, addToCart, showToast } = useTech();
  const [quantity, setQuantity] = React.useState(1);

  const product = products.find((p) => p.id === decodeURIComponent(id));

  if (!product) {
    return (
      <>
        <Link href="/technician/marketplace" style={{ color: "var(--forest)", fontWeight: 600 }}>
          ← Marketplace
        </Link>
        <div className="card mt-3">Product not found.</div>
      </>
    );
  }

  function add() {
    if (!product) return;
    const p = product;
    for (let i = 0; i < quantity; i++) addToCart(p);
    showToast(`${p.name} added to cart.`);
  }

  function buyNow() {
    if (!product) return;
    add();
    router.push("/technician/cart");
  }

  return (
    <>
      <Link href="/technician/marketplace" style={{ color: "var(--forest)", fontWeight: 600 }}>
        ← Marketplace
      </Link>
      <div className="card mt-3">
        <div className="productimg" style={{ height: 180 }}><Sprout size={64} aria-hidden="true" /></div>
        <div className="productbody">
          <div className="productname" style={{ fontSize: 20 }}>{product.name}</div>
          <div className="sub">{product.category || "General"}</div>
          {product.rating != null ? <div className="sub flex items-center gap-1"><Star size={12} className="inline" aria-hidden="true" /> {product.rating.toFixed(1)} rated</div> : null}
          <div className="sub mt-2">{product.description}</div>
          <div className="price">₹{product.startingFrom.toLocaleString("en-IN")}</div>
          <p className="sub">Delivery by {new Date(Date.now() + 7 * 864e5).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}</p>
          <div className="flex items-center gap-2.5 mt-2.5">
            <span className="sub">Quantity</span>
            <div className="actions qty">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <b>{quantity}</b>
              <button onClick={() => setQuantity((q) => q + 1)}>+</button>
            </div>
          </div>
          <p className="mt-2" style={{ fontWeight: 800 }}>
            Total: ₹{(product.startingFrom * quantity).toLocaleString("en-IN")}
          </p>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <button className="btn secondary" onClick={add}>Add to cart</button>
            <button className="btn" onClick={buyNow}>Buy Now</button>
          </div>
        </div>
      </div>
    </>
  );
}

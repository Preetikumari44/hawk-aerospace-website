"use client";

// Session cart — port of User_Frontend cartStore.js (in-memory + localStorage
// persistence so the cart survives navigation on web).

import * as React from "react";

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  vendorUid: string;
  category?: string;
  image?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addToCart: (product: CartProduct, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = React.createContext<CartValue | null>(null);
const STORAGE_KEY = "hawk_cart_v1";

function load(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only hydration.
    setItems(load());
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = React.useMemo<CartValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce(
      (s, i) => s + (Number(i.product.price) || 0) * i.quantity,
      0,
    );
    return {
      items,
      count,
      subtotal,
      addToCart: (product, quantity = 1) =>
        setItems((prev) => {
          const found = prev.find((c) => c.product.id === product.id);
          if (found) {
            return prev.map((c) =>
              c.product.id === product.id ? { ...c, quantity: c.quantity + quantity } : c,
            );
          }
          return [...prev, { product, quantity }];
        }),
      removeFromCart: (id) => setItems((prev) => prev.filter((c) => c.product.id !== id)),
      setQuantity: (id, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((c) => c.product.id !== id)
            : prev.map((c) => (c.product.id === id ? { ...c, quantity } : c)),
        ),
      clearCart: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function productPrice(p: Record<string, unknown>): number {
  const raw = p.price ?? p.startingPrice ?? p.startingFrom ?? 0;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function productId(p: Record<string, unknown>, index = 0): string {
  return String(p.productId ?? p.id ?? p._id ?? `p-${index}`);
}

export function productName(p: Record<string, unknown>): string {
  return String(p.productName ?? p.title ?? p.name ?? "Marketplace Product");
}

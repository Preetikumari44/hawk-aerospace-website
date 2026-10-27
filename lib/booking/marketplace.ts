"use client";

// Marketplace helpers — Super App marketplace parity (MarketplaceScreen /
// ProductDetailsScreen / cartStore / PaymentSelectionScreen marketplace mode).

import { customerApi } from "./api-client";

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  vendorUid: string;
  image?: string;
  description?: string;
  rating?: number;
  [key: string]: unknown;
}

export interface ShopOrder {
  id: string;
  status: string;
  total: number | null;
  items: { productId: string; productName: string; quantity: number; price: number }[];
  createdAt: string;
  paymentStatus?: string;
  deliveryDate?: string;
}

export function normalizeProduct(p: Record<string, unknown>, index = 0): ShopProduct {
  const rawPrice = p.price ?? p.startingPrice ?? p.startingFrom ?? 0;
  const price =
    typeof rawPrice === "number" ? rawPrice : Number(String(rawPrice).replace(/[^0-9.-]/g, "")) || 0;
  return {
    id: String(p.productId ?? p.id ?? p._id ?? `p-${index}`),
    name: String(p.productName ?? p.title ?? p.name ?? "Marketplace Product"),
    price,
    category: String(p.category ?? "General"),
    vendorUid: String(p.vendorUid ?? p.vendorId ?? "marketplace"),
    image: typeof p.image === "string" ? p.image : undefined,
    description: typeof p.description === "string" ? p.description : undefined,
    rating: typeof p.rating === "number" ? p.rating : undefined,
  };
}

export function normalizeProducts(v: unknown): ShopProduct[] {
  const raw = Array.isArray(v)
    ? v
    : Array.isArray((v as Record<string, unknown>)?.products)
      ? ((v as Record<string, unknown>).products as unknown[])
      : Array.isArray((v as Record<string, unknown>)?.items)
        ? ((v as Record<string, unknown>).items as unknown[])
        : [];
  return (raw as Record<string, unknown>[]).map((p, i) => normalizeProduct(p, i));
}

export function normalizeOrder(o: Record<string, unknown>): ShopOrder {
  const itemsRaw = Array.isArray(o.items) ? (o.items as Record<string, unknown>[]) : [];
  const items = itemsRaw.map((it) => ({
    productId: String(it.productId ?? it.id ?? ""),
    productName: String(it.productName ?? it.name ?? "Item"),
    quantity: typeof it.quantity === "number" ? it.quantity : 1,
    price: typeof it.price === "number" ? it.price : 0,
  }));
  const total =
    typeof o.total === "number"
      ? o.total
      : typeof o.amount === "number"
        ? o.amount
        : items.reduce((s, i) => s + i.price * i.quantity, 0);
  return {
    id: String(o.orderId ?? o.id ?? o._id ?? ""),
    status: String(o.status ?? "pending"),
    total,
    items,
    createdAt: String(o.createdAt ?? o.placedAt ?? ""),
    paymentStatus: typeof o.paymentStatus === "string" ? o.paymentStatus : undefined,
    deliveryDate: typeof o.deliveryDate === "string" ? o.deliveryDate : undefined,
  };
}

export function normalizeOrders(v: unknown): ShopOrder[] {
  const raw = Array.isArray(v)
    ? v
    : Array.isArray((v as Record<string, unknown>)?.orders)
      ? ((v as Record<string, unknown>).orders as unknown[])
      : Array.isArray((v as Record<string, unknown>)?.items)
        ? ((v as Record<string, unknown>).items as unknown[])
        : [];
  return (raw as Record<string, unknown>[]).map(normalizeOrder);
}

/** Expected delivery date = 7 days out (locationFormat.getExpectedDeliveryDate parity). */
export function getExpectedDeliveryDate(orderDate: Date | null = null): string {
  const base = orderDate && !Number.isNaN(orderDate.getTime()) ? orderDate : new Date();
  const target = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
  return target.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

export function isAddressValid(a: {
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): boolean {
  return Boolean(a.addressLine1?.trim() && a.city?.trim() && a.state?.trim() && a.pincode?.trim());
}

export async function fetchProducts(): Promise<ShopProduct[]> {
  return normalizeProducts(await customerApi.getProducts());
}

export async function fetchOrders(limit = 50): Promise<ShopOrder[]> {
  return normalizeOrders(await customerApi.getOrders({ limit }));
}

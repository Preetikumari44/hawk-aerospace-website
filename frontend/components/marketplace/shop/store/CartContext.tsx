'use client';
import { createContext, type ReactNode,useContext, useEffect, useMemo, useReducer, useState } from 'react';

import { effectivePrice,services } from '../services';
import type { CartLine, Product, Totals } from '../types';

type Action = { type: 'add'; id: string; qty?: number } | { type: 'set'; id: string; qty: number } | { type: 'remove'; id: string } | { type: 'clear' } | { type: 'hydrate'; lines: CartLine[] };
function reducer(s: CartLine[], a: Action): CartLine[] {
  switch (a.type) {
    case 'add': return s.some((l) => l.productId === a.id) ? s.map((l) => l.productId === a.id ? { ...l, qty: l.qty + (a.qty ?? 1) } : l) : [...s, { productId: a.id, qty: a.qty ?? 1 }];
    case 'set': return a.qty <= 0 ? s.filter((l) => l.productId !== a.id) : s.map((l) => l.productId === a.id ? { ...l, qty: a.qty } : l);
    case 'remove': return s.filter((l) => l.productId !== a.id);
    case 'clear': return [];
    case 'hydrate': return a.lines;
  }
}
export function computeTotals(lines: CartLine[], products: Product[]): Totals {
  let subtotal = 0, discount = 0;
  for (const l of lines) { const p = products.find((x) => x.id === l.productId); if (!p) continue; subtotal += p.price * l.qty; discount += (p.price - effectivePrice(p.price, p.discount)) * l.qty; }
  const delivery = lines.length === 0 || subtotal - discount >= 5000 ? 0 : 100;
  return { subtotal, delivery, discount, total: subtotal - discount + delivery };
}
interface Ctx { lines: CartLine[]; ready: boolean; count: number; qtyOf(id: string): number; add(id: string, qty?: number): void; setQty(id: string, q: number): void; remove(id: string): void; clear(): void; }
const C = createContext<Ctx>(null!);
export const useCart = () => useContext(C);
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, []); const [ready, setReady] = useState(false);
  // the saved cart lives in localStorage, so it is read after mount (keeps server and client markup identical)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- saved cart lives in localStorage; read after mount so server and client markup match
  useEffect(() => { dispatch({ type: 'hydrate', lines: services.cart.load() }); setReady(true); }, []);
  useEffect(() => { if (ready) services.cart.save(lines); }, [lines, ready]);
  const v = useMemo<Ctx>(() => ({
    lines, ready, count: lines.reduce((n, l) => n + l.qty, 0), qtyOf: (id) => lines.find((l) => l.productId === id)?.qty ?? 0,
    add: (id, qty) => dispatch({ type: 'add', id, qty }), setQty: (id, qty) => dispatch({ type: 'set', id, qty }), remove: (id) => dispatch({ type: 'remove', id }), clear: () => dispatch({ type: 'clear' }),
  }), [lines, ready]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

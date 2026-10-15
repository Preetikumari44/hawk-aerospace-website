'use client';
import { type ReactNode,useEffect, useState } from 'react';

import { effectivePrice } from '../services';
import { useCart } from '../store/CartContext';
import type { Product } from '../types';

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const P: Record<string, string> = {
  pin: 'M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  search: 'M11 4a7 7 0 105 11.9l4.6 4.6 1.4-1.4-4.6-4.6A7 7 0 0011 4z',
  cart: 'M3 4h2l2.4 10.5h10.2L20 7H6.2M9 19.5a1 1 0 100 .01M17 19.5a1 1 0 100 .01',
  history: 'M12 7v5l3 2M4 12a8 8 0 108-8 8 8 0 00-6 2.7M4 4v4h4',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  back: 'M15 5l-7 7 7 7', arrow: 'M5 12h14M13 6l6 6-6 6', check: 'M5 12.5l4.5 4.5L19 7.5', close: 'M6 6l12 12M18 6L6 18',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z', drone: 'M8 8l8 8M16 8l-8 8M5 5h4M15 5h4M5 19h4M15 19h4', shop: 'M5 8h14l-1 12H6zM9 8a3 3 0 016 0', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  phone: 'M6 3h4l1.5 4-2 1.5a11 11 0 006 6L17 12.5l4 1.5v4a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z', leaf: 'M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8', truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 18.5a1.5 1.5 0 100 .01M17 18.5a1.5 1.5 0 100 .01', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
};
export function Icon({ n, s = 22 }: { n: keyof typeof P; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>;
}
export function ProductImage({ p, className = '' }: { p: Pick<Product, 'image' | 'category' | 'name'>; className?: string }) {
  const [bad, setBad] = useState(false);
  if (p.image && !bad) return <img className={`pimg ${className}`} src={p.image} alt={p.name} loading="lazy" onError={() => setBad(true)} />;
  return <div className={`pimg fallback ${className}`} role="img" aria-label={p.name}><Icon n={p.category === 'equipment' ? 'shop' : 'leaf'} s={34} /></div>;
}
export const Skeleton = ({ h = 90, w = '100%' }: { h?: number; w?: string }) => <div className="skeleton" style={{ height: h, width: w }} />;
export const EmptyState = ({ title, text, action }: { title: string; text: string; action?: ReactNode }) => <div className="state"><h3>{title}</h3><p>{text}</p>{action}</div>;
export const ErrorState = ({ text, onRetry }: { text: string; onRetry: () => void }) => <div className="state err"><h3>{text}</h3><button className="btn primary" onClick={onRetry}>Try Again</button></div>;
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="overlay" onMouseDown={onClose}><div className="sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
    <div className="sheet-h"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon n="close" /></button></div>{children}</div></div>;
}
export function Qty({ value, onChange, max }: { value: number; onChange: (n: number) => void; max?: number }) {
  return <div className="qty"><button aria-label="Decrease quantity" onClick={() => onChange(value - 1)}><Icon n="minus" s={18} /></button><span>{value}</span>
    <button aria-label="Increase quantity" disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)}><Icon n="plus" s={18} /></button></div>;
}
export function Price({ p }: { p: Product }) {
  return <div className="price"><span className="lbl">Starting from</span><span className="pr"><b>{inr(effectivePrice(p.price, p.discount))}</b>{p.discount ? <s>{inr(p.price)}</s> : null}</span></div>;
}
export const SupportLink = ({ onSupport }: { onSupport: () => void }) => <div className="help"><div><b>Need help?</b><span>24x7 Expert Support</span></div><button className="btn outline" onClick={onSupport}>Support <Icon n="arrow" s={16} /></button></div>;
export function AddButton({ p }: { p: Product }) {
  const cart = useCart(); const q = cart.qtyOf(p.id);
  if (p.availability === 'out_of_stock') return <button className="btn ghost" disabled>Out of Stock</button>;
  return q === 0 ? <button className="btn outline" onClick={(e) => { e.stopPropagation(); cart.add(p.id); }}>Add to Cart</button>
    : <div onClick={(e) => e.stopPropagation()}><Qty value={q} max={p.stock} onChange={(n) => cart.setQty(p.id, n)} /></div>;
}
export const useAsync = <T,>(fn: () => Promise<T>, deps: unknown[]) => {
  const [s, set] = useState<{ data?: T; loading: boolean; error: boolean }>({ loading: true, error: false }); const [k, setK] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-state reset when deps change
  useEffect(() => { let live = true; set((x) => ({ ...x, loading: true, error: false })); fn().then((d) => live && set({ data: d, loading: false, error: false }), () => live && set({ loading: false, error: true })); return () => { live = false; };   }, [...deps, k]);
  return { ...s, retry: () => setK((x) => x + 1) };
};

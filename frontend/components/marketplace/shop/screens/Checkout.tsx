'use client';
import { useState } from 'react';

import { EmptyState, ErrorState, Icon, inr, Skeleton, SupportLink, useAsync } from '../components/ui';
import { effectivePrice, IS_DEMO,services } from '../services';
import { useCart } from '../store/CartContext';
import type { Address, Order } from '../types';
import { TotalsBox, useCartProducts } from './Cart';

export function Checkout({ address, onChangeAddress, onBack, onPlaced, onShop, onSupport }: { address?: Address; onChangeAddress: () => void; onBack: () => void; onPlaced: (o: Order) => void; onShop: () => void; onSupport: () => void }) {
  const cart = useCart(); const d = useCartProducts(); const pm = useAsync(() => services.payment.methods(), []); const [method, setMethod] = useState('upi'); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [placed, setPlaced] = useState(false);
  if (placed) return <div className="page"><Skeleton h={200} /></div>;
  if (cart.lines.length === 0) return <div className="page"><EmptyState title="Your cart is empty" text="Start shopping to add products." action={<button className="btn primary" onClick={onShop}>Continue Shopping</button>} /></div>;
  if (d.loading) return <div className="page"><Skeleton h={200} /></div>;
  const place = async () => {
    if (!address) return setErr('Please select a delivery address.'); setBusy(true); setErr('');
    try {
      // demo mode: the mock payment service would report a fake successful payment, so it is not called
      if (!IS_DEMO) { const pay = await services.payment.pay({ amount: d.totals.total, method }); if (!pay.ok) throw new Error('payment'); }
      const order = await services.orders.create({ lines: cart.lines, products: d.data!, totals: d.totals, address, paymentMethod: pm.data?.find((m) => m.id === method)?.label ?? method });
      setPlaced(true); cart.clear(); onPlaced(order);
    } catch { setErr('Unable to place your order. Please try again.'); setBusy(false); }
  };
  return <div className="page"><button className="back" onClick={onBack}><Icon n="back" /> Checkout</button>
    {d.error ? <ErrorState text="Unable to load your cart." onRetry={d.retry} /> : <div className="two"><div>
      <section className="box"><h3>Delivery Address</h3>{address ? <p><b>{address.label}</b><br />{address.line}</p> : <p>No address selected.</p>}<button className="btn outline" onClick={onChangeAddress}>{address ? 'Change' : 'Select Address'}</button></section>
      <section className="box"><h3>Order Items</h3>{d.items.map(({ line, p }) => <div className="sum-l" key={line.productId}><span>{p!.name} × {line.qty}</span><b>{inr(effectivePrice(p!.price, p!.discount) * line.qty)}</b></div>)}</section>
      <section className="box"><h3>Payment</h3>{pm.loading ? <Skeleton h={50} /> : pm.error ? <ErrorState text="Unable to load payment options." onRetry={pm.retry} /> : pm.data!.map((m) =>
        <label key={m.id} className="radio"><input type="radio" name="pay" checked={method === m.id} onChange={() => setMethod(m.id)} /> {m.label}</label>)}{IS_DEMO && <p className="note">Demo mode: nothing is charged, and no card or payment details are collected.</p>}</section></div>
      <aside className="summary"><h3>Total</h3><TotalsBox t={d.totals} />{err && <p className="note err">{err}</p>}<button className="btn primary wide" disabled={busy} onClick={place}>{busy ? 'Placing Order…' : `${IS_DEMO ? 'Place Demo Order' : 'Place Order'} · ${inr(d.totals.total)}`}</button>{IS_DEMO && <p className="note">This creates a sample order saved only in this browser. Nothing is sent to Hawk Aerospace.</p>}</aside></div>}<SupportLink onSupport={onSupport} /></div>;
}

export function OrderSuccess({ order, onTrack, onShop }: { order: Order; onTrack: () => void; onShop: () => void }) {
  return <div className="page success"><div className="tick"><Icon n="check" s={40} /></div><h1>{IS_DEMO ? 'Demo Order Created' : 'Order Placed Successfully'}</h1><p>{IS_DEMO ? 'This is a sample order saved only in this browser. No payment was taken and nothing was sent to Hawk Aerospace.' : 'Your order has been confirmed.'}</p>
    <p className="meta">Order ID</p><h2>{order.id}</h2><p><b>Total: {inr(order.totals.total)}</b></p><p className="meta">Delivering to: {order.address.line}</p>{!IS_DEMO && <p className="meta">Status: {order.status} · Estimated delivery {new Date(order.eta).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
    <div className="actions c"><button className="btn primary" onClick={onTrack}>{IS_DEMO ? 'View Order' : 'Track Order'}</button><button className="btn outline" onClick={onShop}>Continue Shopping</button></div></div>;
}

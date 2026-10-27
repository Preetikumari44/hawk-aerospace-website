'use client';
import { EmptyState, ErrorState, Icon, inr, ProductImage, Qty, Skeleton, SupportLink, useAsync } from '../components/ui';
import { effectivePrice,services } from '../services';
import { computeTotals,useCart } from '../store/CartContext';
import type { Totals } from '../types';

export function TotalsBox({ t }: { t: Totals }) {
  return <div className="totals"><div><span>Subtotal</span><span>{inr(t.subtotal)}</span></div><div><span>Delivery</span><span>{inr(t.delivery)}</span></div>
    <div><span>Discount</span><span>{t.discount ? '-' + inr(t.discount) : inr(0)}</span></div><div className="grand"><span>Total</span><span>{inr(t.total)}</span></div></div>;
}
export function useCartProducts() {
  const cart = useCart(); const all = useAsync(() => services.products.list({}), []);
  const items = cart.lines.map((l) => ({ line: l, p: all.data?.find((x) => x.id === l.productId) })).filter((x) => x.p);
  return { ...all, items, totals: computeTotals(cart.lines, all.data ?? []) };
}
export function Cart({ onBack, onCheckout, onShop, onSupport }: { onBack: () => void; onCheckout: () => void; onShop: () => void; onSupport: () => void }) {
  const cart = useCart(); const d = useCartProducts();
  return <div className="page"><button className="back" onClick={onBack}><Icon n="back" /> Shopping Cart</button>
    {d.loading ? <Skeleton h={120} /> : d.error ? <ErrorState text="Unable to update cart." onRetry={d.retry} /> :
      cart.lines.length === 0 ? <EmptyState title="Your cart is empty" text="Start shopping to add products." action={<button className="btn primary" onClick={onShop}>Continue Shopping</button>} /> : <>
        <div className="two"><div className="cart-items"><p className="meta">{cart.count} {cart.count === 1 ? 'Item' : 'Items'}</p>
          {d.items.map(({ line, p }) => <article className="line" key={line.productId}><div className="cimg"><ProductImage p={p!} /></div>
            <div className="grow"><h3>{p!.name}</h3><p className="desc">{p!.description}</p><b className="lp">{inr(effectivePrice(p!.price, p!.discount))}</b>
              <div className="line-a"><Qty value={line.qty} max={p!.stock} onChange={(n) => cart.setQty(line.productId, Math.max(1, n))} />
                <button className="btn ghost danger" onClick={() => cart.remove(line.productId)}><Icon n="trash" s={18} /> Remove</button></div></div></article>)}</div>
          <aside className="summary"><h3>Order Summary</h3><TotalsBox t={d.totals} /><button className="btn primary wide" onClick={onCheckout}>Proceed to Checkout</button></aside></div>
        <SupportLink onSupport={onSupport} /></>}
  </div>;
}

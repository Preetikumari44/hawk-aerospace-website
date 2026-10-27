'use client';
import { useState } from 'react';

import { ErrorState, Icon, inr, ProductImage, Qty, Skeleton, useAsync } from '../components/ui';
import { effectivePrice,services } from '../services';
import { useCart } from '../store/CartContext';

export function ProductDetails({ id, onBack, onCart }: { id: string; onBack: () => void; onCart: () => void }) {
  const r = useAsync(() => services.products.get(id), [id]); const cart = useCart(); const [qty, setQty] = useState(1); const [added, setAdded] = useState(false);
  if (r.loading) return <div className="page"><Skeleton h={260} /></div>;
  if (r.error || !r.data) return <div className="page"><ErrorState text="Unable to load this product." onRetry={r.retry} /></div>;
  const p = r.data;
  return <div className="page"><button className="back" onClick={onBack}><Icon n="back" /> Product Details</button>
    <div className="detail"><ProductImage p={p} /><div><h1>{p.name}</h1><p className="meta">Starting from</p><div className="price big"><b>{inr(effectivePrice(p.price, p.discount))}</b>{p.discount ? <s>{inr(p.price)}</s> : null}</div>
      <p className="full">{p.description}</p><p className="meta">{p.availability === 'out_of_stock' ? 'Out of stock' : p.availability === 'low_stock' ? `Only ${p.stock} left` : 'In stock'}</p>
      {p.availability !== 'out_of_stock' && <><p className="meta">Quantity</p><Qty value={qty} max={p.stock} onChange={(n) => setQty(Math.max(1, n))} />
        <div className="actions"><button className="btn primary" onClick={() => { cart.add(p.id, qty); setAdded(true); }}>{added ? '✓ Added to Cart' : 'Add to Cart'}</button>{cart.qtyOf(p.id) > 0 && <button className="btn outline" onClick={onCart}>View Cart</button>}</div></>}</div></div></div>;
}

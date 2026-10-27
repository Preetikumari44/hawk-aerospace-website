'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/sales/SalesProviders';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';

export default function SalesCart() {
  const router = useRouter();
  const { items, clearCart } = useCart();

  const grouped = new Map<string, { name: string; price: number; qty: number }>();
  for (const item of items) {
    const price = Number(String(item.price).replace(/[^0-9.-]/g, '')) || 0;
    const g = grouped.get(item.id) ?? { name: item.name, price, qty: 0 };
    g.qty += 1;
    grouped.set(item.id, g);
  }
  const lines = [...grouped.entries()];
  const subtotal = lines.reduce((s, [, g]) => s + g.price * g.qty, 0);

  return (
    <>
      <Link href="/sales/marketplace" className="text-small font-bold text-primary hover:underline">← Marketplace</Link>
      <h1 className="mt-1 text-h1 font-bold text-ink">Cart</h1>
      {lines.length === 0 ? (
        <Panel title="Empty">
          <p className="text-small text-ink-muted">Your cart is empty.</p>
          <Link href="/sales/marketplace" className="text-small font-bold text-primary hover:underline">Browse products →</Link>
        </Panel>
      ) : (
        <>
          <Panel title={`${items.length} item${items.length === 1 ? '' : 's'}`}>
            <ul>
              {lines.map(([id, g]) => (
                <li key={id} className="flex items-center justify-between gap-2 border-t py-2">
                  <span className="text-body text-ink">{g.qty}× {g.name}</span>
                  <span className="text-body font-bold text-ink">₹{(g.price * g.qty).toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-h2 font-bold text-ink">Subtotal: ₹{subtotal.toLocaleString('en-IN')}</p>
          </Panel>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearCart}>Clear</Button>
            <Button onClick={() => router.push('/sales/marketplace/checkout?mode=cart')}>Proceed to Checkout →</Button>
          </div>
        </>
      )}
    </>
  );
}

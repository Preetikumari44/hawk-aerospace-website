'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { customerApi, paymentApi } from '@/lib/booking/api-client';
import { openRazorpayCheckout } from '@/lib/booking/razorpay-checkout';
import { useCart } from '@/components/sales/SalesProviders';
import { useNotice } from '@/components/sales/SalesProviders';
import { getRawProducts, type RawProduct } from '@/lib/sales/services-root';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';
import { useAsync } from '@/components/sales/useAsync';

const inputCls = 'h-10 w-full rounded-sm border bg-card px-3 text-body text-ink outline-none';

interface Line {
  productId: string;
  productName: string;
  price: number;
  vendorUid: string;
  quantity: number;
}

function CheckoutInner({ mode, ref, qty }: { mode: string; ref: string; qty: number }) {
  const router = useRouter();
  const notify = useNotice();
  const { items, clearCart } = useCart();
  const catalog = useAsync(getRawProducts);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [method, setMethod] = useState<'cash' | 'gateway'>('gateway');
  const [coupon, setCoupon] = useState('');
  const [address, setAddress] = useState({ addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (catalog.status !== 'success') return;
    if (mode === 'cart') {
      const qtyById = new Map<string, number>();
      for (const item of items) qtyById.set(item.id, (qtyById.get(item.id) ?? 0) + 1);
      // Re-resolve numeric prices + vendor from catalog.
      const resolved: Line[] = [];
      for (const [id, qty] of qtyById) {
        const raw = catalog.data.find((p: RawProduct) => p.id === id);
        const seed = items.find((i) => i.id === id);
        const price = raw?.price ?? Number(String(seed?.price ?? '0').replace(/[^0-9.-]/g, '')) ?? 0;
        resolved.push({
          productId: id,
          productName: raw?.name ?? seed?.name ?? 'Product',
          price,
          vendorUid: raw?.vendorUid ?? 'marketplace',
          quantity: qty,
        });
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve cart once catalog loads.
      setLines(resolved);
    } else if (mode === 'buy') {
      const raw = catalog.data.find((p: RawProduct) => p.id === ref);
      setLines(
        raw
          ? [{ productId: raw.id, productName: raw.name, price: raw.price, vendorUid: raw.vendorUid, quantity: Math.max(1, qty) }]
          : [],
      );
    } else {
      setLines([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve once per catalog/mode.
  }, [catalog.status, mode]);

  const subtotal = (lines ?? []).reduce((s, l) => s + l.price * l.quantity, 0);

  function validAddress(): boolean {
    return Boolean(address.addressLine1.trim() && address.city.trim() && address.state.trim() && address.pincode.trim());
  }

  async function createOrders(paymentMethod: 'cod' | 'gateway', couponCode?: string): Promise<string[]> {
    const ids: string[] = [];
    const loc = [address.addressLine1, address.addressLine2, address.city, address.state, address.pincode]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
    for (const l of lines ?? []) {
      const created = (await customerApi.createOrder({
        productId: l.productId,
        productName: l.productName,
        price: l.price * l.quantity,
        vendorUid: l.vendorUid,
        deliveryLocation: loc,
        deliveryAddress: {
          addressLine1: address.addressLine1.trim(),
          ...(address.addressLine2.trim() ? { addressLine2: address.addressLine2.trim() } : {}),
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode.trim(),
        },
        deliveryDate: new Date(Date.now() + 7 * 864e5).toISOString(),
        paymentMethod,
        ...(couponCode ? { couponCode, originalPrice: l.price * l.quantity } : {}),
      })) as Record<string, unknown>;
      const oid = String(created.orderId ?? created.id ?? '');
      if (oid) ids.push(oid);
    }
    return ids;
  }

  async function pay() {
    if (!validAddress() && mode !== 'existing') {
      notify({ title: 'Address required', message: 'Fill Address Line 1, City, State, Pincode.' });
      return;
    }
    setPaying(true);
    const couponCode = coupon.trim().toUpperCase() || undefined;
    let createdIds: string[] = [];
    try {
      if (method === 'cash') {
        if (mode !== 'existing') await createOrders('cod', couponCode);
        if (mode === 'cart') clearCart();
        notify({ title: 'Order placed', message: 'Cash on delivery confirmed.' });
        router.push('/sales/marketplace/orders');
        return;
      }
      const orderIds = mode === 'existing' && ref ? [ref] : await createOrders('gateway', couponCode);
      createdIds = mode === 'existing' ? [] : orderIds;
      if (!orderIds.length) throw new Error('No orders to pay for.');
      const order = await paymentApi.createRazorpayOrder({ orderIds, ...(couponCode ? { couponCode } : {}) });
      const keyId = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
      if (!keyId) throw new Error('Razorpay key is not configured.');
      const result = await openRazorpayCheckout({ keyId, orderId: order.orderId, amount: order.amount });
      await paymentApi.verifyMarketplacePayment({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
        orderIds,
      });
      if (mode === 'cart') clearCart();
      notify({ title: 'Payment completed', message: 'Your order is confirmed.' });
      router.push('/sales/marketplace/orders');
    } catch (err) {
      if (createdIds.length > 0) paymentApi.abandonMarketplaceOrders(createdIds).catch(() => undefined);
      notify({ title: 'Payment failed', message: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <Link href="/sales/marketplace" className="text-small font-bold text-primary hover:underline">← Marketplace</Link>
      <h1 className="mt-1 text-h1 font-bold text-ink">Checkout</h1>
      <AsyncView query={catalog} loadingLines={3} errorTitle="Couldn't load catalog.">
        {() => (
          <>
            <Panel title={mode === 'existing' ? 'Existing order' : `Order summary · ₹${subtotal.toLocaleString('en-IN')}`}>
              {mode === 'existing' ? (
                <p className="text-body text-ink">Paying for order {ref}.</p>
              ) : (lines ?? []).length === 0 ? (
                <p className="text-small text-ink-muted">Nothing to check out.</p>
              ) : (
                <ul>
                  {(lines ?? []).map((l) => (
                    <li key={l.productId} className="flex justify-between gap-2 border-t py-2">
                      <span className="text-body text-ink">{l.quantity}× {l.productName}</span>
                      <span className="text-body font-bold text-ink">₹{(l.price * l.quantity).toLocaleString('en-IN')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            {mode !== 'existing' ? (
              <Panel title="Delivery address">
                <div className="grid gap-2 md:grid-cols-2">
                  <input value={address.addressLine1} onChange={(e) => setAddress((a) => ({ ...a, addressLine1: e.target.value }))} placeholder="Address line 1 *" className={inputCls} />
                  <input value={address.addressLine2} onChange={(e) => setAddress((a) => ({ ...a, addressLine2: e.target.value }))} placeholder="Address line 2" className={inputCls} />
                  <input value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} placeholder="City *" className={inputCls} />
                  <input value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} placeholder="State *" className={inputCls} />
                  <input value={address.pincode} onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))} placeholder="Pincode *" className={inputCls} />
                </div>
              </Panel>
            ) : null}
            <Panel title="Payment">
              <div className="flex gap-2">
                <Button variant={method === 'gateway' ? 'primary' : 'outline'} onClick={() => setMethod('gateway')}>Online</Button>
                <Button variant={method === 'cash' ? 'primary' : 'outline'} onClick={() => setMethod('cash')}>Cash</Button>
              </div>
              <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Coupon (optional)" className={`${inputCls} mt-2`} />
              <div className="mt-3">
                <Button disabled={paying} onClick={() => void pay()}>
                  {paying ? 'Processing…' : method === 'cash' ? 'Place COD Order' : 'Pay & Place Order'}
                </Button>
              </div>
            </Panel>
          </>
        )}
      </AsyncView>
    </>
  );
}

function CheckoutPage() {
  const search = useSearchParams();
  return (
    <CheckoutInner
      mode={search.get('mode') ?? 'cart'}
      ref={search.get('id') ?? search.get('order') ?? ''}
      qty={Number(search.get('qty') ?? 1) || 1}
    />
  );
}

export default function SalesCheckoutPage() {
  return (
    <Suspense fallback={<p className="text-small text-ink-muted">Loading…</p>}>
      <CheckoutPage />
    </Suspense>
  );
}

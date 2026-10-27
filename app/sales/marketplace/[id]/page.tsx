'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAsync } from '@/components/sales/useAsync';
import { useCart } from '@/components/sales/SalesProviders';
import { getRawProducts, type RawProduct } from '@/lib/sales/services-root';
import type { Product } from '@/lib/sales/types';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';
import { getProducts } from '@/lib/sales/services/marketplace';

function toCartProduct(p: RawProduct): Product {
  return {
    id: p.id,
    name: p.name,
    price: `₹${p.price.toLocaleString('en-IN')}`,
    category: (['Fertilizers', 'Farming Equipments'].includes(p.category) ? p.category : 'Fertilizers') as Product['category'],
    image: p.image,
  };
}

export default function SalesProductDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '');
  const router = useRouter();
  const { addToCart } = useCart();
  const raw = useAsync(getRawProducts);
  const fallback = useAsync(getProducts);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <>
      <Link href="/sales/marketplace" className="text-small font-bold text-primary hover:underline">← Marketplace</Link>
      <AsyncView query={raw} loadingLines={4} errorTitle="Couldn't load product.">
        {(list) => {
          const found =
            list.find((p) => p.id === decodeURIComponent(id)) ??
            (fallback.status === 'success'
              ? fallback.data
                  .filter((p) => p.id === decodeURIComponent(id))
                  .map((p) => ({
                    id: p.id,
                    name: p.name,
                    price: Number(String(p.price).replace(/[^0-9.-]/g, '')) || 0,
                    vendorUid: 'marketplace',
                    category: p.category,
                    description: '',
                    image: p.image,
                  }))[0]
              : undefined);
          if (!found) return <p className="mt-6 text-center text-body text-ink-muted">Product not found.</p>;
          const total = found.price * quantity;
          return (
            <Panel title={found.name}>
              <p className="text-small text-ink-muted">{found.category}</p>
              {found.description ? <p className="mt-1 text-body text-ink">{found.description}</p> : null}
              <p className="mt-2 text-h2 font-bold text-ink">₹{found.price.toLocaleString('en-IN')}</p>
              <p className="text-small text-ink-muted">Delivery by {new Date(Date.now() + 7 * 864e5).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-small text-ink-muted">Quantity</span>
                <Button variant="outline" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</Button>
                <span className="min-w-6 text-center text-body font-bold text-ink">{quantity}</span>
                <Button variant="outline" onClick={() => setQuantity((q) => q + 1)}>+</Button>
              </div>
              <p className="mt-2 text-h3 font-semibold text-ink">Total: ₹{total.toLocaleString('en-IN')}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    for (let i = 0; i < quantity; i++) addToCart(toCartProduct(found));
                    setAdded(true);
                    setTimeout(() => setAdded(false), 1200);
                  }}
                >
                  {added ? 'Added ✓' : 'Add to cart'}
                </Button>
                <Button
                  onClick={() => {
                    for (let i = 0; i < quantity; i++) addToCart(toCartProduct(found));
                    router.push('/sales/marketplace/checkout?mode=cart');
                  }}
                >
                  Buy Now
                </Button>
              </div>
            </Panel>
          );
        }}
      </AsyncView>
    </>
  );
}

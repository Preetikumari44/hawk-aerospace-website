'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/sales/SalesProviders';
import type { Product } from '@/lib/sales/types';

interface ProductCardProps {
  product: Product;
  /** `scroller` = fixed-width card inside a horizontal strip; `grid` = fills its grid cell. */
  variant?: 'scroller' | 'grid';
}

export default function ProductCard({ product, variant = 'scroller' }: ProductCardProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1200);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <article className={`rounded-2xl border border-border bg-card p-2 text-card-foreground ${variant === 'scroller' ? 'w-[130px] shrink-0' : 'w-full min-w-0'}`}>
      <div className="mb-1 h-[70px] overflow-hidden rounded-xl">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>
      <h3 className="line-clamp-2 min-h-8 text-sm font-semibold text-foreground">
        <Link href={`/sales/marketplace/${encodeURIComponent(product.id)}`} className="hover:underline">
          {product.name}
        </Link>
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Starting from</p>
      <p className="mb-1 text-sm font-semibold text-foreground">{product.price}</p>
      <button
        type="button"
        onClick={() => {
          addToCart(product);
          setAdded(true);
        }}
        className={`min-h-10 w-full rounded-xl border border-primary text-xs font-bold transition-colors ${
          added ? 'bg-primary text-primary-foreground' : 'text-brand hover:bg-muted'
        }`}
      >
        {added ? 'Added ✓' : 'Add to Cart'}
      </button>
    </article>
  );
}

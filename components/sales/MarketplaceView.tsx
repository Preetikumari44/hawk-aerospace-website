'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAsync } from '@/components/sales/useAsync';
import { getProducts } from '@/lib/sales/services/marketplace';
import { useCart } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import FilterTabs from '@/components/sales/ui/FilterTabs';
import ProductCard from './ProductCard';

const CATEGORIES = ['All', 'Fertilizers', 'Farming Equipments'] as const;
type Category = (typeof CATEGORIES)[number];

export default function MarketplaceView() {
  const products = useAsync(getProducts);
  const { count } = useCart();
  const [category, setCategory] = useState<Category>('All');

  const filtered = useMemo(
    () => (products.status === 'success' ? (category === 'All' ? products.data : products.data.filter((p) => p.category === category)) : []),
    [products, category],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">Marketplace</h1>
        <div className="flex items-center gap-3">
          <Link href="/sales/marketplace/orders" className="text-xs font-bold text-brand hover:underline">
            Orders
          </Link>
          <Link href="/sales/marketplace/cart" className="text-sm font-bold text-brand hover:underline">
            Cart: {count} item{count === 1 ? '' : 's'} →
          </Link>
        </div>
      </div>
      <FilterTabs label="Filter products by category" items={CATEGORIES} value={category} onChange={setCategory} />
      <AsyncView query={products} loadingLines={4} errorTitle="Couldn't load products.">
        {() =>
          filtered.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">No products in this category.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} variant="grid" />
              ))}
            </div>
          )
        }
      </AsyncView>
    </>
  );
}

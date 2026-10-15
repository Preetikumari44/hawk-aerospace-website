'use client';
import { useEffect, useState } from 'react';

import { AddButton, EmptyState, ErrorState, Icon, Price, ProductImage, Skeleton, useAsync } from '../components/ui';
import { services } from '../services';
import type { Product } from '../types';

export function Marketplace({ onOpen, onSupport }: { onOpen: (id: string) => void; onSupport: () => void }) {
  const [search, setSearch] = useState(''); const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(search), 250); return () => clearTimeout(t); }, [search]);
  const cats = useAsync(() => services.products.categories(), []); const promos = useAsync(() => services.products.promotions(), []);
  const prods = useAsync(() => services.products.list({ search: q, category: cat }), [q, cat]);
  return <div className="page wide">
    <h1 className="title">Marketplace Products</h1>
    <label className="search"><input type="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" /><Icon n="search" /></label>
    <h2 className="sec">Select Categories</h2>
    <div className="chips">
      {cats.loading ? [1, 2, 3].map((i) => <Skeleton key={i} h={44} w="130px" />) : cats.error ? <ErrorState text="Unable to load categories." onRetry={cats.retry} /> :
        cats.data!.map((c) => <button key={c.id} aria-pressed={cat === c.id} className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(cat === c.id ? '' : c.id)}>{cat === c.id && <Icon n="check" s={16} />}{c.name}</button>)}
    </div>
    <div className="list">
      {prods.loading ? [1, 2, 3].map((i) => <Skeleton key={i} h={140} />) : prods.error ? <ErrorState text="Unable to load products." onRetry={prods.retry} /> :
        prods.data!.length === 0 ? <EmptyState title="No products found" text="Try another category or search term." /> : prods.data!.map((p) => <Card key={p.id} p={p} onOpen={onOpen} />)}
    </div>
    <h2 className="sec">Promotions &amp; Offers</h2>
    <div className="promos">{promos.loading ? <Skeleton h={130} /> : promos.error ? <ErrorState text="Unable to load offers." onRetry={promos.retry} /> :
      promos.data!.map((o) => <article key={o.id} className={'promo ' + o.tone}><span className="tag">{o.tag}</span><h3>{o.title}</h3><p>{o.subtitle}</p>
        {/* TODO: connect to the Hawk Aerospace offer/redeem service when available */}
        <button className="btn amber" onClick={() => alert(`${o.title} — ${o.subtitle}\nSample offer: redemption is not available yet and no discount is applied at checkout.`)}>{o.cta} <Icon n="arrow" s={16} /></button></article>)}</div>
    <section className="support"><div><h2>24x7 Expert Support</h2><p>Get help from our support team anytime</p><button className="btn light" onClick={onSupport}>Support <Icon n="arrow" s={16} /></button></div><Icon n="phone" s={56} /></section>
  </div>;
}
function Card({ p, onOpen }: { p: Product; onOpen: (id: string) => void }) {
  return <article className="card" onClick={() => onOpen(p.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(p.id)}>
    <ProductImage p={p} /><div className="card-b"><h3>{p.name}</h3><p className="desc">{p.description}</p>{(p.rating || p.availability !== 'in_stock') && <p className="mini">{p.rating ? `★ ${p.rating}` : ''}{p.rating && p.availability !== 'in_stock' ? ' · ' : ''}{p.availability === 'low_stock' ? `Only ${p.stock} left` : p.availability === 'out_of_stock' ? 'Out of stock' : ''}</p>}<div className="card-f"><Price p={p} /><AddButton p={p} /></div></div></article>;
}

'use client';
import Link from 'next/link';
import { createContext, type ReactNode,useContext, useEffect, useState } from 'react';

import { IS_DEMO,services } from '../services';
import { CartProvider, useCart } from '../store/CartContext';
import type { Address } from '../types';
import { LocationModal, SupportModal } from './Modals';
import { Icon } from './ui';

// Marketplace chrome inside the main Hawk Aerospace site. The site header and
// footer come from app/marketplace/layout.tsx; this shell only adds the
// marketplace-specific bar (delivery location, cart, order history), the single
// CartProvider and the location / support modals. Main navigation (Solutions,
// Technology, Platforms, ...) stays with the site header.

interface ShellCtx { address?: Address; openLocation(): void; openSupport(): void; }
const S = createContext<ShellCtx>(null!);
export const useShell = () => useContext(S);

function Shell({ children }: { children?: ReactNode }) {
  const [addr, setAddr] = useState<Address | undefined>(); const [modal, setModal] = useState<'' | 'loc' | 'support'>('');
  // the selected address is stored in localStorage, so it is read after mount
  // eslint-disable-next-line react-hooks/set-state-in-effect -- selected address lives in localStorage; read after mount so server and client markup match
  useEffect(() => setAddr(services.location.selected()), []);
  const cart = useCart();
  return <S.Provider value={{ address: addr, openLocation: () => setModal('loc'), openSupport: () => setModal('support') }}><div className="mp">
    <div className="top"><div className="top-in">
      <button className="loc" onClick={() => setModal('loc')} aria-label="Change delivery location"><Icon n="pin" /><span><small>Delivering to</small><b>{addr ? addr.line : '\u00a0'}</b></span></button>
      <div className="right"><div className="tools">
        <Link className="icon-btn cartb" href="/marketplace/cart" aria-label={`Cart, ${cart.count} items`}><Icon n="cart" />{cart.count > 0 && <span key={cart.count} className="count">{cart.count}</span>}</Link>
        <Link className="icon-btn hist" href="/marketplace/orders"><Icon n="history" /><span>Order History</span></Link></div></div></div></div>
    {IS_DEMO && <p className="demo-note" role="note"><b>Demo storefront.</b> Products, prices, offers, orders and delivery details are sample data. No payment is taken and no real order is placed.</p>}
    <main>{children}</main>
    {modal === 'loc' && <LocationModal selected={addr} onSelect={setAddr} onClose={() => setModal('')} />}
    {modal === 'support' && <SupportModal onClose={() => setModal('')} />}
  </div></S.Provider>;
}
export default function HawkMarketplace(props: { children?: ReactNode }) { return <CartProvider><Shell {...props} /></CartProvider>; }

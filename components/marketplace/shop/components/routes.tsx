'use client';
// Thin client wrappers that connect the existing screens to Next.js navigation.
import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { Cart } from '../screens/Cart';
import { Checkout, OrderSuccess } from '../screens/Checkout';
import { Marketplace } from '../screens/Marketplace';
import { OrderHistory, OrderTracking } from '../screens/Orders';
import { ProductDetails } from '../screens/ProductDetails';
import { services } from '../services';
import { useCart } from '../store/CartContext';
import { useShell } from './MarketplaceShell';
import { ErrorState, Skeleton, useAsync } from './ui';

const HOME = '/marketplace';
function useNav() {
  const router = useRouter();
  return {
    go: (to: string) => router.push(to), replace: (to: string) => router.replace(to), shop: () => router.push(HOME),
    back: () => (window.history.length > 1 ? router.back() : router.push(HOME)),
  };
}
// the saved cart is loaded after mount; hold the cart-dependent pages until then
function CartReady({ children }: { children: ReactNode }) {
  const { ready } = useCart();
  return ready ? <>{children}</> : <div className="page"><Skeleton h={200} /></div>;
}

export function MarketplaceRoute() {
  const nav = useNav(); const shell = useShell();
  return <Marketplace onOpen={(id) => nav.go(`${HOME}/${id}`)} onSupport={shell.openSupport} />;
}
export function ProductRoute() {
  const nav = useNav(); const { productId } = useParams<{ productId: string }>();
  return <ProductDetails id={productId} onBack={nav.back} onCart={() => nav.go(`${HOME}/cart`)} />;
}
export function CartRoute() {
  const nav = useNav(); const shell = useShell();
  return <CartReady><Cart onBack={nav.back} onShop={nav.shop} onSupport={shell.openSupport} onCheckout={() => nav.go(`${HOME}/checkout`)} /></CartReady>;
}
export function CheckoutRoute() {
  const nav = useNav(); const shell = useShell();
  return <CartReady><Checkout address={shell.address} onChangeAddress={shell.openLocation} onBack={nav.back} onShop={nav.shop} onSupport={shell.openSupport} onPlaced={(order) => nav.replace(`${HOME}/orders/${order.id}/success`)} /></CartReady>;
}
export function OrdersRoute() {
  const nav = useNav();
  return <OrderHistory onBack={nav.back} onShop={nav.shop} onTrack={(id) => nav.go(`${HOME}/orders/${id}`)} />;
}
export function TrackRoute() {
  const nav = useNav(); const { orderId } = useParams<{ orderId: string }>();
  return <OrderTracking id={orderId} onBack={nav.back} />;
}
export function SuccessRoute() {
  const nav = useNav(); const { orderId } = useParams<{ orderId: string }>();
  const r = useAsync(() => services.orders.get(orderId), [orderId]);
  if (r.loading) return <div className="page"><Skeleton h={260} /></div>;
  if (r.error || !r.data) return <div className="page"><ErrorState text="Unable to load this order." onRetry={r.retry} /></div>;
  return <OrderSuccess order={r.data} onTrack={() => nav.go(`${HOME}/orders/${r.data!.id}`)} onShop={nav.shop} />;
}

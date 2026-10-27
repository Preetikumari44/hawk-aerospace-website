'use client';

// Cart, notices (replaces window.alert) and the signed-in profile for the /sales module.
// Cart behaviour is unchanged from the original CartContext: in-memory, per session.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Modal from '@/components/sales/ui/Modal';
import { useAsync, type AsyncQuery } from '@/components/sales/useAsync';
import { getProfile } from '@/lib/sales/services/profile';
import type { Product, Profile } from '@/lib/sales/types';

interface CartItem extends Product {
  cartId: string;
}

interface CartValue {
  items: CartItem[];
  count: number;
  addToCart: (product: Product) => void;
  clearCart: () => void;
}

interface Notice {
  title: string;
  message: string;
}

const CartContext = createContext<CartValue | null>(null);
const NoticeContext = createContext<((notice: Notice) => void) | null>(null);
const ProfileContext = createContext<AsyncQuery<Profile> | null>(null);

function useRequired<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`${name} must be used within SalesProviders`);
  return value;
}

export const useCart = () => useRequired(useContext(CartContext), 'useCart');
export const useNotice = () => useRequired(useContext(NoticeContext), 'useNotice');
export const useProfile = () => useRequired(useContext(ProfileContext), 'useProfile');

export default function SalesProviders({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const profile = useAsync(getProfile);

  const addToCart = useCallback((product: Product) => {
    setItems((prev) => [...prev, { ...product, cartId: `${product.id}-${Date.now()}` }]);
  }, []);
  const clearCart = useCallback(() => setItems([]), []);
  const cart = useMemo<CartValue>(
    () => ({ items, count: items.length, addToCart, clearCart }),
    [items, addToCart, clearCart],
  );

  const closeNotice = useCallback(() => setNotice(null), []);

  return (
    <CartContext.Provider value={cart}>
      <NoticeContext.Provider value={setNotice}>
        <ProfileContext.Provider value={profile}>
          {children}
          <Modal open={notice !== null} title={notice?.title ?? ''} onClose={closeNotice}>
            {notice?.message}
          </Modal>
        </ProfileContext.Provider>
      </NoticeContext.Provider>
    </CartContext.Provider>
  );
}

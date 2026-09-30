// src/utils/CartContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = useCallback((product) => {
    setItems((prev) => [...prev, { ...product, cartId: `${product.id}-${Date.now()}` }]);
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = { items, count: items.length, addToCart, clearCart };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

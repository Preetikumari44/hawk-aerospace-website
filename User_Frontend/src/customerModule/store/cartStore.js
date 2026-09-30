import { useEffect, useState } from 'react';

// Minimal in-memory cart store shared across screens without needing to
// wrap the app in a Context Provider. Data is kept for the app session only.

let cartItems = [];
const listeners = new Set();

const notify = () => {
    listeners.forEach((listener) => listener(cartItems));
};

const getProductId = (product) => product.productId || product.id;

export const addToCart = (product, quantity = 1) => {
    const id = getProductId(product);
    const existing = cartItems.find((item) => getProductId(item.product) === id);

    if (existing) {
        cartItems = cartItems.map((item) =>
            getProductId(item.product) === id
                ? { ...item, quantity: item.quantity + quantity }
                : item,
        );
    } else {
        cartItems = [...cartItems, { product, quantity }];
    }

    notify();
};

export const removeFromCart = (productId) => {
    cartItems = cartItems.filter((item) => getProductId(item.product) !== productId);
    notify();
};

export const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    cartItems = cartItems.map((item) =>
        getProductId(item.product) === productId ? { ...item, quantity } : item,
    );
    notify();
};

export const clearCart = () => {
    cartItems = [];
    notify();
};

export const getCartItems = () => cartItems;

export const getCartCount = () => cartItems.reduce((sum, item) => sum + item.quantity, 0);

export const getCartTotal = () =>
    cartItems.reduce((sum, item) => {
        const price = Number(item.product.price || item.product.startingPrice || 0);
        return sum + price * item.quantity;
    }, 0);

// React hook: re-renders the component whenever the cart changes.
export const useCart = () => {
    const [items, setItems] = useState(cartItems);

    useEffect(() => {
        const listener = (next) => setItems(next);
        listeners.add(listener);
        return () => listeners.delete(listener);
    }, []);

    return {
        items,
        count: items.reduce((sum, item) => sum + item.quantity, 0),
        total: items.reduce((sum, item) => {
            const price = Number(item.product.price || item.product.startingPrice || 0);
            return sum + price * item.quantity;
        }, 0),
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
    };
};
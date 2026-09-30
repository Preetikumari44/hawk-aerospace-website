import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getMockTechnician } from '../data/technicianData';
import { technicianApi } from '../../../utils/api';

// Centralized, replaceable application state: technician identity,
// cart, orders and notifications. Every screen/component reads this
// via useApp() instead of importing fixed values, so wiring up real
// authentication/API data later means changing ONLY the calls inside
// this provider (e.g. replacing getMockTechnician() with a fetched
// user), never the UI layer.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [technician, setTechnician] = useState(getMockTechnician());
  const [dashboardTickets, setDashboardTickets] = useState([]);
  const [dashboardEarnings, setDashboardEarnings] = useState(null);
  const [dashboardIncoming, setDashboardIncoming] = useState([]);
  const [cartItems, setCartItems] = useState([]);

  // Use the SuperApp's authenticated technician APIs when available.
  // The visual dashboard remains usable with its bundled fallback data.
  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      technicianApi.getProfile().catch(() => null),
      technicianApi.getTickets().catch(() => []),
      technicianApi.getIncomingTickets().catch(() => []),
      technicianApi.getEarnings().catch(() => null),
    ]).then(([profile, tickets, incoming, earnings]) => {
      if (!mounted) return;
      if (profile) setTechnician((prev) => ({ ...prev, ...profile, name: profile.name || profile.fullName || prev.name }));
      const list = Array.isArray(tickets) ? tickets : tickets?.items || tickets?.data || [];
      const incomingList = Array.isArray(incoming) ? incoming : incoming?.items || incoming?.data || [];
      setDashboardTickets(list);
      setDashboardIncoming(incomingList);
      setDashboardEarnings(earnings);
    });
    return () => { mounted = false; };
  }, []); // { product, quantity }
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]); // populated by real events later

  const addToCart = useCallback((product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateCartQuantity = useCallback((productId, quantity) => {
    setCartItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }
      return prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i));
    });
  }, []);

  const checkout = useCallback(() => {
    if (cartItems.length === 0) return null;
    const order = {
      id: `ORD-${Date.now()}`,
      items: cartItems,
      total: cartItems.reduce((sum, i) => sum + i.product.startingFrom * i.quantity, 0),
      placedAt: new Date().toISOString(),
    };
    setOrders((prev) => [order, ...prev]);
    setCartItems([]);
    return order;
  }, [cartItems]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems]
  );
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.product.startingFrom * i.quantity, 0),
    [cartItems]
  );

  const activeTicket = dashboardTickets.find((t) => ['accepted', 'in_progress', 'repairing'].includes(t?.status)) || null;
  const nextTicket = dashboardTickets.find((t) => ['scheduled', 'assigned', 'upcoming'].includes(t?.status)) || dashboardTickets.find((t) => t !== activeTicket) || null;
  const totalEarnings = dashboardEarnings?.totalEarnings ?? dashboardEarnings?.total ?? dashboardEarnings?.amount ?? 0;
  const overview = {
    totalEarnings,
    totalRepairs: dashboardTickets.filter((t) => ['completed', 'closed'].includes(t?.status)).length,
    upcomingTickets: dashboardTickets.filter((t) => ['scheduled', 'assigned', 'upcoming'].includes(t?.status)).length,
    rejectedTickets: dashboardTickets.filter((t) => ['rejected', 'declined'].includes(t?.status)).length,
  };

  const value = useMemo(
    () => ({
      technician,
      setTechnician,
      cartItems,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      cartCount,
      cartSubtotal,
      orders,
      checkout,
      notifications,
      dashboardTickets,
      dashboardIncoming,
      dashboardEarnings,
      activeTicket,
      nextTicket,
      incomingTicketsCount: dashboardIncoming.length,
      overview,
    }),
    [
      technician,
      cartItems,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      cartCount,
      cartSubtotal,
      orders,
      checkout,
      notifications,
      dashboardTickets,
      dashboardIncoming,
      dashboardEarnings,
      activeTicket,
      nextTicket,
      overview,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}

export default AppContext;

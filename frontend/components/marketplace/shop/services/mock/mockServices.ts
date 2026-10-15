import type { Order } from '../../types';
import type { Services } from '../contracts';
import { addresses, categories, products, promotions, seedOrders } from './data';
const wait = <T,>(v: T, ms = 450) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
export const effectivePrice = (price: number, discount?: number) => Math.round(price * (1 - (discount ?? 0) / 100));

export const mockServices: Services = {
  products: {
    async list({ search, category }) {
      const q = (search ?? '').trim().toLowerCase();
      return wait(products.filter((p) => (!category || p.category === category) && (!q || [p.name, p.description, p.category, p.seller].some((s) => s.toLowerCase().includes(q)))));
    },
    get: (id) => wait(products.find((p) => p.id === id), 200),
    categories: () => wait(categories, 250),
    promotions: () => wait(promotions, 300),
  },
  cart: { load: () => ls.get('hawk.cart', []), save: (l) => ls.set('hawk.cart', l) },
  orders: {
    async create({ lines, products: ps, totals, address, paymentMethod }) {
      const num = ls.get<number>('hawk.orderSeq', 10234) + 1; ls.set('hawk.orderSeq', num);
      const order: Order = {
        id: `HA-${num}`, status: 'Order Placed', createdAt: new Date().toISOString(), eta: new Date(Date.now() + 3 * 864e5).toISOString(), paymentMethod, address, totals,
        items: lines.map((l) => { const pr = ps.find((x) => x.id === l.productId)!; return { productId: pr.id, name: pr.name, qty: l.qty, unitPrice: effectivePrice(pr.price, pr.discount) }; }),
      };
      ls.set('hawk.orders', [order, ...ls.get<Order[]>('hawk.orders', seedOrders())]);
      return wait(order, 700);
    },
    list: () => wait(ls.get<Order[]>('hawk.orders', seedOrders()), 350),
    async get(id) { return wait(ls.get<Order[]>('hawk.orders', seedOrders()).find((o) => o.id === id), 250); },
  },
  location: {
    saved: () => wait(ls.get('hawk.addresses', addresses), 250),
    selected: () => ls.get('hawk.selectedAddress', addresses[0]),
    select: (a) => ls.set('hawk.selectedAddress', a),
    async add(a) { const n = { id: 'a' + Date.now(), ...a }; ls.set('hawk.addresses', [...ls.get('hawk.addresses', addresses), n]); return wait(n, 300); },
    resolveCurrent: ({ lat, lng }) => wait({ id: 'cur', label: 'Current Location', line: `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}` }, 400),
  },
  payment: {
    methods: () => wait([{ id: 'upi', label: 'UPI' }, { id: 'card', label: 'Credit / Debit Card' }, { id: 'cod', label: 'Cash on Delivery' }], 200),
    pay: () => wait({ ok: true, reference: 'PAY-' + Date.now() }, 600),
  },
  support: {
    contact: () => wait({ phone: '+91 80 0000 0000', email: 'support@hawkaerospace.example', hours: '24 x 7' }, 200),
    createTicket: () => wait({ ticketId: 'TKT-' + Math.floor(Math.random() * 90000 + 10000) }, 500),
  },
};

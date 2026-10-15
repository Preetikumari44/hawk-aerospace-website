// Contracts the UI depends on. Replace the mock implementations in services/index.ts
// with real Hawk Aerospace API clients that satisfy these interfaces.
import type { Address, CartLine, Category, Order, PaymentMethod,Product, Promotion, SupportContact, Totals } from '../types';
export interface ProductService { list(q: { search?: string; category?: string }): Promise<Product[]>; get(id: string): Promise<Product | undefined>; categories(): Promise<Category[]>; promotions(): Promise<Promotion[]>; }
export interface CartService { load(): CartLine[]; save(lines: CartLine[]): void; }
export interface OrderService { create(i: { lines: CartLine[]; products: Product[]; totals: Totals; address: Address; paymentMethod: string }): Promise<Order>; list(): Promise<Order[]>; get(id: string): Promise<Order | undefined>; }
export interface LocationService { saved(): Promise<Address[]>; selected(): Address | undefined; select(a: Address): void; add(a: { label: string; line: string }): Promise<Address>; resolveCurrent(c: { lat: number; lng: number }): Promise<Address>; }
export interface PaymentService { methods(): Promise<PaymentMethod[]>; pay(i: { amount: number; method: string }): Promise<{ ok: boolean; reference: string }>; }
export interface SupportService { contact(): Promise<SupportContact>; createTicket(msg: string): Promise<{ ticketId: string }>; }
export interface Services { products: ProductService; cart: CartService; orders: OrderService; location: LocationService; payment: PaymentService; support: SupportService; }

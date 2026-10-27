export interface Product { id: string; name: string; description: string; category: string; image?: string; price: number; discount?: number; stock: number; seller: string; rating?: number; availability: 'in_stock' | 'low_stock' | 'out_of_stock'; specifications: Record<string, string>; }
export interface Category { id: string; name: string; }
export interface Promotion { id: string; tag: string; title: string; subtitle: string; cta: string; tone: 'green' | 'amber'; }
export interface Address { id: string; label: string; line: string; }
export interface CartLine { productId: string; qty: number; }
export type OrderStatus = 'Order Placed' | 'Processing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
export const STATUS_FLOW: OrderStatus[] = ['Order Placed', 'Processing', 'Out for Delivery', 'Delivered'];
export interface OrderItem { productId: string; name: string; qty: number; unitPrice: number; }
export interface Totals { subtotal: number; delivery: number; discount: number; total: number; }
export interface Order { id: string; items: OrderItem[]; totals: Totals; address: Address; status: OrderStatus; createdAt: string; eta: string; paymentMethod: string; }
export interface SupportContact { phone: string; email: string; hours: string; }
export interface PaymentMethod { id: string; label: string; }

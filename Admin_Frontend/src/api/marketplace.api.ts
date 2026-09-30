/** Marketplace API — orders, stats, products, support tickets */

import { api } from './client';

export interface MarketplaceStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalVendors: number;
  totalSupportTickets: number;
  totalRefunds: number;
  revenueTimeSeries?: Array<{ date: string; revenue: number }>;
  ordersTimeSeries?: Array<{ date: string; count: number }>;
}

export interface MarketplaceOrder {
  orderId: string;
  productName: string;
  status: string;
  price: number;
  customerUid: string;
  vendorId: string;
  vendorName: string;
  deliveryLocation: string;
  deliveryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  ticketId: string;
  orderId: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface OrdersResponse {
  items: MarketplaceOrder[];
  total: number;
  page: number;
  limit: number;
}

export const marketplaceApi = {
  getStats: () =>
    api.get<MarketplaceStats>('/marketplace/stats'),

  getOrders: (params?: string) =>
    api.get<OrdersResponse>(`/marketplace/orders${params ? `?${params}` : ''}`),

  getOrder: (id: string) =>
    api.get<MarketplaceOrder>(`/marketplace/orders/${id}`),

  updateOrderStatus: (id: string, status: string) =>
    api.patch<MarketplaceOrder>(`/marketplace/orders/${id}/status`, { status }),

  getSupportTickets: (status?: string) =>
    api.get<SupportTicket[]>(`/marketplace/support-tickets${status ? `?status=${status}` : ''}`),

  getProducts: (vendorId?: string) =>
    api.get<unknown[]>(`/marketplace/products${vendorId ? `?vendorId=${vendorId}` : ''}`),
};

/** Marketplace data interfaces */

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

export interface DeliveryAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface MarketplaceOrder {
  orderId: string;
  productId?: string;
  productName: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled' | 'refunded';
  price: number;
  originalPrice?: number;
  couponCode?: string;
  couponDiscount?: number;
  customerUid: string;
  vendorUid: string;
  vendorName: string;
  deliveryLocation: string;
  deliveryAddress?: DeliveryAddress | null;
  deliveryDate: string;
  /** ISO timestamp used for expiry/auto-complete checks (deliveryDate is a display string). */
  deliveryDateISO?: string | null;
  paymentMethod?: 'cod' | 'gateway';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  /** Set once the Razorpay payment covering this order has been verified. */
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceProduct {
  productId: string;
  name: string;
  category: string;
  price: number;
  vendorUid: string;
  vendorName: string;
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
}

export interface SupportTicket {
  ticketId: string;
  orderId: string;
  customerUid: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceOrderFilter {
  status?: string;
  vendorUid?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

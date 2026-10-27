// Technician workspace types — teammate shapes (technician-dashboard
// next-web + mobile), backend-mapped in lib/tech/data.ts.

export interface TechTicket {
  id: string;
  title: string;
  issue: string;
  status: string;
  priority: string;
  date: string;
  droneName: string;
  raisedBy: string;
  meta: string;
}

export interface TechProduct {
  id: string;
  name: string;
  description: string;
  startingFrom: number;
  category?: string;
  vendorUid?: string;
  rating?: number;
}

export interface TechCartItem {
  product: TechProduct;
  quantity: number;
}

export interface TechOrder {
  id: string;
  items: { product: TechProduct; quantity: number }[];
  total: number;
  placedAt: string;
}

export interface TechNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export interface TechProfile {
  name: string;
  phone: string;
  email: string;
  role: string;
  id: string;
  address: string;
  rating: string;
  status: string;
  statusDescription: string;
}

// Sales workspace services — backend-first with seed fallback.
//
// Each loader tries the live Super App endpoint and falls back to the
// teammate's seed data ONLY on failure, mapping backend shapes onto the exact
// teammate types so every ported component keeps working unchanged.

import { apiRequest } from '@/lib/booking/api-client';
import { aggregatorApi } from '@/lib/booking/role-apis';
import type {
  Booking,
  BookingStatus,
  CommissionEntry,
  CommissionStatus,
  Product,
  ProductCategory,
  Profile,
  Promotion,
  SalesNotification,
  SalesPerformance,
  SalesSummary,
  SupportInfo,
} from '@/lib/sales/types';
import { bookings as seedBookings } from '@/lib/sales/services/seed/bookings';
import { commissionHistory as seedCommission } from '@/lib/sales/services/seed/commission';
import { notifications as seedNotifications } from '@/lib/sales/services/seed/notifications';
import { products as seedProducts } from '@/lib/sales/services/seed/products';
import { profile as seedProfile } from '@/lib/sales/services/seed/profile';
import { promotions as seedPromotions } from '@/lib/sales/services/seed/promotions';
import { salesPerformance as seedPerformance, salesSummary as seedSummary } from '@/lib/sales/services/seed/sales';
import { support as seedSupport } from '@/lib/sales/services/seed/support';

function toList(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['data', 'items', 'results', 'bookings', 'history', 'products', 'notifications', 'promotions']) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
  }
  return [];
}

const str = (v: unknown, fb = ''): string => (typeof v === 'string' && v ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === 'number' ? v : fb);
const inr = (v: unknown): string => `₹${num(typeof v === 'string' ? Number(String(v).replace(/[^0-9.-]/g, '')) || 0 : v).toLocaleString('en-IN')}`;

function bookingStatus(s: string): BookingStatus {
  const t = s.toLowerCase();
  if (/cancel|reject/.test(t)) return 'Cancelled';
  if (/complet/.test(t)) return 'Completed';
  if (/upcoming|confirm|schedul/.test(t)) return 'Upcoming';
  return 'Active';
}

/** Mobile lifecycle: cancelled→Cancelled; completed+paid→Completed else
 *  Upcoming; approved-and-today→Active else Upcoming. */
function lifecycleStatus(raw: Record<string, unknown>): BookingStatus {
  const t = String(raw.status ?? '').toLowerCase();
  if (/cancel|reject/.test(t)) return 'Cancelled';
  const paid = /paid/.test(String(raw.paymentStatus ?? ''));
  if (/complet/.test(t)) return paid ? 'Completed' : 'Upcoming';
  const approved = /approv|confirm|assign|progress|active|start/.test(t);
  const date = String(raw.scheduledDate ?? raw.date ?? '').slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (approved && date && date <= today) return 'Active';
  if (/upcoming|confirm|schedul/.test(t)) return 'Upcoming';
  if (approved) return 'Active';
  return 'Upcoming';
}

export function formatBookingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function resolveBookingLocationLabel(b: Record<string, unknown>): string {
  const loc = b.location;
  if (typeof loc === 'string' && loc) return loc;
  if (loc && typeof loc === 'object') {
    const o = loc as Record<string, unknown>;
    if (typeof o.address === 'string' && o.address) return o.address;
    if (typeof o.label === 'string' && o.label) return o.label;
  }
  return String(b.address ?? b.client ?? '');
}

export async function getSalesSummary(): Promise<SalesSummary> {
  try {
    const [dash, comm] = await Promise.all([
      aggregatorApi.getDashboard().catch(() => null),
      aggregatorApi.getCommission().catch(() => null),
    ]);
    const d = (dash ?? {}) as Record<string, unknown>;
    const c = (comm ?? {}) as Record<string, unknown>;
    const hasAny = Object.keys(d).length > 0 || Object.keys(c).length > 0;
    if (!hasAny) return seedSummary;
    const totalBookings = num(d.totalBookings ?? d.bookings, seedSummary.totalBookings);
    const completed = num(d.completedBookings ?? d.completed, seedSummary.completedBookings);
    const totalSales = num(
      d.totalSales ?? d.sales ?? d.totalEarnings ?? d.grossRevenue,
      seedSummary.totalSales,
    );
    const pendingCommission = num(
      c.pending ?? c.pendingCommission ?? d.pendingCommission ?? d.pendingEarnings,
      seedSummary.pendingCommission,
    );
    const earnedCommission = num(
      c.earned ?? c.paid ?? c.commissionEarned ?? d.earnedCommission,
      seedSummary.earnedCommission,
    );
    return {
      status: str(d.status, seedSummary.status),
      thisMonth: num(d.thisMonth ?? d.monthSales ?? d.monthBookings, seedSummary.thisMonth),
      totalSales,
      totalBookings,
      activeBookings: num(d.activeBookings ?? d.active, seedSummary.activeBookings),
      upcomingBookings: num(d.upcomingBookings ?? d.upcoming, seedSummary.upcomingBookings),
      completedBookings: completed,
      cancelledBookings: num(d.cancelledBookings ?? d.cancelled, seedSummary.cancelledBookings),
      totalCommission: num(c.total ?? c.commissionEarned ?? d.totalCommission, seedSummary.totalCommission),
      pendingCommission,
      earnedCommission,
      customers: num(d.customers ?? d.totalCustomers, seedSummary.customers),
    };
  } catch {
    return seedSummary;
  }
}

export async function getSalesPerformance(): Promise<SalesPerformance> {
  try {
    const a = (await aggregatorApi.getAnalytics().catch(() => null)) as Record<string, unknown> | null;
    if (!a || Object.keys(a).length === 0) return seedPerformance;
    const weekly = Array.isArray(a.weekly) ? (a.weekly as number[]) : seedPerformance.weekly;
    const monthly = Array.isArray(a.monthly) ? (a.monthly as number[]) : seedPerformance.monthly;
    return { weekly, monthly, completed: num(a.completed, seedPerformance.completed) };
  } catch {
    return seedPerformance;
  }
}

export interface CommissionDashboard {
  totalCommission: number;
  pendingCommission: number;
  settledCommission: number;
  currentTier: string;
  commissionRate: number;
  monthlyBookings: number;
  nextTierBookings: number | null;
  chart: { date: string; commission: number; bookings: number }[];
}

export async function getCommissionDashboard(): Promise<CommissionDashboard | null> {
  try {
    const d = (await aggregatorApi.getCommissionDashboard().catch(() => null)) as Record<string, unknown> | null;
    if (!d || Object.keys(d).length === 0) return null;
    const chart = Array.isArray(d.chartData ?? d.chart) ? ((d.chartData ?? d.chart) as Record<string, unknown>[]) : [];
    return {
      totalCommission: num(d.totalCommission),
      pendingCommission: num(d.pendingCommission),
      settledCommission: num(d.settledCommission ?? d.earnedCommission),
      currentTier: str(d.currentTier, 'Standard'),
      commissionRate: num(d.commissionRate, 0.08),
      monthlyBookings: num(d.monthlyBookings),
      nextTierBookings: typeof d.nextTierBookings === 'number' ? (d.nextTierBookings as number) : null,
      chart: chart.map((c) => ({
        date: str(c.date),
        commission: num(c.commission),
        bookings: num(c.bookings),
      })),
    };
  } catch {
    return null;
  }
}

export async function getBookingTrends(): Promise<number[]> {
  try {
    const a = (await aggregatorApi.getAnalytics().catch(() => null)) as Record<string, unknown> | null;
    const trends = a?.bookingTrends;
    if (Array.isArray(trends) && trends.every((v) => typeof v === 'number')) return trends as number[];
    return [];
  } catch {
    return [];
  }
}

export async function getWalletBalance(): Promise<{ total: number; pending: number }> {
  try {
    const w = (await apiRequest<unknown>('/wallet').catch(() => null)) as Record<string, unknown> | null;
    if (!w) return { total: 0, pending: 0 };
    return { total: num(w.totalEarnings ?? w.total), pending: num(w.pendingEarnings ?? w.pending) };
  } catch {
    return { total: 0, pending: 0 };
  }
}

export async function getBookings(): Promise<Booking[]> {
  try {
    const raw = await aggregatorApi.getBookings();
    const list = toList(raw);
    if (!list.length) return seedBookings;
    return list.map((b, i) => ({
      id: str(b.bookingNumber ?? b.id ?? b._id, `HB-${i}`),
      customer: str(b.customerName ?? b.customer ?? b.client, 'Customer'),
      service: str(b.serviceType ?? b.service, 'Service'),
      date: formatBookingDate(str(b.scheduledDate ?? b.date, '')),
      amount: inr(b.totalAmount ?? b.amount),
      status: lifecycleStatus(b),
      pilot: str(b.assignedPilot ?? b.pilotName ?? b.pilot, '—'),
    }));
  } catch {
    return seedBookings;
  }
}

export async function getRecentBookings(): Promise<Booking[]> {
  return (await getBookings()).slice(0, 4);
}

export async function getCommissionHistory(): Promise<CommissionEntry[]> {
  try {
    const raw = await aggregatorApi.getCommissionHistory();
    const list = toList(raw);
    if (!list.length) return seedCommission;
    return list.map((c, i) => ({
      id: str(c.id ?? c._id ?? c.commissionId, `CM-${i}`),
      booking: str(c.bookingNumber ?? c.bookingId ?? c.booking, ''),
      amount: inr(c.amount),
      date: str(c.date ?? c.createdAt, ''),
      status: (/pend/i.test(str(c.status)) ? 'Pending' : 'Completed') as CommissionStatus,
    }));
  } catch {
    return seedCommission;
  }
}

export interface RawProduct {
  id: string;
  name: string;
  price: number;
  vendorUid: string;
  category: string;
  description: string;
  image?: string;
  rating?: number;
}

export async function getRawProducts(): Promise<RawProduct[]> {
  try {
    const raw = await apiRequest<unknown>('/marketplace/products');
    const list = toList(raw);
    if (!list.length) return [];
    return list.map((p, i) => ({
      id: str(p.id ?? p._id ?? p.productId, `P${i}`),
      name: str(p.name ?? p.productName ?? p.title, `Product ${i + 1}`),
      price: num(p.price ?? p.startingPrice),
      vendorUid: str(p.vendorUid ?? p.vendorId, 'marketplace'),
      category: str(p.category, 'General'),
      description: str(p.description, ''),
      image: typeof p.image === 'string' ? p.image : undefined,
      rating: typeof p.rating === 'number' ? (p.rating as number) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const raw = await apiRequest<unknown>('/marketplace/products');
    const list = toList(raw);
    if (!list.length) return seedProducts;
    const cats: ProductCategory[] = ['Fertilizers', 'Farming Equipments'];
    return list.map((p, i) => {
      const cat = str(p.category, '');
      return {
        id: str(p.id ?? p._id, `P${i}`),
        name: str(p.name, `Product ${i + 1}`),
        price: inr(p.price),
        category: (cats.includes(cat as ProductCategory) ? cat : 'Fertilizers') as ProductCategory,
        image: typeof p.image === 'string' ? p.image : undefined,
      };
    });
  } catch {
    return seedProducts;
  }
}

export async function getNotifications(): Promise<SalesNotification[]> {
  try {
    const raw = await apiRequest<unknown>('/notifications');
    const list = toList(raw);
    if (!list.length) return seedNotifications;
    return list.map((n, i) => ({
      id: str(n.id ?? n._id, `N${i}`),
      title: str(n.title, 'Notification'),
      message: str(n.body ?? n.message, ''),
      time: str(n.time ?? n.createdAt, ''),
    }));
  } catch {
    return seedNotifications;
  }
}

export async function getProfile(): Promise<Profile> {
  try {
    const p = (await aggregatorApi.getProfile().catch(() => null)) as Record<string, unknown> | null;
    if (!p || Object.keys(p).length === 0) return seedProfile;
    return {
      fullName: str(p.name ?? p.fullName, seedProfile.fullName),
      role: 'Sales Aggregator',
      phone: str(p.phone ?? p.phoneNumber, seedProfile.phone),
      email: str(p.email, seedProfile.email),
      notifications: str(p.notifications, seedProfile.notifications),
      payoutMethod: str(p.payoutMethod, seedProfile.payoutMethod),
    };
  } catch {
    return seedProfile;
  }
}

export async function getPromotions(): Promise<Promotion[]> {
  return seedPromotions;
}

export async function getSupport(): Promise<SupportInfo> {
  return seedSupport;
}

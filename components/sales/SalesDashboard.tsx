'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BadgePercent,
  CalendarCheck,
  CircleCheck,
  Hourglass,
  IndianRupee,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { ROUTES } from '@/lib/sales/routes';
import { formatINR } from '@/lib/sales/format';
import { useAsync } from '@/components/sales/useAsync';
import { getBookingTrends, getCommissionDashboard, getSalesPerformance, getSalesSummary, getWalletBalance } from '@/lib/sales/services/sales';
import { getRecentBookings, getBookings } from '@/lib/sales/services/bookings';
import { getProducts } from '@/lib/sales/services/marketplace';
import { getPromotions } from '@/lib/sales/services/promotions';
import { aggregatorApi, chatApi } from '@/lib/booking/role-apis';
import { useNotice } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';
import StatCard from '@/components/sales/ui/StatCard';
import StatusBadge from '@/components/sales/ui/StatusBadge';
import type { BookingStatus, SalesSummary } from '@/lib/sales/types';
import MiniBarChart from './MiniBarChart';
import ProductCard from './ProductCard';
import PromotionCard from './PromotionCard';
import SalesCustomers from './SalesCustomers';

const VIEW_ALL = 'text-xs font-bold text-brand hover:underline';
const STAT_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2';

export default function SalesDashboard() {
  const router = useRouter();
  const notify = useNotice();
  const summary = useAsync(getSalesSummary);
  const performance = useAsync(getSalesPerformance);
  const recent = useAsync(getRecentBookings);
  const allBookings = useAsync(getBookings);
  const products = useAsync(getProducts);
  const promotions = useAsync(getPromotions);
  const commissionBoard = useAsync(getCommissionDashboard);
  const trends = useAsync(getBookingTrends);
  const wallet = useAsync(getWalletBalance);
  const [servicePick, setServicePick] = useState('spraying');
  const [region, setRegion] = useState('');
  const [regionMsg, setRegionMsg] = useState<string | null>(null);

  async function openSupportChat() {
    try {
      const conv = (await chatApi.createConversation({
        participantUid: 'admin',
        participantRole: 'admin',
        type: 'support',
        supportCategory: 'other',
      })) as Record<string, unknown>;
      const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? '');
      router.push(cid ? `/chat/${cid}` : '/chat');
    } catch (err) {
      notify({ title: 'Chat failed', message: err instanceof Error ? err.message : 'Could not open support chat.' });
    }
  }

  async function saveRegion() {
    if (!region.trim()) return;
    try {
      await aggregatorApi.updateProfile({ state: region.trim() });
      setRegionMsg(`Operating region set to ${region.trim()}.`);
      setRegion('');
    } catch (err) {
      setRegionMsg(err instanceof Error ? err.message : 'Could not save region.');
    }
  }

  return (
    <>
      <h1 className="sr-only">Sales Aggregator Dashboard</h1>

      <section className="flex flex-col gap-4 rounded-3xl border border-primary bg-primary p-6 shadow-2xl md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white">Welcome back, Sales Aggregator</h2>
          <p className="mt-1 max-w-[460px] text-sm text-white/80">
            Track your sales, bookings, commissions and marketplace activity from one place.
          </p>
        </div>
        {summary.status === 'success' ? (
          <div className="flex gap-2">
            <div className="rounded-xl bg-white/10 px-2 py-1 text-center">
              <p className="text-xs text-white/70">Sales Status</p>
              <p className="mt-0.5 text-sm font-semibold text-primary-foreground">{summary.data.status}</p>
            </div>
            <div className="rounded-xl bg-primary px-2 py-1 text-center">
              <p className="text-xs text-white/85">This Month</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{formatINR(summary.data.thisMonth)}</p>
            </div>
          </div>
        ) : summary.status === 'error' ? (
          <button type="button" onClick={summary.reload} className="min-h-10 self-start rounded-xl bg-white/10 px-3 text-xs font-semibold text-primary-foreground">
            Stats unavailable — retry
          </button>
        ) : (
          <div role="status" className="h-12 w-48 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none">
            <span className="sr-only">Loading stats</span>
          </div>
        )}
      </section>

      <h2 className="mt-1 text-base font-bold text-foreground">Sales Overview</h2>
      <AsyncView query={summary} loadingLines={4} errorTitle="Couldn't load sales overview.">
        {(s) => <SalesOverview s={s} rejected={allBookings.status === 'success' ? allBookings.data.filter((b) => b.status === 'Cancelled').length : 0} />}
      </AsyncView>

      <SalesCustomers />

      <Panel title="Quick Book">
        <div className="flex flex-wrap items-center gap-2">
          <select value={servicePick} onChange={(e) => setServicePick(e.target.value)} className="h-10 rounded-xl border bg-card px-3 text-sm text-foreground outline-none" aria-label="Service">
            <option value="spraying">Spraying</option>
            <option value="monitoring">Monitoring</option>
            <option value="mapping">Mapping</option>
            <option value="surveillance">Surveillance</option>
            <option value="videography">Videography</option>
          </select>
          <Button onClick={() => router.push(`/sales/book?service=${encodeURIComponent(servicePick)}`)}>
            New On-Behalf Booking →
          </Button>
          <span className="text-xs text-muted-foreground">Pick the customer above, then continue.</span>
        </div>
      </Panel>

      <Panel title="Operating Region">
        <div className="flex flex-wrap items-center gap-2">
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="State / region" className="h-10 flex-1 rounded-xl border bg-card px-3 text-sm text-foreground outline-none" />
          <Button variant="outline" onClick={() => void saveRegion()}>Save</Button>
        </div>
        {regionMsg ? <p className="mt-1 text-xs text-muted-foreground">{regionMsg}</p> : null}
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Sales Performance">
          <AsyncView query={performance} loadingLines={3}>
            {(p) => (
              <>
                <MiniBarChart data={p.weekly} label="Weekly sales performance" />
                <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                  <span>Weekly</span>
                  <span>Monthly avg: {Math.round(p.monthly.reduce((a, b) => a + b, 0) / p.monthly.length)}</span>
                  <span>Completed: {p.completed}</span>
                </div>
              </>
            )}
          </AsyncView>
        </Panel>

        <Panel title="Commission Trend">
          <AsyncView query={commissionBoard} loadingLines={3} errorTitle="Couldn't load commission trend.">
            {(board) => (
              board && board.chart.length > 0 ? (
                <>
                  <MiniBarChart data={board.chart.map((c) => c.commission)} label="Commission trend" />
                  <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                    <span>Tier: {board.currentTier} ({Math.round(board.commissionRate * 100)}%)</span>
                    <span>{board.monthlyBookings} bookings this month</span>
                    {board.nextTierBookings != null ? <span>Next tier: {board.nextTierBookings} bookings</span> : null}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No commission trend yet.</p>
              )
            )}
          </AsyncView>
        </Panel>

        <Panel title="Booking Summary">
          <AsyncView query={summary} loadingLines={3}>
            {(s) => (
              <div className="grid grid-cols-2 gap-2">
                <SummaryChip label="Active" value={s.activeBookings} status="Active" />
                <SummaryChip label="Upcoming" value={s.upcomingBookings} status="Upcoming" />
                <SummaryChip label="Completed" value={s.completedBookings} status="Completed" />
                <SummaryChip label="Cancelled" value={s.cancelledBookings} status="Cancelled" />
              </div>
            )}
          </AsyncView>
        </Panel>

        <Panel title="Bookings Trend">
          <AsyncView query={trends} loadingLines={3} errorTitle="Couldn't load booking trends.">
            {(t) => (
              t.length > 0 ? (
                <TrendLine data={t} label="Bookings trend" />
              ) : (
                <p className="text-xs text-muted-foreground">No trend data yet.</p>
              )
            )}
          </AsyncView>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent Bookings" action={<Link href={ROUTES.bookings} className={VIEW_ALL}>View All →</Link>}>
          <AsyncView query={recent} isEmpty={(r) => r.length === 0} emptyTitle="No bookings yet." loadingLines={4}>
            {(rows) => (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {rows.map((b) => (
                  <Link key={b.id} href={`/sales/bookings/${encodeURIComponent(b.id)}`} className="w-[210px] shrink-0 rounded-xl border bg-card p-2 hover:bg-muted">
                    <p className="truncate text-sm font-bold text-foreground">{b.customer}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.service} · {b.date}</p>
                    <p className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{b.amount}</span>
                      <StatusBadge status={b.status} />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </AsyncView>
        </Panel>

        <Panel title="Commission Summary">
          <AsyncView query={summary} loadingLines={3}>
            {(s) => (
              <>
                <CommissionRow label="Earned" value={formatINR(s.earnedCommission)} />
                <CommissionRow label="Pending" value={formatINR(s.pendingCommission)} />
                <CommissionRow label="Total" value={formatINR(s.totalCommission)} accent />
                <Link href={ROUTES.commission} className={`${VIEW_ALL} mt-1 inline-block`}>
                  View Commission →
                </Link>
              </>
            )}
          </AsyncView>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Marketplace" action={<Link href={ROUTES.marketplace} className={VIEW_ALL}>View All →</Link>}>
          <AsyncView query={products} isEmpty={(p) => p.length === 0} emptyTitle="No products available." loadingLines={3}>
            {(list) => (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {list.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </AsyncView>
        </Panel>

        <Panel title="Promotions & Offers">
          <AsyncView query={promotions} isEmpty={(p) => p.length === 0} emptyTitle="No promotions right now." loadingLines={3}>
            {(list) => (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <article className="flex min-h-[92px] w-[190px] shrink-0 flex-col justify-between rounded-2xl bg-primary p-2">
                  <span className="mb-1 w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">REFER & EARN</span>
                  <h3 className="text-[15px] font-extrabold text-white">Invite. Earn. Fly.</h3>
                  <p className="mb-1 mt-0.5 line-clamp-2 text-xs text-white/85">Share your code, earn on every signup</p>
                  <Link href="/refer" className="min-h-9 w-fit text-left text-sm font-semibold text-white">
                    Open Refer & Earn →
                  </Link>
                </article>
                {list.map((p) => (
                  <PromotionCard key={p.id} promotion={p} />
                ))}
              </div>
            )}
          </AsyncView>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Support">
          <p className="text-xs text-muted-foreground">24x7 Expert Support — chat with our team anytime.</p>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => void openSupportChat()}>Chat with Support</Button>
            <Link href="/support" className="text-xs font-bold text-brand hover:underline self-center">Help Center →</Link>
          </div>
        </Panel>
        <Panel title="Refer & Earn" action={<Link href="/refer" className={VIEW_ALL}>Open →</Link>}>
          <AsyncView query={wallet} loadingLines={2} errorTitle="Couldn't load wallet.">
            {(w) => (
              <p className="text-xs text-muted-foreground">
                Balance ₹{(w.total ?? 0).toLocaleString('en-IN')} · Pending ₹{(w.pending ?? 0).toLocaleString('en-IN')} — invite customers and earn commission.
              </p>
            )}
          </AsyncView>
        </Panel>
      </div>

    </>
  );
}

function TrendLine({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 100},${100 - (v / max) * 90}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[70px] w-full" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke="var(--color-primary, #1f6f4a)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / Math.max(1, data.length - 1)) * 100} cy={100 - (v / max) * 90} r="1.6" fill="var(--color-primary, #1f6f4a)" />
      ))}
    </svg>
  );
}

function SalesOverview({ s, rejected = 0 }: { s: SalesSummary; rejected?: number }) {
  return (
    <div className={STAT_GRID}>
      <StatCard icon={<IndianRupee size={16} />} label="Total Sales" value={formatINR(s.totalSales)} />
      <StatCard icon={<CalendarCheck size={16} />} label="Total Bookings" value={s.totalBookings} />
      <StatCard icon={<TrendingUp size={16} />} label="Active Bookings" value={s.activeBookings} tone="info" />
      <StatCard icon={<Hourglass size={16} />} label="Upcoming Bookings" value={s.upcomingBookings} tone="warning" />
      <StatCard icon={<CircleCheck size={16} />} label="Completed Bookings" value={s.completedBookings} tone="success" />
      <StatCard icon={<XCircle size={16} />} label="Rejected Missions" value={rejected} tone="warning" />
      <StatCard icon={<BadgePercent size={16} />} label="Total Commission" value={formatINR(s.totalCommission)} />
      <StatCard icon={<Hourglass size={16} />} label="Pending Commission" value={formatINR(s.pendingCommission)} tone="warning" />
      <StatCard icon={<Users size={16} />} label="Customers / Leads" value={s.customers} />
    </div>
  );
}

function SummaryChip({ label, value, status }: { label: string; value: number; status: BookingStatus }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-muted p-2">
      <StatusBadge status={status} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-bold text-foreground">{value}</span>
    </div>
  );
}

function CommissionRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-2 border-t py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${accent ? 'text-brand' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

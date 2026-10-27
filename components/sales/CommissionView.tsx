'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CircleCheck, Hourglass, TrendingUp, Wallet } from 'lucide-react';
import { formatINR } from '@/lib/sales/format';
import { useAsync } from '@/components/sales/useAsync';
import { getCommissionDashboard, getSalesSummary, getWalletBalance } from '@/lib/sales/services/sales';
import { getCommissionHistory } from '@/lib/sales/services/commission';
import { payoutApi } from '@/lib/booking/role-apis';
import { useNotice } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import MiniBarChart from '@/components/sales/MiniBarChart';
import Panel from '@/components/sales/ui/Panel';
import ResponsiveTable, { type Column } from '@/components/sales/ui/ResponsiveTable';
import StatCard from '@/components/sales/ui/StatCard';
import StatusBadge from '@/components/sales/ui/StatusBadge';
import type { CommissionEntry } from '@/lib/sales/types';

const inputCls = 'h-10 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none';

const COLUMNS: readonly Column<CommissionEntry>[] = [
  { key: 'id', header: 'Commission ID', cell: (c) => c.id },
  { key: 'booking', header: 'Booking', cell: (c) => c.booking, muted: true },
  { key: 'date', header: 'Date', cell: (c) => c.date, muted: true },
  { key: 'amount', header: 'Amount', cell: (c) => c.amount },
  { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
];

export default function CommissionView() {
  const notify = useNotice();
  const summary = useAsync(getSalesSummary);
  const history = useAsync(getCommissionHistory);
  const board = useAsync(getCommissionDashboard);
  const wallet = useAsync(getWalletBalance);
  const [methods, setMethods] = useState<Record<string, unknown>[]>([]);
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadMethods() {
    if (methodsLoaded) return;
    try {
      const v = await payoutApi.methods();
      setMethods(Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
      setMethodsLoaded(true);
    } catch {
      setMethods([]);
      setMethodsLoaded(true);
    }
  }

  async function withdraw() {
    const amt = Math.floor(Number(amount));
    if (!Number.isFinite(amt) || amt < 100) {
      notify({ title: 'Minimum ₹100', message: 'Enter at least ₹100 to withdraw.' });
      return;
    }
    const verified = methods.filter((m) => String(m.verificationStatus ?? '').toLowerCase() === 'verified');
    const chosen = methodId || String((verified[0] ?? methods[0] ?? {}).id ?? '');
    if (!chosen) {
      notify({ title: 'No payout method', message: 'Add one from Refer & Earn or your profile first.' });
      return;
    }
    const method = methods.find((m) => String(m.id ?? '') === chosen);
    if (method && String(method.verificationStatus ?? '').toLowerCase() !== 'verified') {
      notify({ title: 'Unverified method', message: 'That payout method is not verified yet.' });
      return;
    }
    setBusy(true);
    try {
      const { walletApi } = await import('@/lib/booking/role-apis');
      await walletApi.withdraw({ amount: amt, payoutMethodId: chosen });
      notify({ title: 'Withdrawal requested', message: `₹${amt.toLocaleString('en-IN')} will be reviewed in 24–48h.` });
      setAmount('');
    } catch (err) {
      notify({ title: 'Withdraw failed', message: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-bold text-foreground">Commission</h1>

      <AsyncView query={summary} loadingLines={2} errorTitle="Couldn't load commission totals.">
        {(s) => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
            <StatCard icon={<Wallet size={16} />} label="Total Commission" value={formatINR(s.totalCommission)} />
            <StatCard icon={<CircleCheck size={16} />} label="Earned Commission" value={formatINR(s.earnedCommission)} tone="success" />
            <StatCard icon={<Hourglass size={16} />} label="Pending Commission" value={formatINR(s.pendingCommission)} tone="warning" />
            <StatCard icon={<TrendingUp size={16} />} label="This Month" value={formatINR(s.thisMonth)} />
          </div>
        )}
      </AsyncView>

      <Panel title="Commission Graph">
        <AsyncView query={board} loadingLines={3} errorTitle="Couldn't load commission graph.">
          {(b) => (
            b && b.chart.length > 0 ? (
              <>
                <MiniBarChart data={b.chart.map((c) => c.commission)} label="Commission per period" />
                <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                  <span>Tier: {b.currentTier} ({Math.round(b.commissionRate * 100)}%)</span>
                  <span>Settled: {formatINR(b.settledCommission)}</span>
                  {b.nextTierBookings != null ? <span>Next tier: {b.nextTierBookings} bookings</span> : null}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No graph data yet.</p>
            )
          )}
        </AsyncView>
      </Panel>

      <Panel title="Wallet & Payout">
        <AsyncView query={wallet} loadingLines={2} errorTitle="Couldn't load wallet.">
          {(w) => (
            <p className="text-xs text-muted-foreground">
              Wallet balance ₹{w.total.toLocaleString('en-IN')} · Pending ₹{w.pending.toLocaleString('en-IN')}
            </p>
          )}
        </AsyncView>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <select value={methodId} onChange={(e) => setMethodId(e.target.value)} onFocus={() => void loadMethods()} className={inputCls} aria-label="Payout method">
            <option value="">Select payout method…</option>
            {methods.map((m) => (
              <option key={String(m.id ?? '')} value={String(m.id ?? '')}>
                {String(m.label ?? 'Account')} ({String(m.verificationStatus ?? '')})
              </option>
            ))}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Amount (min ₹100)" inputMode="numeric" className={inputCls} />
        </div>
        <div className="mt-2 flex gap-2">
          <Button disabled={busy} onClick={() => void withdraw()}>{busy ? 'Requesting…' : 'Withdraw'}</Button>
          <Link href="/refer" className="text-xs font-bold text-brand hover:underline self-center">Manage methods →</Link>
        </div>
      </Panel>

      <h2 className="mt-2 text-base font-bold text-foreground">Commission History</h2>
      <AsyncView
        query={history}
        isEmpty={(h) => h.length === 0}
        emptyTitle="No commission history yet."
        loadingLines={4}
        errorTitle="Couldn't load commission history."
      >
        {(rows) => <ResponsiveTable caption="Commission history" rows={rows} columns={COLUMNS} getRowKey={(c) => c.id} />}
      </AsyncView>
    </>
  );
}

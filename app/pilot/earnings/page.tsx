"use client";

// Pilot earnings — port of EarningsScreen: totals, SVG earnings graph with
// range chips, payout methods (withdraw/history/refunds), add-method entry.

import Link from "next/link";

import * as React from "react";

import { usePilot } from "@/lib/pilot/data";

const RANGES = ["Last month", "Last 3 months", "Last 6 months", "Last 1 year"] as const;

const MONTH_DAYS: Record<(typeof RANGES)[number], number> = {
  "Last month": 30,
  "Last 3 months": 91,
  "Last 6 months": 182,
  "Last 1 year": 365,
};

function entryDate(h: Record<string, unknown>): number | null {
  const raw = h.settledAt ?? h.endTime ?? h.completedAt ?? h.createdAt ?? h.date;
  if (typeof raw !== "string" || !raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

function entryAmount(h: Record<string, unknown>): number {
  return Number(h.amount ?? h.value ?? h.pilotEarning ?? 0) || 0;
}

export default function PilotEarnings() {
  const { earnings, pendingEarnings, earningHistory, payouts, loading } = usePilot();
  const [range, setRange] = React.useState<(typeof RANGES)[number] | "Custom">("Last 6 months");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedMethod, setSelectedMethod] = React.useState("");

  // Accurate buckets straight from settled history (no demo numbers).
  const points = React.useMemo(() => {
    const now = Date.now();
    let start: number;
    let end = now;
    if (range === "Custom") {
      const f = from ? new Date(`${from}T00:00:00`).getTime() : NaN;
      const t = to ? new Date(`${to}T23:59:59`).getTime() : NaN;
      if (Number.isNaN(f) || Number.isNaN(t) || f > t) return [];
      start = f;
      end = Math.min(t, now);
    } else {
      start = now - MONTH_DAYS[range] * 86400000;
    }
    const spanDays = Math.max(1, Math.ceil((end - start) / 86400000));
    const perWeek = spanDays > 62;
    const bucketCount = perWeek ? Math.min(26, Math.ceil(spanDays / 7)) : Math.min(31, spanDays);
    const sizeMs = (end - start) / bucketCount;
    const sums = new Array<number>(bucketCount).fill(0);
    for (const h of earningHistory) {
      const t = entryDate(h);
      if (t == null || t < start || t > end) continue;
      const idx = Math.min(bucketCount - 1, Math.floor((t - start) / sizeMs));
      sums[idx] += entryAmount(h);
    }
    return sums.map((value, i) => {
      const bt = new Date(start + sizeMs * i);
      const label = perWeek
        ? `${bt.getDate()}/${bt.getMonth() + 1}`
        : bt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return { label, value };
    });
  }, [earningHistory, range, from, to]);
  const max = Math.max(1, ...points.map((p) => p.value));
  const rangeTotal = points.reduce((s, p) => s + p.value, 0);
  const currentMethods = payouts.slice(0, 2);
  const methodLabel = (p: Record<string, unknown>): string => {
    if (typeof p.label === "string" && p.label) return p.label;
    if (p.type === "upi") return `UPI ${String(p.upiId ?? "")}`;
    if (p.type === "bank") return `Bank •••• ${String(p.accountNumber ?? p.masked ?? "").slice(-4)}`;
    return "Account";
  };
  const selected = selectedMethod || String((currentMethods[0] as Record<string, unknown> | undefined)?.id ?? "");

  return (
    <>
      <h1 className="p-h1">Manage Your Earnings</h1>
      <p className="p-sub">Totals, graph, payouts and refunds — live from the backend.</p>
      {loading ? (
        <div className="p-card">Loading…</div>
      ) : (
        <>
          <div className="p-overview">
            <div className="p-ovcard dark">
              <div className="p-ovlabel">Total Earnings</div>
              <div className="p-ovvalue">₹{earnings.total.toLocaleString("en-IN")}</div>
            </div>
            <Link href="/pilot/pending" className="p-ovcard no-underline text-inherit">
              <div className="p-ovlabel">Pending Earnings →</div>
              <div className="p-ovvalue">₹{earnings.pending.toLocaleString("en-IN")}</div>
              <div className="p-sub m-0" style={{ fontSize: 11 }}>
                {pendingEarnings.length} mission{pendingEarnings.length === 1 ? "" : "s"} settling · tap for detail
              </div>
            </Link>
          </div>

          <div className="p-card">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="m-0">Earnings Graph</h3>
              <div className="p-segment" style={{ maxWidth: 460 }}>
                {RANGES.map((r) => (
                  <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>
                    {r.replace("Last ", "")}
                  </button>
                ))}
                <button className={range === "Custom" ? "active" : ""} onClick={() => setRange("Custom")}>
                  Custom
                </button>
              </div>
            </div>
            {range === "Custom" && (
              <div className="flex gap-2 mt-2.5 flex-wrap items-center">
                <label className="p-sub">From <input type="date" className="p-input p-date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
                <label className="p-sub">To <input type="date" className="p-input p-date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
              </div>
            )}
            <p className="p-sub mt-2">
              {range === "Custom" && points.length === 0
                ? "Pick a valid From/To range to see earnings."
                : `Total in range: ₹${rangeTotal.toLocaleString("en-IN")}`}
            </p>
            <svg viewBox="0 0 360 140" className="mt-2" style={{ width: "100%", height: 140 }} role="img" aria-label={`Earnings ${range}`}>
              {points.map((p, i) => {
                const n = points.length || 1;
                const w = 340 / n;
                const h = Math.max(6, (p.value / max) * 90);
                const x = 10 + i * w;
                return (
                  <g key={i}>
                    <rect x={x} y={100 - h} width={Math.max(4, w - 8)} height={h} rx={6} fill="#1F3A2E" opacity={0.85} />
                    {n <= 16 && (
                      <text x={x + Math.max(4, w - 8) / 2} y={116} fontSize={10} textAnchor="middle" fill="#8B968F">
                        {p.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="p-card">
            <div className="flex justify-between items-center">
              <h3 className="m-0">Current Payout Methods</h3>
              <Link href="/pilot/payout" className="p-btn secondary">
                Add New Payout Method
              </Link>
            </div>
            {currentMethods.length === 0 ? (
              <p className="p-sub">No payout method added.</p>
            ) : (
              <>
                {currentMethods.map((p, i) => (
                  <div className="p-teamrow" key={String((p as Record<string, unknown>).id ?? i)}>
                    <b style={{ fontSize: 13 }}>{methodLabel(p as Record<string, unknown>)}</b>
                    <span className="p-badge-pill success">
                      {String((p as Record<string, unknown>).verificationStatus ?? "unverified")}
                    </span>
                  </div>
                ))}
                <div className="mt-2">
                  <span className="p-sub">Selected Method:</span>
                  <select
                    className="p-input mt-1"
                    value={selected}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                  >
                    {currentMethods.map((p, i) => (
                      <option key={String((p as Record<string, unknown>).id ?? i)} value={String((p as Record<string, unknown>).id ?? "")}>
                        {methodLabel(p as Record<string, unknown>)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <Link href="/pilot/withdraw" className="p-btn outline">
                Withdraw
              </Link>
              <Link href="/pilot/withdrawals" className="p-btn outline">
                History
              </Link>
              <Link href="/pilot/refunds" className="p-btn outline">
                Refunds
              </Link>
            </div>
            <p className="p-sub mt-2" style={{ fontSize: 11 }}>
              Pending is being processed and moves to payout automatically.
            </p>
          </div>
        </>
      )}
    </>
  );
}

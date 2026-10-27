"use client";

// Technician earnings — Super App TechnicianEarningsScreen parity: unified
// wallet totals, pending modal with per-ticket cards, real history series
// with range filtering, withdraw entry (min ₹100).

import Link from "next/link";
import * as React from "react";

import { apiRequest } from "@/lib/booking/api-client";
import { useTech } from "@/lib/tech/data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RANGES = ["Last 1 year", "Last 6 months", "Last 30 days"] as const;

export default function TechEarnings() {
  const { earnings, pendingList, earningHistory, wallet, loading } = useTech();
  const [range, setRange] = React.useState<(typeof RANGES)[number]>("Last 1 year");
  const [showPending, setShowPending] = React.useState(false);
  const [methods, setMethods] = React.useState<Record<string, unknown>[]>([]);

  React.useEffect(() => {
    apiRequest<unknown>("/payouts/methods")
      .then((v) => setMethods(Array.isArray(v) ? (v as Record<string, unknown>[]) : []))
      .catch(() => undefined);
  }, []);

  const months = range === "Last 1 year" ? 12 : range === "Last 6 months" ? 6 : 1;
  const series = earningHistory.length
    ? earningHistory.slice(-months)
    : MONTHS.slice(-months).map((label) => ({ label, value: 0 }));
  const max = Math.max(1, ...series.map((p) => p.value));
  const hasData = series.some((p) => p.value > 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="title">Manage your Earnings</div>
          <p className="sub">Unified wallet — missions and referrals in one place.</p>
        </div>
      </div>
      {loading ? (
        <div className="card">Loading…</div>
      ) : (
        <>
          <div className="grid2">
            <div className="card">
              <div className="statlabel">Earnings</div>
              <div className="statvalue">₹{earnings.total.toLocaleString("en-IN")}</div>
            </div>
            <button className="card text-left" style={{ cursor: "pointer" }} onClick={() => setShowPending(true)}>
              <div className="statlabel">Pending Earnings →</div>
              <div className="statvalue">₹{earnings.pending.toLocaleString("en-IN")}</div>
              <p className="sub">Pending is being processed.</p>
            </button>
          </div>
          {wallet ? (
            <div className="card mt-3.5">
              <h3 className="sectiontitle">Wallet</h3>
              <p className="sub">
                Balance ₹{Number(wallet.balance ?? wallet.total ?? 0).toLocaleString("en-IN")} ·
                Withdrawn ₹{Number(wallet.withdrawn ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
          ) : null}
          <div className="card mt-4.5">
            <div className="flex justify-between items-center">
              <h3 className="sectiontitle">Earnings Graph</h3>
              <div className="chips" style={{ padding: 0 }}>
                {RANGES.map((r) => (
                  <button key={r} className={"chip" + (range === r ? " active" : "")} onClick={() => setRange(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {!hasData ? (
              <div className="empty">No earnings data available.</div>
            ) : (
              <svg viewBox="0 0 360 120" style={{ width: "100%", height: 120 }} role="img" aria-label={`Earnings ${range}`}>
                {series.map((p, i) => {
                  const h = Math.max(4, (p.value / max) * 80);
                  return (
                    <g key={i}>
                      <rect x={10 + i * (340 / series.length)} y={90 - h} width={Math.max(8, 340 / series.length - 10)} height={h} rx={4} fill="var(--forest)" opacity={0.85} />
                      <text x={10 + i * (340 / series.length) + 9} y={105} fontSize={9} textAnchor="middle" fill="var(--muted)">
                        {p.label.slice(0, 3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <Link href="/technician/withdraw" className="btn">
                Withdraw (min ₹100)
              </Link>
            </div>
            <p className="sub mt-1.5">
              You earn 70% of every repair · {methods.length} payout method{methods.length === 1 ? "" : "s"} on file.
            </p>
          </div>
          <div className="card mt-4.5">
            <h3 className="sectiontitle">Rewards</h3>
            <div className="empty">No rewards available.</div>
          </div>
        </>
      )}

      {showPending ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPending(false)}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/40 p-4"
        >
          <div className="card" style={{ maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2.5">
              <b>All Pending Earnings</b>
              <button className="btn secondary" onClick={() => setShowPending(false)}>Close</button>
            </div>
            {pendingList.length === 0 ? (
              <div className="empty">No pending earnings.</div>
            ) : (
              pendingList.map((p) => (
                <div className="card mb-2" key={p.id}>
                  <b style={{ fontSize: 13 }}>{p.title}</b>
                  <p className="sub">Earnings: {p.amount != null ? `₹${p.amount.toLocaleString("en-IN")}` : "—"} (Pending)</p>
                  <p className="sub">{p.date} · {p.location}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

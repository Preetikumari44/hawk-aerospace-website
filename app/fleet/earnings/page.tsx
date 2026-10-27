"use client";

// FM earnings — Super App fmEarningsScreen parity: unified totals, 12-bar
// graph, payout settings, Withdraw/History/Refunds nav.

import Link from "next/link";
import * as React from "react";

import { useFleetData } from "@/lib/fleet/data";

export default function FleetEarnings() {
  const { earnings, commissionHistory, payouts, loading, error, reload } = useFleetData();
  const [selected, setSelected] = React.useState("");

  const points = React.useMemo(() => {
    if (commissionHistory.length) {
      return commissionHistory.slice(0, 12).map((h, i) => ({
        label: String(h.label ?? h.month ?? `M${i + 1}`),
        value: Number(h.amount ?? h.value ?? h.total ?? 0),
      }));
    }
    return [];
  }, [commissionHistory]);
  const max = Math.max(10000, ...points.map((p) => p.value));
  const yMax = Math.ceil(max / 10000) * 10000;

  const current = payouts.slice(0, 2);
  const sel = selected || String((current[0] as Record<string, unknown> | undefined)?.id ?? "");

  return (
    <div>
      <div className="pageTitle">
        <div>
          <h1>Manage your Earnings</h1>
          <p>Commission, payouts and refunds in one place.</p>
        </div>
      </div>
      {error ? (
        <div className="card">{error} <button className="btn secondary" onClick={reload}>Retry</button></div>
      ) : loading ? (
        <div className="card">Loading…</div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi dark">
              <span>Earnings</span>
              <strong>₹{earnings.total.toLocaleString("en-IN")}</strong>
            </div>
            <Link className="kpi no-underline text-inherit" href="/fleet/earnings/pending">
              <span>Pending →</span>
              <strong>₹{earnings.pending.toLocaleString("en-IN")}</strong>
            </Link>
          </div>

          <div className="card mt-3">
            <div className="panelHead"><h2>Last 12 periods</h2></div>
            {points.length === 0 ? (
              <div className="empty">No commission history yet.</div>
            ) : (
              <svg viewBox="0 0 360 140" style={{ width: "100%", height: 140 }} role="img" aria-label="Commission history">
                {points.map((p, i) => {
                  const h = Math.max(4, (p.value / yMax) * 90);
                  return (
                    <g key={i}>
                      <rect x={10 + i * 29} y={100 - h} width={18} height={h} rx={4} fill="#1f3b2f" opacity={0.85} />
                      <text x={19 + i * 29} y={116} fontSize={9} textAnchor="middle" fill="rgba(20,40,31,.56)">
                        {p.label.slice(0, 3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
            <p className="muted">Max ₹{(yMax / 1000).toFixed(0)}k</p>
          </div>

          <div className="card mt-3">
            <div className="panelHead"><h2>Payout Settings</h2><Link href="/fleet/payout">Add Method</Link></div>
            {current.length === 0 ? (
              <div className="empty">No payout method added.</div>
            ) : (
              <>
                {current.map((p, i) => (
                  <div className="dRow" key={String((p as Record<string, unknown>).id ?? i)}>
                    <span><b>{String((p as Record<string, unknown>).label ?? "Account")}</b></span>
                    <span className="badge">{String((p as Record<string, unknown>).verificationStatus ?? "")}</span>
                  </div>
                ))}
                <select
                  value={sel}
                  onChange={(e) => setSelected(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 13, background: "#fff", marginTop: 8 }}
                >
                  {current.map((p, i) => (
                    <option key={String((p as Record<string, unknown>).id ?? i)} value={String((p as Record<string, unknown>).id ?? "")}>
                      {String((p as Record<string, unknown>).label ?? `Method ${i + 1}`)}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="actions mt-2.5">
              <Link className="btn primary" href="/fleet/withdraw">Withdraw</Link>
              <Link className="btn secondary" href="/fleet/withdrawals">History</Link>
              <Link className="btn secondary" href="/fleet/refunds">Refunds</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

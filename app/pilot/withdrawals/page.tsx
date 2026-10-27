"use client";

// Pilot withdrawal history — Super App WithdrawalHistoryScreen parity:
// amount + status colors, requested date, UTR, failure reason, short ID.

import Link from "next/link";
import * as React from "react";

import { pilotApi } from "@/lib/booking/role-apis";

const STATUS_CLASS: Record<string, string> = {
  pending: "warning",
  approved: "success",
  processing: "info",
  completed: "success",
  failed: "error",
  rejected: "error",
};

export default function PilotWithdrawals() {
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    pilotApi
      .getWithdrawalHistory()
      .then((v) => {
        if (cancelled) return;
        const list = Array.isArray(v) ? v : [];
        setRows(list as Record<string, unknown>[]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Link href="/pilot/earnings" style={{ color: "var(--p-forest)", fontWeight: 600 }}>
        ← Back to Earnings
      </Link>
      <h1 className="p-h1 mt-2">Withdrawal History</h1>
      {loading ? (
        <div className="p-card">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-card">No withdrawals yet.</div>
      ) : (
        rows.map((w, i) => {
          const status = String(w.status ?? "pending").toLowerCase();
          return (
            <div className="p-mission" key={String(w.id ?? w._id ?? i)}>
              <div className="flex justify-between items-center gap-2">
                <b>₹{Number(w.amount ?? 0).toLocaleString("en-IN")}</b>
                <span className={`p-badge-pill ${STATUS_CLASS[status] ?? ""}`}>{String(w.status ?? "")}</span>
              </div>
              <p className="p-sub mt-1">
                {w.requestedAt ? new Date(String(w.requestedAt)).toLocaleString("en-IN") : ""}
              </p>
              {w.utr ? <p className="p-sub m-0">UTR: {String(w.utr)}</p> : null}
              {w.failureReason ? <p className="p-sub m-0">{String(w.failureReason)}</p> : null}
              <p className="p-sub m-0">ID: {String(w.id ?? w._id ?? "").slice(-8)}</p>
            </div>
          );
        })
      )}
    </>
  );
}

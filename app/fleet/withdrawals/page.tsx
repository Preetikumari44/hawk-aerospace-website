"use client";

// FM withdrawal history — amount + status colors + date + UTR + failure +
// short ID (Super App fmWithdrawalHistoryScreen parity).

import Link from "next/link";

import { useFleetData } from "@/lib/fleet/data";

const STATUS_CLASS: Record<string, string> = {
  pending: "",
  approved: "blue",
  processing: "blue",
  completed: "blue",
  failed: "red",
  rejected: "red",
};

export default function FleetWithdrawals() {
  const { withdrawals } = useFleetData();
  return (
    <div>
      <Link href="/fleet/earnings">← Earnings</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Withdrawal History</h1>
          <p>Every payout request and its status.</p>
        </div>
      </div>
      {withdrawals.length === 0 ? (
        <div className="card empty">No withdrawals yet.</div>
      ) : (
        withdrawals.map((w, i) => {
          const status = String(w.status ?? "pending").toLowerCase();
          return (
            <div className="card mb-2.5" key={String(w.id ?? w._id ?? i)}>
              <div className="row">
                <b>₹{Number(w.amount ?? 0).toLocaleString("en-IN")}</b>
                <span className={"badge " + (STATUS_CLASS[status] ?? "")}>{String(w.status ?? "")}</span>
              </div>
              <div className="muted">{w.requestedAt ? new Date(String(w.requestedAt)).toLocaleString("en-IN") : ""}</div>
              {w.utr ? <div className="muted">UTR: {String(w.utr)}</div> : null}
              {w.failureReason ? <div className="muted">{String(w.failureReason)}</div> : null}
              <div className="muted">ID: {String(w.id ?? w._id ?? "").slice(-8)}</div>
            </div>
          );
        })
      )}
    </div>
  );
}

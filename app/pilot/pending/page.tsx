"use client";

// Pilot pending earnings — Super App PendingEarningsScreen parity: per-mission
// pending cards with When & Where, address and earnings boxes, View Details.

import Link from "next/link";

import { usePilot } from "@/lib/pilot/data";

export default function PilotPendingEarnings() {
  const { pendingEarnings, loading, error, reload } = usePilot();

  return (
    <>
      <Link href="/pilot/earnings" style={{ color: "var(--p-forest)", fontWeight: 600 }}>
        ← Back to Earnings
      </Link>
      <h1 className="p-h1 mt-2">All Pending Earnings</h1>
      {error ? (
        <div className="p-card">
          {error} <button className="p-btn outline" onClick={reload}>Retry</button>
        </div>
      ) : loading ? (
        <div className="p-card">Loading…</div>
      ) : pendingEarnings.length === 0 ? (
        <div className="p-card">No pending earnings.</div>
      ) : (
        pendingEarnings.map((p) => (
          <div className="p-mission" key={p.id}>
            <b>{p.title}</b>
            <p className="p-sub my-1 mx-0">{p.description}</p>
            <p className="p-sub m-0">When & Where: {p.date}</p>
            {p.address ? (
              <div className="p-card mt-2" style={{ padding: 12 }}>
                <span className="p-sub">{p.address}</span>
              </div>
            ) : null}
            <div className="p-card mt-2" style={{ padding: 12 }}>
              <b style={{ fontSize: 13 }}>
                Earnings: {p.amount != null ? `₹${p.amount.toLocaleString("en-IN")}` : "—"} (Pending)
              </b>
            </div>
            <Link href={`/pilot/missions/${p.missionId}`} style={{ color: "var(--p-forest)", fontSize: 13, fontWeight: 600 }}>
              View Details →
            </Link>
          </div>
        ))
      )}
    </>
  );
}

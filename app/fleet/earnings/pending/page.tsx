"use client";

// FM pending earnings — per-mission pending cards with booking-details nav.

import Link from "next/link";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";
import * as React from "react";

export default function FleetPendingEarnings() {
  const { reload } = useFleetData();
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fleetApi
      .getPendingCommission()
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
  }, [reload]);

  return (
    <div>
      <Link href="/fleet/earnings">← Earnings</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Pending Earnings</h1>
          <p>Missions awaiting settlement.</p>
        </div>
      </div>
      {loading ? (
        <div className="card">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card empty">No pending earnings.</div>
      ) : (
        rows.map((r, i) => {
          const bid = String(r.bookingId ?? r.bookingNumber ?? r.id ?? i);
          return (
            <div className="card mb-2.5" key={bid}>
              <b style={{ fontSize: 13 }}>{String(r.serviceType ?? r.type ?? "Mission")}</b>
              <div className="muted">{String(r.scheduledDate ?? r.date ?? "")}</div>
              <div className="muted">{String(r.address ?? r.location ?? "")}</div>
              <div className="mt-1.5">
                <b>Mission Earnings ₹{Number(r.amount ?? r.pendingAmount ?? 0).toLocaleString("en-IN")} (Pending)</b>
              </div>
              <div className="actions mt-2">
                <Link className="btn secondary" href={`/fleet/bookings/${encodeURIComponent(bid)}`}>
                  View Details
                </Link>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

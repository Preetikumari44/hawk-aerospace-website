"use client";

// Pilot refund status — Super App RefundStatusScreen parity: booking cards
// with refund/original amounts, reason, admin notes, 4-step timeline.

import Link from "next/link";
import * as React from "react";

import { pilotApi } from "@/lib/booking/role-apis";

const STEPS = ["pending", "approved", "processing", "completed"];

export default function PilotRefunds() {
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    pilotApi
      .getMyRefunds()
      .then((v) => {
        if (cancelled) return;
        setRows(Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
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
      <h1 className="p-h1 mt-2">Refund Status</h1>
      {loading ? (
        <div className="p-card">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-card">No refund requests.</div>
      ) : (
        rows.map((r, i) => {
          const status = String(r.status ?? "pending").toLowerCase();
          const failed = status === "rejected" || status === "failed";
          const stepIdx = failed ? -1 : STEPS.indexOf(status);
          return (
            <div className="p-mission" key={String(r.id ?? r._id ?? i)}>
              <div className="flex justify-between items-center gap-2">
                <b>Booking #{String(r.bookingId ?? "").slice(-8)}</b>
                <span className={`p-badge-pill ${failed ? "error" : status === "completed" ? "success" : "warning"}`}>
                  {String(r.status ?? "")}
                </span>
              </div>
              <p className="p-sub mt-1">
                Refund: ₹{Number(r.refundAmount ?? r.amount ?? 0).toLocaleString("en-IN")}
                {r.refundPercent != null ? ` (${String(r.refundPercent)}%)` : ""}
              </p>
              <p className="p-sub m-0">
                Original: ₹{Number(r.originalAmount ?? 0).toLocaleString("en-IN")}
              </p>
              {r.reason ? <p className="p-sub m-0">Reason: {String(r.reason)}</p> : null}
              {r.requestedAt ? (
                <p className="p-sub m-0">
                  Requested: {new Date(String(r.requestedAt)).toLocaleString("en-IN")}
                </p>
              ) : null}
              {r.adminNotes ? <p className="p-sub m-0">{failed ? "Rejected: " : "Notes: "}{String(r.adminNotes)}</p> : null}
              {status === "completed" ? (
                <p className="p-sub mt-1">Refund sent to original payment method.</p>
              ) : null}
              {!failed && (
                <div className="p-segment mt-2" style={{ maxWidth: "100%" }}>
                  {STEPS.map((s, si) => (
                    <button key={s} className={si <= stepIdx ? "active" : ""} style={{ fontSize: 11 }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

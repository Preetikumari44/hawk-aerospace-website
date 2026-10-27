"use client";

// FM refund status — booking cards + 4-step pending→completed timeline
// (Super App fmRefundStatusScreen parity).

import Link from "next/link";

import { useFleetData } from "@/lib/fleet/data";

const STEPS = ["pending", "approved", "processing", "completed"];

export default function FleetRefunds() {
  const { refunds } = useFleetData();
  return (
    <div>
      <Link href="/fleet/earnings">← Earnings</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Refund Status</h1>
          <p>Refunds on your missions.</p>
        </div>
      </div>
      {refunds.length === 0 ? (
        <div className="card empty">No refund requests.</div>
      ) : (
        refunds.map((r, i) => {
          const status = String(r.status ?? "pending").toLowerCase();
          const failed = status === "rejected" || status === "failed";
          const stepIdx = failed ? -1 : STEPS.indexOf(status);
          return (
            <div className="card mb-2.5" key={String(r.id ?? r._id ?? i)}>
              <div className="row">
                <b>Booking #{String(r.bookingId ?? "").slice(-8)}</b>
                <span className={"badge " + (failed ? "red" : status === "completed" ? "blue" : "")}>
                  {String(r.status ?? "")}
                </span>
              </div>
              <div className="muted">
                Refund: ₹{Number(r.refundAmount ?? r.amount ?? 0).toLocaleString("en-IN")}
                {r.refundPercent != null ? ` (${String(r.refundPercent)}%)` : ""}
              </div>
              <div className="muted">Original: ₹{Number(r.originalAmount ?? 0).toLocaleString("en-IN")}</div>
              {r.reason ? <div className="muted">Reason: {String(r.reason)}</div> : null}
              {r.requestedAt ? (
                <div className="muted">Requested: {new Date(String(r.requestedAt)).toLocaleString("en-IN")}</div>
              ) : null}
              {r.adminNotes ? <div className="muted">Rejected: {String(r.adminNotes)}</div> : null}
              {status === "completed" ? <div className="muted">Refund sent to original payment method.</div> : null}
              {!failed && (
                <div className="actions mt-2">
                  {STEPS.map((s, si) => (
                    <span key={s} className={"badge " + (si <= stepIdx ? "blue" : "")}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

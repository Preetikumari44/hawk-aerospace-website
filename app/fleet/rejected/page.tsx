"use client";

// FM rejected missions — merged rejected view: cancelled/rejected missions +
// rejected/timeout/cancelled FM requests, deduped by booking (Super App
// RejectedMissionsScreen parity).

import Link from "next/link";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";
import * as React from "react";

export default function FleetRejected() {
  const { rejectedMissions, requestHistory, showToast } = useFleetData();

  const histRejected = requestHistory.filter((r) =>
    /reject|timeout|cancel/i.test(String(r.status ?? "")),
  );

  const seen = new Set<string>();
  const cards: { key: string; title: string; meta: string; bookingId: string; requestId?: string }[] = [];
  const push = (key: string, title: string, meta: string, bookingId: string, requestId?: string) => {
    const k = bookingId || key;
    if (seen.has(k)) return;
    seen.add(k);
    cards.push({ key: k, title, meta, bookingId, requestId });
  };

  rejectedMissions.forEach((m) =>
    push(m.id, `${m.type} · Rejected`, `${m.client} · ${m.date} · ${m.status}`, m.id),
  );
  histRejected.forEach((r, i) => {
    const bid = String(r.bookingId ?? r.bookingNumber ?? "");
    push(
      `h${i}`,
      `${String(r.serviceType ?? "Request")} · ${String(r.status ?? "rejected")}`,
      `${String(r.address ?? r.location ?? "")} · ${String(r.date ?? r.createdAt ?? "").slice(0, 10)}`,
      bid,
      String(r.requestId ?? r.id ?? ""),
    );
  });

  async function reaccept(bookingId: string, requestId?: string) {
    if (!requestId) {
      showToast("No live request to accept for this mission.");
      return;
    }
    try {
      const res = (await fleetApi.acceptFleetManagerRequest(requestId, bookingId)) as Record<string, unknown>;
      const booking = res.booking as Record<string, unknown> | undefined;
      showToast("Accepted.");
      window.location.href = `/fleet/bookings/${encodeURIComponent(String(booking?.bookingNumber ?? booking?.id ?? bookingId))}`;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Accept failed.");
    }
  }

  return (
    <div>
      <Link href="/fleet/missions">← Missions</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Rejected Missions</h1>
          <p>Cancelled and declined work, safe to re-accept.</p>
        </div>
      </div>
      {cards.length === 0 ? (
        <div className="card empty">No rejected missions.</div>
      ) : (
        cards.map((c) => (
          <div className="card mb-2.5" key={c.key}>
            <b style={{ fontSize: 13 }}>{c.title}</b>
            <div className="muted">{c.meta}</div>
            <div className="actions mt-2">
              {c.bookingId ? (
                <button className="btn primary" onClick={() => void reaccept(c.bookingId, c.requestId)}>
                  Accept
                </button>
              ) : null}
              {c.requestId ? (
                <Link className="btn secondary" href={`/fleet/requests/${encodeURIComponent(c.requestId)}`}>
                  View Details
                </Link>
              ) : c.bookingId ? (
                <Link className="btn secondary" href={`/fleet/bookings/${encodeURIComponent(c.bookingId)}`}>
                  View Details
                </Link>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

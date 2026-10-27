"use client";

// Technician jobs — open repair list linking into the full ticket-detail
// route (pickup verify, start, charges, finish live there with gating).

import Link from "next/link";

import { useTech } from "@/lib/tech/data";

export default function TechJobs() {
  const { tickets, loading } = useTech();

  const open = tickets.filter((t) => !/complet|clos|reject|resolv/i.test(t.status));

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="title">Jobs</div>
          <p className="sub">View and manage assigned repair jobs.</p>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading…</div>
      ) : open.length === 0 ? (
        <div className="empty">No jobs assigned.</div>
      ) : (
        open.map((t) => (
          <div className="card mb-3" key={t.id}>
            <div className="cartrow">
              <div>
                <b>{t.title}</b>
                <p className="sub">
                  {t.id} · {t.status} · {t.priority} · {t.droneName}
                </p>
                <p className="sub">{t.issue}</p>
              </div>
              <Link href={`/technician/tickets/${encodeURIComponent(t.id)}`} className="btn">
                Open Repair
              </Link>
            </div>
          </div>
        ))
      )}
    </>
  );
}

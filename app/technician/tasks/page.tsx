"use client";

// Technician tasks — Super App RepairsScreen parity: status tabs with
// per-tab actions (Start Repair / Transit / Details), Completed financial
// cards, duty-schedule selector, calendar + day tickets.

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { technicianApi } from "@/lib/booking/role-apis";
import { useTech } from "@/lib/tech/data";

const TABS = ["Active", "Upcoming", "Completed"] as const;
const DUTIES = [
  { key: "full_active", label: "Full Day Active" },
  { key: "morning_off", label: "Morning Off-Duty" },
  { key: "evening_off", label: "Evening Off-Duty" },
  { key: "full_off", label: "Full Day Off-Duty" },
] as const;

function monthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const keyOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export default function TechTasks() {
  const { incoming, tickets, acceptTicket, rejectTicket, showToast, loading, duty, setDutySchedule } = useTech();
  const router = useRouter();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Active");
  const [acting, setActing] = React.useState<string | null>(null);
  const now = new Date();
  const [ym, setYm] = React.useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = React.useState<string | null>(null);

  const inTab = tickets.filter((t) => {
    const s = t.status.toLowerCase();
    if (tab === "Completed") return /complet|clos|resolv|done/.test(s);
    if (tab === "Upcoming") return /open|pending|assign|schedul|upcoming/.test(s) && !/progress|repair/.test(s);
    return /progress|repair|open|active/.test(s);
  });
  const dayTickets = selected
    ? tickets.filter((t) => t.date.includes(selected) || t.meta.includes(selected))
    : [];
  const activity = new Set(
    tickets
      .map((t) => {
        const m = t.date.match(/(\d{4})-(\d{2})-(\d{2})/);
        return m ? Number(m[3]) : null;
      })
      .filter((d): d is number => d !== null),
  );

  async function act(id: string, fn: (mid: string) => Promise<void>, ok: string) {
    setActing(id);
    try {
      await fn(id);
      showToast(ok);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  async function startRepair(id: string) {
    setActing(id);
    try {
      await technicianApi.updateTicketStage(id, { stage: "in_progress" });
      showToast("Repair started.");
      router.push(`/technician/tickets/${encodeURIComponent(id)}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  const monthName = new Date(ym.y, ym.m, 1).toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="title">Your Tickets</div>
          <p className="sub">Manage assigned technician tasks.</p>
        </div>
      </div>

      <div className="chips">
        {TABS.map((t) => (
          <button key={t} className={"chip" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <h3 className="sectiontitle">Incoming Requests ({String(incoming.length).padStart(2, "0")})</h3>
      {loading ? (
        <div className="card">Loading…</div>
      ) : incoming.length === 0 ? (
        <div className="empty">No {tab.toLowerCase()} tickets to show right now.</div>
      ) : (
        incoming.map((t) => (
          <div className="card mb-2.5" key={t.id}>
            <div className="cartrow">
              <div>
                <b>{t.title}</b>
                <p className="sub">
                  {t.id} · {t.priority} · {t.status} · {t.date}
                </p>
                <p className="sub">{t.issue}</p>
              </div>
              <div className="actions flex gap-2">
                <button className="btn" disabled={acting === t.id} onClick={() => void act(t.id, acceptTicket, "Ticket accepted.")}>
                  Accept
                </button>
                <button className="btn danger" disabled={acting === t.id} onClick={() => void act(t.id, rejectTicket, "Ticket rejected.")}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <h3 className="sectiontitle mt-4.5">
        {tab} Tickets ({inTab.length})
      </h3>
      {inTab.length === 0 ? (
        <div className="empty">No {tab.toLowerCase()} tickets to show right now.</div>
      ) : tab === "Completed" ? (
        inTab.slice(0, 10).map((t) => (
          <div className="card mb-2.5" key={t.id}>
            <b>{t.title}</b>
            <p className="sub">
              Est. earnings · {t.date} · {t.meta || t.droneName}
            </p>
            <p className="sub">
              {t.id} · {t.status} · {t.droneName} · {t.date}
            </p>
            <Link href={`/technician/tickets/${encodeURIComponent(t.id)}`} className="btn secondary mt-1.5 inline-block">
              View Details
            </Link>
          </div>
        ))
      ) : (
        inTab.slice(0, 10).map((t) => (
          <div className="card mb-2.5" key={t.id}>
            <div className="cartrow">
              <div>
                <b>{t.title}</b>
                <p className="sub">
                  {t.id} · {t.status} · {t.droneName} · {t.date}
                </p>
                <p className="sub">{t.issue}</p>
              </div>
              <div className="actions flex gap-2">
                {tab === "Active" ? (
                  <button className="btn" disabled={acting === t.id} onClick={() => void startRepair(t.id)}>
                    Start Repair
                  </button>
                ) : (
                  <button className="btn" disabled={acting === t.id} onClick={() => void startRepair(t.id)}>
                    Start Transit
                  </button>
                )}
                <Link href={`/technician/tickets/${encodeURIComponent(t.id)}`} className="btn secondary">
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="grid2 mt-4.5">
        <div className="card">
          <h3 className="sectiontitle">Manage your Schedule</h3>
          <div className="chips" style={{ padding: "0 0 12px" }}>
            {DUTIES.map((d) => (
              <button
                key={d.key}
                className={"chip" + (duty === d.key ? " active" : "")}
                onClick={() => {
                  setDutySchedule(d.key);
                  showToast(`Schedule: ${d.label}.`);
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center mb-2">
            <button
              className="btn secondary"
              onClick={() => setYm((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
            >
              ‹
            </button>
            <b>{monthName}</b>
            <button
              className="btn secondary"
              onClick={() => setYm((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
            >
              ›
            </button>
          </div>
          <div className="grid gap-1 text-center" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="sub">
                {d}
              </span>
            ))}
            {monthGrid(ym.y, ym.m).flat().map((d, i) =>
              d === null ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  className="chip"
                  style={
                    selected === keyOf(ym.y, ym.m, d)
                      ? { background: "var(--forest)", color: "#fff", borderColor: "var(--forest)" }
                      : undefined
                  }
                  onClick={() => setSelected(keyOf(ym.y, ym.m, d))}
                >
                  {d}
                  {activity.has(d) ? " •" : ""}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="sectiontitle">Tickets for the Day</h3>
          {!selected ? (
            <div className="empty">Select a date to see tickets.</div>
          ) : dayTickets.length === 0 ? (
            <div className="empty">No tickets scheduled for this day.</div>
          ) : (
            dayTickets.map((t) => (
              <div key={t.id} className="mb-2">
                <b style={{ fontSize: 13 }}>{t.title}</b>
                <p className="sub">{t.meta || t.date}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

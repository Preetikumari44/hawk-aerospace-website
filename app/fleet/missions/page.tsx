"use client";

// Fleet missions — exact teammate layout + backend actions (auto-assign,
// accept/reject incoming requests, assign pilot/drone). Deep-linkable tabs,
// cancelled merged into Completed, rich cards with booking-details nav.

import { MapPin, Plane, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useState } from "react";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

const TABS = ["Active", "Upcoming", "Completed"] as const;

function MissionsInner() {
  const { missions, rejectedMissions, requests, reload, showToast } = useFleetData();
  const search = useSearchParams();
  const initial = search.get("tab");
  const [tab, setTab] = useState<string>(
    initial && (TABS as readonly string[]).includes(initial) ? initial : "Active",
  );
  const [acting, setActing] = useState<string | null>(null);
  const [assign, setAssign] = useState({ bookingId: "", pilotId: "", droneId: "" });
  // The rejected endpoint and the main list can contain the same booking —
  // dedupe by id so Completed never shows twins.
  const completedIds = new Set(missions.filter((m) => m.tab === "Completed").map((m) => m.id));
  const all =
    tab === "Completed"
      ? [...missions.filter((m) => m.tab === "Completed"), ...rejectedMissions.filter((r) => !completedIds.has(r.id))]
      : missions.filter((m) => m.tab === tab);
  const list = all;

  async function act(key: string, fn: () => Promise<unknown>, ok: string) {
    setActing(key);
    try {
      await fn();
      showToast(ok);
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <div className="pageTitle">
        <div>
          <h1>Missions</h1>
          <p>Manage active, upcoming and completed fleet missions.</p>
        </div>
      </div>

      {requests.length > 0 && (
        <div className="card mb-3">
          <div className="panelHead">
            <h2>Incoming Requests ({requests.length})</h2>
          </div>
          {requests.slice(0, 5).map((r, i) => {
            const rid = String(r.requestId ?? r.id ?? i);
            const bid = String(r.bookingId ?? r.bookingNumber ?? "");
            return (
              <div className="dRow" key={rid}>
                <span>
                  <b><Link href={`/fleet/requests/${encodeURIComponent(rid)}`}>{bid || rid}</Link></b>
                  <small>{String(r.serviceType ?? "")}</small>
                </span>
                <span className="flex gap-1.5">
                  <button
                    className="btn primary"
                    disabled={acting === rid}
                    onClick={() => void act(rid, () => fleetApi.acceptFleetManagerRequest(rid, bid), "Accepted.")}
                  >
                    Accept
                  </button>
                  <button
                    className="btn secondary"
                    disabled={acting === rid}
                    onClick={() =>
                      void act(rid, () => fleetApi.rejectFleetManagerRequest(rid, bid, "Rejected from web"), "Rejected.")
                    }
                  >
                    Reject
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mb-3">
        <div className="panelHead">
          <h2>Assign pilot / drone (own roster)</h2>
        </div>
        <div className="grid three">
          <div className="search">
            <input
              value={assign.bookingId}
              onChange={(e) => setAssign((a) => ({ ...a, bookingId: e.target.value }))}
              placeholder="Booking ID"
            />
          </div>
          <div className="search">
            <input
              value={assign.pilotId}
              onChange={(e) => setAssign((a) => ({ ...a, pilotId: e.target.value }))}
              placeholder="Pilot ID"
            />
          </div>
          <div className="search">
            <input
              value={assign.droneId}
              onChange={(e) => setAssign((a) => ({ ...a, droneId: e.target.value }))}
              placeholder="Drone ID"
            />
          </div>
        </div>
        <div className="actions mt-2.5">
          <button
            className="btn primary"
            disabled={!assign.bookingId || !assign.pilotId || acting === "ap"}
            onClick={() =>
              void act("ap", () => fleetApi.assignFleetManagerPilot(assign.bookingId, assign.pilotId), "Pilot assigned.")
            }
          >
            Assign pilot
          </button>
          <button
            className="btn secondary"
            disabled={!assign.bookingId || !assign.droneId || acting === "ad"}
            onClick={() =>
              void act("ad", () => fleetApi.assignFleetManagerDrone(assign.bookingId, assign.droneId), "Drone assigned.")
            }
          >
            Assign drone
          </button>
        </div>
      </div>

      <div className="actions mb-3">
        {TABS.map((t) => (
          <button key={t} className={"btn " + (tab === t ? "primary" : "secondary")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <Link className="btn secondary" href="/fleet/rejected">
          Rejected
        </Link>
      </div>
      <div className="list">
        {list.map((m) => (
          <div className="card" key={m.id}>
            <div className="row">
              <div>
                <b style={{ fontSize: 13 }}>{m.type}</b>
                <div className="muted">
                  {m.id} · {m.client}
                </div>
              </div>
              <span className={"badge " + (m.status === "In Progress" ? "blue" : m.status === "Rejected" ? "red" : "")}>
                {m.status}
              </span>
            </div>
            <div className="grid three mt-3">
              <div className="muted">
                <MapPin size={13} className="mr-1" style={{ verticalAlign: "middle" }} />
                {m.location}
              </div>
              <div className="muted">
                <UserRound size={13} className="mr-1" style={{ verticalAlign: "middle" }} />
                {m.pilot || "Not assigned"}
              </div>
              <div className="muted">
                <Plane size={13} className="mr-1" style={{ verticalAlign: "middle" }} />
                {m.drone || "Not assigned"} · {m.date} {m.time}
              </div>
            </div>
            <div className="actions mt-2.5">
              <Link className="btn primary" href={`/fleet/bookings/${encodeURIComponent(m.id)}`}>
                View Details
              </Link>
              <Link className="btn secondary" href={`/fleet/handover?booking=${encodeURIComponent(m.id)}`}>
                Handover
              </Link>
              <button
                className="btn secondary"
                disabled={acting === m.id}
                onClick={() => void act(m.id, () => fleetApi.autoAssignMission(m.id), "Auto-assign requested.")}
              >
                Auto-assign
              </button>
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <div className="card empty">No missions in this status.</div>}
    </div>
  );
}

export default function FleetMissions() {
  return (
    <React.Suspense fallback={<div className="card">Loading…</div>}>
      <MissionsInner />
    </React.Suspense>
  );
}

"use client";

// FM drone details — Super App DroneDetailsScreen parity: normalized status,
// identifiers, assigned mission / maintenance ticket context, assign flow.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

export default function FleetDroneDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { drones, missions, tickets, reload, showToast } = useFleetData();
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);

  const listed = drones.find((x) => x.id === decodeURIComponent(id)) ?? null;

  React.useEffect(() => {
    let cancelled = false;
    fleetApi
      .getDrone(decodeURIComponent(id))
      .then((d) => {
        if (!cancelled) setDetail((d ?? null) as Record<string, unknown> | null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const d = { ...(listed ?? {}), ...(detail ?? {}) } as Record<string, unknown>;
  const code = String(d.code ?? "");
  const history = missions.filter((m) => m.drone && code && String(m.drone).includes(code));
  const ticket = tickets.find((t) => t.resource.includes(code) && /open|progress/i.test(t.status));

  return (
    <div>
      <Link href="/fleet/resources">← Resources</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>{String(d.model ?? "Drone")}</h1>
          <p>
            {code} · {String(d.status ?? listed?.status ?? "")}
          </p>
        </div>
      </div>
      <div className="grid two">
        <div className="card">
          <div className="panelHead"><h2>Identifiers</h2></div>
          <div className="kv">
            <div><span>Model</span><b>{String(d.model ?? "—")}</b></div>
            <div><span>Code</span><b>{code || "—"}</b></div>
            <div><span>Type</span><b>{String(d.type ?? "—")}</b></div>
            <div><span>Company</span><b>{String(d.company ?? d.manufacturer ?? "—")}</b></div>
            <div><span>Year</span><b>{String(d.year ?? "—")}</b></div>
            <div><span>Flight Hours</span><b>{String(d.flightHours ?? "—")}</b></div>
          </div>
          <div className="actions mt-2.5">
            <Link className="btn primary" href="/fleet/missions">Assign Mission</Link>
          </div>
        </div>
        <div className="card">
          <div className="panelHead"><h2>Assignment</h2></div>
          {history.length > 0 ? (
            <div className="kv">
              <div><span>Mission</span><b>{history[0].type} · {history[0].id}</b></div>
              <div><span>Status</span><b>{history[0].status}</b></div>
            </div>
          ) : ticket ? (
            <div className="kv">
              <div><span>Maintenance Ticket</span><b>{ticket.id} · {ticket.status}</b></div>
              <div><span>Issue</span><b>{ticket.issue}</b></div>
            </div>
          ) : (
            <div className="empty">Deployable — no active assignment.</div>
          )}
        </div>
      </div>
      <div className="sectionHead"><h2>Mission History ({history.length})</h2></div>
      <div className="card">
        {history.length === 0 ? (
          <div className="empty">No missions yet.</div>
        ) : (
          history.slice(0, 8).map((m) => (
            <div className="dRow" key={m.id}>
              <span>
                <b>{m.type}</b>
                <small>{m.date} · {m.status}</small>
              </span>
              <Link href={`/fleet/bookings/${encodeURIComponent(m.id)}`}>Details →</Link>
            </div>
          ))
        )}
      </div>
      <div className="actions mt-3">
        <button
          className="btn secondary"
          onClick={() => {
            showToast("Drone removal is handled by support.");
            router.push("/support");
          }}
        >
          Remove Drone
        </button>
      </div>
    </div>
  );
}

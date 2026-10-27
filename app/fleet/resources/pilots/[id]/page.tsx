"use client";

// FM pilot details — Super App PilotDetailsScreen parity: profile, contact,
// service types, assigned mission, documents, mission history, assign flow.

import Link from "next/link";
import { Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

export default function FleetPilotDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { pilots, missions, reload, showToast } = useFleetData();
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);

  const listed = pilots.find((p) => p.id === decodeURIComponent(id)) ?? null;

  React.useEffect(() => {
    let cancelled = false;
    fleetApi
      .getPilot(decodeURIComponent(id))
      .then((d) => {
        if (!cancelled) setDetail((d ?? null) as Record<string, unknown> | null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const d = { ...(listed ?? {}), ...(detail ?? {}) } as Record<string, unknown>;
  const name = String(d.name ?? "Pilot");
  const history = missions.filter(
    (m) => m.pilot && (String(m.pilot).includes(name) || name.includes(String(m.pilot))),
  );
  const docs = Array.isArray(d.documents) ? (d.documents as unknown[]) : [];

  return (
    <div>
      <Link href="/fleet/resources">← Resources</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>{name}</h1>
          <p className="flex items-center gap-1">
            {String(d.status ?? listed?.status ?? "")} · <Star size={12} className="inline" aria-hidden="true" /> {String(d.rating ?? listed?.rating ?? "—")}
          </p>
        </div>
      </div>
      <div className="grid two">
        <div className="card">
          <div className="panelHead"><h2>Profile</h2></div>
          <div className="kv">
            <div><span>Phone</span><b>{String(d.phone ?? listed?.phone ?? "—")}</b></div>
            <div><span>Email</span><b>{String(d.email ?? "—")}</b></div>
            <div><span>License</span><b>{String(d.license ?? d.licenseNumber ?? "—")}</b></div>
            <div><span>Joined</span><b>{String(d.createdAt ?? d.joiningDate ?? "—").slice(0, 10)}</b></div>
            <div><span>Service Types</span><b>{Array.isArray(d.serviceTypes) ? (d.serviceTypes as unknown[]).join(", ") : String(d.serviceTypes ?? listed?.skills?.join(", ") ?? "—")}</b></div>
            <div><span>Status</span><b>{String(d.status ?? listed?.status ?? "—")}</b></div>
          </div>
          <div className="actions mt-2.5">
            <Link className="btn primary" href="/fleet/missions">Assign Mission</Link>
          </div>
        </div>
        <div className="card">
          <div className="panelHead"><h2>Documents</h2></div>
          {docs.length === 0 ? (
            <div className="empty">No documents on file.</div>
          ) : (
            docs.map((doc, i) => (
              <div className="dRow" key={i}>
                <span><b>{String((doc as Record<string, unknown>).name ?? (doc as Record<string, unknown>).type ?? `Document ${i + 1}`)}</b></span>
              </div>
            ))
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
            showToast("Pilot removal is handled by support.");
            router.push("/support");
          }}
        >
          Remove Pilot
        </button>
      </div>
    </div>
  );
}

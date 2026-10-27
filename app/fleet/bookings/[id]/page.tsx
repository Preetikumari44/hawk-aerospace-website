"use client";

// FM booking details — Super App fmBookingDetailsscreen parity: 5-node
// mission stepper, pilot/drone recommendations + assign sheets, weather /
// restriction / tracking context, pricing breakdown, cancel, support chat,
// handover banner.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { chatApi, fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

const NODES = ["mission_accepted", "drone_assigned", "pilot_assigned", "service_started", "service_ended"];

function stageIndex(status: string): number {
  const s = status.toLowerCase();
  if (/end|complet/.test(s)) return 4;
  if (/start|progress|transit|fly/.test(s)) return 3;
  if (/pilot/.test(s)) return 2;
  if (/drone/.test(s)) return 1;
  return 0;
}

export default function FleetBookingDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { showToast, reload } = useFleetData();
  const [mission, setMission] = React.useState<Record<string, unknown> | null>(null);
  const [weather, setWeather] = React.useState<Record<string, unknown> | null>(null);
  const [restrictions, setRestrictions] = React.useState<Record<string, unknown> | null>(null);
  const [tracking, setTracking] = React.useState<Record<string, unknown> | null>(null);
  const [pilotRecs, setPilotRecs] = React.useState<Record<string, unknown>[]>([]);
  const [droneRecs, setDroneRecs] = React.useState<Record<string, unknown>[]>([]);
  const [sheet, setSheet] = React.useState<"pilot" | "drone" | null>(null);
  const [acting, setActing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const raw = (await fleetApi.getMission(decodeURIComponent(id))) as Record<string, unknown>;
      // GET /fleet/missions/:id returns { mission, pilot?, drone? } — unwrap.
      const m =
        raw && typeof raw === "object" && (raw as Record<string, unknown>).mission &&
        typeof (raw as Record<string, unknown>).mission === "object"
          ? (((raw as Record<string, unknown>).mission as Record<string, unknown>))
          : raw;
      setMission(m);
      const mid = String(m.bookingId ?? m.id ?? id);
      fleetApi.getBookingWeather(mid).then((w) => setWeather((w ?? null) as Record<string, unknown> | null)).catch(() => undefined);
      fleetApi.getBookingRestrictions(mid).then((r) => setRestrictions((r ?? null) as Record<string, unknown> | null)).catch(() => undefined);
      fleetApi.getBookingTracking(mid).then((t) => setTracking((t ?? null) as Record<string, unknown> | null)).catch(() => undefined);
      const [pr, dr] = await Promise.all([
        fleetApi.getPilotRecommendations(mid).catch(() => []),
        fleetApi.getDroneRecommendations(mid).catch(() => []),
      ]);
      const toArr = (v: unknown): Record<string, unknown>[] => {
        if (Array.isArray(v)) return v as Record<string, unknown>[];
        const o = (v ?? {}) as Record<string, unknown>;
        for (const k of ["pilots", "drones", "items", "data", "results"]) {
          if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
        }
        return [];
      };
      setPilotRecs(toArr(pr));
      setDroneRecs(toArr(dr));
    } catch {
      setMission(null);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(t);
  }, [load]);

  async function assign(kind: "pilot" | "drone", rid: string) {
    const mid = String(mission?.bookingId ?? mission?.id ?? id);
    setActing(true);
    try {
      const res = (kind === "pilot"
        ? await fleetApi.assignFleetManagerPilot(mid, rid)
        : await fleetApi.assignFleetManagerDrone(mid, rid)) as Record<string, unknown>;
      const code = res.handoverIssueCode;
      showToast(
        kind === "drone" && code
          ? `Drone assigned. Issue code: ${code} — share it in person.`
          : `${kind === "pilot" ? "Pilot" : "Drone"} assigned.`,
      );
      setSheet(null);
      reload();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Assign failed.");
    } finally {
      setActing(false);
    }
  }

  async function cancel() {
    const mid = String(mission?.bookingId ?? mission?.id ?? id);
    setActing(true);
    try {
      await fleetApi.cancelBooking(mid, "Cancelled by fleet manager (web)");
      showToast("Booking cancelled.");
      router.push("/fleet/missions");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setActing(false);
    }
  }

  async function openChat() {
    const mid = String(mission?.bookingId ?? mission?.id ?? id);
    try {
      const conv = (await chatApi.createConversation({ participantUid: "admin", participantRole: "admin", type: "support", bookingId: mid })) as Record<string, unknown>;
      const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? "");
      router.push(cid ? `/chat/${cid}?refId=${encodeURIComponent(mid)}` : "/chat");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not open chat.");
    }
  }

  if (mission === null) {
    return (
      <div>
        <Link href="/fleet/missions">← Missions</Link>
        <div className="card mt-3">Loading mission…</div>
      </div>
    );
  }
  if (!mission) {
    return (
      <div>
        <Link href="/fleet/missions">← Missions</Link>
        <div className="card mt-3">Mission not found.</div>
      </div>
    );
  }

  const status = String(mission.status ?? "");
  const idx = stageIndex(status);
  const issueCode = String(mission.handoverIssueCode ?? "");
  const returnCode = String(mission.handoverReturnCode ?? "");
  const price = (mission.priceBreakdown ?? {}) as Record<string, unknown>;

  return (
    <div>
      <Link href="/fleet/missions">← Missions</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>{String(mission.bookingNumber ?? mission.id ?? id)}</h1>
          <p>{String(mission.serviceType ?? "")} · {String(mission.address ?? mission.location ?? "")}</p>
        </div>
      </div>

      {(issueCode || returnCode || String(mission.assignedDrone ?? mission.assignedDroneId ?? mission.droneId ?? "")) && (
        <div className="card mb-3" style={{ background: "var(--mintSoft)" }}>
          <b>Handover</b>
          {issueCode ? <p className="muted">Issue code: <b>{String(issueCode)}</b> — share in person.</p> : null}
          {returnCode ? <p className="muted">Return code: <b>{String(returnCode)}</b> — {String(mission.handoverReturnVerified ? "verified ✓" : "awaiting verification")}.</p> : null}
          {!issueCode && !returnCode ? (
            <p className="muted">Drone assigned — open handover to view the issue code.</p>
          ) : null}
          <Link className="btn secondary" href={`/fleet/handover?booking=${encodeURIComponent(String(mission.bookingId ?? mission.id ?? id))}`}>
            Open Handover
          </Link>
        </div>
      )}

      <div className="card mb-3">
        <div className="panelHead"><h2>Mission Progress</h2><span className="badge">{status}</span></div>
        <div className="actions mb-1.5">
          {["Accepted", "Drone", "Pilot", "Started", "Ended"].map((s, i) => (
            <span key={s} className={"badge " + (i <= idx ? "blue" : "")}>{s}</span>
          ))}
        </div>
        <div className="kv mt-2.5">
          <div><span>Pilot</span><b>{String(mission.assignedPilot ?? mission.pilotName ?? "—")}</b></div>
          <div><span>Drone</span><b>{String(mission.assignedDrone ?? mission.assignedDroneId ?? mission.droneId ?? mission.droneName ?? "—")}</b></div>
          <div><span>Date</span><b>{String(mission.scheduledDate ?? mission.date ?? "—")}</b></div>
          <div><span>Slot</span><b>{String(mission.preferredTimeSlot ?? mission.time ?? "—")}</b></div>
          <div><span>Customer</span><b>{String(mission.customerName ?? mission.client ?? "—")}</b></div>
          <div><span>Payment</span><b>{String(mission.paymentStatus ?? "—")}</b></div>
        </div>
        <div className="actions mt-2.5">
          <button className="btn primary" onClick={() => setSheet("pilot")}>Assign Pilot</button>
          <button className="btn primary" onClick={() => setSheet("drone")}>Assign Drone</button>
          <button className="btn secondary" onClick={() => void openChat()}>Support Chat</button>
          <button className="btn secondary" disabled={acting} onClick={() => void cancel()}>Cancel Booking</button>
        </div>
      </div>

      {sheet ? (
        <div className="card mb-3">
          <div className="panelHead">
            <h2>{sheet === "pilot" ? "Recommended Pilots" : "Recommended Drones"} (own roster)</h2>
            <button className="btn secondary" onClick={() => setSheet(null)}>Close</button>
          </div>
          {(sheet === "pilot" ? pilotRecs : droneRecs).length === 0 ? (
            <div className="empty">No recommendations — enter IDs on the missions page.</div>
          ) : (
            (sheet === "pilot" ? pilotRecs : droneRecs).map((r, i) => {
              const rid = String(r.id ?? r.uid ?? r.pilotId ?? r.droneId ?? i);
              return (
                <div className="dRow" key={rid}>
                  <span>
                    <b>{String(r.name ?? r.model ?? rid)}</b>
                    <small>{String(r.phone ?? r.code ?? r.distanceKm != null ? `${r.distanceKm} km` : "")}</small>
                  </span>
                  <button className="btn primary" disabled={acting} onClick={() => void assign(sheet, rid)}>
                    Assign
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      <div className="grid two">
        <div className="card">
          <div className="panelHead"><h2>Flight Conditions</h2></div>
          <p className="muted">Weather: {weather ? JSON.stringify(weather).slice(0, 160) : "—"}</p>
          <p className="muted">Airspace: {restrictions ? JSON.stringify(restrictions).slice(0, 160) : "—"}</p>
          <p className="muted">Tracking: {tracking ? JSON.stringify(tracking).slice(0, 160) : "—"}</p>
        </div>
        <div className="card">
          <div className="panelHead"><h2>Pricing</h2></div>
          {Object.keys(price).length === 0 ? (
            <div className="empty">No price breakdown.</div>
          ) : (
            <div className="kv">
              {Object.entries(price).map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <b>{typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : String(v)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

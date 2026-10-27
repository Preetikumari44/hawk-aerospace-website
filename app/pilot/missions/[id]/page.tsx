"use client";

// Pilot mission details — stages mirror the BACKEND state machine exactly:
// pending → accepted → en_route → at_location → preflight → started →
// completed (see mission.service.ts guards). Every action below calls the
// matching staged endpoint, so progression can never 400 on vocabulary.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { chatApi, pilotApi, serviceCentreApi } from "@/lib/booking/role-apis";
import { usePilot } from "@/lib/pilot/data";

type Stage = "pending" | "assigned" | "en_route" | "at_location" | "preflight" | "flying" | "completed";

const STAGE_LABELS: Record<Stage, string> = {
  pending: "Pending",
  assigned: "Assigned",
  en_route: "En Route",
  at_location: "At Location",
  preflight: "Pre-flight",
  flying: "Flying",
  completed: "Completed",
};

const STAGES: Stage[] = ["pending", "assigned", "en_route", "at_location", "preflight", "flying", "completed"];

function deriveStage(status: string): Stage {
  const s = status.toLowerCase();
  if (/complet|cancel|reject/.test(s)) return "completed";
  if (/started|fly|progress|in_progress/.test(s)) return "flying";
  if (/preflight|pre-flight|pre_flight/.test(s)) return "preflight";
  if (/at_location|at location|arriv/.test(s)) return "at_location";
  if (/en_route|enroute|en route|transit/.test(s)) return "en_route";
  if (/accept|assign|confirm|schedul|upcoming/.test(s)) return "assigned";
  return "pending";
}

export default function PilotMissionDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { missions, incoming, showToast, reload } = usePilot();
  const [acting, setActing] = React.useState(false);
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);
  const [liveWeather, setLiveWeather] = React.useState<Record<string, unknown> | null>(null);
  const [returnCode, setReturnCode] = React.useState<string | null>(null);

  const mission = missions.find((m) => m.id === id) ?? incoming.find((m) => m.id === id) ?? null;

  const refresh = React.useCallback(async () => {
    try {
      const d = (await pilotApi.getMission(id)) as Record<string, unknown> | null;
      setDetail(d);
      const rc = d?.handoverReturnCode;
      if (typeof rc === "string" && rc) setReturnCode(rc);
    } catch {
      /* keep previous */
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(label: string, fn: () => Promise<unknown>, back = false) {
    setActing(true);
    try {
      await fn();
      showToast(label);
      await refresh();
      reload();
      if (back) router.push("/pilot/missions");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  if (!mission && !detail) {
    return (
      <>
        <Link href="/pilot/missions" style={{ color: "var(--p-forest)", fontWeight: 600 }}>
          ← Back to Missions
        </Link>
        <div className="p-card mt-3">
          Mission not found.
        </div>
      </>
    );
  }

  const d = (detail ?? {}) as Record<string, unknown>;
  const status = mission?.status ?? String(d.status ?? "pending");
  const stage = deriveStage(status);
  const stageIdx = STAGES.indexOf(stage);
  const bookingId = String(d.bookingId ?? mission?.id ?? id);
  const customerUid = String(d.customerUid ?? d.customerId ?? "");
  const customerName = mission?.customerName ?? String(d.customerName ?? "");
  const lat = typeof d.latitude === "number" ? d.latitude : typeof d.lat === "number" ? d.lat : null;
  const lng = typeof d.longitude === "number" ? d.longitude : typeof d.lng === "number" ? d.lng : null;

  const costToCustomer = Number(d.costToCustomer ?? d.totalAmount ?? NaN);
  const pilotCost = Number(d.pilotServiceCost ?? d.pilotEarnings ?? d.estimatedEarnings ?? NaN);
  const payStatus = String(d.paymentStatus ?? mission?.paymentStatus ?? "pending").toLowerCase();
  const cashPending = /cash|pending/.test(payStatus) && !/paid/.test(payStatus);

  async function shareLocation() {
    if (!("geolocation" in navigator)) {
      showToast("Geolocation unavailable.");
      return;
    }
    setActing(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }),
      );
      await pilotApi.updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      await pilotApi.postMissionProgress(id, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      showToast("Location shared.");
    } catch {
      showToast("Could not share location.");
    } finally {
      setActing(false);
    }
  }

  async function openCustomerChat() {
    setActing(true);
    try {
      const conv = (await chatApi.createConversation({
        participantUid: customerUid || customerName,
        participantRole: "customer",
        bookingId,
        type: "customer_pilot",
      })) as Record<string, unknown>;
      const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? "");
      router.push(cid ? `/chat/${cid}?refId=${encodeURIComponent(bookingId)}` : "/chat");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not open chat.");
    } finally {
      setActing(false);
    }
  }

  async function loadLiveWeather() {
    if (lat == null || lng == null) {
      showToast("No coordinates on this mission.");
      return;
    }
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,weather_code`,
      );
      const json = (await res.json()) as { current?: Record<string, unknown> };
      setLiveWeather(json.current ?? {});
    } catch {
      showToast("Weather unavailable.");
    }
  }

  const handoverCode = String(d.handoverIssueCode ?? d.assignedDrone ?? "");
  const droneAssigned =
    (mission?.drone ?? "") !== "" ||
    String(d.assignedDrone ?? d.assignedDroneId ?? d.droneId ?? "") !== "";
  const handoverVerified =
    /started|fly|progress|farm_completed|complet/i.test(status) ||
    Boolean(d.handoverIssueVerified);
  const handoverLocked = droneAssigned && !handoverVerified && stage !== "completed";

  return (
    <>
      <Link href="/pilot/missions" style={{ color: "var(--p-forest)", fontWeight: 600 }}>
        ← Back to Missions
      </Link>
      <h1 className="p-h1 mt-2">
        {mission?.serviceType ?? String(d.serviceType ?? "Mission")}
      </h1>
      <p className="p-sub">
        {id} · {status}
      </p>

      <div className="p-segment mb-3" style={{ maxWidth: "100%" }}>
        {STAGES.map((s, i) => (
          <button key={s} className={i <= stageIdx ? "active" : ""} style={{ fontSize: 11 }}>
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {handoverLocked && (
        <div className="p-card">
          <h3 className="mb-2">🔒 Drone Takeover Required</h3>
          <p className="p-sub">
            Your Fleet Manager has assigned drone{" "}
            <b>{mission?.drone || String(d.assignedDrone ?? "")}</b>. Collect it in person and
            enter the issue code — mission actions and customer details unlock only after takeover.
          </p>
          <Link href={`/pilot/handover?mission=${encodeURIComponent(id)}`} className="p-btn inline-block mt-2">
            Complete Drone Takeover
          </Link>
        </div>
      )}

      {stage === "pending" && !handoverLocked && (
        <div className="p-card">
          <h3 className="mb-2">Next Steps</h3>
          <p className="p-sub">Accept the request to begin. Only start when you have collected the drone.</p>
          <div className="flex gap-2 flex-wrap mt-2">
            <button className="p-btn" disabled={acting} onClick={() => void run("Accepted.", () => pilotApi.acceptMission(id))}>
              Accept
            </button>
            <button className="p-btn outline" disabled={acting} onClick={() => void run("Rejected.", () => pilotApi.rejectMission(id, {}), true)}>
              Reject
            </button>
            <Link href={`/pilot/handover?mission=${encodeURIComponent(id)}`} className="p-btn secondary inline-block">
              Open Drone Handover
            </Link>
          </div>
        </div>
      )}

      {(stage === "assigned" || stage === "en_route" || stage === "at_location" || stage === "preflight" || stage === "flying") && !handoverLocked && (
        <div className="p-card">
          <h3 className="mb-2">
            {stage === "assigned" && "Start navigation"}
            {stage === "en_route" && "En route — mark arrival"}
            {stage === "at_location" && "At location — pre-flight check"}
            {stage === "preflight" && "Pre-flight done — take over & start"}
            {stage === "flying" && "Flying — finish the service"}
          </h3>
          <p className="p-sub">
            {stage === "assigned" && "Head to the site to begin the mission."}
            {stage === "en_route" && "Reached the site? Mark your arrival."}
            {stage === "at_location" && "Run the pre-flight checks on the drone."}
            {stage === "preflight" && "Collect the drone from your Fleet Manager and enter the 4-character issue code to start."}
            {stage === "flying" && "Post progress and complete the mission when the service is done."}
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            {stage === "assigned" && (
              <button className="p-btn" disabled={acting} onClick={() => void run("Navigation started.", () => pilotApi.startNavigation(id))}>
                Start Navigation
              </button>
            )}
            {stage === "en_route" && (
              <button className="p-btn" disabled={acting} onClick={() => void run("Arrived.", () => pilotApi.arriveMission(id))}>
                Mark Arrived
              </button>
            )}
            {stage === "at_location" && (
              <button className="p-btn" disabled={acting} onClick={() => void run("Pre-flight done.", () => pilotApi.preFlightCheck(id))}>
                Complete Pre-flight
              </button>
            )}
            {stage === "preflight" && (
              <Link href={`/pilot/handover?mission=${encodeURIComponent(id)}`} className="p-btn inline-block">
                Take Over Drone & Start
              </Link>
            )}
            {stage === "flying" && (
              <>
                <button className="p-btn secondary" disabled={acting} onClick={() => void run("Progress posted.", () => pilotApi.postMissionProgress(id, {}))}>
                  Post Progress
                </button>
                <button className="p-btn" disabled={acting} onClick={() => void run("Mission completed.", () => pilotApi.completeMission(id))}>
                  Complete Mission
                </button>
              </>
            )}
            <button className="p-btn secondary" disabled={acting} onClick={() => void shareLocation()}>
              Share My Location
            </button>
            <button className="p-btn secondary" disabled={acting} onClick={() => void openCustomerChat()}>
              Chat with Customer
            </button>
          </div>
        </div>
      )}

      {stage === "completed" && (
        <div className="p-card">
          <h3 className="mb-2">Mission Status: Mission Completed</h3>
          {returnCode ? (
            <>
              <p className="p-sub">Drone Return Code</p>
              <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4 }}>{returnCode}</p>
              <p className="p-sub">Share this code at handover — service completes after it is entered.</p>
            </>
          ) : (
            <p className="p-sub">Mission completed.</p>
          )}
          <Link href={`/pilot/handover?mission=${encodeURIComponent(id)}`} className="p-btn outline inline-block mt-2">
            Open Drone Handover
          </Link>
        </div>
      )}

      <div className="p-grid2">
        <div className="p-card">
          <h3 className="mb-2">Mission Information</h3>
          {(
            [
              ["Service", mission?.serviceType ?? String(d.serviceType ?? "")],
              ["Status", status],
              ["Scheduled", mission?.scheduledDate ?? String(d.scheduledDate ?? "")],
              ["Time", mission?.preferredTimeSlot ?? String(d.preferredTimeSlot ?? "")],
              ["Est. Earnings", mission?.estimatedEarnings ?? ""],
              ["Payment", mission?.paymentStatus ?? String(d.paymentStatus ?? "")],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div className="p-teamrow" key={k}>
              <span className="p-sub">{k}</span>
              <b style={{ fontSize: 13 }}>{v || "—"}</b>
            </div>
          ))}
        </div>
        <div className="p-card">
          <h3 className="mb-2">Customer & Fleet</h3>
          {(
            [
              ["Customer", handoverLocked ? "🔒 Hidden until drone takeover" : customerName || String(d.customerName ?? "")],
              ["Location", handoverLocked ? "🔒 Hidden until drone takeover" : mission?.address ?? String(d.address ?? "")],
              ["Fleet Manager", mission?.fleetManagerName ?? String(d.fleetManagerName ?? "")],
              ["Drone", mission?.drone ?? String(d.assignedDrone ?? "")],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div className="p-teamrow" key={k}>
              <span className="p-sub">{k}</span>
              <b style={{ fontSize: 13 }}>{v || "—"}</b>
            </div>
          ))}
          {handoverCode ? <p className="p-sub">Handover ref: {handoverCode}</p> : null}
        </div>
      </div>

      <div className="p-card">
        <h3 className="mb-2">Weather & Airspace</h3>
        <button className="p-btn secondary" onClick={() => void loadLiveWeather()}>
          Load Live Weather
        </button>
        {liveWeather ? (
          <p className="p-sub mt-2">
            {Math.round(Number(liveWeather.temperature_2m ?? NaN))}°C ·
            Wind {Math.round(Number(liveWeather.wind_speed_10m ?? NaN))} km/h ·
            Code {String(liveWeather.weather_code ?? "—")}
          </p>
        ) : null}
        {d.weather || d.flyingRestriction || d.restriction ? (
          <p className="p-sub mt-2">
            {String(d.weather ?? "")} {String(d.flyingRestriction ?? d.restriction ?? "")}
          </p>
        ) : null}
      </div>

      <div className="p-card">
        <h3 className="mb-2">Financials</h3>
        <div className="p-teamrow">
          <span className="p-sub">Pilot Service Cost</span>
          <b style={{ fontSize: 13 }}>{Number.isFinite(pilotCost) ? `₹${pilotCost.toLocaleString("en-IN")}` : "—"}</b>
        </div>
        <div className="p-teamrow">
          <span className="p-sub">Cost to Customer</span>
          <b style={{ fontSize: 13 }}>{Number.isFinite(costToCustomer) ? `₹${costToCustomer.toLocaleString("en-IN")}` : "—"}</b>
        </div>
        <div className="p-teamrow">
          <span className="p-sub">Customer Payment</span>
          <b style={{ fontSize: 13 }}>{payStatus || "—"}</b>
        </div>
        {cashPending && !handoverLocked ? (
          <button
            className="p-btn mt-2"
            disabled={acting}
            onClick={() => void run("Cash confirmed.", () => pilotApi.confirmCash(bookingId))}
          >
            Confirm Cash Received
          </button>
        ) : null}
        {stage === "pending" || stage === "assigned" ? (
          <button
            className="p-btn danger mt-2"
            disabled={acting}
            onClick={() => void run("Mission cancelled.", () => pilotApi.cancelMission(id, "Cancelled from web"), true)}
          >
            Cancel Mission
          </button>
        ) : !handoverLocked ? (
          <button className="p-btn outline mt-2" onClick={() => void openCustomerChat()}>
            Contact Support to Cancel
          </button>
        ) : null}
      </div>

      {!handoverLocked && (
      <div className="p-card">
        <h3 className="mb-2">Mission Actions</h3>
        <div className="flex gap-2 flex-wrap">
          {stage === "assigned" && (
            <>
              <button className="p-btn" disabled={acting} onClick={() => void run("Accepted.", () => pilotApi.acceptMission(id))}>
                Accept
              </button>
              <button className="p-btn outline" disabled={acting} onClick={() => void run("Rejected.", () => pilotApi.rejectMission(id, {}), true)}>
                Reject
              </button>
            </>
          )}
          {stage !== "completed" && (
            <Link href={`/pilot/handover?mission=${encodeURIComponent(id)}`} className="p-btn inline-block">
              Drone Takeover
            </Link>
          )}
          <button className="p-btn secondary" disabled={acting} onClick={() => void openCustomerChat()}>
            Chat
          </button>
          <button
            className="p-btn outline"
            disabled={acting}
            onClick={() => router.push(`/support?bookingId=${encodeURIComponent(bookingId)}`)}
          >
            Raise a Complaint
          </button>
          <button
            className="p-btn outline"
            disabled={acting}
            onClick={() => void run("Maintenance raised.", () => serviceCentreApi.createTicket({ bookingId: id, issue: "Reported from pilot dashboard" }))}
          >
            Raise maintenance
          </button>
        </div>
      </div>
      )}
    </>
  );
}

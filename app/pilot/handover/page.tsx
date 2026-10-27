"use client";

// Drone handover — Super App HandoverScreen parity: Step 1 take-over
// (4-char issue code → started), Step 2 hand-back (return code display).

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { pilotApi } from "@/lib/booking/role-apis";
import { usePilot } from "@/lib/pilot/data";

function HandoverInner({ missionId }: { missionId: string }) {
  const router = useRouter();
  const { missions, incoming, showToast, reload } = usePilot();
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);
  const [code, setCode] = React.useState("");
  const [acting, setActing] = React.useState(false);

  const mission = missions.find((m) => m.id === missionId) ?? incoming.find((m) => m.id === missionId) ?? null;

  const refresh = React.useCallback(async () => {
    try {
      setDetail((await pilotApi.getMission(missionId)) as Record<string, unknown> | null);
    } catch {
      /* keep */
    }
  }, [missionId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const d = (detail ?? {}) as Record<string, unknown>;
  const status = String(d.status ?? mission?.status ?? "");
  const issueCode = String(d.handoverIssueCode ?? "");
  const droneAssigned =
    (mission?.drone ?? "") !== "" ||
    String(d.assignedDrone ?? d.assignedDroneId ?? d.droneId ?? "") !== "";
  const issueVerified = /start/i.test(status) || Boolean(d.handoverIssueVerified);
  const needsIssueCode = !issueVerified && (issueCode !== "" || droneAssigned);
  const returnCode = String(d.handoverReturnCode ?? "");
  const pendingTakeover = [...missions, ...incoming].filter((m) => {
    if (m.id === missionId) return false;
    const s = m.status.toLowerCase();
    if (/start|fly|progress|complet|cancel|reject/.test(s)) return false;
    return m.drone !== "";
  });

  async function verify() {
    const c = code.trim().toUpperCase();
    if (c.length !== 4) {
      showToast("Enter the 4-character code.");
      return;
    }
    setActing(true);
    try {
      await pilotApi.updateMissionStatus(missionId, { status: "started", handoverCode: c });
      showToast("Drone collected — mission started.");
      await refresh();
      reload();
      router.push(`/pilot/missions/${missionId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <Link href={missionId ? `/pilot/missions/${missionId}` : "/pilot/missions"} style={{ color: "var(--p-forest)", fontWeight: 600 }}>
        ← Back
      </Link>
      <h1 className="p-h1 mt-2">Drone Handover</h1>
      {!missionId || (!mission && !detail) ? (
        <div className="p-card">
          <h3 className="mb-2">Missions waiting for drone takeover</h3>
          {pendingTakeover.length === 0 ? (
            <p className="p-sub m-0">
              No missions with an assigned drone right now. Ask your Fleet Manager to assign a drone first.
            </p>
          ) : (
            pendingTakeover.slice(0, 10).map((m) => (
              <div className="p-teamrow" key={m.id}>
                <div>
                  <b style={{ fontSize: 13 }}>{m.serviceType}</b>
                  <p className="p-sub m-0">
                    {m.id} · {m.drone} · {m.scheduledDate}
                  </p>
                </div>
                <Link href={`/pilot/handover?mission=${encodeURIComponent(m.id)}`} className="p-btn secondary">
                  Take Over
                </Link>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="p-card">
            <b>{mission?.serviceType ?? String(d.serviceType ?? "Mission")}</b>
            <p className="p-sub my-1 mx-0">
              Mission {missionId} · {mission?.scheduledDate ?? String(d.scheduledDate ?? "")}
            </p>
          </div>

          <div className="p-card">
            <h3 className="mb-2">Step 1 · Take Over (FM → Pilot)</h3>
            {issueVerified ? (
              <p className="p-sub">✓ Drone collected — mission started.</p>
            ) : needsIssueCode ? (
              <>
                <p className="p-sub">
                  Your Fleet Manager has assigned drone{" "}
                  <b>{mission?.drone || String(d.assignedDrone ?? d.assignedDroneId ?? d.droneId ?? "")}</b> — collect it in person,
                  then enter the 4-character issue code to confirm takeover.
                </p>
                <div className="flex gap-2 mt-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                    placeholder="XXXX"
                    className="p-input"
                    style={{ maxWidth: 160, letterSpacing: 4, textTransform: "uppercase" }}
                  />
                  <button className="p-btn" disabled={acting || code.length !== 4} onClick={() => void verify()}>
                    Verify & Start Mission
                  </button>
                </div>
              </>
            ) : /complet|cancel|reject/i.test(status) ? (
              <p className="p-sub">
                This mission is {status || "closed"} — no drone takeover needed.
              </p>
            ) : (
              <p className="p-sub">
                Waiting on your Fleet Manager — a drone must be assigned and an issue code
                generated before you can take over. Pull down or reopen this page after your FM assigns one.
              </p>
            )}
          </div>
        </>
      )}

      {missionId && (mission || detail) ? (
        <div className="p-card">
          <h3 className="mb-2">Step 2 · Hand Back (Pilot → FM)</h3>
          {returnCode ? (
            <>
              <p className="p-sub">Share this code in person — service completes after it is entered.</p>
              <p style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6 }}>{returnCode}</p>
            </>
          ) : (
            <p className="p-sub">Complete the service from mission details first — the return code appears here.</p>
          )}
        </div>
      ) : null}
    </>
  );
}

export default function PilotHandoverPage() {
  return (
    <React.Suspense fallback={<div className="p-card">Loading…</div>}>
      <HandoverSearch />
    </React.Suspense>
  );
}

function HandoverSearch() {
  const search = useSearchParams();
  return <HandoverInner missionId={search.get("mission") ?? ""} />;
}

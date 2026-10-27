"use client";

// FM drone handover — Super App fmHandoverScreen parity: shows the issue
// code to share in person, verifies the 4-char return code to complete.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

function HandoverInner({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { showToast, reload } = useFleetData();
  const [mission, setMission] = React.useState<Record<string, unknown> | null>(null);
  const [code, setCode] = React.useState("");
  const [acting, setActing] = React.useState(false);
  const [options, setOptions] = React.useState<Record<string, unknown>[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(false);

  // GET /fleet/missions/:id returns { mission, pilot?, drone? } — unwrap.
  const load = React.useCallback(async () => {
    if (!bookingId) {
      setMission(null);
      return;
    }
    try {
      const raw = (await fleetApi.getMission(bookingId)) as Record<string, unknown> | null;
      const doc =
        raw && typeof raw === "object" && (raw as Record<string, unknown>).mission &&
        typeof (raw as Record<string, unknown>).mission === "object"
          ? ((raw as Record<string, unknown>).mission as Record<string, unknown>)
          : raw;
      setMission(doc);
    } catch {
      setMission(null);
    }
  }, [bookingId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Booking picker when opened without ?booking= — missions with a drone.
  React.useEffect(() => {
    if (bookingId) return;
    let cancelled = false;
    setLoadingOptions(true);
    fleetApi
      .getMissions()
      .then((v) => {
        if (cancelled) return;
        const arr = Array.isArray(v)
          ? v
          : Array.isArray((v as Record<string, unknown>)?.missions)
            ? ((v as Record<string, unknown>).missions as Record<string, unknown>[])
            : [];
        setOptions(
          arr.filter((m) => {
            const o = (m ?? {}) as Record<string, unknown>;
            return Boolean(o.assignedDrone ?? o.assignedDroneId ?? o.droneId);
          }),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const issueCode = mission ? String(mission.handoverIssueCode ?? "") : "";
  const verified = Boolean(mission?.handoverIssueVerified);
  const returnVerified = Boolean(mission?.handoverReturnVerified);
  const assigned = Boolean(mission?.assignedDrone ?? mission?.assignedDroneId ?? mission?.droneId);
  const assignedDroneId = String(mission?.assignedDrone ?? mission?.assignedDroneId ?? mission?.droneId ?? "");
  const done = returnVerified;

  async function verify() {
    if (code.trim().length !== 4) {
      showToast("Enter the 4-character return code.");
      return;
    }
    setActing(true);
    try {
      await fleetApi.verifyDroneReturn(bookingId, code.trim().toUpperCase());
      showToast("Drone return verified — handover complete.");
      reload();
      await load();
      router.push("/fleet/missions");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <Link href="/fleet/missions">← Missions</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Drone Handover</h1>
          <p>Booking {bookingId}</p>
        </div>
      </div>
      {!bookingId ? (
        <div className="card">
          <div className="panelHead"><h2>Select a booking</h2></div>
          {loadingOptions ? (
            <p className="muted">Loading bookings with assigned drones…</p>
          ) : options.length === 0 ? (
            <p className="muted">No bookings with an assigned drone right now.</p>
          ) : (
            options.slice(0, 20).map((m) => {
              const o = (m ?? {}) as Record<string, unknown>;
              const bid = String(o.bookingId ?? o.id ?? o._id ?? "");
              return (
                <div className="search mb-2" key={bid}>
                  <span className="muted">
                    {bid} · {String(o.serviceType ?? o.type ?? "Booking")}
                  </span>
                  <Link className="btn primary" href={`/fleet/handover?booking=${encodeURIComponent(bid)}`}>
                    Open Handover
                  </Link>
                </div>
              );
            })
          )}
        </div>
      ) : !mission ? (
        <div className="card">Loading…</div>
      ) : !assigned ? (
        <div className="card empty">No drone assigned to this booking yet.</div>
      ) : done ? (
        <div className="card">Service done — return verified ✓</div>
      ) : (
        <>
          <div className="card mb-3">
            <div className="panelHead"><h2>Step 1 · Issue Code</h2></div>
            <p className="muted">Drone: <b>{assignedDroneId}</b></p>
            {issueCode ? (
              <>
                <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6 }}>{issueCode}</p>
                <p className="muted">Share this code in person with the pilot.{verified ? " Verified ✓" : ""}</p>
              </>
            ) : (
              <div className="empty">Issue code appears here after assignment.</div>
            )}
          </div>
          <div className="card">
            <div className="panelHead"><h2>Step 2 · Verify Return</h2></div>
            <div className="search">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                placeholder="4-char return code"
              />
              <button className="btn primary" disabled={acting || code.trim().length !== 4} onClick={() => void verify()}>
                {acting ? "Verifying…" : "Verify Return"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function FleetHandoverPage() {
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <HandoverSearch />
    </Suspense>
  );
}

function HandoverSearch() {
  const search = useSearchParams();
  return <HandoverInner bookingId={search.get("booking") ?? ""} />;
}

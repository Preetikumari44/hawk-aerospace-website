"use client";

// Technician ticket details — Super App ActiveTicketDetails parity: guard +
// skeleton, live route map (origin→dest routing, ETA/distance, turn-by-turn,
// Google Maps link), raiser block, drone block, ticket block, toolkit
// handout/takeover (tier/amount, pickup verify, return code + SC-pending
// state), 70% earnings math, gated repair buttons, add-charge approval
// notice, support entry. 8s poll + ticket socket events.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { TicketRouteMap } from "@/components/booking/ticket-route-map";
import { mapsApi } from "@/lib/booking/api-client";
import { chatApi, serviceCentreApi } from "@/lib/booking/role-apis";
import { useTech } from "@/lib/tech/data";

function str(v: unknown, fb = ""): string {
  return typeof v === "string" && v ? v : fb;
}
function num(v: unknown, fb = 0): number {
  return typeof v === "number" ? v : fb;
}

export default function TechTicketDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { showToast, reload } = useTech();
  const [ticket, setTicket] = React.useState<Record<string, unknown> | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [acting, setActing] = React.useState(false);
  const [charge, setCharge] = React.useState({ label: "", amount: "" });
  const [techLoc, setTechLoc] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [route, setRoute] = React.useState<Record<string, unknown> | null>(null);

  const load = React.useCallback(async () => {
    try {
      const t = (await serviceCentreApi.getTicket(decodeURIComponent(id))) as Record<string, unknown>;
      setTicket(t && typeof t === "object" ? t : null);
      if (!t || typeof t !== "object") setMissing(true);
    } catch {
      setMissing(true);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(t);
  }, [load]);

  React.useEffect(() => {
    let cancelled = false;
    let off: (() => void) | null = null;
    void import("@/lib/booking/socket").then((mod) => {
      if (cancelled) return;
      const s = mod.connectSocket();
      if (!s) return;
      const refresh = () => void load();
      const events = ["ticket:status", "ticket:assigned", "ticket:toolkit", "ticket:payment", "ticket:location"] as const;
      events.forEach((e) => s.on(e, refresh));
      off = () => events.forEach((e) => s.off(e, refresh));
    });
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setTechLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => undefined,
        { timeout: 8000 },
      );
    }
    return () => {
      cancelled = true;
      off?.();
    };
  }, [load]);

  // Route: origin = tech GPS (else SC), dest = repair site (or SC pre-pickup).
  const sc = (ticket?.serviceCentre ?? ticket?.serviceCenter ?? {}) as Record<string, unknown>;
  const scGeo = {
    latitude: num(sc.latitude ?? sc.lat ?? (ticket?.scLat as number | undefined)),
    longitude: num(sc.longitude ?? sc.lng ?? (ticket?.scLng as number | undefined)),
  };
  const repairGeo = {
    latitude: num(ticket?.latitude ?? ticket?.lat ?? (ticket?.repairLat as number | undefined)),
    longitude: num(ticket?.longitude ?? ticket?.lng ?? (ticket?.repairLng as number | undefined)),
  };
  const hasScGeo = scGeo.latitude !== 0 && scGeo.longitude !== 0;
  const hasRepairGeo = repairGeo.latitude !== 0 && repairGeo.longitude !== 0;
  const pickupDone = Boolean(ticket?.toolkitPickupVerified);
  const dest = !pickupDone && hasScGeo ? { ...scGeo, label: "Service Centre" } : hasRepairGeo ? { ...repairGeo, label: "Repair Site" } : null;
  const origin = techLoc
    ? { ...techLoc, label: "You" }
    : hasScGeo
      ? { ...scGeo, label: "Service Centre" }
      : null;

  React.useEffect(() => {
    if (!origin || !dest) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    mapsApi
      .route(
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: dest.latitude, longitude: dest.longitude },
      )
      .then((r) => {
        if (!cancelled) setRoute((r ?? null) as Record<string, unknown> | null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- route on endpoints change.
  }, [origin?.latitude, origin?.longitude, dest?.latitude, dest?.longitude]);

  async function act(ok: string, fn: () => Promise<unknown>) {
    setActing(true);
    try {
      await fn();
      showToast(ok);
      reload();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  if (!ticket) {
    return (
      <>
        <Link href="/technician/tasks" style={{ color: "var(--forest)", fontWeight: 600 }}>
          ← Tasks
        </Link>
        <div className="card mt-3">
          {missing ? "No ticket selected." : "Loading ticket…"}
        </div>
      </>
    );
  }

  const t = ticket;
  const status = String(t.status ?? "Open");
  const pickupCode = String(t.toolkitPickupCode ?? "");
  const returnCode = String(t.toolkitReturnCode ?? "");
  const returnVerified = Boolean(t.toolkitReturnVerified);
  const tier = String(t.toolkitTier ?? "standard");
  const toolkitAmount = num(t.toolkitAmount, 0);
  const estimatedCost = num(t.estimatedCost, 0);
  const charges = Array.isArray(t.additionalCharges) ? (t.additionalCharges as Record<string, unknown>[]) : [];
  const approvedExtra = charges.filter((c) => /approv/i.test(String(c.status ?? ""))).reduce((s, c) => s + num(c.amount, 0), 0);
  const total = estimatedCost + approvedExtra + toolkitAmount;
  const earning = Math.round(total * 0.7);
  const paymentStatus = String(t.paymentStatus ?? "pending");
  const raiserRole = String(t.raisedByRole ?? "");
  const raiserName = String(t.raisedByName ?? t.fleetManagerName ?? t.pilotName ?? "");
  const raiserPhone = String(t.raisedByPhone ?? t.pilotPhone ?? "");
  const repairing = /repairing/.test(status.toLowerCase());
  const canStart = pickupDone && /assigned|accepted|in_progress/.test(status.toLowerCase()) && !repairing;

  const steps = Array.isArray(route?.steps)
    ? (route.steps as unknown[]).slice(0, 8)
    : Array.isArray(route?.legs)
      ? (route.legs as unknown[]).slice(0, 8)
      : [];
  const distanceKm = route?.distanceKm ?? route?.distance ?? null;
  const durationMin = route?.durationMin ?? route?.duration ?? route?.etaMinutes ?? null;
  const mapsUrl =
    origin && dest
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}`
      : null;

  return (
    <>
      <Link href="/technician/tasks" style={{ color: "var(--forest)", fontWeight: 600 }}>
        ← Tasks
      </Link>
      <div className="pagehead mt-2">
        <div>
          <div className="title">{String(t.title ?? t.mainProblem ?? t.category ?? id)}</div>
          <p className="sub">
            {String(t.ticketId ?? id)} · {status} · {String(t.priority ?? "")}
          </p>
        </div>
      </div>

      {origin && dest ? (
        <div className="card mb-3.5">
          <h3 className="sectiontitle">
            {!pickupDone ? "To Service Centre (toolkit handoff)" : "To Repair Site"}
          </h3>
          <TicketRouteMap origin={{ ...origin, label: origin.label }} destination={{ ...dest, label: dest.label }} />
          <p className="sub mt-2">
            ETA ~{durationMin != null ? `${Math.round(Number(durationMin))} min` : "—"}
            {distanceKm != null ? ` (${Number(distanceKm).toFixed(1)} km)` : ""}
          </p>
          {steps.length > 0 ? (
            <ol className="sub mt-1.5" style={{ paddingLeft: 18 }}>
              {steps.map((s, i) => (
                <li key={i}>{typeof s === "string" ? s : String((s as Record<string, unknown>).instruction ?? (s as Record<string, unknown>).name ?? JSON.stringify(s))}</li>
              ))}
            </ol>
          ) : null}
          {mapsUrl ? (
            <a className="btn secondary mt-2 inline-block" href={mapsUrl} target="_blank" rel="noreferrer">
              Open navigation in Google Maps
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="grid2">
        <div className="card">
          <h3 className="sectiontitle">Raised By</h3>
          <p><b style={{ fontSize: 13 }}>{raiserName || "—"}</b></p>
          <p className="sub">
            {raiserRole === "pilot" ? "Pilot" : raiserRole === "fleet_manager" ? "Fleet Manager" : raiserRole || "—"}
            {" · "}FM approval: {String(t.fmApprovalStatus ?? "—")}
          </p>
          {raiserPhone ? <p className="sub">{raiserPhone}</p> : null}
        </div>
        <div className="card">
          <h3 className="sectiontitle">Drone</h3>
          <p><b style={{ fontSize: 13 }}>{String(t.droneName ?? t.droneId ?? "—")}</b></p>
          <p className="sub">{String(t.droneId ?? "")}</p>
        </div>
      </div>

      <div className="card mt-3.5">
        <h3 className="sectiontitle">Ticket</h3>
        <p><b style={{ fontSize: 13 }}>{String(t.mainProblem ?? t.category ?? "")}</b></p>
        <p className="sub">{String(t.description ?? "")}</p>
        <p className="sub">
          {String(t.ticketId ?? id)} · {t.location ? String(t.location) : ""} · {String(t.scheduledDate ?? t.dateTime ?? t.date ?? "")} · {status}
        </p>
      </div>

      <div className="card mt-3.5">
        <h3 className="sectiontitle">Toolkit Handout ↔ Takeover</h3>
        <p className="sub">Tier {tier} · ₹{toolkitAmount.toLocaleString("en-IN")}</p>
        {!pickupDone ? (
          <div className="flex gap-2 mt-2 flex-wrap">
            <input
              className="search"
              style={{ maxWidth: 160 }}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
              placeholder="4-char code"
            />
            <button className="btn" disabled={acting || code.length !== 4} onClick={() => void act("Toolkit received — Start Repair enabled.", () => serviceCentreApi.toolkitPickupVerify(String(t.ticketId ?? id), code))}>
              Confirm toolkit pickup
            </button>
          </div>
        ) : (
          <>
            <p className="sub">Toolkit picked up ✓</p>
            {returnCode ? (
              <>
                <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4 }}>{returnCode}</p>
                <p className="sub">
                  Return verified: {returnVerified ? "Yes" : "Pending — the Service Centre enters the code."}
                </p>
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="card mt-3.5">
        <h3 className="sectiontitle">Earnings</h3>
        <p className="sub">Estimate ₹{estimatedCost.toLocaleString("en-IN")} + approved extras ₹{approvedExtra.toLocaleString("en-IN")} + toolkit ₹{toolkitAmount.toLocaleString("en-IN")}</p>
        {charges.map((c, i) => (
          <p className="sub" key={i}>
            {String(c.reason ?? c.label ?? "Charge")} ({String(c.status ?? "pending")}) ₹{num(c.amount, 0).toLocaleString("en-IN")}
          </p>
        ))}
        <p><b style={{ fontSize: 14 }}>Earning ₹{earning.toLocaleString("en-IN")} (70%)</b></p>
        <p className="sub">Payment: {paymentStatus}</p>
        <AddChargeForm
          onAdd={(label, amount) => act("Sent for approval — FM/pilot must approve.", () => serviceCentreApi.addCharge(String(t.ticketId ?? id), { reason: label, amount }))}
          acting={acting}
        />
      </div>

      <div className="card mt-3.5">
        <h3 className="sectiontitle">Repair Actions</h3>
        <div className="flex gap-2 flex-wrap">
          {!pickupDone ? (
            <button className="btn" disabled>Start Repair (take toolkit first)</button>
          ) : canStart ? (
            <button className="btn" disabled={acting} onClick={() => void act("Repair started.", () => serviceCentreApi.startRepair(String(t.ticketId ?? id)))}>
              Start Repair
            </button>
          ) : repairing ? (
            <button className="btn" disabled={acting} onClick={() => void act("Repair finished — payment pending.", () => serviceCentreApi.finishRepair(String(t.ticketId ?? id)))}>
              Finish Repair
            </button>
          ) : /payment_pending/i.test(String(t.paymentStatus ?? "")) ? (
            <p className="sub" style={{ color: "#b45309" }}>Waiting for FM/pilot payment (Razorpay/Cash/UPI)…</p>
          ) : /complet/i.test(String(t.paymentStatus ?? "")) || /complet|clos/i.test(status) ? (
            <p className="sub" style={{ color: "var(--forest)" }}>Payment Completed • Earning ₹{earning.toLocaleString("en-IN")}</p>
          ) : null}
          <button
            className="btn secondary"
            onClick={() => {
              chatApi
                .createConversation({ participantUid: "admin", participantRole: "admin", type: "support", supportCategory: "other" })
                .then((c) => {
                  const cid = String((c as Record<string, unknown>).id ?? (c as Record<string, unknown>)._id ?? (c as Record<string, unknown>).conversationId ?? "");
                  router.push(cid ? `/chat/${cid}` : "/chat");
                })
                .catch(() => router.push("/chat"));
            }}
          >
            Support
          </button>
        </div>
      </div>
    </>
  );
}

function AddChargeForm({ onAdd, acting }: { onAdd: (label: string, amount: number) => Promise<void>; acting: boolean }) {
  const [label, setLabel] = React.useState("");
  const [amount, setAmount] = React.useState("");
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      <input className="search" style={{ maxWidth: 200 }} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Charge reason" />
      <input className="search" style={{ maxWidth: 140 }} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Amount ₹" inputMode="numeric" />
      <button className="btn secondary" disabled={acting || !label.trim()} onClick={() => void onAdd(label.trim(), Number(amount) || 0).then(() => { setLabel(""); setAmount(""); })}>
        Add charge
      </button>
    </div>
  );
}

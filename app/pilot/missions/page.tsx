"use client";

// Pilot missions — Super App MissionScreen parity: rich mission cards with
// inline Accept/Reject, full maintenance-ticket subsystem (7-field new
// ticket, open/closed lists, stage details, Razorpay/cash/UPI payment).

import Link from "next/link";

import * as React from "react";

import { pilotApi, serviceCentreApi } from "@/lib/booking/role-apis";
import { openRazorpayCheckout } from "@/lib/booking/razorpay-checkout";
import { usePilot, type PilotMission } from "@/lib/pilot/data";

const TABS = ["Active", "Upcoming", "Completed"] as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--p-borderstrong)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  background: "var(--p-cream)",
  outline: "none",
};

export default function PilotMissions() {
  const { missions, incoming, maintenanceTickets, loading, error, reload, showToast, act } = usePilot();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Active");
  const [showNew, setShowNew] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  // Backend mission statuses: pending|accepted|rejected|en_route|at_location|
  // preflight|started|completed|cancelled. Every mission lands in EXACTLY one
  // tab — accepted/at_location/preflight used to match NO tab (invisible).
  const inTab = missions.filter((m) => {
    const s = m.status.toLowerCase();
    const isDone = /complet|cancel|reject/.test(s);
    if (tab === "Completed") return isDone;
    const isActive =
      /progress|active|flying|farm_completed|started|en_route|at_location|preflight|accept|arriv|fly/.test(
        s,
      );
    if (tab === "Upcoming") return !isDone && !isActive;
    return !isDone && isActive;
  });

  function badge(m: PilotMission) {
    if (/complet/i.test(m.status))
      return <span className="p-badge-pill success">{m.paymentStatus === "paid" ? "Paid" : "Payment Pending"}</span>;
    if (/progress|active|start|accept|arriv|preflight|at_location|en_route|fly/i.test(m.status))
      return <span className="p-badge-pill info">{m.status}</span>;
    return <span className="p-badge-pill">{m.status}</span>;
  }

  return (
    <>
      <h1 className="p-h1">Your Missions</h1>
      <p className="p-sub">Accept requests and execute missions — every action hits the backend live.</p>

      <div className="p-segment">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <div className="p-card">
          {error} <button className="p-btn outline" onClick={reload}>Retry</button>
        </div>
      ) : loading ? (
        <div className="p-card">Loading…</div>
      ) : (
        <>
          {tab === "Active" && incoming.length > 0 && (
            <>
              <h3 className="mt-4 mb-2" style={{ fontSize: 16 }}>Assigned Requests</h3>
              <div className="p-hscroll">
                {incoming.map((m) => (
                  <div className="p-mission" style={{ minWidth: 280 }} key={m.id}>
                    <div className="flex justify-between items-center gap-2">
                      <b>{m.serviceType}</b>
                      {badge(m)}
                    </div>
                    <p className="p-sub my-1 mx-0">{m.id} · {m.customerName}</p>
                    <p className="p-sub m-0">
                      Est. {m.estimatedEarnings} · {m.scheduledDate} · {m.preferredTimeSlot}
                    </p>
                    <p className="p-sub m-0">{m.address}</p>
                    <div className="flex gap-2 mt-2.5">
                      <button className="p-btn" onClick={() => void act(m.id, (id) => pilotApi.acceptMission(id), "Accepted.")}>
                        Accept
                      </button>
                      <button className="p-btn outline" onClick={() => void act(m.id, (id) => pilotApi.rejectMission(id, {}), "Rejected.")}>
                        Reject
                      </button>
                      <Link href={`/pilot/missions/${m.id}`} style={{ color: "var(--p-green)", fontSize: 13, fontWeight: 600, alignSelf: "center" }}>
                        Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-2">
            {inTab.length === 0 ? (
              <div className="p-card">Nothing here yet.</div>
            ) : (
              inTab.map((m) => (
                <div className="p-mission" key={m.id}>
                  <div className="flex justify-between gap-2 items-center">
                    <b>{m.serviceType}</b>
                    {badge(m)}
                  </div>
                  <p className="p-sub my-1 mx-0">
                    {m.id} · {m.address}
                  </p>
                  <p className="p-sub m-0">
                    Est. {m.estimatedEarnings} · {m.scheduledDate} · {m.preferredTimeSlot}
                  </p>
                  <p className="p-sub m-0">
                    {m.customerName} · {m.fleetManagerName} · {m.drone}
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <Link href={`/pilot/missions/${m.id}`} style={{ color: "var(--p-forest)", fontSize: 13, fontWeight: 600 }}>
                      View Details →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <MaintenanceSection
            tickets={maintenanceTickets}
            missions={missions}
            detailId={detailId}
            setDetailId={setDetailId}
            showNew={showNew}
            setShowNew={setShowNew}
            onChanged={reload}
          />
        </>
      )}
    </>
  );
}

function MaintenanceSection({
  tickets,
  missions,
  detailId,
  setDetailId,
  showNew,
  setShowNew,
  onChanged,
}: {
  tickets: Record<string, unknown>[];
  missions: PilotMission[];
  detailId: string | null;
  setDetailId: (id: string | null) => void;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  onChanged: () => void;
}) {
  const { showToast } = usePilot();
  const [form, setForm] = React.useState({
    mainProblem: "",
    description: "",
    droneId: "",
    missionId: "",
    location: "",
    dateTime: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);
  const [paying, setPaying] = React.useState(false);

  const open = tickets.filter((t) => !/resolv|clos|complet|done/i.test(String(t.status ?? "")));
  const closed = tickets.filter((t) => /resolv|clos|complet|done/i.test(String(t.status ?? "")));

  React.useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    serviceCentreApi
      .getTicket(detailId)
      .then((d) => {
        if (!cancelled) setDetail((d ?? null) as Record<string, unknown> | null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  async function create() {
    if (!form.mainProblem.trim() || !form.droneId.trim() || !form.missionId.trim() || !form.location.trim() || !form.dateTime) {
      showToast("Fill problem, drone, mission, location and date/time.");
      return;
    }
    setSaving(true);
    try {
      await serviceCentreApi.createTicket({
        mainProblem: form.mainProblem.trim(),
        description: form.description.trim(),
        droneId: form.droneId.trim(),
        missionId: form.missionId.trim(),
        location: form.location.trim(),
        scheduledDate: form.dateTime,
        dateTime: form.dateTime,
        priority: "medium",
        category: "maintenance",
      });
      showToast("Ticket sent — live updates will follow.");
      setForm({ mainProblem: "", description: "", droneId: "", missionId: "", location: "", dateTime: "" });
      setShowNew(false);
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function payTicket(id: string, method: "razorpay" | "cash" | "upi") {
    setPaying(true);
    try {
      const order = (await serviceCentreApi.paymentOrder(id)) as Record<string, unknown>;
      if (method === "razorpay") {
        const keyId =
          String(order.keyId ?? "") || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
        if (!keyId) throw new Error("Razorpay key is not configured.");
        const result = await openRazorpayCheckout({
          keyId,
          orderId: String(order.orderId ?? order.id ?? ""),
          amount: Number(order.amount ?? 0),
        });
        await serviceCentreApi.paymentConfirm(id, {
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });
      } else {
        await serviceCentreApi.paymentConfirm(id, { method });
      }
      showToast("Payment completed.");
      onChanged();
      const d = await serviceCentreApi.getTicket(id).catch(() => null);
      setDetail((d ?? null) as Record<string, unknown> | null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  const stages = ["Pending FM Approval", "Assigning", "Assigned", "In Transit", "Completed", "Closed"];
  const stageIndex = detail
    ? Math.max(
        0,
        stages.findIndex((s) => s.toLowerCase() === String(detail.status ?? "").toLowerCase()),
      )
    : 0;

  return (
    <>
      <div className="flex justify-between items-center mt-5 mb-2.5">
        <h3 className="m-0" style={{ fontSize: 18 }}>Maintenance History</h3>
        <button className="p-btn secondary" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Close" : "New Maintenance Ticket"}
        </button>
      </div>

      {showNew ? (
        <div className="p-card">
          <div className="flex flex-col gap-2">
            <input style={inputStyle} value={form.mainProblem} onChange={(e) => setForm((f) => ({ ...f, mainProblem: e.target.value }))} placeholder="Main problem *" />
            <textarea
              style={{ ...inputStyle, minHeight: 70 }}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
            />
            <select style={inputStyle} value={form.droneId} onChange={(e) => setForm((f) => ({ ...f, droneId: e.target.value }))}>
              <option value="">Drone *</option>
              {[...new Set(missions.map((m) => m.drone).filter(Boolean))].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select style={inputStyle} value={form.missionId} onChange={(e) => setForm((f) => ({ ...f, missionId: e.target.value }))}>
              <option value="">Mission *</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>{m.id} · {m.serviceType}</option>
              ))}
            </select>
            <input style={inputStyle} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location *" />
            <input style={inputStyle} type="datetime-local" value={form.dateTime} onChange={(e) => setForm((f) => ({ ...f, dateTime: e.target.value }))} />
            <button className="p-btn" disabled={saving} onClick={() => void create()}>
              {saving ? "Sending…" : "Send Ticket"}
            </button>
          </div>
        </div>
      ) : null}

      <h4 className="mt-3 mb-1.5" style={{ fontSize: 14 }}>Open Tickets ({open.length})</h4>
      {open.length === 0 ? (
        <div className="p-card">No open tickets.</div>
      ) : (
        open.map((t, i) => (
          <div className="p-mission" key={String(t.id ?? t.ticketId ?? i)}>
            <b>{String(t.mainProblem ?? t.title ?? "Ticket")}</b>
            <p className="p-sub my-1 mx-0">
              {String(t.id ?? t.ticketId ?? "")} · {String(t.status ?? "")}
            </p>
            <button className="p-btn outline" onClick={() => setDetailId(String(t.id ?? t.ticketId ?? ""))}>
              View Details
            </button>
          </div>
        ))
      )}

      <h4 className="mt-3 mb-1.5" style={{ fontSize: 14 }}>Closed Tickets ({closed.length})</h4>
      {closed.length === 0 ? (
        <div className="p-card">No closed tickets.</div>
      ) : (
        closed.slice(0, 5).map((t, i) => (
          <div className="p-mission" key={String(t.id ?? t.ticketId ?? i)}>
            <b>{String(t.mainProblem ?? t.title ?? "Ticket")}</b>
            <p className="p-sub my-1 mx-0">
              {String(t.id ?? t.ticketId ?? "")} · {String(t.status ?? "")}
            </p>
            <button className="p-btn outline" onClick={() => setDetailId(String(t.id ?? t.ticketId ?? ""))}>
              View Details
            </button>
          </div>
        ))
      )}

      {detailId ? (
        <div className="p-card">
          <div className="flex justify-between items-center">
            <h3 className="m-0">Ticket {detailId}</h3>
            <button className="p-btn outline" onClick={() => setDetailId(null)}>Close</button>
          </div>
          {!detail ? (
            <p className="p-sub">Loading…</p>
          ) : (
            <>
              <div className="p-segment my-2.5 mx-0" style={{ maxWidth: "100%" }}>
                {stages.map((s, i) => (
                  <button key={s} className={i <= stageIndex ? "active" : ""} style={{ fontSize: 11 }}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="p-sub">Technician: {String(detail.technicianName ?? detail.technicianUid ?? "—")}</p>
              <p className="p-sub">Estimate: ₹{Number(detail.estimatedCost ?? 0).toLocaleString("en-IN")} · Payment: {String(detail.paymentStatus ?? "pending")}</p>
              {/pending/i.test(String(detail.paymentStatus ?? "")) ? (
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  <button className="p-btn" disabled={paying} onClick={() => void payTicket(detailId, "razorpay")}>
                    Pay Online
                  </button>
                  <button className="p-btn secondary" disabled={paying} onClick={() => void payTicket(detailId, "cash")}>
                    Cash
                  </button>
                  <button className="p-btn outline" disabled={paying} onClick={() => void payTicket(detailId, "upi")}>
                    UPI
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
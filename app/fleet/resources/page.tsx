"use client";

// Fleet resources — teammate layout + full parity: status tabs, drill-downs,
// AddPilot KYC flow entry, AddDrone (serialNo + type), new maintenance
// ticket modal (GPS + dropdowns), approve/reject, ticket payments.

import { Plane, Plus, UserCheck, UserX, Users, Wrench } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { fleetApi, serviceCentreApi } from "@/lib/booking/role-apis";
import { openRazorpayCheckout } from "@/lib/booking/razorpay-checkout";
import { useFleetData, type FleetPilot } from "@/lib/fleet/data";

type PilotTab = "Available" | "Assigned" | "Off-Duty";
type DroneTab = "Deployable" | "Assigned" | "Maintenance";

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  background: "#fff",
  outline: "none",
};

export default function FleetResources() {
  const { pilots, drones, tickets, missions, reload, showToast } = useFleetData();
  const [acting, setActing] = React.useState<string | null>(null);
  const [pilotTab, setPilotTab] = React.useState<PilotTab>("Available");
  const [droneTab, setDroneTab] = React.useState<DroneTab>("Deployable");
  const [showAddDrone, setShowAddDrone] = React.useState(false);
  const [droneForm, setDroneForm] = React.useState({ model: "", serialNo: "", type: "spraying" });
  const [showTicket, setShowTicket] = React.useState(false);
  const [ticket, setTicket] = React.useState({ mainProblem: "", description: "", droneId: "", missionId: "", location: "", dateTime: "", estimatedCost: "" });

  const pc = {
    total: pilots.length,
    assigned: pilots.filter((x) => x.status === "Assigned").length,
    available: pilots.filter((x) => x.status === "Available").length,
    off: pilots.filter((x) => x.status === "Off-Duty").length,
  };
  const dc = {
    total: drones.length,
    assigned: drones.filter((x) => x.status === "Assigned").length,
    ready: drones.filter((x) => x.status === "Deployable").length,
    maintenance: drones.filter((x) => x.status === "Maintenance").length,
  };

  const pilotList = pilots.filter((p) => p.status === pilotTab);
  const droneList = drones.filter((d) => d.status === droneTab);

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

  async function addDrone(e: React.FormEvent) {
    e.preventDefault();
    setActing("add-drone");
    try {
      await fleetApi.createDrone({
        model: droneForm.model.trim(),
        serialNo: droneForm.serialNo.trim().toUpperCase(),
        type: droneForm.type,
      });
      showToast("Drone added to your fleet.");
      setDroneForm({ model: "", serialNo: "", type: "spraying" });
      setShowAddDrone(false);
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Add failed.");
    } finally {
      setActing(null);
    }
  }

  function useGps() {
    if (!("geolocation" in navigator)) {
      showToast("Geolocation unavailable.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setTicket((t) => ({ ...t, location: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` })),
      () => showToast("Could not get location."),
      { timeout: 8000 },
    );
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket.mainProblem.trim() || !ticket.droneId || !ticket.location.trim() || !ticket.dateTime) {
      showToast("Fill problem, drone, location and date/time.");
      return;
    }
    setActing("ticket");
    try {
      await serviceCentreApi.createTicket({
        mainProblem: ticket.mainProblem.trim(),
        description: ticket.description.trim(),
        droneId: ticket.droneId,
        ...(ticket.missionId ? { missionId: ticket.missionId } : {}),
        location: ticket.location.trim(),
        scheduledDate: ticket.dateTime,
        dateTime: ticket.dateTime,
        ...(ticket.estimatedCost ? { estimatedCost: Number(ticket.estimatedCost) } : {}),
      });
      showToast("Maintenance ticket created.");
      setTicket({ mainProblem: "", description: "", droneId: "", missionId: "", location: "", dateTime: "", estimatedCost: "" });
      setShowTicket(false);
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setActing(null);
    }
  }

  async function payTicket(id: string, method: "razorpay" | "cash" | "upi") {
    setActing(id);
    try {
      const order = (await serviceCentreApi.paymentOrder(id)) as Record<string, unknown>;
      if (method === "razorpay") {
        const keyId = String(order.keyId ?? "") || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
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
      showToast("Ticket payment completed.");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <div className="pageTitle">
        <div>
          <h1>Manage Resources</h1>
          <p>Pilots, drones and maintenance in one place.</p>
        </div>
        <span className="actions">
          <Link className="btn primary" href="/fleet/pilots/new">
            <Plus size={14} /> Add Pilot
          </Link>{" "}
          <button className="btn secondary" onClick={() => setShowAddDrone((s) => !s)}>
            <Plus size={14} /> Add Drone
          </button>
        </span>
      </div>

      {showAddDrone && (
        <div className="card mb-3">
          <div className="panelHead"><h2>Add Drone</h2></div>
          <form onSubmit={addDrone}>
            <div className="grid two">
              <input style={inputStyle} value={droneForm.model} onChange={(e) => setDroneForm((f) => ({ ...f, model: e.target.value }))} placeholder="Model *" required />
              <input style={inputStyle} value={droneForm.serialNo} onChange={(e) => setDroneForm((f) => ({ ...f, serialNo: e.target.value.toUpperCase() }))} placeholder="Serial No *" required />
              <select style={inputStyle} value={droneForm.type} onChange={(e) => setDroneForm((f) => ({ ...f, type: e.target.value }))}>
                {["videography", "mapping", "monitoring", "spraying", "surveillance", "seeding"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="actions mt-2.5">
              <button className="btn primary" type="submit" disabled={acting === "add-drone"}>
                {acting === "add-drone" ? "Adding…" : "Add Drone"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sectionHead">
        <h2>Pilot Status</h2>
      </div>
      <div className="grid stats">
        <Stat label="Total Pilots" value={pc.total} icon={<Users />} />
        <Stat label="Assigned" value={pc.assigned} icon={<UserCheck />} />
        <Stat label="Available" value={pc.available} icon={<UserCheck />} />
        <Stat label="Off-Duty" value={pc.off} icon={<UserX />} red />
      </div>
      <div className="actions mb-3">
        {(["Available", "Assigned", "Off-Duty"] as PilotTab[]).map((t) => (
          <button key={t} className={"btn " + (pilotTab === t ? "primary" : "secondary")} onClick={() => setPilotTab(t)}>
            {t} ({t === "Available" ? pc.available : t === "Assigned" ? pc.assigned : pc.off})
          </button>
        ))}
        <Link className="btn secondary" href="/fleet/pilots/new">+ Onboard Pilot</Link>
      </div>

      <div className="sectionHead">
        <h2>Drone Status</h2>
      </div>
      <div className="grid stats">
        <Stat label="Total Drones" value={dc.total} icon={<Plane />} />
        <Stat label="Assigned" value={dc.assigned} icon={<Plane />} />
        <Stat label="Deployable" value={dc.ready} icon={<Plane />} />
        <Stat label="Maintenance" value={dc.maintenance} icon={<Wrench />} red />
      </div>
      <div className="actions mb-3">
        {(["Deployable", "Assigned", "Maintenance"] as DroneTab[]).map((t) => (
          <button key={t} className={"btn " + (droneTab === t ? "primary" : "secondary")} onClick={() => setDroneTab(t)}>
            {t} ({t === "Deployable" ? dc.ready : t === "Assigned" ? dc.assigned : dc.maintenance})
          </button>
        ))}
      </div>

      <div className="sectionHead">
        <h2>Fleet Resources</h2>
      </div>
      <div className="grid two">
        <div className="card list">
          {pilotList.length === 0 ? <div className="empty">No {pilotTab.toLowerCase()} pilots.</div> : pilotList.map((p: FleetPilot) => (
            <Link className="row no-underline text-inherit" key={p.id} href={`/fleet/resources/pilots/${encodeURIComponent(p.id)}`}>
              <div className="resource">
                <div className="avatar">{p.avatarInitial}</div>
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.phone} · {p.skills.join(", ")}
                  </small>
                </div>
              </div>
              <span className={"badge " + (p.status === "Off-Duty" ? "red" : p.status === "Assigned" ? "blue" : "")}>
                {p.status}
              </span>
            </Link>
          ))}
        </div>
        <div className="card list">
          {droneList.length === 0 ? <div className="empty">No {droneTab.toLowerCase()} drones.</div> : droneList.map((d) => (
            <Link className="row no-underline text-inherit" key={d.id} href={`/fleet/resources/drones/${encodeURIComponent(d.id)}`}>
              <div className="resource">
                <div className="resourceIcon">
                  <Plane size={16} />
                </div>
                <div>
                  <b>{d.model}</b>
                  <small>
                    {d.code} · Last serviced {d.lastServiced}
                  </small>
                </div>
              </div>
              <span className={"badge " + (d.status === "Maintenance" ? "red" : d.status === "Assigned" ? "blue" : "")}>
                {d.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="sectionHead">
        <h2>Maintenance Tickets</h2>
        <span className="actions">
          <button className="btn primary" onClick={() => setShowTicket((s) => !s)}>
            <Plus size={14} /> New Ticket
          </button>
        </span>
      </div>
      {showTicket && (
        <div className="card mb-3">
          <form onSubmit={createTicket}>
            <div className="grid two">
              <input style={inputStyle} value={ticket.mainProblem} onChange={(e) => setTicket((t) => ({ ...t, mainProblem: e.target.value }))} placeholder="Main problem *" required />
              <input style={inputStyle} value={ticket.description} onChange={(e) => setTicket((t) => ({ ...t, description: e.target.value }))} placeholder="Description" />
              <select style={inputStyle} value={ticket.droneId} onChange={(e) => setTicket((t) => ({ ...t, droneId: e.target.value }))} required>
                <option value="">Drone *</option>
                {drones.map((x) => (
                  <option key={x.id} value={x.id}>{x.model} · {x.code}</option>
                ))}
              </select>
              <select style={inputStyle} value={ticket.missionId} onChange={(e) => setTicket((t) => ({ ...t, missionId: e.target.value }))}>
                <option value="">Mission (optional)</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>{m.id} · {m.type}</option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <input style={{ ...inputStyle, flex: 1 }} value={ticket.location} onChange={(e) => setTicket((t) => ({ ...t, location: e.target.value }))} placeholder="Location *" required />
                <button type="button" className="btn secondary" onClick={useGps}>GPS</button>
              </div>
              <input style={inputStyle} type="datetime-local" value={ticket.dateTime} onChange={(e) => setTicket((t) => ({ ...t, dateTime: e.target.value }))} required />
              <input style={inputStyle} value={ticket.estimatedCost} onChange={(e) => setTicket((t) => ({ ...t, estimatedCost: e.target.value.replace(/\D/g, "") }))} placeholder="Est. cost ₹ (optional)" inputMode="numeric" />
            </div>
            <div className="actions mt-2.5">
              <button className="btn primary" type="submit" disabled={acting === "ticket"}>
                {acting === "ticket" ? "Creating…" : "Create Ticket"}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="tableWrap card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Resource</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const pendingPay = /payment_pending|payment pending/i.test(String((t as unknown as Record<string, unknown>).paymentStatus ?? ""));
              return (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.resource}</td>
                  <td>{t.issue}</td>
                  <td>
                    <span className={"badge " + (t.priority === "High" || t.priority === "Critical" ? "red" : "")}>
                      {t.priority}
                    </span>
                  </td>
                  <td>{t.status}</td>
                  <td>{t.date}</td>
                  <td>
                    {pendingPay ? (
                      <span className="flex gap-1">
                        <button className="btn primary" disabled={acting === t.id} onClick={() => void act(t.id, () => payTicket(t.id, "razorpay"), "Paid.")}>
                          Pay
                        </button>
                        <button className="btn secondary" disabled={acting === t.id} onClick={() => void act(t.id, () => payTicket(t.id, "cash"), "Paid.")}>
                          Cash
                        </button>
                      </span>
                    ) : (
                      <span className="flex gap-1">
                        <button
                          className="btn secondary"
                          disabled={acting === t.id}
                          onClick={() => void act(t.id, () => serviceCentreApi.fmApprove(t.id, { approved: true }), "Ticket approved.")}
                        >
                          Approve
                        </button>
                        <button
                          className="btn secondary"
                          disabled={acting === t.id}
                          onClick={() => void act(t.id, () => serviceCentreApi.fmApprove(t.id, { approved: false }), "Ticket rejected.")}
                        >
                          Reject
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  red,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  red?: boolean;
}) {
  return (
    <div className="card stat">
      <div className="statIcon" style={red ? { background: "#fdeaea", color: "#9a4c4c" } : undefined}>
        {icon}
      </div>
      <div>
        <div className="statLabel">{label}</div>
        <div className="statValue">{value}</div>
      </div>
    </div>
  );
}

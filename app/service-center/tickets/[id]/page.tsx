"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { scApi } from "@/lib/service-center/api";

export default function TicketDetail() {
  const params = useParams() as any;
  const id = params?.id as string;
  const [t, setT] = React.useState<any>(null);
  React.useEffect(() => {
    if (!id) return;
    const load = () => scApi.ticket(id).then(setT).catch(() => {});
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [id]);
  if (!t) return <div className="p-6">Loading…</div>;
  const sc = (t as any)?.serviceCenter;
  const tech = (t as any)?.technician;
  const total = Number(t.estimatedCost || 0) + (t.additionalCharges || []).filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + Number(c.amount || 0), 0) + Number(t.toolkitAmount || 0);
  return (
    <div className="min-h-screen bg-slate-50"><div className="max-w-4xl mx-auto p-6 bg-white mt-6 rounded-xl shadow-sm">
      <h1 className="text-xl font-semibold">{t.mainProblem || t.category} — {t.ticketId}</h1>
      <div className="text-sm text-slate-600 mt-1">Status {t.status} • queue {t.queue || "—"} • FM {t.fmApprovalStatus} • Payment {t.paymentStatus}</div>
      <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
        <div><h3 className="font-semibold">Raiser</h3><div>{t.raisedByName} ({t.raisedByRole})</div><div>FM: {t.fleetManagerName || t.fleetManagerUid || "—"}</div><div>Pilot: {t.pilotUid}</div></div>
        <div><h3 className="font-semibold">Drone & repair</h3><div>{t.droneName} ({t.droneId})</div><div>{t.location}</div><div>Scheduled {t.scheduledDate || t.dateTime}</div><div>Total ₹{total} • Earning ₹{t.earningAmount ?? Math.round(total * 0.7)}</div></div>
        <div><h3 className="font-semibold">Service centre</h3><div>{sc?.name || t.serviceCenterCity}</div><div>{sc?.address}</div><div>Pickup code: {t.toolkitPickupCode || "—"} {t.toolkitPickupVerified ? "✓" : ""}</div></div>
        <div><h3 className="font-semibold">Technician live</h3><div>{t.technicianName || t.technicianUid}</div><div>Live: {tech?.liveGeo ? `${tech.liveGeo.lat}, ${tech.liveGeo.lng}` : t.techLiveGeo ? `${t.techLiveGeo.lat}, ${t.techLiveGeo.lng}` : "—"}</div><div>Return code: {t.toolkitReturnCode || "—"} {t.toolkitReturnVerified ? "✓" : ""}</div></div>
      </div>
      {(t.techLiveGeo || tech?.liveGeo) && (
        <a className="text-sm text-indigo-600 mt-3 inline-block" href={`https://www.google.com/maps?q=${(tech?.liveGeo || t.techLiveGeo).lat},${(tech?.liveGeo || t.techLiveGeo).lng}`} target="_blank">Open technician live location on map →</a>
      )}
      {t.geo && <div><a className="text-sm text-indigo-600" href={`https://www.google.com/maps?q=${t.geo.lat},${t.geo.lng}`} target="_blank">Open repair location pinned on map →</a></div>}
      <pre className="text-xs bg-slate-50 p-3 rounded mt-4 overflow-auto">{JSON.stringify(t, null, 2)}</pre>
    </div></div>
  );
}

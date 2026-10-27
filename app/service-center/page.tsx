"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { DashboardBackBlock } from "@/lib/booking/use-dashboard-back-block";
import { getToken,scApi } from "@/lib/service-center/api";

export default function ServiceCentreDashboard() {
  const router = useRouter();
  const [stats, setStats] = React.useState<any>(null);
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [techs, setTechs] = React.useState<any[]>([]);
  const [centres, setCentres] = React.useState<any[]>([]);
  const [toolkits, setToolkits] = React.useState<any[]>([]);
  const [city, setCity] = React.useState("");
  const [assignForm, setAssignForm] = React.useState<Record<string, { tech: string; tier: string }>>({});
  const [returnCodes, setReturnCodes] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const [d, t, te, c, tk] = await Promise.all([
        scApi.dashboard().catch(() => null),
        scApi.tickets({ limit: "100", ...(city ? { city } : {}) }).catch(() => ({ items: [] })),
        scApi.technicians(city || undefined).catch(() => []),
        scApi.centres().catch(() => []),
        scApi.toolkits().catch(() => []),
      ]);
      setStats(d);
      setTickets(Array.isArray(t) ? t : t?.items || []);
      setTechs(Array.isArray(te) ? te : []);
      setCentres(Array.isArray(c) ? c : []);
      setToolkits(Array.isArray(tk) ? tk : []);
    } catch (e: any) { setErr(e?.message || "Failed to load"); }
  }, [city]);

  React.useEffect(() => {
    if (!getToken()) { router.push("/service-center/login"); return; }
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, [load, router]);

  const doAssign = async (ticket: any) => {
    const f = assignForm[ticket.ticketId];
    if (!f?.tech) { alert("Select technician"); return; }
    try {
      const res: any = await scApi.assign(ticket.ticketId, { technicianUid: f.tech, priority: ticket.priority || "medium", toolkitTier: (f.tier as any) || undefined, serviceCenterId: ticket.serviceCenterId || undefined, scheduledDate: ticket.scheduledDate || ticket.dateTime || new Date().toISOString() });
      alert(`Assigned. Pickup code (show to technician): ${res?._pickupCodeForSC || res?.toolkitPickupCode || "see ticket"}`);
      load();
    } catch (e: any) { alert(e?.message || "Assign failed"); }
  };
  const doReturn = async (ticket: any) => {
    const code = returnCodes[ticket.ticketId] || "";
    if (code.length !== 4) { alert("Enter 4-digit return code from technician"); return; }
    try { await scApi.toolkitReturn(ticket.ticketId, code.toUpperCase()); alert("Toolkit takeover confirmed — now reusable."); load(); }
    catch (e: any) { alert(e?.message || "Verification failed"); }
  };

  const cities = React.useMemo(() => [...new Set(centres.map((c: any) => c.city))], [centres]);
  const techsByCity = (ct: string) => techs.filter((x: any) => String(x?.profileData?.serviceRegion || x?.serviceRegion || x?.city || "").toLowerCase().includes(ct.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Isolated admin-only area: own sc_token login, own back-block, never part of role-switch. */}
      <DashboardBackBlock enabled />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-semibold">Service Centre Dashboard</h1><p className="text-sm text-slate-500">15 cities • live, auto-refresh every 8s</p></div>
          <div className="flex gap-2">
            <select value={city} onChange={(e) => setCity(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
              <option value="">All cities</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="text-sm border rounded-lg px-3 py-1" onClick={() => { scApi.logout(); router.push("/service-center/login"); }}>Logout</button>
          </div>
        </div>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            {(Object.entries(stats.ticketsByStatus || {}) as [string, any][]).map(([k, v]) => (
              <div key={k} className="bg-white rounded-xl p-3 shadow-sm"><div className="text-xs text-slate-500">{k}</div><div className="text-xl font-semibold">{v}</div></div>
            ))}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold">Incoming tickets ({tickets.length})</h2>
            <div className="mt-2 space-y-3 max-h-[560px] overflow-auto">
              {tickets.map((tk: any) => (
                <div key={tk.ticketId} className="border rounded-lg p-3">
                  <div className="flex justify-between"><span className="font-medium">{tk.mainProblem || tk.category}</span><span className="text-xs">{tk.status} • {tk.serviceCenterCity || "—"}</span></div>
                  <div className="text-xs text-slate-600 mt-1">Raised by {tk.raisedByName} ({tk.raisedByRole}) • FM approval: {tk.fmApprovalStatus} • Technician: {tk.technicianName || tk.technicianUid || "—"}</div>
                  <div className="text-xs text-slate-600">Drone {tk.droneName || tk.droneId} • {tk.location} • {tk.scheduledDate || tk.dateTime} • Est ₹{tk.estimatedCost ?? 0} + toolkit ₹{tk.toolkitAmount ?? 0}</div>
                  <div className="text-xs mt-1">Pickup: {tk.toolkitPickupCode || "—"} {tk.toolkitPickupVerified ? "✓" : ""} • Return: {tk.toolkitReturnCode || "—"} {tk.toolkitReturnVerified ? "✓" : ""} • Payment: {tk.paymentStatus}</div>
                  <Link className="text-xs text-indigo-600" href={`/service-center/tickets/${tk.ticketId}`}>Open live tracking →</Link>
                  {(!tk.technicianUid || tk.status === "rejected" || tk.status === "open") && tk.status !== "pending_fm_approval" && (
                    <div className="flex gap-2 mt-2">
                      <select className="border rounded px-2 py-1 text-xs" value={assignForm[tk.ticketId]?.tech || ""} onChange={(e) => setAssignForm((p) => ({ ...p, [tk.ticketId]: { tech: e.target.value, tier: p[tk.ticketId]?.tier || "basic" } }))}>
                        <option value="">Select tech</option>
                        {(city ? techsByCity(city) : techs).map((x: any) => <option key={x.uid} value={x.uid}>{x.displayName || x.name || x.uid} ({x.liveGeo ? `${x.liveGeo.lat},${x.liveGeo.lng}` : "no GPS"})</option>)}
                      </select>
                      <select className="border rounded px-2 py-1 text-xs" value={assignForm[tk.ticketId]?.tier || "basic"} onChange={(e) => setAssignForm((p) => ({ ...p, [tk.ticketId]: { tech: p[tk.ticketId]?.tech || "", tier: e.target.value } }))}>
                        <option value="basic">basic ₹499</option><option value="standard">standard ₹999</option><option value="advanced">advanced ₹1999</option>
                      </select>
                      <button className="text-xs bg-indigo-600 text-white rounded px-2 py-1" onClick={() => doAssign(tk)}>Assign</button>
                    </div>
                  )}
                  {tk.toolkitReturnCode && !tk.toolkitReturnVerified && (
                    <div className="flex gap-2 mt-2">
                      <input className="border rounded px-2 py-1 text-xs" placeholder="4-digit return code" maxLength={4} value={returnCodes[tk.ticketId] || ""} onChange={(e) => setReturnCodes((p) => ({ ...p, [tk.ticketId]: e.target.value.toUpperCase() }))} />
                      <button className="text-xs bg-green-600 text-white rounded px-2 py-1" onClick={() => doReturn(tk)}>Confirm takeover</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold">Technicians ({techs.length}) {city ? `around ${city}` : "— all cities"}</h2>
              <div className="mt-2 space-y-2 max-h-[260px] overflow-auto">
                {techs.map((x: any) => (
                  <div key={x.uid} className="border rounded-lg p-2 text-xs">
                    <div className="font-medium">{x.displayName || x.name || x.email || x.uid}</div>
                    <div>Phone {x.phone || x.phoneNumber || "—"} • Region {x.profileData?.serviceRegion || x.serviceRegion || "—"} • Status {x.status}</div>
                    <div>Live: {x.liveGeo ? `${x.liveGeo.lat}, ${x.liveGeo.lng}` : "—"} • Active {x.activeCount ?? "?"} • Next {x.nextCount ?? "?"}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold">Toolkit handout ↔ takeover + marketplace</h2>
              <div className="text-xs text-slate-600">Available: {toolkits.filter((x: any) => x.status === "available").length} • Handed out: {toolkits.filter((x: any) => x.status !== "available").length}</div>
              <PurchaseBox centres={centres} onDone={load} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseBox({ centres, onDone }: { centres: any[]; onDone: () => void }) {
  const [sc, setSc] = React.useState("");
  const [tier, setTier] = React.useState("basic");
  return (
    <div className="flex gap-2 mt-2">
      <select value={sc} onChange={(e) => setSc(e.target.value)} className="border rounded px-2 py-1 text-xs">
        <option value="">Centre</option>{centres.map((c: any) => <option key={c.id} value={c.id}>{c.city}</option>)}
      </select>
      <select value={tier} onChange={(e) => setTier(e.target.value)} className="border rounded px-2 py-1 text-xs">
        <option value="basic">basic ₹499</option><option value="standard">standard ₹999</option><option value="advanced">advanced ₹1999</option>
      </select>
      <button className="text-xs bg-indigo-600 text-white rounded px-2 py-1" onClick={async () => {
        if (!sc) { alert("Select centre"); return; }
        await scApi.purchaseToolkit({ serviceCenterId: sc, tier, qty: 1 }); alert("Toolkit purchased from marketplace & added to stock."); onDone();
      }}>Buy toolkit</button>
    </div>
  );
}

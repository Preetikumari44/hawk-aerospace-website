"use client";

// FM incoming-request details — pre-accept mission view with financials +
// Accept (→ booking details) / Reject (→ missions).

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

export default function FleetRequestDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const router = useRouter();
  const { requests, reload, showToast } = useFleetData();
  const [mission, setMission] = React.useState<Record<string, unknown> | null>(null);
  const [acting, setActing] = React.useState(false);

  const request =
    requests.find((r) => String(r.requestId ?? r.id ?? r._id) === decodeURIComponent(id)) ?? null;

  const bookingId = request ? String(request.bookingId ?? request.bookingNumber ?? "") : "";

  React.useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    fleetApi
      .getMission(bookingId)
      .then((m) => {
        if (!cancelled) setMission((m ?? null) as Record<string, unknown> | null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  async function decide(accept: boolean) {
    if (!request) return;
    const rid = String(request.requestId ?? request.id ?? request._id ?? "");
    setActing(true);
    try {
      if (accept) {
        await fleetApi.acceptFleetManagerRequest(rid, bookingId);
        showToast("Accepted.");
        reload();
        router.push(`/fleet/bookings/${encodeURIComponent(bookingId)}`);
      } else {
        await fleetApi.rejectFleetManagerRequest(rid, bookingId, "Rejected from web");
        showToast("Rejected.");
        reload();
        router.push("/fleet/missions");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  if (!request) {
    return (
      <div>
        <Link href="/fleet/missions">← Missions</Link>
        <div className="card mt-3">Request not found — it may already be handled.</div>
      </div>
    );
  }

  const m = (mission ?? {}) as Record<string, unknown>;
  const price = (m.priceBreakdown ?? {}) as Record<string, unknown>;

  return (
    <div>
      <Link href="/fleet/missions">← Missions</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>{bookingId}</h1>
          <p>{String(request.serviceType ?? m.serviceType ?? "")} · {String(request.status ?? "pending")}</p>
        </div>
      </div>
      <div className="card mb-3">
        <div className="panelHead"><h2>Mission Details</h2></div>
        <div className="kv">
          <div><span>Service</span><b>{String(request.serviceType ?? m.serviceType ?? "—")}</b></div>
          <div><span>Sub-service</span><b>{String(m.subService ?? m.serviceSubType ?? "—")}</b></div>
          <div><span>Date & Time</span><b>{String(m.scheduledDate ?? request.date ?? "—")} {String(m.preferredTimeSlot ?? "")}</b></div>
          <div><span>Location</span><b>{String(m.address ?? m.location ?? request.address ?? "—")}</b></div>
          <div><span>Land Area</span><b>{String(m.areaValue ?? m.landArea ?? "—")}</b></div>
          <div><span>Est. Service Time</span><b>{String(m.estimatedDuration ?? m.estTime ?? "—")}</b></div>
          <div><span>Customer</span><b>{String(m.customerName ?? request.customerName ?? "—")}</b></div>
          <div><span>Mission ID</span><b>{String(m.id ?? bookingId)}</b></div>
        </div>
      </div>
      <div className="card mb-3">
        <div className="panelHead"><h2>Financials</h2></div>
        <div className="kv">
          <div><span>Est. Commission</span><b>{price.commission != null ? `₹${Number(price.commission).toLocaleString("en-IN")}` : String(request.commission ?? "—")}</b></div>
          <div><span>Total</span><b>{price.totalAmount != null ? `₹${Number(price.totalAmount).toLocaleString("en-IN")}` : "—"}</b></div>
          <div><span>Payment</span><b>{String(m.paymentStatus ?? "—")}</b></div>
        </div>
        <div className="actions mt-2.5">
          <button className="btn primary" disabled={acting} onClick={() => void decide(true)}>
            Accept
          </button>
          <button className="btn secondary" disabled={acting} onClick={() => void decide(false)}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

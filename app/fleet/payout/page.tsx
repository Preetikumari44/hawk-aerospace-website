"use client";

// FM payout method — bank/UPI with strict validation, save → auto-verify,
// re-verify, reset, cancel (Super App fmAddPayoutMethodScreen parity).

import Link from "next/link";

import * as React from "react";

import { fleetApi } from "@/lib/booking/role-apis";
import { payoutApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  background: "#fff",
  outline: "none",
};

export default function FleetPayout() {
  const { payouts, reload, showToast } = useFleetData();
  const [kind, setKind] = React.useState<"bank" | "upi">("bank");
  const [holder, setHolder] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [ifsc, setIfsc] = React.useState("");
  const [upi, setUpi] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [verified, setVerified] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const formError =
    kind === "bank"
      ? !holder.trim()
        ? "Account holder name is required."
        : !/^\d{9,18}$/.test(number.replace(/\D/g, ""))
          ? "Account number must be 9–18 digits."
          : !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())
            ? "IFSC looks invalid (e.g. HDFC0001234)."
            : null
      : !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim())
        ? "UPI ID looks invalid (e.g. name@bank)."
        : null;

  async function verifyById(id: string) {
    setSaving(true);
    setFailed(false);
    try {
      const res = (await payoutApi.verifyMethod(id)) as Record<string, unknown>;
      const status = String(res.verificationStatus ?? res.status ?? "").toLowerCase();
      if (status === "failed" || status === "rejected") {
        setFailed(true);
        showToast("Verification failed — check details and re-verify.");
      } else {
        setVerified(true);
        showToast("Payout method verified.");
      }
      reload();
    } catch (err) {
      setFailed(true);
      showToast(err instanceof Error ? err.message : "Verify failed.");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (formError) {
      showToast(formError);
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      const res = (await fleetApi.addPayoutMethod(
        kind === "bank"
          ? {
              type: "bank",
              accountHolderName: holder.trim(),
              accountNumber: number.replace(/\D/g, ""),
              ifscCode: ifsc.trim().toUpperCase(),
            }
          : { type: "upi", upiId: upi.trim() },
      )) as Record<string, unknown>;
      const id = String(res.id ?? res._id ?? res.methodId ?? "");
      if (!id) throw new Error("Save returned no id.");
      setSavedId(id);
      if (res.razorpayFundAccountId != null || String(res.verificationStatus ?? res.status ?? "").toLowerCase() === "pending") {
        await verifyById(id);
      } else {
        setVerified(true);
        showToast("Payout method saved and verified.");
      }
      reload();
    } catch (err) {
      setFailed(true);
      showToast(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link href="/fleet/earnings">← Earnings</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Payout Method</h1>
          <p>Bank or UPI for commission payouts.</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="actions">
          <button className={"btn " + (kind === "bank" ? "primary" : "secondary")} onClick={() => { setKind("bank"); setSavedId(null); setVerified(false); setFailed(false); }}>
            Bank
          </button>
          <button className={"btn " + (kind === "upi" ? "primary" : "secondary")} onClick={() => { setKind("upi"); setSavedId(null); setVerified(false); setFailed(false); }}>
            UPI
          </button>
        </div>
        <div className="grid two mt-2.5">
          {kind === "bank" ? (
            <>
              <input style={inputStyle} value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Account holder name" />
              <input style={inputStyle} value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} placeholder="Account number" inputMode="numeric" />
              <input style={inputStyle} value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="IFSC" />
            </>
          ) : (
            <input style={inputStyle} value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="UPI ID (name@bank)" />
          )}
        </div>
        {formError && (holder || number || ifsc || upi) ? <p style={{ color: "#9a4c4c", fontSize: 12 }}>{formError}</p> : null}
        {verified ? <p style={{ color: "#2f7a52", fontWeight: 700 }}>✓ Verified</p> : null}
        {failed ? <p style={{ color: "#9a4c4c", fontWeight: 700 }}>✗ Verification failed — check details and re-verify.</p> : null}
        <div className="actions mt-2.5">
          {!savedId || failed ? (
            <>
              <button className="btn primary" disabled={!!formError || saving} onClick={() => void save()}>
                {saving ? "Saving…" : failed ? "Retry Save" : "Save Payout Method"}
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  setHolder("");
                  setNumber("");
                  setIfsc("");
                  setUpi("");
                  setSavedId(null);
                  setVerified(false);
                  setFailed(false);
                }}
              >
                Reset
              </button>
              <Link className="btn secondary" href="/fleet/earnings">
                Cancel
              </Link>
            </>
          ) : (
            <>
              {!verified ? (
                <button className="btn primary" disabled={saving} onClick={() => void verifyById(savedId)}>
                  Re-verify Payout Method
                </button>
              ) : null}
              <Link className="btn secondary" href="/fleet/earnings">
                Done
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="sectionHead"><h2>Saved Methods</h2></div>
      <div className="card">
        {payouts.length === 0 ? (
          <div className="empty">No payout methods yet.</div>
        ) : (
          payouts.map((p, i) => (
            <div className="dRow" key={String((p as Record<string, unknown>).id ?? i)}>
              <span><b>{String((p as Record<string, unknown>).label ?? "Account")}</b></span>
              <span className="badge">{String((p as Record<string, unknown>).verificationStatus ?? "")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

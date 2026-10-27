"use client";

// Pilot payout — Super App AddPayoutMethodScreen parity: Bank/UPI switch with
// strict validation, save → auto-verify, verified/failed boxes, re-verify,
// reset, cancel. History moved to /pilot/withdrawals.

import Link from "next/link";

import * as React from "react";

import { payoutApi, pilotApi } from "@/lib/booking/role-apis";
import { usePilot } from "@/lib/pilot/data";

function validBank(holder: string, number: string, ifsc: string): string | null {
  if (!holder.trim()) return "Account holder name is required.";
  if (!/^\d{9,18}$/.test(number.replace(/\D/g, ""))) return "Account number must be 9–18 digits.";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) return "IFSC looks invalid (e.g. HDFC0001234).";
  return null;
}

function validUpi(upi: string): string | null {
  if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim())) return "UPI ID looks invalid (e.g. name@bank).";
  return null;
}

function methodLabel(p: Record<string, unknown>): string {
  if (typeof p.label === "string" && p.label) return p.label;
  if (p.type === "upi") return `UPI ${String(p.upiId ?? "")}`;
  if (p.type === "bank") return `Bank •••• ${String(p.accountNumber ?? p.masked ?? "").slice(-4)}`;
  return "Account";
}

export default function PilotPayout() {
  const { payouts, showToast, reload } = usePilot();
  const [kind, setKind] = React.useState<"bank" | "upi">("bank");
  const [holder, setHolder] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [ifsc, setIfsc] = React.useState("");
  const [upi, setUpi] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [verified, setVerified] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const formError = kind === "bank" ? validBank(holder, number, ifsc) : validUpi(upi);
  const canSave = formError === null;

  function switchKind(k: "bank" | "upi") {
    setKind(k);
    setSavedId(null);
    setVerified(false);
    setFailed(false);
  }

  function reset() {
    setHolder("");
    setNumber("");
    setIfsc("");
    setUpi("");
    setSavedId(null);
    setVerified(false);
    setFailed(false);
  }

  async function save() {
    if (!canSave) {
      showToast(formError ?? "Check the form.");
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      const res = (await pilotApi.addPayoutMethod(
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
      // Auto-verify when the backend leaves it pending (Razorpay fund account
      // flow) — mirrors the app's razorpayFundAccountId|pending branch.
      const needsVerify =
        res.razorpayFundAccountId != null || String(res.verificationStatus ?? res.status ?? "").toLowerCase() === "pending";
      if (needsVerify) {
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

  async function verify() {
    if (!savedId) return;
    await verifyById(savedId);
  }

  return (
    <>
      <Link href="/pilot/earnings" style={{ color: "var(--p-forest)", fontWeight: 600 }}>
        ← Back to Earnings
      </Link>
      <h1 className="p-h1 mt-2">
        Payout Method
      </h1>
      <div className="p-card" style={{ maxWidth: 480 }}>
        <div className="p-segment">
          <button className={kind === "bank" ? "active" : ""} onClick={() => switchKind("bank")}>
            Bank
          </button>
          <button className={kind === "upi" ? "active" : ""} onClick={() => switchKind("upi")}>
            UPI
          </button>
        </div>
        <div className="flex flex-col gap-2 mt-3">
          {kind === "bank" ? (
            <>
              <input className="p-input" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Account holder name" />
              <input className="p-input" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} placeholder="Account number (9–18 digits)" inputMode="numeric" />
              <input className="p-input" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="IFSC (e.g. HDFC0001234)" />
            </>
          ) : (
            <>
              <input className="p-input" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="UPI ID (name@bank)" />
              <p className="p-sub m-0">We will verify this VPA with a penny-drop.</p>
            </>
          )}
        </div>
        {formError && (holder || number || ifsc || upi) ? (
          <p className="p-sub mt-2" style={{ color: "var(--p-error)" }}>{formError}</p>
        ) : null}
        {verified ? (
          <div className="p-card mt-3" style={{ background: "var(--p-mintsoft)" }}>
            <b style={{ color: "var(--p-forest)" }}>✓ Verified</b>
          </div>
        ) : null}
        {failed ? (
          <div className="p-card mt-3" style={{ background: "#F6E0DB" }}>
            <b style={{ color: "var(--p-error)" }}>✗ Verification failed — check details and re-verify.</b>
          </div>
        ) : null}
        {savedId && !verified && !failed ? (
          <p className="p-sub mt-2">
            Verification status: <span className="p-badge-pill warning">Pending</span>
          </p>
        ) : null}
        <div className="flex gap-2 mt-3 flex-wrap">
          {!savedId || failed ? (
            <>
              <button className="p-btn" disabled={!canSave || saving} onClick={() => void save()}>
                {saving ? "Saving…" : failed ? "Retry Save" : "Save Payout Method"}
              </button>
              <button className="p-btn outline" onClick={reset}>
                Reset
              </button>
              <Link href="/pilot/earnings" className="p-btn outline">
                Cancel
              </Link>
            </>
          ) : (
            <>
              {!verified ? (
                <button className="p-btn" disabled={saving} onClick={() => void verify()}>
                  Re-verify Payout Method
                </button>
              ) : null}
              <Link href="/pilot/earnings" className="p-btn secondary">
                Done
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="p-card">
        <h3 className="mb-2">Saved Methods</h3>
        {payouts.length === 0 ? (
          <p className="p-sub">No payout methods yet.</p>
        ) : (
          payouts.map((p, i) => (
            <div className="p-teamrow" key={String((p as Record<string, unknown>).id ?? i)}>
              <b style={{ fontSize: 13 }}>{methodLabel(p as Record<string, unknown>)}</b>
              <span className="p-badge-pill success">{String((p as Record<string, unknown>).verificationStatus ?? "")}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

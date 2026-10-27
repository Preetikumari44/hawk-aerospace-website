"use client";

// FM withdraw — balance + verified-method radio + amount/quick amounts +
// min-100 + balance checks (Super App fmWithdrawScreen parity).

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { fleetApi } from "@/lib/booking/role-apis";
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

export default function FleetWithdraw() {
  const router = useRouter();
  const { earnings, payouts, showToast } = useFleetData();
  const [amount, setAmount] = React.useState("");
  const [methodId, setMethodId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const verified = payouts.filter(
    (p) => String((p as Record<string, unknown>).verificationStatus ?? "").toLowerCase() === "verified",
  );
  const selected = methodId || String((verified[0] as Record<string, unknown> | undefined)?.id ?? "");

  async function submit() {
    const amt = Math.floor(Number(amount));
    if (!selected) {
      showToast("Add a verified bank/UPI method first.");
      return;
    }
    if (!Number.isFinite(amt) || amt < 100) {
      showToast("Minimum withdrawal is ₹100.");
      return;
    }
    if (amt > earnings.pending) {
      showToast("Amount exceeds available balance.");
      return;
    }
    setBusy(true);
    try {
      await fleetApi.createWithdrawal({ payoutMethodId: selected, amount: amt });
      showToast("Withdrawal requested — reviewed by admin in 24–48h.");
      router.push("/fleet/earnings");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Withdraw failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/fleet/earnings">← Earnings</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Withdraw Earnings</h1>
          <p>Balance ₹{earnings.pending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <div className="card mb-3">
        <input style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Amount (min ₹100)" inputMode="numeric" />
        <div className="actions mt-2">
          {[500, 1000, 2000, 5000].map((q) => (
            <button key={q} className="btn secondary" onClick={() => setAmount(String(q))}>
              ₹{q.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="panelHead"><h2>Payout Method</h2><Link href="/fleet/payout">Add</Link></div>
        {verified.length === 0 ? (
          <div className="empty">No verified methods. <Link href="/fleet/payout">Add Payout Method</Link></div>
        ) : (
          verified.map((p) => {
            const pid = String((p as Record<string, unknown>).id ?? "");
            return (
              <label className="dRow" key={pid} style={{ cursor: "pointer" }}>
                <span>
                  <input type="radio" checked={selected === pid} onChange={() => setMethodId(pid)} />{" "}
                  <b>{String((p as Record<string, unknown>).label ?? "Account")}</b>
                </span>
              </label>
            );
          })
        )}
        <div className="actions mt-2.5">
          <button className="btn primary" disabled={busy} onClick={() => void submit()}>
            {busy ? "Requesting…" : "Confirm Withdrawal"}
          </button>
        </div>
        <p className="muted">Reviewed by admin in 24–48h.</p>
      </div>
    </div>
  );
}

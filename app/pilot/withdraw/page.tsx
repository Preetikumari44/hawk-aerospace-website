"use client";

// Pilot withdraw — Super App WithdrawScreen parity: available balance, min
// ₹100, quick amounts, verified-method radio, admin 24–48h confirm.

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { pilotApi } from "@/lib/booking/role-apis";
import { usePilot } from "@/lib/pilot/data";

export default function PilotWithdraw() {
  const router = useRouter();
  const { earnings, payouts, showToast } = usePilot();
  const [amount, setAmount] = React.useState("");
  const [methodId, setMethodId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const verified = payouts.filter(
    (p) => String((p as Record<string, unknown>).verificationStatus ?? "").toLowerCase() === "verified",
  );
  const selected = methodId || (verified[0] ? String((verified[0] as Record<string, unknown>).id ?? "") : "");

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
      await pilotApi.createWithdrawal({ payoutMethodId: selected, amount: amt });
      showToast("Withdrawal requested — reviewed by admin in 24–48h.");
      router.push("/pilot/earnings");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Withdraw failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/pilot/earnings" style={{ color: "var(--p-forest)", fontWeight: 600 }}>
        ← Back to Earnings
      </Link>
      <h1 className="p-h1 mt-2">Withdraw Earnings</h1>
      <div className="p-card">
        <div className="p-ovlabel">Available Balance</div>
        <div className="p-ovvalue">₹{earnings.pending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        <p className="p-sub">Minimum ₹100.</p>
        <input
          className="p-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          placeholder="Amount"
          inputMode="numeric"
        />
        <div className="flex gap-2 mt-2 flex-wrap">
          {[500, 1000, 2000, 5000].map((q) => (
            <button key={q} className="p-btn outline" onClick={() => setAmount(String(q))}>
              ₹{q.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>
      <div className="p-card">
        <h3 className="mb-2">Payout Method</h3>
        {verified.length === 0 ? (
          <div className="p-card" style={{ background: "#FFF7E5" }}>
            <p className="p-sub">No verified methods.</p>
            <Link href="/pilot/payout" className="p-btn secondary inline-block mt-2">
              Add Payout Method
            </Link>
          </div>
        ) : (
          verified.map((p) => {
            const o = p as Record<string, unknown>;
            const pid = String(o.id ?? "");
            return (
              <label key={pid} className="p-teamrow" style={{ cursor: "pointer" }}>
                <span>
                  <input type="radio" checked={selected === pid} onChange={() => setMethodId(pid)} />{" "}
                  <b style={{ fontSize: 13 }}>{String(o.label ?? "Account")}</b>
                </span>
              </label>
            );
          })
        )}
        <button className="p-btn mt-3" disabled={busy} onClick={() => void submit()}>
          {busy ? "Requesting…" : "Confirm Withdrawal"}
        </button>
        <p className="p-sub mt-2">Reviewed by admin in 24–48h.</p>
      </div>
    </>
  );
}

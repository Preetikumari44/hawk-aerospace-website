"use client";

// Technician withdraw — min ₹100 to bank/UPI, verified-method gate (Super
// App TechnicianEarningsScreen withdraw parity).

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { apiRequest } from "@/lib/booking/api-client";
import { useTech } from "@/lib/tech/data";

export default function TechWithdraw() {
  const router = useRouter();
  const { earnings, showToast } = useTech();
  const [amount, setAmount] = React.useState("");
  const [methods, setMethods] = React.useState<Record<string, unknown>[]>([]);
  const [methodId, setMethodId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    apiRequest<unknown>("/payouts/methods")
      .then((v) => {
        const list = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
        setMethods(list);
        const verified = list.find((m) => String(m.verificationStatus ?? "").toLowerCase() === "verified");
        setMethodId(String((verified ?? list[0] ?? {}).id ?? ""));
      })
      .catch(() => undefined);
  }, []);

  const selected = methods.find((m) => String(m.id ?? "") === methodId);
  const verified = !selected || String(selected.verificationStatus ?? "").toLowerCase() === "verified";

  async function submit() {
    const amt = Math.floor(Number(amount));
    if (!selected) {
      showToast("Add a verified bank/UPI method first.");
      return;
    }
    if (!verified) {
      showToast("That payout method isn't verified yet.");
      return;
    }
    if (!Number.isFinite(amt) || amt < 100) {
      showToast("Minimum withdrawal is ₹100.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest<unknown>("/wallet/withdraw", {
        method: "POST",
        body: { amount: amt, payoutMethodId: methodId },
      });
      showToast(`₹${amt.toLocaleString("en-IN")} withdrawal initiated.`);
      router.push("/technician/earnings");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Withdraw failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/technician/earnings" style={{ color: "var(--forest)", fontWeight: 600 }}>
        ← Earnings
      </Link>
      <div className="pagehead mt-2">
        <div>
          <div className="title">Withdraw</div>
          <p className="sub">Balance ₹{earnings.total.toLocaleString("en-IN")} · min ₹100 to bank/UPI.</p>
        </div>
      </div>
      <div className="card">
        <input
          className="search"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          placeholder="Amount (min ₹100)"
          inputMode="numeric"
        />
        <h3 className="sectiontitle mt-3">Payout Method</h3>
        {methods.length === 0 ? (
          <div className="empty">No payout methods yet — add one from your profile.</div>
        ) : (
          <select
            className="search"
            value={methodId}
            onChange={(e) => setMethodId(e.target.value)}
          >
            {methods.map((m) => (
              <option key={String(m.id ?? "")} value={String(m.id ?? "")}>
                {String(m.label ?? "Account")} {String(m.verificationStatus ?? "")}
              </option>
            ))}
          </select>
        )}
        <button className="btn mt-3" style={{ width: "100%" }} disabled={busy} onClick={() => void submit()}>
          {busy ? "Requesting…" : "Withdraw"}
        </button>
      </div>
    </>
  );
}

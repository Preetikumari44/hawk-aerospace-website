"use client";

// Refer & Earn — Super App ReferAndEarnScreen parity: per-role code chips,
// share/copy, phone invites, attach-a-code, wallet breakdown + history,
// payout methods (add/verify/select) + min-100 withdraw.

import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Reveal } from "@/components/ui/reveal";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { payoutApi, referralApi, walletApi } from "@/lib/booking/role-apis";
import { normalizeBackendRole } from "@/lib/booking/roles";

const TARGETS = [
  { key: "customer", label: "Customer" },
  { key: "pilot", label: "Pilot" },
  { key: "sales", label: "Sales" },
  { key: "fleet", label: "Fleet Manager" },
  { key: "technician", label: "Technician" },
] as const;

const inputClass =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

interface PayoutMethod {
  id: string;
  type: string;
  label: string;
  verified: boolean;
}

function toMethods(v: unknown): PayoutMethod[] {
  const raw = Array.isArray(v) ? v : (v as Record<string, unknown>)?.methods;
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((m, i) => ({
    id: String(m.id ?? m._id ?? i),
    type: String(m.type ?? ""),
    label: String(
      m.label ??
        (m.type === "upi"
          ? `UPI ${String(m.upiId ?? "")}`
          : `Bank •••• ${String(m.accountNumber ?? m.masked ?? "").slice(-4)}`),
    ),
    verified: Boolean(
      m.verified ?? m.isVerified ?? String(m.verificationStatus ?? "").toLowerCase() === "verified",
    ),
  }));
}

export default function ReferPage() {
  const { isAuthenticated, requestLogin } = useBookingAuth();
  const [target, setTarget] = React.useState<string>("customer");
  const [code, setCode] = React.useState("");
  const [invites, setInvites] = React.useState<Record<string, unknown>[]>([]);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [pending, setPending] = React.useState<number | null>(null);
  const [withdrawn, setWithdrawn] = React.useState<number | null>(null);
  const [history, setHistory] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState<string | null>(null);
  // Phone invites.
  const [phones, setPhones] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  // Attach a code.
  const [attachCode, setAttachCode] = React.useState("");
  const [attaching, setAttaching] = React.useState(false);
  // Payout methods + withdraw.
  const [methods, setMethods] = React.useState<PayoutMethod[]>([]);
  const [methodId, setMethodId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [showAddMethod, setShowAddMethod] = React.useState(false);
  const [mType, setMType] = React.useState<"bank" | "upi">("upi");
  const [mHolder, setMHolder] = React.useState("");
  const [mNumber, setMNumber] = React.useState("");
  const [mIfsc, setMIfsc] = React.useState("");
  const [mUpi, setMUpi] = React.useState("");
  const [mSaving, setMSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [c, m, w, h, p] = await Promise.all([
        referralApi.code(normalizeBackendRole(target)).catch(() => null),
        referralApi.my().catch(() => null),
        walletApi.get().catch(() => null),
        walletApi.history().catch(() => null),
        payoutApi.methods().catch(() => null),
      ]);
      const cc = (c ?? {}) as Record<string, unknown>;
      setCode(String(cc.code ?? cc.referralCode ?? ""));
      const mm = (m ?? {}) as Record<string, unknown>;
      const inv = mm.invites ?? mm.data;
      setInvites(Array.isArray(inv) ? (inv as Record<string, unknown>[]) : []);
      const ww = (w ?? {}) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === "number" ? v : null);
      setBalance(num(ww.balance ?? ww.total ?? ww.totalEarnings));
      setPending(num(ww.pending ?? ww.pendingEarnings));
      setWithdrawn(num(ww.withdrawn ?? ww.withdrawnEarnings));
      const hh = (h ?? {}) as Record<string, unknown>;
      const hist = hh.history ?? hh.data;
      setHistory(Array.isArray(hist) ? (hist as Record<string, unknown>[]) : []);
      const ms = toMethods(p);
      setMethods(ms);
      setMethodId((prev) => prev || ms.find((x) => x.verified)?.id || ms[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [target]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [isAuthenticated, load]);

  function say(m: string | null) {
    setMsg(m);
  }

  function inviteText() {
    return `Join Hawk Aerospace with my code ${code}: ${window.location.origin}/r/${code}`;
  }

  function legacyCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("copy failed");
  }

  async function copyInvite() {
    const text = inviteText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          legacyCopy(text);
        }
      } else {
        legacyCopy(text);
      }
      say("Invite link copied to clipboard.");
    } catch {
      say("Could not copy — long-press the link instead.");
    }
  }

  function share() {
    const text = inviteText();
    if (navigator.share) void navigator.share({ title: "Hawk Aerospace", text }).catch(() => undefined);
    else void copyInvite();
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteText())}`, "_blank", "noopener");
  }

  async function sendInvites() {
    const list = phones
      .split(/[,\n\s]+/)
      .map((p) => p.replace(/\D/g, "").slice(-10))
      .filter((p) => p.length === 10);
    if (!code || list.length === 0) {
      say("Enter at least one valid 10-digit number.");
      return;
    }
    setInviting(true);
    say(null);
    try {
      await referralApi.invites({
        code,
        phones: list.map((p) => `+91${p}`),
        targetRole: normalizeBackendRole(target),
        channel: "share",
      });
      say(`Invite${list.length > 1 ? "s" : ""} sent to ${list.length} number${list.length > 1 ? "s" : ""}.`);
      setPhones("");
    } catch (err) {
      say(err instanceof Error ? err.message : "Could not send invites.");
    } finally {
      setInviting(false);
    }
  }

  async function attach() {
    const c = attachCode.trim().toUpperCase();
    if (!c) return;
    setAttaching(true);
    say(null);
    try {
      await referralApi.attach(c);
      say(`Code ${c} attached to your account.`);
      setAttachCode("");
    } catch (err) {
      say(err instanceof Error ? err.message : "Could not attach code.");
    } finally {
      setAttaching(false);
    }
  }

  async function addMethod() {
    setMSaving(true);
    say(null);
    try {
      const payload =
        mType === "bank"
          ? {
              type: "bank" as const,
              accountHolderName: mHolder.trim(),
              accountNumber: mNumber.replace(/\D/g, ""),
              ifscCode: mIfsc.trim().toUpperCase(),
            }
          : { type: "upi" as const, upiId: mUpi.trim() };
      const created = await payoutApi.addMethod(payload);
      const id = String(created.id ?? "");
      if (id) {
        try {
          await payoutApi.verifyMethod(id);
          say("Payout method added — verification requested.");
        } catch {
          say("Payout method added — verification pending.");
        }
      } else {
        say("Payout method added.");
      }
      setShowAddMethod(false);
      setMHolder("");
      setMNumber("");
      setMIfsc("");
      setMUpi("");
      const ms = toMethods(await payoutApi.methods().catch(() => []));
      setMethods(ms);
      setMethodId((prev) => prev || ms.find((x) => x.verified)?.id || ms[0]?.id || "");
    } catch (err) {
      say(err instanceof Error ? err.message : "Could not add payout method.");
    } finally {
      setMSaving(false);
    }
  }

  async function withdraw() {
    const amt = Math.floor(Number(amount));
    if (!Number.isFinite(amt) || amt < 100) {
      say("Minimum withdrawal is ₹100.");
      return;
    }
    if (!methodId) {
      say("Select a payout method first.");
      return;
    }
    const method = methods.find((m) => m.id === methodId);
    if (method && !method.verified) {
      say("That payout method isn't verified yet.");
      return;
    }
    setWithdrawing(true);
    say(null);
    try {
      await walletApi.withdraw({ amount: amt, payoutMethodId: methodId });
      say(`₹${amt.toLocaleString("en-IN")} withdrawal requested — admin review in 24–48h.`);
      setAmount("");
      const ww = (await walletApi.get().catch(() => null)) as Record<string, unknown> | null;
      if (ww) {
        const num = (v: unknown) => (typeof v === "number" ? v : null);
        setBalance(num(ww.balance ?? ww.total ?? ww.totalEarnings));
        setPending(num(ww.pending ?? ww.pendingEarnings));
      }
    } catch (err) {
      say(err instanceof Error ? err.message : "Withdraw failed.");
    } finally {
      setWithdrawing(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
              <AerialScene variant="terrain" />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 -z-20"
              style={{
                background:
                  "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
              }}
            />
            <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <span className="eyebrow">Refer & Earn</span>
          <p className="text-muted-foreground text-sm">Log in to see your referral code and wallet.</p>
          <Button size="lg" onClick={() => requestLogin("/refer")}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="hawk-theme hawk-forest relative min-h-screen w-full overflow-hidden">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
        }}
      />
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-6">
          <Reveal className="flex flex-col gap-2">
            <span className="eyebrow">Refer & Earn</span>
            <h1 className="text-3xl font-semibold sm:text-4xl">Invite. Earn. Fly.</h1>
          </Reveal>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <>
              <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6 text-center">
                <div className="flex flex-wrap justify-center gap-2">
                  {TARGETS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTarget(t.key)}
                      aria-pressed={target === t.key}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        target === t.key
                          ? "border-brand bg-brand/15 text-brand"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs tracking-widest uppercase">Your code</p>
                <p className="text-foreground text-3xl font-bold tracking-widest">{code || "—"}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <Button onClick={share} disabled={!code}>
                    Share invite
                  </Button>
                  <Button variant="outline" onClick={() => void copyInvite()} disabled={!code}>
                    Copy link
                  </Button>
                  <Button variant="outline" onClick={shareWhatsApp} disabled={!code}>
                    WhatsApp
                  </Button>
                </div>
              </div>

              <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6">
                <span className="text-foreground font-semibold">Invite by phone</span>
                <textarea
                  value={phones}
                  onChange={(e) => setPhones(e.target.value)}
                  placeholder="10-digit numbers, comma or line separated"
                  rows={2}
                  className={`${inputClass} h-auto py-2`}
                />
                <Button onClick={() => void sendInvites()} disabled={inviting || !code}>
                  {inviting ? "Sending…" : "Send Invites"}
                </Button>
              </div>

              <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6">
                <span className="text-foreground font-semibold">Have a code? Attach it</span>
                <div className="flex gap-2">
                  <input
                    value={attachCode}
                    onChange={(e) => setAttachCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="e.g. HAWK-ABC123"
                    className={`${inputClass} flex-1`}
                  />
                  <Button onClick={() => void attach()} disabled={attaching || !attachCode.trim()}>
                    {attaching ? "…" : "Attach"}
                  </Button>
                </div>
              </div>

              <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6">
                <span className="text-foreground font-semibold">Wallet</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-muted-foreground text-xs">Balance</p>
                    <p className="text-foreground font-bold">₹{(balance ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Pending</p>
                    <p className="text-foreground font-bold">₹{(pending ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Withdrawn</p>
                    <p className="text-foreground font-bold">₹{(withdrawn ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-xs">Payout method</span>
                  {methods.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No payout methods yet — add one below.</p>
                  ) : (
                    <select
                      value={methodId}
                      onChange={(e) => setMethodId(e.target.value)}
                      className={`${inputClass}`}
                    >
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} {m.verified ? "✓" : "(unverified)"}
                        </option>
                      ))}
                    </select>
                  )}
                  {!showAddMethod ? (
                    <Button variant="outline" onClick={() => setShowAddMethod(true)}>
                      Add payout method
                    </Button>
                  ) : (
                    <div className="border-border bg-card flex flex-col gap-2 rounded-2xl border p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant={mType === "upi" ? "default" : "outline"} onClick={() => setMType("upi")}>
                          UPI
                        </Button>
                        <Button size="sm" variant={mType === "bank" ? "default" : "outline"} onClick={() => setMType("bank")}>
                          Bank
                        </Button>
                      </div>
                      {mType === "upi" ? (
                        <input value={mUpi} onChange={(e) => setMUpi(e.target.value)} placeholder="name@bank" className={inputClass} />
                      ) : (
                        <>
                          <input value={mHolder} onChange={(e) => setMHolder(e.target.value)} placeholder="Account holder name" className={inputClass} />
                          <input value={mNumber} onChange={(e) => setMNumber(e.target.value.replace(/\D/g, ""))} placeholder="Account number" inputMode="numeric" className={inputClass} />
                          <input value={mIfsc} onChange={(e) => setMIfsc(e.target.value.toUpperCase())} placeholder="IFSC" className={inputClass} />
                        </>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" disabled={mSaving} onClick={() => void addMethod()}>
                          {mSaving ? "Saving…" : "Save & Verify"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowAddMethod(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="Amount (min ₹100)"
                      inputMode="numeric"
                      className={`${inputClass} flex-1`}
                    />
                    <Button disabled={withdrawing} onClick={() => void withdraw()}>
                      {withdrawing ? "…" : "Withdraw"}
                    </Button>
                  </div>
                </div>
                {msg ? <p className="text-muted-foreground text-sm">{msg}</p> : null}
              </div>

              <div className="border-border bg-card shadow-2xl backdrop-blur-md rounded-3xl border p-6">
                <h2 className="text-foreground font-semibold">Invites ({invites.length})</h2>
                {invites.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No invites yet.</p>
                ) : (
                  invites.slice(0, 10).map((v, i) => (
                    <p key={i} className="text-muted-foreground text-sm">
                      {String(v.phone ?? v.code ?? JSON.stringify(v))} · {String(v.status ?? "")}
                    </p>
                  ))
                )}
              </div>
              <div className="border-border bg-card shadow-2xl backdrop-blur-md rounded-3xl border p-6">
                <h2 className="text-foreground font-semibold">Wallet history</h2>
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No transactions yet.</p>
                ) : (
                  history.slice(0, 10).map((h, i) => (
                    <p key={i} className="text-muted-foreground text-sm">
                      {String(h.label ?? h.type ?? "Entry")} · ₹{Number(h.amount ?? 0).toLocaleString("en-IN")}
                    </p>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

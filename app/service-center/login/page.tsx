"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { scApi } from "@/lib/service-center/api";

export default function ServiceCentreLogin() {
  const router = useRouter();
  const [email, setEmail] = React.useState("serviceadmin@hawkaero.com");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-semibold">Service Centre Login</h1>
        <p className="text-sm text-slate-500 mt-1">Authorized personnel only. Same Firebase project backend.</p>
        <input className="mt-6 w-full border rounded-lg px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="mt-3 w-full border rounded-lg px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
        <button disabled={busy} className="mt-5 w-full bg-indigo-600 text-white rounded-lg py-2.5 disabled:opacity-50"
          onClick={async () => { setBusy(true); setErr(""); try { await scApi.login(email, password); router.push("/service-center"); } catch (e: any) { setErr(e?.message || "Login failed"); } finally { setBusy(false); } }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

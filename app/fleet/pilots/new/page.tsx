"use client";

// FM onboard pilot — Super App AddPilotScreen + OTPVerificationScreen parity:
// full KYC form (availability + certifications + service types + mandatory
// docs checklist gating) → initiatePilotCreation → 6-digit OTP →
// completePilotCreation.

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { fleetApi } from "@/lib/booking/role-apis";
import { useFleetData } from "@/lib/fleet/data";

const CERTS = ["DGCA Certified", "Night Flying", "Mapping", "Spraying", "Surveillance", "First Aid"];
const SERVICES = ["monitoring", "videography", "seeding", "surveillance", "mapping", "spraying"];
const DOCS = ["Aadhar Front", "Aadhar Back", "Pilot License", "GST Document", "Training Certificate"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  background: "#fff",
  outline: "none",
};

export default function FleetAddPilot() {
  const router = useRouter();
  const { reload, showToast } = useFleetData();
  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [phone, setPhone] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    mobile: "",
    address: "",
    email: "",
    aadhar: "",
    license: "",
    pan: "",
    age: "",
    experience: "",
    start: "09:00",
    end: "18:00",
  });
  const [days, setDays] = React.useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [certs, setCerts] = React.useState<string[]>([]);
  const [services, setServices] = React.useState<string[]>([]);
  const [checkedDocs, setCheckedDocs] = React.useState<string[]>([]);

  function toggle(list: string[], v: string, set: (x: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  const allChecked = DOCS.every((d) => checkedDocs.includes(d));
  const valid =
    form.name.trim() &&
    form.mobile.replace(/\D/g, "").slice(-10).length === 10 &&
    form.address.trim() &&
    form.aadhar.trim() &&
    form.license.trim() &&
    Number(form.age) > 0 &&
    allChecked;

  async function initiate(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      await fleetApi.initiatePilotCreation({
        fullName: form.name.trim(),
        mobile: `+91${form.mobile.replace(/\D/g, "").slice(-10)}`,
        address: form.address.trim(),
        email: form.email.trim() || undefined,
        age: Number(form.age),
        aadhaarNumber: form.aadhar.trim(),
        panNumber: form.pan.trim() || undefined,
        license: form.license.trim(),
        experience: form.experience.trim() || undefined,
        certifications: certs,
        serviceTypes: services,
        availability: { start: form.start, end: form.end, days },
        documents: checkedDocs,
      });
      setPhone(`+91${form.mobile.replace(/\D/g, "").slice(-10)}`);
      setStep("otp");
      showToast("OTP sent to the pilot's number.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not initiate.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.replace(/\D/g, "").length !== 6 || busy) return;
    setBusy(true);
    try {
      await fleetApi.completePilotCreation({ phone, otp: otp.trim() });
      showToast("Pilot onboarded.");
      reload();
      router.push("/fleet/resources");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/fleet/resources">← Resources</Link>
      <div className="pageTitle mt-2">
        <div>
          <h1>Onboard New Pilot</h1>
          <p>{step === "form" ? "Full KYC registration" : "Verify the pilot's number"}</p>
        </div>
      </div>

      {step === "form" ? (
        <form onSubmit={initiate}>
          <div className="card mb-3">
            <div className="panelHead"><h2>Personal</h2></div>
            <div className="grid two">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name *" required />
              <input style={inputStyle} value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Mobile (10-digit) *" inputMode="numeric" required />
              <input style={inputStyle} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Address *" required />
              <input style={inputStyle} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" type="email" />
              <input style={inputStyle} value={form.aadhar} onChange={(e) => setForm((f) => ({ ...f, aadhar: e.target.value }))} placeholder="Aadhar number *" required />
              <input style={inputStyle} value={form.license} onChange={(e) => setForm((f) => ({ ...f, license: e.target.value }))} placeholder="DGCA license *" required />
              <input style={inputStyle} value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))} placeholder="PAN (optional)" />
              <input style={inputStyle} value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value.replace(/\D/g, "").slice(0, 3) }))} placeholder="Age *" inputMode="numeric" required />
              <input style={inputStyle} value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))} placeholder="Experience (e.g. 2 years)" />
            </div>
          </div>

          <div className="card mb-3">
            <div className="panelHead"><h2>Availability</h2></div>
            <div className="grid two">
              <label className="muted">Start <input style={inputStyle} type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></label>
              <label className="muted">End <input style={inputStyle} type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} /></label>
            </div>
            <div className="actions mt-2">
              {DAYS.map((d) => (
                <button key={d} type="button" className={"btn " + (days.includes(d) ? "primary" : "secondary")} onClick={() => toggle(days, d, setDays)}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="card mb-3">
            <div className="panelHead"><h2>Certifications</h2></div>
            <div className="actions">
              {CERTS.map((c) => (
                <button key={c} type="button" className={"btn " + (certs.includes(c) ? "primary" : "secondary")} onClick={() => toggle(certs, c, setCerts)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="card mb-3">
            <div className="panelHead"><h2>Service Types</h2></div>
            <div className="actions">
              {SERVICES.map((s) => (
                <button key={s} type="button" className={"btn " + (services.includes(s) ? "primary" : "secondary")} onClick={() => toggle(services, s, setServices)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card mb-3">
            <div className="panelHead"><h2>Mandatory Documents ({checkedDocs.length}/{DOCS.length})</h2></div>
            {DOCS.map((doc) => (
              <label key={doc} className="dRow" style={{ cursor: "pointer" }}>
                <span><b>{doc}</b></span>
                <input
                  type="checkbox"
                  checked={checkedDocs.includes(doc)}
                  onChange={() => toggle(checkedDocs, doc, setCheckedDocs)}
                />
              </label>
            ))}
            {!allChecked ? <p className="muted">All 5 documents are required to enable Add Pilot.</p> : null}
          </div>

          <button className="btn primary" type="submit" disabled={!valid || busy}>
            {busy ? "Sending OTP…" : "Add Pilot"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <div className="card mb-3">
            <div className="panelHead"><h2>Verify {phone}</h2></div>
            <input
              style={{ ...inputStyle, letterSpacing: 6, textAlign: "center", fontSize: 20 }}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
            />
            <div className="actions mt-2.5">
              <button className="btn primary" type="submit" disabled={otp.replace(/\D/g, "").length !== 6 || busy}>
                {busy ? "Verifying…" : "Verify & Complete"}
              </button>
              <button className="btn secondary" type="button" onClick={() => setStep("form")}>
                Back
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

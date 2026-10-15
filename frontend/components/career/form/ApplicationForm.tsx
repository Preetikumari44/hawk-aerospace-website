"use client";

import { type FormEvent,useRef, useState } from "react";

import { FileDrop } from "@/components/career/form/FileDrop";
import { FormField } from "@/components/career/form/FormField";
import { NoticeDialog } from "@/components/career/form/NoticeDialog";
import { type GroupKey, ProgressCard, type ProgressState } from "@/components/career/form/ProgressCard";
import { inputCls, labelCls } from "@/components/career/form/styles";
import { YesNo } from "@/components/career/form/YesNo";
import { buttonClasses } from "@/components/career/ui/Button";
import { submitApplication } from "@/lib/career/api";
import { cn } from "@/lib/career/cn";
import { CALENDLY_URL } from "@/lib/career/site";
import type { Notice } from "@/lib/career/types";
import { MESSAGES, validateApplication } from "@/lib/career/validation";

type Step = "step1" | "step2" | "step3" | "step4" | "step6" | "step6b" | "step7" | "ownDroneInfo" | "step8" | "step9" | "step5" | "step11" | "step10" | "submitStep";
const ELIGIBILITY: Step[] = ["step4", "step6", "step6b", "step7", "ownDroneInfo", "step8", "step9", "step5"];
const DOCUMENTS: Step[] = ["step11", "step10", "submitStep"];
const RADIOS = ["residency", "hasExperience", "ownDrone", "willingTravel", "visaInvestment", "hasLicense"];

const groupTitle = "mb-6 text-2xl font-bold tracking-tight";
const groupWrap = "mt-11 border-t border-[#d3dacb] pt-10";

export function ApplicationForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<Notice | null>(null);
  const [visible, setVisible] = useState<Record<Step, boolean>>({
    step1: true, step2: false, step3: false, step4: false, step6: false, step6b: false, step7: false,
    ownDroneInfo: false, step8: false, step9: false, step5: false, step11: false, step10: false, submitStep: false,
  });
  const [country, setCountry] = useState("+91");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ answered: 0, total: 10, done: { details: false, eligibility: false, documents: false }, active: "details" });

  // --- progressive reveal: same rules as the original page script -----------------------------
  const show = (...ids: Step[]) => setVisible((v) => { const n = { ...v }; ids.forEach((i) => (n[i] = true)); return n; });
  const set = (id: Step, on: boolean) => setVisible((v) => ({ ...v, [id]: on }));

  const refreshProgress = () => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const text = (n: string) => String(fd.get(n) ?? "").trim().length > 0;
    const radio = RADIOS.map((n) => fd.get(n) !== null);
    const cv = fd.get("cvFile");
    const hasCv = cv instanceof File && cv.name !== "";
    const flags = [text("fullName"), text("email"), text("phone"), ...radio, hasCv];
    const done: Record<GroupKey, boolean> = { details: flags.slice(0, 3).every(Boolean), eligibility: radio.every(Boolean), documents: hasCv };
    const active: GroupKey = !done.details ? "details" : !done.eligibility ? "eligibility" : "documents";
    setProgress({ answered: flags.filter(Boolean).length, total: flags.length, done, active });
  };

  const closeNotice = () => { const n = noticeRef.current; noticeRef.current = null; setNotice(null); n?.onClose?.(); };
  const notify = (n: Notice) => { noticeRef.current = n; setNotice(n); };
  const fail = (field: string, message: string) => {
    setInvalid(field);
    notify({ kind: "error", message, onClose: () => (document.getElementById(field) as HTMLElement | null)?.focus() });
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const err = validateApplication({ fullName: String(fd.get("fullName") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? "") });
    if (err) { fail(err.field, err.message); return; }

    setSubmitting(true);
    const result = await submitApplication(fd);
    setSubmitting(false);
    switch (result.status) {
      case "duplicate": notify({ kind: "warn", message: MESSAGES.duplicate }); break;
      case "ok": notify({ kind: "success", message: MESSAGES.success, okLabel: "Schedule interview", onClose: () => { window.location.href = CALENDLY_URL; } }); break;
      case "error": notify({ kind: "warn", message: MESSAGES.errorPrefix + result.message }); break;
      default: notify({ kind: "warn", message: MESSAGES.failed });
    }
  }

  const clearInvalid = (name: string) => { if (invalid === name) setInvalid(null); };
  const showEligibility = ELIGIBILITY.some((s) => visible[s]);
  const showDocuments = DOCUMENTS.some((s) => visible[s]);

  return (
    <div className="mx-auto mt-[-48px] grid w-[min(1180px,100%-36px)] items-start gap-7 pb-[clamp(72px,9vw,120px)] max-lg:mt-[-40px] sm:w-[min(1180px,100%-48px)] lg:grid-cols-[300px_minmax(0,1fr)] relative z-[2]">
      <ProgressCard progress={progress} />

      <form id="pilotForm" ref={formRef} action="/api/career/applications" method="POST" encType="multipart/form-data" onSubmit={onSubmit} onInput={refreshProgress} onChange={refreshProgress}
        className="rounded-[24px] border border-[#d3dacb] bg-[#fbfbf6] p-[clamp(26px,4.5vw,56px)] shadow-[0_24px_60px_-30px_rgba(11,36,24,.35)]">

        {/* ---------- Your details ---------- */}
        <section aria-labelledby="t-details">
          <h2 id="t-details" className={groupTitle}>Your details</h2>
          <div className="grid gap-x-5 sm:grid-cols-2">
            <FormField id="step1" visible={visible.step1}>
              <label htmlFor="fullName" className={labelCls}>Full Name </label>
              <input type="text" name="fullName" id="fullName" autoComplete="name" required className={inputCls} aria-invalid={invalid === "fullName" || undefined}
                onInput={() => { show("step2"); clearInvalid("fullName"); }} />
            </FormField>
            <FormField id="step2" visible={visible.step2}>
              <label htmlFor="email" className={labelCls}>Email </label>
              <input type="email" name="email" id="email" autoComplete="email" required className={inputCls} aria-invalid={invalid === "email" || undefined}
                onInput={() => { show("step3"); clearInvalid("email"); }} />
            </FormField>
            <FormField id="step3" visible={visible.step3} full>
              <label htmlFor="phone" className={labelCls}>Phone number </label>
              <div className="grid grid-cols-[minmax(150px,220px)_90px_minmax(0,1fr)] gap-3 max-sm:grid-cols-[1fr_84px]">
                <select id="countrySelect" name="country" aria-label="Country code" value={country} onChange={(e) => setCountry(e.target.value)}
                  className={cn(inputCls, "cursor-pointer appearance-none bg-no-repeat pr-11")}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2314201a' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 14px center", backgroundSize: "18px" }}>
                  <option value="+91">{"\u{1F1EE}\u{1F1F3}"} India (+91)</option>
                  <option value="+44">{"\u{1F1EC}\u{1F1E7}"} UK (+44)</option>
                  <option value="+1">{"\u{1F1FA}\u{1F1F8}"} USA (+1)</option>
                </select>
                <input type="text" id="phoneCode" name="phoneCode" readOnly aria-label="Dialling code" value={country} className={cn(inputCls, "text-center font-semibold")} />
                <input type="text" name="phone" id="phone" inputMode="tel" autoComplete="tel-national" placeholder="Enter phone number" required className={cn(inputCls, "max-sm:col-span-2")} aria-invalid={invalid === "phone" || undefined}
                  onInput={() => { show("step4"); clearInvalid("phone"); }} />
              </div>
            </FormField>
          </div>
        </section>

        {/* ---------- Eligibility and experience ---------- */}
        <section aria-labelledby="t-elig" hidden={!showEligibility} className={groupWrap}>
          <h2 id="t-elig" className={groupTitle}>Eligibility and experience</h2>
          <YesNo stepId="step4" name="residency" label="Are you currently living in the EU or UK? *" visible={visible.step4} onChange={() => show("step6")} />
          <YesNo stepId="step6" name="hasExperience" label="Do you have prior experience operating agricultural drones? *" visible={visible.step6}
            onChange={(v) => { if (v === "yes") show("step6b"); else set("step6b", false); show("step7"); }} />
          <FormField id="step6b" visible={visible.step6b}>
            <label htmlFor="experience" className={labelCls}>If yes, please specify the model(s).</label>
            <textarea name="experienceInfo" id="experience" placeholder="E.g., Model H-50, 50L tank, 300 acres per season" className={cn(inputCls, "min-h-[120px] resize-y")} />
          </FormField>
          <YesNo stepId="step7" name="ownDrone" label="Do you own an agricultural drone?" visible={visible.step7}
            onChange={(v) => { if (v === "yes") show("ownDroneInfo"); else set("ownDroneInfo", false); show("step8"); }} />
          <FormField id="ownDroneInfo" visible={visible.ownDroneInfo}>
            <label htmlFor="ownDroneInfoInput" className={labelCls}>Model &amp; Capacity *</label>
            <input type="text" name="ownDroneInfo" id="ownDroneInfoInput" placeholder="E.g., H120 — 50L" className={inputCls} />
          </FormField>
          <YesNo stepId="step8" name="willingTravel" label="Are you willing to travel across EU or UK countries for work?" visible={visible.step8} onChange={() => show("step9")} />
          <YesNo stepId="step9" name="visaInvestment" label="Do you invest between EURO 25000 to 35000 for EU or UK Self Sponsor visa?" visible={visible.step9} onChange={() => show("step5")} />
          <YesNo stepId="step5" name="hasLicense" label="Do you hold a valid drone pilot license? *" visible={visible.step5}
            onChange={(v) => { if (v === "yes") show("step11"); else set("step11", false); show("step10"); }} />
        </section>

        {/* ---------- Documents ---------- */}
        <section aria-labelledby="t-docs" hidden={!showDocuments} className={groupWrap}>
          <h2 id="t-docs" className={groupTitle}>Documents</h2>
          <FileDrop stepId="step11" name="licenseFile" label="Attach Drone License copy *" visible={visible.step11} onChange={(has) => { if (has) show("step10"); }} />
          <FileDrop stepId="step10" name="cvFile" label="Please attach your CV *" visible={visible.step10} required onChange={() => show("submitStep")} />
          <FormField id="submitStep" visible={visible.submitStep} className="mb-0">
            <button type="submit" id="submitBtn" disabled={submitting} className={buttonClasses("dark", "w-full min-h-[60px] text-[1.1rem] disabled:cursor-progress disabled:opacity-60")}>Submit Application</button>
          </FormField>
          {submitting && <div id="loadingSpinner" role="status" className="mt-[18px] text-center font-semibold text-[#0b2418]">&#9203; Submitting your application, please wait...</div>}
        </section>
      </form>

      <NoticeDialog notice={notice} onClose={closeNotice} />
    </div>
  );
}

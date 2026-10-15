"use client";

import {
  Briefcase,
  Building2,
  ChartColumn,
  Eye,
  Globe,
  IdCard,
  Layers,
  LoaderCircle,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  type ApplicationValues,
  BUSINESS_TYPES,
  DRONE_MODELS,
  INITIAL_VALUES,
  TURNOVER_OPTIONS,
} from "@/lib/distributor/application";
import { COUNTRIES } from "@/lib/distributor/countries";
import { submitApplication, type SubmitResult } from "@/lib/distributor/submit";
import { completedRequiredCount, FIELD_ORDER, type FieldKey, validateAll, validateField } from "@/lib/distributor/validation";

import { DroneModelCards } from "./drone-model-cards";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "./fields";
import { FileUpload } from "./file-upload";
import { FormProgress } from "./form-progress";
import { ModeBadge } from "./mode-badge";
import { PhoneField } from "./phone-field";
import { ReviewDialog } from "./review-dialog";
import { SubmitChecklist } from "./submit-checklist";
import { SubmitStatus } from "./submit-status";

export function ApplicationForm() {
  const [values, setValues] = React.useState<ApplicationValues>(INITIAL_VALUES);
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [attempted, setAttempted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<SubmitResult | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const submittingRef = React.useRef(false);
  const statusRef = React.useRef<HTMLDivElement>(null);

  const set = <K extends keyof ApplicationValues>(key: K, value: ApplicationValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setResult((r) => (r?.status === "success" ? r : null));
  };
  const touch = (key: FieldKey) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));

  const errorFor = (key: FieldKey) => (touched[key] || attempted ? validateField(key, values) : undefined);

  React.useEffect(() => {
    if (result) statusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [result]);

  const firstInvalid = (): boolean => {
    setAttempted(true);
    const errors = validateAll(values);
    const key = FIELD_ORDER.find((k) => errors[k]);
    if (!key) return false;
    const el = document.getElementById(key);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
    return true;
  };

  const doSubmit = async () => {
    if (submittingRef.current) return; // block duplicate submissions while a real request is in flight
    if (firstInvalid()) {
      setReviewOpen(false);
      return;
    }
    submittingRef.current = true;
    setReviewOpen(false);
    setResult(null);
    setSubmitting(true);
    try {
      setResult(await submitApplication(values));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSubmit();
  };

  const onReview = () => {
    if (!firstInvalid()) setReviewOpen(true);
  };

  const reset = () => {
    setValues(INITIAL_VALUES);
    setTouched({});
    setAttempted(false);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keep the selection in the original option order (H32X → H200) regardless of click order,
  // so the stored `models` string is always consistent.
  const toggleModel = (value: string) => {
    const next = values.models.includes(value) ? values.models.filter((m) => m !== value) : [...values.models, value];
    set(
      "models",
      DRONE_MODELS.map((m) => m.value).filter((v) => next.includes(v)),
    );
  };

  const completed = completedRequiredCount(values);
  const locked = submitting || result?.status === "success";

  if (result?.status === "success") {
    return (
      <div ref={statusRef} className="flex flex-col gap-5">
        <SubmitStatus result={result} />
        <Button type="button" variant="outline" className="h-12 self-start border-[#bcc8b3] bg-white px-6 text-[15px] text-[#14532d]" onClick={reset}>
          <RotateCcw aria-hidden />
          Start a new application
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={submitting} className="flex flex-col gap-7">
      <ModeBadge />
      <FormProgress completed={completed} />

      <FormSection icon={MapPin} title="Business location" description="Where your business operates.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="country" label="Country" icon={MapPin} required error={errorFor("country")}>
            <SelectInput
              id="country"
              name="country"
              autoComplete="country-name"
              required
              value={values.country}
              error={errorFor("country")}
              onChange={(e) => set("country", e.target.value)}
              onBlur={() => touch("country")}
            >
              <option value="">Select Country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="city" label="City / Region" icon={MapIcon} required error={errorFor("city")}>
            <TextInput
              id="city"
              name="city"
              autoComplete="address-level2"
              required
              value={values.city}
              error={errorFor("city")}
              onChange={(e) => set("city", e.target.value)}
              onBlur={() => touch("city")}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={ChartColumn} title="Drone models" description="Choose the models you would like to sell.">
        <DroneModelCards selected={values.models} onToggle={toggleModel} />
      </FormSection>

      <FormSection icon={Building2} title="Company information" description="About your company and the business it runs.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="companyName" label="Company Name" icon={Building2} required error={errorFor("companyName")}>
            <TextInput
              id="companyName"
              name="companyName"
              autoComplete="organization"
              required
              value={values.companyName}
              error={errorFor("companyName")}
              onChange={(e) => set("companyName", e.target.value)}
              onBlur={() => touch("companyName")}
            />
          </Field>
          <Field id="website" label="Website URL" icon={Globe} error={errorFor("website")}>
            <TextInput
              id="website"
              name="website"
              inputMode="url"
              autoComplete="url"
              placeholder="www.example.com"
              value={values.website}
              error={errorFor("website")}
              onChange={(e) => set("website", e.target.value)}
              onBlur={() => touch("website")}
            />
          </Field>
          <Field id="businessType" label="Business Type" icon={Briefcase}>
            <SelectInput id="businessType" name="businessType" value={values.businessType} onChange={(e) => set("businessType", e.target.value)}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="turnover" label="Average Annual Turnover" icon={ChartColumn}>
            <SelectInput id="turnover" name="turnover" value={values.turnover} onChange={(e) => set("turnover", e.target.value)}>
              {TURNOVER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </FormSection>

      <FormSection icon={User} title="Applicant information" description="Who we should get in touch with.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Your Name" icon={User} required error={errorFor("name")}>
            <TextInput
              id="name"
              name="name"
              autoComplete="name"
              required
              value={values.name}
              error={errorFor("name")}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => touch("name")}
            />
          </Field>
          <Field id="jobTitle" label="Job Title" icon={IdCard}>
            <TextInput id="jobTitle" name="jobTitle" autoComplete="organization-title" value={values.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
          </Field>
          <Field id="email" label="Business Email" icon={Mail} required error={errorFor("email")}>
            <TextInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              required
              value={values.email}
              error={errorFor("email")}
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => touch("email")}
            />
          </Field>
          <PhoneField
            callingCodeId={values.callingCodeId}
            phone={values.phone}
            error={errorFor("phone")}
            onCodeChange={(id) => set("callingCodeId", id)}
            onPhoneChange={(p) => set("phone", p)}
            onPhoneBlur={() => touch("phone")}
          />
        </div>
      </FormSection>

      <FormSection icon={MessageSquare} title="Additional information" description="Anything that helps us understand your business.">
        <Field id="brands" label="Does your company represent other drone brands?" icon={Layers}>
          <TextArea id="brands" name="brands" rows={3} placeholder="List the brands you currently represent, if any." value={values.brands} onChange={(e) => set("brands", e.target.value)} />
        </Field>
        <Field id="message" label="Message" icon={MessageSquare}>
          <TextArea id="message" name="message" rows={3} placeholder="Tell us about your market, your customers, or anything else we should know." value={values.message} onChange={(e) => set("message", e.target.value)} />
        </Field>
        <FileUpload
          file={values.file}
          error={errorFor("file")}
          onChange={(f) => {
            set("file", f);
            touch("file");
          }}
        />
      </FormSection>

      <SubmitChecklist values={values} />

      <div ref={statusRef} className="scroll-mt-24 empty:hidden" aria-live="polite">
        {result && <SubmitStatus result={result} />}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-[#5a695f]">
          <ShieldCheck className="size-4 shrink-0 text-[#1d6b3d]" aria-hidden />
          Submitting does not guarantee partnership approval.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={locked}
            onClick={onReview}
            className="h-12 border-[#9fb29a] bg-white px-6 text-[15px] font-semibold text-[#14532d] hover:border-[#14532d] hover:bg-[#eef4ea] hover:text-[#0f3d22] focus-visible:ring-2 focus-visible:ring-[#1d6b3d] focus-visible:ring-offset-2"
          >
            <Eye aria-hidden />
            Review Your Details
          </Button>
          <Button
            type="submit"
            disabled={locked}
            aria-busy={submitting}
            className="h-12 px-8 text-[15px] font-semibold shadow-md transition-transform hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#1d6b3d] focus-visible:ring-offset-2 active:translate-y-px"
          >
            {submitting ? <LoaderCircle className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            {submitting ? "Submitting…" : "Submit Application"}
          </Button>
        </div>
      </div>

      <ReviewDialog open={reviewOpen} values={values} busy={locked} onClose={() => setReviewOpen(false)} onSubmit={() => void doSubmit()} />
    </form>
  );
}

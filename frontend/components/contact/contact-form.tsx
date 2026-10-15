"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Send, WifiOff } from "lucide-react";
import * as React from "react";

import { submitContact, type SubmitFailureKind,toRequestBody } from "@/lib/contact/api";
import {
  COUNTRIES,
  DEFAULT_DIAL_KEY,
  DIAL_OPTIONS,
  DRONE_OPTIONS,
} from "@/lib/contact/contact-options";
import {
  type ContactFormValues,
  FIELD_ORDER,
  type FieldErrors,
  type FieldName,
  LIMITS,
  validateAll,
  validateField,
} from "@/lib/contact/validation";
import { cn } from "@/lib/utils";

const EMPTY: ContactFormValues = {
  name: "",
  email: "",
  dialKey: DEFAULT_DIAL_KEY,
  phone: "",
  company: "",
  country: "",
  drone: "",
  message: "",
};

type Banner = { kind: SubmitFailureKind; message: string } | null;

const controlBase =
  "w-full rounded-xl border border-input bg-white/80 px-4 text-[15px] text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/70 hover:border-primary/40 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60";
const controlInvalid =
  "border-destructive/70 bg-red-50/60 hover:border-destructive focus:border-destructive focus:ring-destructive/15";

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-[13px] font-medium text-destructive">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactForm() {
  const [values, setValues] = React.useState<ContactFormValues>(EMPTY);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [touched, setTouched] = React.useState<Partial<Record<FieldName, boolean>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [banner, setBanner] = React.useState<Banner>(null);
  const [success, setSuccess] = React.useState<{ message: string; referenceId?: string } | null>(
    null,
  );

  // Synchronous guard: `submitting` state updates asynchronously, so a fast
  // double-click could otherwise fire two requests.
  const inFlight = React.useRef(false);
  const honeypot = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (success) successRef.current?.focus();
  }, [success]);

  function setValue<K extends keyof ContactFormValues>(field: K, value: ContactFormValues[K]) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (banner) setBanner(null);
    // Re-validate live once a field has been touched (or already shows an error).
    if (touched[field as FieldName] || errors[field as FieldName]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field as FieldName, next) }));
    }
  }

  function onBlur(field: FieldName) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, values) }));
  }

  function focusField(field: FieldName) {
    const el = formRef.current?.elements.namedItem(field === "phone" ? "phone" : field);
    if (el instanceof HTMLElement) el.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const found = validateAll(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const allTouched: Partial<Record<FieldName, boolean>> = {};
      for (const f of FIELD_ORDER) allTouched[f] = true;
      setTouched(allTouched);
      setBanner({
        kind: "validation",
        message: "Please correct the highlighted fields and try again.",
      });
      const first = FIELD_ORDER.find((f) => found[f]);
      if (first) focusField(first);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setBanner(null);

    try {
      const result = await submitContact(toRequestBody(values, honeypot.current?.value ?? ""));
      if (result.ok) {
        // Success is shown only after the API has confirmed (HTTP 201 + success:true).
        setSuccess({ message: result.message, referenceId: result.referenceId });
        setValues(EMPTY);
        setErrors({});
        setTouched({});
        return;
      }

      // Failure: keep everything the visitor typed.
      if (result.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...result.fieldErrors }));
        const first = FIELD_ORDER.find((f) => result.fieldErrors?.[f]);
        // The fieldset is still disabled until this handler finishes; focus afterwards.
        if (first) requestAnimationFrame(() => focusField(first));
      }
      setBanner({ kind: result.kind, message: result.message });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const err = (f: FieldName) => errors[f];
  const aria = (f: FieldName) => ({
    "aria-invalid": err(f) ? (true as const) : undefined,
    "aria-describedby": err(f) ? `${f}-error` : undefined,
  });

  if (success) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 px-2 py-12 text-center focus:outline-hidden sm:py-16"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
          <CircleCheck className="size-8" aria-hidden="true" />
        </span>
        <h3 className="text-2xl font-semibold tracking-tight text-foreground">Message received</h3>
        <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {success.message} Our team will get back to you shortly.
        </p>
        {success.referenceId && (
          <p className="rounded-full border border-border bg-white/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Reference: <span className="font-mono text-foreground">{success.referenceId}</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="mt-2 rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-hidden"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={submitting} className="flex flex-col gap-6">
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input ref={honeypot} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset disabled={submitting} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
        <legend className="sr-only">Contact form</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="name" label="Name" required error={err("name")}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your Name..."
              maxLength={LIMITS.name + 50}
              value={values.name}
              onChange={(e) => setValue("name", e.target.value)}
              onBlur={() => onBlur("name")}
              className={cn(controlBase, "h-12", err("name") && controlInvalid)}
              {...aria("name")}
            />
          </Field>
          <Field id="email" label="Email" required error={err("email")}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Business Email..."
              value={values.email}
              onChange={(e) => setValue("email", e.target.value)}
              onBlur={() => onBlur("email")}
              className={cn(controlBase, "h-12", err("email") && controlInvalid)}
              {...aria("email")}
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="phone" label="Phone / WhatsApp" required error={err("phone")}>
            <div className="flex gap-2">
              <select
                id="countryCode"
                name="countryCode"
                aria-label="Country dialling code"
                value={values.dialKey}
                onChange={(e) => setValue("dialKey", e.target.value)}
                className={cn(controlBase, "h-12 w-[7.75rem] shrink-0 cursor-pointer truncate px-3")}
              >
                {DIAL_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.code} {o.label}
                  </option>
                ))}
              </select>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="Enter phone number"
                value={values.phone}
                onChange={(e) => setValue("phone", e.target.value)}
                onBlur={() => onBlur("phone")}
                className={cn(controlBase, "h-12 min-w-0 flex-1", err("phone") && controlInvalid)}
                {...aria("phone")}
              />
            </div>
          </Field>
          <Field id="company" label="Company" error={err("company")}>
            <input
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="Company Name..."
              value={values.company}
              onChange={(e) => setValue("company", e.target.value)}
              onBlur={() => onBlur("company")}
              className={cn(controlBase, "h-12", err("company") && controlInvalid)}
              {...aria("company")}
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="country" label="Country" required error={err("country")}>
            <select
              id="country"
              name="country"
              autoComplete="country-name"
              value={values.country}
              onChange={(e) => setValue("country", e.target.value)}
              onBlur={() => onBlur("country")}
              className={cn(controlBase, "h-12 cursor-pointer", !values.country && "text-muted-foreground/80", err("country") && controlInvalid)}
              {...aria("country")}
            >
              <option value="">Select Country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field id="drone" label="Are You Using a Drone?" required error={err("drone")}>
            <select
              id="drone"
              name="drone"
              value={values.drone}
              onChange={(e) => setValue("drone", e.target.value)}
              onBlur={() => onBlur("drone")}
              className={cn(controlBase, "h-12 cursor-pointer", !values.drone && "text-muted-foreground/80", err("drone") && controlInvalid)}
              {...aria("drone")}
            >
              <option value="">Select</option>
              {DRONE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field id="message" label="Message" error={err("message")}>
          <textarea
            id="message"
            name="message"
            rows={5}
            placeholder="Leave your message here..."
            value={values.message}
            onChange={(e) => setValue("message", e.target.value)}
            onBlur={() => onBlur("message")}
            className={cn(controlBase, "min-h-32 resize-y py-3 leading-relaxed", err("message") && controlInvalid)}
            {...aria("message")}
          />
          <p className="text-right text-xs text-muted-foreground" aria-hidden="true">
            {values.message.length}/{LIMITS.message}
          </p>
        </Field>
      </fieldset>

      {banner && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
            banner.kind === "validation"
              ? "border-amber-300/70 bg-amber-50 text-amber-900"
              : "border-destructive/30 bg-red-50 text-red-900",
          )}
        >
          {banner.kind === "network" || banner.kind === "timeout" ? (
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive" aria-hidden="true">*</span> Required fields. We only use
          your details to respond to your enquiry.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="group inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl bg-linear-to-b from-[#1d6b3d] to-[#14532d] px-8 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(20,83,45,0.7)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-8px_rgba(20,83,45,0.8)] focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-hidden active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Sending&hellip;
            </>
          ) : (
            <>
              Submit
              <Send className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

"use client";

import { ArrowLeft, Send, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { type ApplicationValues, callingCodeFor, formatBytes } from "@/lib/distributor/application";

interface Props {
  open: boolean;
  values: ApplicationValues;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

/** Read-only summary opened by "Review Your Details". Uses the native <dialog> (focus trap + Esc built in). */
export function ReviewDialog({ open, values, busy, onClose, onSubmit }: Props) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const code = callingCodeFor(values.callingCodeId).code;
  const rows: [string, string][] = [
    ["Country", values.country],
    ["City / Region", values.city.trim()],
    ["Drone models", values.models.length ? values.models.join(", ") : "None selected"],
    ["Company name", values.companyName.trim()],
    ["Website URL", values.website.trim() || "Not provided"],
    ["Business type", values.businessType],
    ["Average annual turnover", values.turnover],
    ["Your name", values.name.trim()],
    ["Job title", values.jobTitle.trim() || "Not provided"],
    ["Business email", values.email.trim()],
    ["Phone / WhatsApp", `${code} ${values.phone.trim()}`],
    ["Other drone brands represented", values.brands.trim() || "Not provided"],
    ["Message", values.message.trim() || "Not provided"],
    ["Business proposal / company profile", values.file ? `${values.file.name} (${formatBytes(values.file.size)})` : "No file attached"],
  ];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="review-title"
      className="m-auto w-[min(92vw,640px)] max-h-[88vh] rounded-2xl border border-[#cfd8c7] bg-white p-0 text-[#17211b] shadow-2xl backdrop:bg-[#0b2418]/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[88vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-[#e1e7da] px-6 py-5">
          <div>
            <h2 id="review-title" className="text-lg font-semibold text-[#0f2a1c]">
              Review your details
            </h2>
            <p className="mt-0.5 text-sm text-[#5a695f]">Check everything below. This is a read-only summary.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close review" className="-mt-1 -mr-2 size-9 text-[#45544b] hover:bg-[#eef2e9]">
            <X aria-hidden />
          </Button>
        </div>
        <dl className="grid flex-1 gap-0 overflow-y-auto px-6 py-2">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-0.5 border-b border-[#eef1e9] py-3 last:border-b-0 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt className="text-sm text-[#5a695f]">{label}</dt>
              <dd className="text-sm font-medium break-words whitespace-pre-wrap text-[#17211b]">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col-reverse gap-3 border-t border-[#e1e7da] bg-[#f7f9f3] px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-12 border-[#bcc8b3] bg-white px-6 text-[15px] text-[#14532d]" onClick={onClose}>
            <ArrowLeft aria-hidden />
            Edit details
          </Button>
          <Button type="button" className="h-12 px-7 text-[15px]" disabled={busy} onClick={onSubmit}>
            <Send aria-hidden />
            Submit Application
          </Button>
        </div>
      </div>
    </dialog>
  );
}

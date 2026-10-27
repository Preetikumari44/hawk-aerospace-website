"use client";

import { ChevronDown, Phone } from "lucide-react";

import { callingCodeFor } from "@/lib/distributor/application";
import { CALLING_CODES } from "@/lib/distributor/countries";
import { cn } from "@/lib/utils";

import { controlClass, describedBy, FieldError } from "./fields";

interface Props {
  callingCodeId: string;
  phone: string;
  error?: string;
  onCodeChange: (id: string) => void;
  onPhoneChange: (value: string) => void;
  onPhoneBlur: () => void;
}

/**
 * Original fields: `countryCode` (select, default +91 India) and `phone` (text, required).
 * The select is a real native <select> (full list, type-to-jump, native mobile picker) laid invisibly over a
 * compact "+91" display so the number input keeps enough room even in a two-column layout.
 */
export function PhoneField({ callingCodeId, phone, error, onCodeChange, onPhoneChange, onPhoneBlur }: Props) {
  const current = callingCodeFor(callingCodeId);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold text-[#263442]">
        <Phone className="size-4 text-[#1d3f5c]" aria-hidden />
        <span>
          Phone / WhatsApp
          <span aria-hidden className="ml-0.5 text-[#a52a1f]">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </span>
      </label>
      <div className="flex gap-2">
        <div
          className={cn(
            controlClass(error),
            "relative flex h-11 w-[5.75rem] shrink-0 items-center justify-between gap-1 px-3 has-[select:focus-visible]:border-[#1d3f5c] has-[select:focus-visible]:ring-4 has-[select:focus-visible]:ring-[#1d3f5c]/20",
          )}
        >
          <span className="text-[15px] font-medium tabular-nums" aria-hidden>
            {current.code}
          </span>
          <ChevronDown className="size-4 text-[#52606e]" aria-hidden />
          <select
            name="countryCode"
            aria-label="Country calling code"
            value={callingCodeId}
            onChange={(e) => onCodeChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {CALLING_CODES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.name}
              </option>
            ))}
          </select>
        </div>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Enter your number"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          onBlur={onPhoneBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy("phone", { hint: "Country code: " + current.name, error })}
          className={cn(controlClass(error), "h-11 min-w-0 flex-1")}
        />
      </div>
      {error ? (
        <FieldError id="phone-error" message={error} />
      ) : (
        <p id="phone-hint" className="text-xs text-[#5a695f]">
          Calling code: {current.code} ({current.name}). Tap the code to change it.
        </p>
      )}
    </div>
  );
}

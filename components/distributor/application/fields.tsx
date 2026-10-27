"use client";

import { ChevronDown, CircleAlert, type LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-lg border bg-white px-3.5 text-[15px] text-[#263442] shadow-xs transition-[border-color,box-shadow] placeholder:text-[#7b887f] hover:border-[#8fa089] focus-visible:border-[#1d3f5c] focus-visible:ring-4 focus-visible:ring-[#1d3f5c]/20 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:bg-[#f1f3ec]";

export const controlClass = (error?: string) =>
  cn(controlBase, error ? "border-[#a52a1f] bg-[#fff8f7] focus-visible:border-[#a52a1f] focus-visible:ring-[#a52a1f]/20" : "border-[#a9bccb]");

interface FieldProps {
  id: string;
  label: string;
  icon?: LucideIcon;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint + inline error. The control must set aria-describedby via `describedBy()`. */
export function Field({ id, label, icon: Icon, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-[#263442]">
        {Icon && <Icon className="size-4 text-[#1d3f5c]" aria-hidden />}
        <span>
          {label}
          {required && (
            <>
              <span aria-hidden className="ml-0.5 text-[#a52a1f]">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </span>
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-[#5a695f]">
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-[13px] font-medium text-[#a52a1f]">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function describedBy(id: string, { hint, error }: { hint?: string; error?: string }) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type InputProps = React.ComponentProps<"input"> & { id: string; error?: string; hint?: string };

export function TextInput({ id, error, hint, className, ...props }: InputProps) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, { hint, error })}
      className={cn(controlClass(error), "h-11", className)}
      {...props}
    />
  );
}

type SelectProps = React.ComponentProps<"select"> & { id: string; error?: string; hint?: string };

export function SelectInput({ id, error, hint, className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { hint, error })}
        className={cn(controlClass(error), "h-11 cursor-pointer appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#52606e]"
        aria-hidden
      />
    </div>
  );
}

type AreaProps = React.ComponentProps<"textarea"> & { id: string; error?: string; hint?: string };

export function TextArea({ id, error, hint, className, ...props }: AreaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, { hint, error })}
      className={cn(controlClass(error), "min-h-[96px] resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#e1e7da] pt-7 first:border-t-0 first:pt-0" aria-labelledby={`sec-${title.replace(/\W+/g, "-").toLowerCase()}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e3ecf4] text-[#244e70]">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div>
          <h3 id={`sec-${title.replace(/\W+/g, "-").toLowerCase()}`} className="text-base leading-tight font-semibold text-[#1b2a38]">
            {title}
          </h3>
          {description && <p className="mt-0.5 text-sm text-[#5a695f]">{description}</p>}
        </div>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

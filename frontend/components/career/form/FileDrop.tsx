"use client";

import { useState } from "react";

import { FormField } from "@/components/career/form/FormField";
import { labelCls } from "@/components/career/form/styles";
import { CheckCircleIcon, UploadIcon } from "@/components/career/ui/icons";
import { cn } from "@/lib/career/cn";

function formatSize(bytes: number) {
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
}

/** Drag-and-drop / browse upload panel built on the original native file input (same name, id, accept). */
export function FileDrop({ stepId, name, label, visible, required, onChange }: { stepId: string; name: string; label: string; visible: boolean; required?: boolean; onChange?: (hasFile: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  return (
    <FormField id={stepId} visible={visible}>
      <label htmlFor={name} className={labelCls}>{label}</label>
      <div className={cn("relative block rounded-[10px] border-2 border-dashed px-6 py-[30px] text-center transition-colors max-sm:px-4 max-sm:py-6 focus-within:border-[#1d6b3d] focus-within:ring-4 focus-within:ring-[#1d6b3d]/20",
        file ? "border-solid border-[#1d6b3d] bg-[#eef5ec]" : over ? "border-[#1d6b3d] bg-[#eef5ec]" : "border-[#b4c1b0] bg-[#f7f9f5] hover:border-[#1d6b3d] hover:bg-[#eef5ec]")}>
        <input id={name} name={name} type="file" accept=".pdf,image/*" required={required} className="absolute inset-0 size-full cursor-pointer opacity-0"
          onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); onChange?.(!!f); }}
          onDragEnter={() => setOver(true)} onDragOver={() => setOver(true)} onDragLeave={() => setOver(false)} onDrop={() => setOver(false)} />
        <div aria-hidden="true" className="pointer-events-none grid justify-items-center gap-1.5">
          <UploadIcon className="mb-1 size-[34px] text-[#1d6b3d]" />
          <strong className="text-base text-[#17211b]">Drag a file here, or browse</strong>
          <span className="text-sm text-[#5a6860]">PDF or image</span>
        </div>
        <div aria-live="polite" className="pointer-events-none">
          {file && (
            <p className="mt-2 flex items-center justify-center gap-2.5 break-all font-semibold text-[#0b2418]">
              <CheckCircleIcon className="size-5 shrink-0 text-[#1d6b3d]" />
              <span>{file.name} <small className="font-medium text-[#5a6860]">({formatSize(file.size)})</small></span>
            </p>
          )}
        </div>
      </div>
    </FormField>
  );
}

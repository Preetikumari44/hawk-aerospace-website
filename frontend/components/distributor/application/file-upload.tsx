"use client";

import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { FILE_RULES, formatBytes } from "@/lib/distributor/application";
import { cn } from "@/lib/utils";

import { FieldError } from "./fields";

interface Props {
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
}

/** Drag-and-drop + browse upload for the original `file` field ("Upload Business Proposal / Company Profile"). */
export function FileUpload({ file, error, onChange }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const pick = (list: FileList | null) => {
    const next = list?.[0] ?? null;
    if (next) onChange(next);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="file" className="flex items-center gap-2 text-sm font-semibold text-[#17211b]">
        <Upload className="size-4 text-[#1d6b3d]" aria-hidden />
        Upload Business Proposal / Company Profile
      </label>

      <input
        ref={inputRef}
        id="file"
        name="file"
        type="file"
        className="sr-only"
        accept={FILE_RULES.extensions.map((e) => `.${e}`).join(",")}
        onChange={(e) => pick(e.target.files)}
        aria-describedby={error ? "file-error" : "file-hint"}
        aria-invalid={error ? true : undefined}
      />

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
            dragging ? "border-[#14532d] bg-[#e7f1e3]" : "border-[#b4c1ab] bg-[#f7f9f3] hover:border-[#6f9a7e]",
            error && "border-[#a52a1f] bg-[#fff8f7]",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-[#e3ede0] text-[#14532d]">
            <Upload className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-[#17211b]">Drag and drop your file here</p>
            <p className="text-sm text-[#5a695f]">or</p>
          </div>
          <Button type="button" variant="outline" className="h-10 border-[#bcc8b3] bg-white px-5 text-[#14532d]" onClick={() => inputRef.current?.click()}>
            <Paperclip aria-hidden />
            Choose file
          </Button>
        </div>
      ) : (
        <div className={cn("flex items-center gap-3 rounded-xl border bg-[#f1f7ee] p-3.5", error ? "border-[#a52a1f] bg-[#fff8f7]" : "border-[#9dbca6]")}>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#14532d] text-white">
            <FileText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0f2a1c]" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-[#5a695f]">{formatBytes(file.size)}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 border-[#bcc8b3] bg-white px-3 text-[13px] text-[#14532d]" onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-9 text-[#a52a1f] hover:bg-[#fbe9e6] hover:text-[#a52a1f]" onClick={clear} aria-label={`Remove ${file.name}`}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      )}

      {error ? (
        <FieldError id="file-error" message={error} />
      ) : (
        <p id="file-hint" className="text-xs text-[#5a695f]">
          {FILE_RULES.typeLabel}. Maximum {FILE_RULES.maxLabel}. Optional.
        </p>
      )}
    </div>
  );
}

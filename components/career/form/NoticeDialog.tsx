"use client";

import { useEffect, useRef } from "react";

import { AlertCircleIcon, CheckCircleIcon, WarnIcon } from "@/components/career/ui/icons";
import { cn } from "@/lib/career/cn";
import type { Notice } from "@/lib/career/types";

/** Modal that replaces the browser alert() of the original page; shows the same messages. */
export function NoticeDialog({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (notice && !d.open) { d.showModal(); okRef.current?.focus(); }
    if (!notice && d.open) d.close();
  }, [notice]);

  const tone = notice?.kind ?? "warn";
  const Icon = tone === "success" ? CheckCircleIcon : tone === "error" ? AlertCircleIcon : WarnIcon;
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="notice-msg" data-kind={tone}
      className="m-auto w-[min(440px,calc(100%-32px))] rounded-[24px] border-0 bg-[#ffffff] p-0 text-[#263442] shadow-[0_40px_90px_rgba(7,25,15,.5)] backdrop:bg-[#07190f]/60 backdrop:backdrop-blur-[3px]">
      <div className="grid justify-items-start gap-[18px] px-[30px] pb-7 pt-8">
        <div className={cn("grid size-12 place-items-center rounded-full", tone === "error" ? "bg-[#f7dedb] text-[#b3382f]" : tone === "warn" ? "bg-[#f8ecc9] text-[#8a6200]" : "bg-[#eaf1f7] text-[#1d3f5c]")}>
          <Icon className="size-[26px]" />
        </div>
        <p id="notice-msg" role="alert" className="text-[1.1rem] font-medium leading-normal">{notice?.message}</p>
        <button ref={okRef} type="button" onClick={() => ref.current?.close()}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-[#17324a] px-7 font-semibold text-white transition-colors hover:bg-[#2d6288]">
          {notice?.okLabel ?? "OK"}
        </button>
      </div>
    </dialog>
  );
}

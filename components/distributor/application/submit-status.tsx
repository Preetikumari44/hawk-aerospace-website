import { CircleAlert, CircleCheck } from "lucide-react";

import type { SubmitResult } from "@/lib/distributor/submit";

/** Honest outcome banner: success only when the backend confirmed the saved application. */
export function SubmitStatus({ result }: { result: SubmitResult }) {
  if (result.status === "error") {
    return (
      <div role="alert" className="flex gap-3 rounded-xl border border-[#e0a8a1] bg-[#fdeeed] p-4 text-[#6b1a12]">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold">Your application could not be submitted.</p>
          <p className="mt-1">{result.message} Your details are still here, so you can try again.</p>
          {result.fieldProblems && result.fieldProblems.length > 1 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {result.fieldProblems.map((p) => (
                <li key={`${p.field}-${p.message}`}>{p.message}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }
  return (
    <div role="status" className="flex gap-3 rounded-xl border border-[#9dbca6] bg-[#eaf4e8] p-4 text-[#0f3d22]">
      <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="text-sm">
        <p className="font-semibold">Application submitted.</p>
        <p className="mt-1">{result.message}</p>
      </div>
    </div>
  );
}

import { FormField } from "@/components/career/form/FormField";
import { labelCls } from "@/components/career/form/styles";

/** Yes/No radio pair (values "yes" / "no", exactly as the original). */
export function YesNo({ stepId, name, label, visible, onChange }: { stepId: string; name: string; label: string; visible: boolean; onChange?: (value: string) => void }) {
  return (
    <FormField id={stepId} visible={visible}>
      <div role="group" aria-labelledby={`l-${stepId}`}>
        <span id={`l-${stepId}`} className={labelCls}>{label}</span>
        <div className="flex flex-wrap gap-3">
          {(["yes", "no"] as const).map((v) => (
            <label key={v} className="relative max-sm:flex-[1_1_calc(50%-6px)]">
              <input type="radio" name={name} value={v} onChange={() => onChange?.(v)} className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0" />
              <span className="inline-flex min-h-[52px] min-w-[120px] items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-[#cdd6c9] bg-[#f7f9f5] px-[26px] font-semibold text-[#3f4d43] transition-colors before:size-[18px] before:rounded-full before:border-2 before:border-[#9aa89a] before:transition-colors hover:border-[#1d6b3d] peer-checked:border-[#0b2418] peer-checked:bg-[#0b2418] peer-checked:text-white peer-checked:before:border-[#a6d7b4] peer-checked:before:bg-[#a6d7b4] peer-checked:before:shadow-[inset_0_0_0_3px_#0b2418] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[#7fbf95] max-sm:w-full">
                {v === "yes" ? "Yes" : "No"}
              </span>
            </label>
          ))}
        </div>
      </div>
    </FormField>
  );
}

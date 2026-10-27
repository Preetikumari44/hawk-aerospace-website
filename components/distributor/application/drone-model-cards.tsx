"use client";

import { Check, Drone } from "lucide-react";

import { DRONE_MODELS } from "@/lib/distributor/application";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[];
  onToggle: (value: string) => void;
}

/**
 * The four original drone options. Each card is a real <input type="checkbox"> (keyboard + screen-reader
 * friendly) with a custom visual state. Values are the original strings, e.g. "H32X (10L)".
 */
export function DroneModelCards({ selected, onToggle }: Props) {
  return (
    <fieldset>
      <legend className="flex items-center gap-2 text-sm font-semibold text-[#263442]">
        <Drone className="size-4 text-[#1d3f5c]" aria-hidden />
        Drone Models You Want to Sell
      </legend>
      <p id="models-hint" className="mt-1 text-xs text-[#5a695f]">
        Select every model you are interested in. Optional.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DRONE_MODELS.map((model) => {
          const checked = selected.includes(model.value);
          return (
            <label key={model.value} className="group relative block cursor-pointer">
              <input
                type="checkbox"
                name="models[]"
                value={model.value}
                checked={checked}
                onChange={() => onToggle(model.value)}
                aria-describedby="models-hint"
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-full flex-col gap-3 rounded-xl border-2 bg-white p-4 transition-all duration-200",
                  "group-hover:border-[#6b8fae] group-hover:shadow-md peer-focus-visible:ring-4 peer-focus-visible:ring-[#1d3f5c]/30",
                  "peer-active:scale-[0.985]",
                  checked ? "border-[#244e70] bg-[#eef4f9] shadow-md" : "border-[#dce5ec]",
                )}
              >
                <span className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-colors",
                      checked ? "bg-[#244e70] text-white" : "bg-[#e3ecf4] text-[#244e70]",
                    )}
                  >
                    <Drone className="size-5" aria-hidden />
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                      checked ? "border-[#244e70] bg-[#244e70] text-white" : "border-[#a9bccb] bg-white text-transparent",
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                </span>
                <span>
                  <span className="block text-lg leading-tight font-bold tracking-tight text-[#1b2a38]">
                    {model.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#52606e]">
                    Capacity <span className="font-semibold text-[#244e70]">{model.capacity}</span>
                  </span>
                </span>
              </span>
              <span className="sr-only">{checked ? "Selected" : "Not selected"}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

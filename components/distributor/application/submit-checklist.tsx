import { Circle, CircleCheck, ClipboardCheck } from "lucide-react";

import type { ApplicationValues } from "@/lib/distributor/application";
import { validateField } from "@/lib/distributor/validation";
import { cn } from "@/lib/utils";

/** Supplementary reminder only — it never replaces or blocks any original field. */
export function SubmitChecklist({ values }: { values: ApplicationValues }) {
  const companyDone = !!values.companyName.trim() && !!values.country && !!values.city.trim() && !validateField("website", values);
  const contactDone = !validateField("name", values) && !validateField("email", values) && !validateField("phone", values);
  const items = [
    {
      label: "Company details",
      detail: "Company name, country, city and website are correct.",
      done: companyDone,
    },
    {
      label: "Contact information",
      detail: "Your name, business email and phone / WhatsApp number work.",
      done: contactDone,
    },
    {
      label: "Selected drone models",
      detail: values.models.length ? `${values.models.length} selected.` : "Choose the models you want to sell, if any.",
      done: values.models.length > 0,
    },
    {
      label: "Business proposal / company profile",
      detail: values.file ? "File attached." : "Attach it now if you have one.",
      done: !!values.file && !validateField("file", values),
    },
  ];

  return (
    <aside aria-labelledby="before-submit" className="rounded-xl border border-[#dce5ec] bg-[#f8fafc] p-4 sm:p-5">
      <h3 id="before-submit" className="flex items-center gap-2 text-sm font-semibold text-[#1b2a38]">
        <ClipboardCheck className="size-4 text-[#1d3f5c]" aria-hidden />
        Before You Submit
      </h3>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            {item.done ? (
              <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-[#1d3f5c]" aria-hidden />
            ) : (
              <Circle className="mt-0.5 size-[18px] shrink-0 text-[#8a9bab]" aria-hidden />
            )}
            <div>
              <p className="text-sm leading-tight font-medium text-[#263442]">
                {item.label}
                <span className="sr-only">{item.done ? " — done" : " — not yet"}</span>
              </p>
              <p className={cn("text-xs", item.done ? "text-[#52606e]" : "text-[#5a695f]")}>{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

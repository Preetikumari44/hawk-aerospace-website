import { useId } from "react";

import type { FlagCode } from "@/lib/career/types";

const label: Record<FlagCode, string> = {
  ee: "Flag of Estonia", fr: "Flag of France", de: "Flag of Germany", ie: "Flag of Ireland",
  nl: "Flag of the Netherlands", es: "Flag of Spain", gb: "Flag of the United Kingdom", in: "Flag of India",
};

/** Inline SVG flags (same artwork as the original page's flag symbols). */
export function FlagIcon({ code, className }: { code: FlagCode; className?: string }) {
  const clipId = `gb-clip-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 640 480" className={className} role="img" aria-label={label[code]}>
      {code === "ee" && (<><rect width="640" height="160" fill="#4891D9" /><rect y="160" width="640" height="160" fill="#000" /><rect y="320" width="640" height="160" fill="#FFF" /></>)}
      {code === "fr" && (<><rect width="213" height="480" fill="#002395" /><rect x="213" width="213" height="480" fill="#FFF" /><rect x="426" width="214" height="480" fill="#ED2939" /></>)}
      {code === "de" && (<><rect width="640" height="160" fill="#000" /><rect y="160" width="640" height="160" fill="#DD0000" /><rect y="320" width="640" height="160" fill="#FFCE00" /></>)}
      {code === "ie" && (<><rect width="213" height="480" fill="#169B62" /><rect x="213" width="213" height="480" fill="#FFF" /><rect x="426" width="214" height="480" fill="#FF883E" /></>)}
      {code === "nl" && (<><rect width="640" height="160" fill="#AE1C28" /><rect y="160" width="640" height="160" fill="#FFF" /><rect y="320" width="640" height="160" fill="#21468B" /></>)}
      {code === "es" && (<><rect width="640" height="120" fill="#AA151B" /><rect y="120" width="640" height="240" fill="#F1BF00" /><rect y="360" width="640" height="120" fill="#AA151B" /></>)}
      {code === "in" && (
        <>
          <rect width="640" height="160" fill="#FF9933" />
          <rect y="160" width="640" height="160" fill="#FFF" />
          <rect y="320" width="640" height="160" fill="#138808" />
          <g transform="translate(320 240)" stroke="#000080" fill="none">
            <circle r="60" strokeWidth="8" />
            <circle r="9" fill="#000080" stroke="none" />
            {Array.from({ length: 24 }, (_, i) => (
              <line key={i} x1="0" y1="-9" x2="0" y2="-60" strokeWidth="4" transform={`rotate(${i * 15})`} />
            ))}
          </g>
        </>
      )}
      {code === "gb" && (
        <>
          <clipPath id={clipId}><path d="M0 0h640v480H0z" /></clipPath>
          <g clipPath={`url(#${clipId})`}>
            <path fill="#012169" d="M0 0h640v480H0z" />
            <path stroke="#FFF" strokeWidth="60" d="M0 0l640 480m0-480L0 480" />
            <path stroke="#C8102E" strokeWidth="40" d="M0 0l640 480m0-480L0 480" />
            <path stroke="#FFF" strokeWidth="100" d="M320 0v480M0 240h640" />
            <path stroke="#C8102E" strokeWidth="60" d="M320 0v480M0 240h640" />
          </g>
        </>
      )}
    </svg>
  );
}

import { Sparkles } from "lucide-react"

import type { PropertyHighlight } from "@/lib/skymap/types"

export function PropertyHighlights({
  highlights,
  visibleHighlightIds,
}: {
  highlights: PropertyHighlight[]
  visibleHighlightIds?: string[]
}) {
  const visibleHighlights = visibleHighlightIds
    ? highlights.filter((highlight) => visibleHighlightIds.includes(highlight.title))
    : highlights

  if (!visibleHighlights.length) return null
  return (
    <div className="glass rounded-3xl p-6">
      <p className="eyebrow">Property highlights</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {visibleHighlights.map((h) => (
          <div key={h.title} className="flex gap-3 rounded-2xl border border-border p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-medium">{h.title}</p>
              {h.description && <p className="mt-1 text-sm text-muted-foreground">{h.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

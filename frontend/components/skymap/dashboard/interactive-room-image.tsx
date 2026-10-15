"use client"

import Image from "next/image"
import { useState } from "react"

import type { RoomInteractiveElement } from "@/lib/skymap/types"

export function InteractiveRoomImage({
  image,
  alt,
  elements,
}: {
  image: string
  alt: string
  elements?: RoomInteractiveElement[]
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = elements?.find((e) => e.id === activeId) || null

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl">
      <Image src={image} alt={alt} fill className="object-cover" sizes="600px" />

      {elements?.map((el) => {
        const isActive = el.id === activeId
        return (
          <button
            key={el.id}
            onClick={() => setActiveId(isActive ? null : el.id)}
            style={{ left: `${el.xPercent}%`, top: `${el.yPercent}%` }}
            className={`absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 transition-all duration-200 ${
              isActive
                ? "scale-125 border-primary bg-primary shadow-[0_0_0_6px_rgba(79,70,229,0.25)]"
                : "border-white/70 bg-background/70 hover:scale-110 hover:border-primary"
            }`}
            aria-label={el.label}
          >
            <span className={`size-2 rounded-full ${isActive ? "bg-white" : "bg-primary"}`} />
          </button>
        )
      })}

      {active && (
        <div
          className="glass absolute z-10 w-56 -translate-x-1/2 animate-in fade-in zoom-in-95 rounded-xl p-3 text-sm duration-150"
          style={{
            left: `${active.xPercent}%`,
            top: `${Math.max(active.yPercent - 16, 4)}%`,
          }}
        >
          <p className="font-medium">{active.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{active.detail}</p>
        </div>
      )}

      {elements && elements.length > 0 && !active && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          Tap a marker to explore
        </div>
      )}
    </div>
  )
}

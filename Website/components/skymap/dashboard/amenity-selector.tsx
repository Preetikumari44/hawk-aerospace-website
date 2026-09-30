"use client"

import {
  Car, ChevronDown, ChevronUp, Dumbbell, Flame, Home, ShieldCheck,
  Sparkles, Waves, Wifi, Wind, Zap,
} from "lucide-react"
import { useState } from "react"

const ICON_MAP: [string, typeof Car][] = [
  ["parking", Car],
  ["pool", Waves],
  ["gym", Dumbbell],
  ["security", ShieldCheck],
  ["wifi", Wifi],
  ["ev charging", Zap],
  ["elevator", Home],
  ["theatre", Flame],
  ["fire", Flame],
  ["ac", Wind],
  ["air", Wind],
]

function iconFor(name: string) {
  const lower = name.toLowerCase()
  const match = ICON_MAP.find(([key]) => lower.includes(key))
  return match ? match[1] : Sparkles
}

const INITIAL_COUNT = 4

export function AmenitySelector({ amenities }: { amenities: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!amenities.length) return null

  const visible = expanded ? amenities : amenities.slice(0, INITIAL_COUNT)
  const hasMore = amenities.length > INITIAL_COUNT

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {visible.map((amenity) => {
          const Icon = iconFor(amenity)
          return (
            <div key={amenity} className="flex items-center gap-2.5 rounded-xl border border-border p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="text-sm">{amenity}</span>
            </div>
          )
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {expanded ? <>Show less <ChevronUp className="size-3.5" /></> : <>View all {amenities.length} amenities <ChevronDown className="size-3.5" /></>}
        </button>
      )}
    </div>
  )
}

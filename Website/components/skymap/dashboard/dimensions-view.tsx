"use client"

import { Ruler, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { Button } from "@/components/skymap/ui/button"
import type { RoomDimensions } from "@/lib/skymap/types"

const EDGE_POSITION: Record<RoomDimensions["dimensionLabels"][number]["edge"], string> = {
  top: "left-1/2 top-3 -translate-x-1/2",
  bottom: "bottom-3 left-1/2 -translate-x-1/2",
  left: "left-3 top-1/2 -translate-y-1/2",
  right: "right-3 top-1/2 -translate-y-1/2",
  center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
}

// Popovers are anchored just past their matching label so the detail appears
// directly next to the wall/edge the user selected, not in an unrelated panel.
const POPOVER_POSITION: Record<RoomDimensions["dimensionLabels"][number]["edge"], string> = {
  top: "left-1/2 top-14 -translate-x-1/2",
  bottom: "bottom-14 left-1/2 -translate-x-1/2",
  left: "left-14 top-1/2 -translate-y-1/2",
  right: "right-14 top-1/2 -translate-y-1/2",
  center: "left-1/2 top-[58%] -translate-x-1/2",
}

type Unit = "ft" | "m"

function ftToM(ft: number) {
  return Math.round(ft * 0.3048 * 100) / 100
}

function formatFt(ft: number) {
  return `${ft}'-0"`
}

function displayValue(ft: number, unit: Unit) {
  return unit === "ft" ? formatFt(ft) : `${ftToM(ft)} m`
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  )
}

export function DimensionsView({ room }: { room: RoomDimensions }) {
  const [showOverlay, setShowOverlay] = useState(true)
  const [unit, setUnit] = useState<Unit>("ft")
  const [activeLabel, setActiveLabel] = useState<RoomDimensions["dimensionLabels"][number] | null>(null)

  const doorCount = 1
  const windowCount = room.name.toLowerCase().includes("terrace") || room.name.toLowerCase().includes("balcony") ? 0 : 2
  const measurementCount = room.dimensionLabels.length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Click a measurement to see its exact value.</p>
        <div className="glass flex rounded-lg p-1 text-xs">
          <button
            onClick={() => setUnit("ft")}
            className={`rounded-md px-2.5 py-1 transition ${unit === "ft" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Feet
          </button>
          <button
            onClick={() => setUnit("m")}
            className={`rounded-md px-2.5 py-1 transition ${unit === "m" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Meters
          </button>
        </div>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card sm:aspect-video">
        <Image src={room.floorPlanImage} alt={`${room.name} floor plan`} fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-background/25" />

        {showOverlay && (
          <div className="absolute inset-0 hidden sm:block">
            {room.dimensionLabels.map((label) => {
              const isActive = activeLabel?.edge === label.edge && activeLabel?.text === label.text
              return (
                <button
                  key={`${label.edge}-${label.text}`}
                  onClick={() => setActiveLabel(isActive ? null : label)}
                  className={`absolute rounded-md border px-2.5 py-1 text-xs font-medium tracking-tight transition-all duration-200 ${
                    isActive
                      ? "scale-110 border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_rgba(79,70,229,0.25)]"
                      : "border-border bg-background/90 text-foreground hover:border-primary hover:text-primary"
                  } ${EDGE_POSITION[label.edge]}`}
                >
                  {label.text}
                </button>
              )
            })}
            <span className="absolute bottom-3 right-3 rounded-md border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              {room.areaSqFt.toLocaleString()} sq ft
            </span>
          </div>
        )}

        <div className="glass absolute left-4 top-4 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Floor plan</p>
          <p className="font-medium">{room.name}</p>
        </div>

        <div className="absolute right-4 top-4">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowOverlay((v) => !v)}
            aria-label={showOverlay ? "Hide dimension overlay" : "Show dimension overlay"}
          >
            <Ruler />
          </Button>
        </div>

        {activeLabel && (
          <div className={`glass absolute z-10 flex w-56 animate-in fade-in zoom-in-95 flex-col gap-2 rounded-xl p-4 duration-150 ${POPOVER_POSITION[activeLabel.edge]}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{activeLabel.measurementType || "Measurement"}</p>
                <p className="mt-1 text-lg font-medium">{activeLabel.text}</p>
              </div>
              <button onClick={() => setActiveLabel(null)} aria-label="Close measurement detail">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs capitalize text-muted-foreground">{activeLabel.edge} edge · wall-to-wall</p>
          </div>
        )}
      </div>

      {/* On small screens, labels are shown as a stacked, tappable list instead of overlaying the image. */}
      <div className="glass grid grid-cols-2 gap-3 rounded-2xl p-4 text-sm sm:hidden">
        {room.dimensionLabels.map((label) => (
          <button key={`${label.edge}-${label.text}`} onClick={() => setActiveLabel(label)} className="text-left">
            <p className="text-xs capitalize text-muted-foreground">{label.measurementType || `${label.edge} edge`}</p>
            <p className="font-medium">{label.text}</p>
          </button>
        ))}
        <div>
          <p className="text-xs text-muted-foreground">Area</p>
          <p className="font-medium">{room.areaSqFt.toLocaleString()} sq ft</p>
        </div>
      </div>

      <div className="glass grid grid-cols-2 gap-4 rounded-2xl p-5 sm:grid-cols-4">
        <Metric label="Width" value={displayValue(room.widthFt, unit)} />
        <Metric label="Length" value={displayValue(room.lengthFt, unit)} />
        <Metric label="Ceiling height" value={room.ceilingHeightFt > 0 ? displayValue(room.ceilingHeightFt, unit) : "Open air"} />
        <Metric label="Total area" value={`${room.areaSqFt.toLocaleString()} sq ft`} />
      </div>

      <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Measurements available</p>
        <ul className="flex flex-col gap-1">
          <li>{measurementCount} wall measurement{measurementCount !== 1 ? "s" : ""}</li>
          <li>{doorCount} door measurement</li>
          <li>{windowCount} window measurements</li>
        </ul>
      </div>
    </div>
  )
}

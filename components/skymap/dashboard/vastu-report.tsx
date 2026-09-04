"use client"

import { AlertTriangle, Check, Info } from "lucide-react"

import type { VastuReportData, VastuStatus } from "@/lib/skymap/types"

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
const DIRECTION_ANGLE: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
}

const STATUS_COLOR: Record<VastuStatus, string> = {
  ideal: "var(--color-primary, #4f7cff)",
  acceptable: "#e0a72b",
  not_recommended: "var(--color-destructive, #ef5d68)",
}
const STATUS_LABEL: Record<VastuStatus, string> = {
  ideal: "Ideal",
  acceptable: "Acceptable",
  not_recommended: "Not recommended",
}
const STATUS_BADGE_CLASS: Record<VastuStatus, string> = {
  ideal: "bg-primary/15 text-primary",
  acceptable: "bg-amber-500/15 text-amber-500",
  not_recommended: "bg-destructive/15 text-destructive",
}

function CompassDiagram({ rooms, entranceDirection }: { rooms: VastuReportData["rooms"]; entranceDirection: string }) {
  const size = 320
  const c = size / 2
  const r = size / 2 - 28

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-sm">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border)" strokeWidth="1" />
      <circle cx={c} cy={c} r={r * 0.6} fill="none" stroke="var(--border)" strokeWidth="1" />
      {/* Direction spokes + labels */}
      {DIRECTIONS.map((d) => {
        const angle = THREE_deg(DIRECTION_ANGLE[d])
        const x2 = c + r * Math.sin(angle)
        const y2 = c - r * Math.cos(angle)
        const lx = c + (r + 16) * Math.sin(angle)
        const ly = c - (r + 16) * Math.cos(angle)
        return (
          <g key={d}>
            <line x1={c} y1={c} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="1" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[11px]">{d}</text>
          </g>
        )
      })}
      {/* Entrance marker */}
      {(() => {
        const angle = THREE_deg(DIRECTION_ANGLE[entranceDirection] ?? 0)
        const x = c + (r + 16) * Math.sin(angle)
        const y = c - (r + 16) * Math.cos(angle)
        return <circle cx={x} cy={y} r="5" fill="var(--color-primary, #4f7cff)" />
      })()}
      {/* Room markers around the ring, evenly spaced for readability */}
      {rooms.map((room, i) => {
        const angle = THREE_deg(DIRECTION_ANGLE[normalizeDirection(room.currentDirection)] ?? (i * 45))
        const radius = r * 0.6
        const x = c + radius * Math.sin(angle)
        const y = c - radius * Math.cos(angle)
        return (
          <g key={room.name}>
            <circle cx={x} cy={y} r="9" fill={STATUS_COLOR[room.status]} opacity={0.9} />
          </g>
        )
      })}
      <circle cx={c} cy={c} r="3" fill="var(--foreground)" />
    </svg>
  )
}

function THREE_deg(deg: number) {
  return (deg * Math.PI) / 180
}
function normalizeDirection(dir: string) {
  const found = DIRECTIONS.find((d) => dir.toUpperCase().startsWith(d))
  return found || "N"
}

function ScoreRadial({ score }: { score: number }) {
  return (
    <div className="grid aspect-square place-items-center rounded-full border-[14px] border-primary/20 bg-card">
      <div className="text-center">
        <strong className="text-6xl">{score}</strong>
        <p className="text-sm text-muted-foreground">Vastu score</p>
      </div>
    </div>
  )
}

function ElementBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} /></div>
    </div>
  )
}

export function VastuReport({ data }: { data: VastuReportData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[.55fr_1.45fr]">
        <div className="glass flex flex-col items-center gap-6 rounded-3xl p-6">
          <ScoreRadial score={data.overallScore} />
          <CompassDiagram rooms={data.rooms} entranceDirection={data.entranceDirection} />
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR.ideal }} /> Ideal</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR.acceptable }} /> Acceptable</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR.not_recommended }} /> Not recommended</span>
          </div>
        </div>

        <div className="glass flex flex-col gap-4 rounded-3xl p-6">
          <p className="eyebrow">Room-by-room breakdown</p>
          <div className="flex flex-col divide-y divide-border">
            {data.rooms.map((room) => (
              <div key={room.name} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-md">
                  <p className="font-medium">{room.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Currently facing <strong className="text-foreground">{room.currentDirection}</strong> · ideal: {room.idealDirections.join(", ")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{room.note}</p>
                </div>
                <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${STATUS_BADGE_CLASS[room.status]}`}>
                  {room.status === "ideal" ? <Check className="size-3.5" /> : room.status === "not_recommended" ? <AlertTriangle className="size-3.5" /> : <Info className="size-3.5" />}
                  {STATUS_LABEL[room.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <p className="eyebrow">Suggested remedies</p>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {data.remedies.map((remedy) => (
              <li key={remedy} className="flex gap-2.5 leading-relaxed text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {remedy}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">
            Based on traditional Vastu Shastra guidance — offered as general reference, not a substitute for a consultation.
          </p>
        </div>

        <div className="glass rounded-3xl p-6">
          <p className="eyebrow">Five-element balance</p>
          <div className="mt-4 flex flex-col gap-4">
            <ElementBar label="Earth (Prithvi)" value={data.elementBalance.earth} />
            <ElementBar label="Water (Jal)" value={data.elementBalance.water} />
            <ElementBar label="Fire (Agni)" value={data.elementBalance.fire} />
            <ElementBar label="Air (Vayu)" value={data.elementBalance.air} />
            <ElementBar label="Space (Akash)" value={data.elementBalance.space} />
          </div>
        </div>
      </div>
    </div>
  )
}

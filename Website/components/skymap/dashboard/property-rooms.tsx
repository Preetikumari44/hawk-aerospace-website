"use client"

import { DoorOpen, Link2, Move3d, PanelsTopLeft, Ruler } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { InteractiveRoomImage } from "@/components/skymap/dashboard/interactive-room-image"
import { Button } from "@/components/skymap/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/skymap/ui/dialog"
import type { PropertyRoom } from "@/lib/skymap/types"

function RoomOverviewCard({ room, onOpen }: { room: PropertyRoom; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="glass group flex flex-col overflow-hidden rounded-2xl text-left transition hover:ring-1 hover:ring-primary/40">
      <div className="relative aspect-[4/3]">
        <Image src={room.image} alt={room.name} fill className="object-cover transition duration-300 group-hover:scale-105" sizes="(min-width:1024px) 25vw, 50vw" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-medium">{room.name}</p>
        <p className="text-xs text-muted-foreground">{room.type}</p>
      </div>
    </button>
  )
}

function RoomDetailDialog({
  room,
  open,
  onOpenChange,
  onOpenTour,
  onOpenDimensions,
}: {
  room: PropertyRoom | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenTour: (roomName: string) => void
  onOpenDimensions: (roomName: string) => void
}) {
  if (!room) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{room.name}</DialogTitle>
        </DialogHeader>
        <InteractiveRoomImage image={room.image} alt={room.name} elements={room.interactiveElements} />
        {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {room.doors !== undefined && <span className="flex items-center gap-1.5"><DoorOpen className="size-4" /> {room.doors} door{room.doors !== 1 ? "s" : ""}</span>}
          {room.windows !== undefined && <span className="flex items-center gap-1.5"><PanelsTopLeft className="size-4" /> {room.windows} window{room.windows !== 1 ? "s" : ""}</span>}
          {room.connectedRooms && room.connectedRooms.length > 0 && (
            <span className="flex items-center gap-1.5"><Link2 className="size-4" /> Connects to {room.connectedRooms.join(", ")}</span>
          )}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Full measurements are available in the Dimensions section.</p>
        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={() => { onOpenTour(room.name); onOpenChange(false) }}>
            <Move3d data-icon="inline-start" /> Open in 360° Tour
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => { onOpenDimensions(room.name); onOpenChange(false) }}>
            <Ruler data-icon="inline-start" /> View dimensions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PropertyRooms({
  rooms,
  onOpenTour,
  onOpenDimensions,
  visibleRoomIds,
}: {
  rooms: PropertyRoom[]
  onOpenTour: (roomName: string) => void
  onOpenDimensions: (roomName: string) => void
  visibleRoomIds?: string[]
}) {
  const [selected, setSelected] = useState<PropertyRoom | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const visibleRooms = visibleRoomIds ? rooms.filter((room) => visibleRoomIds.includes(room.id)) : rooms

  if (!visibleRooms.length) return null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">Rooms</p>
        <span className="text-xs text-muted-foreground">{visibleRooms.length} spaces mapped</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visibleRooms.map((room) => (
          <RoomOverviewCard key={room.id} room={room} onOpen={() => { setSelected(room); setDialogOpen(true) }} />
        ))}
      </div>
      <RoomDetailDialog
        room={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onOpenTour={onOpenTour}
        onOpenDimensions={onOpenDimensions}
      />
    </div>
  )
}

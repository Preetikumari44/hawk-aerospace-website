"use client"

import { Bookmark, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button, buttonVariants } from "@/components/skymap/ui/button"
import type { ProcessingStatus,Property } from "@/lib/skymap/types"

function StatusPill({ status }: { status: ProcessingStatus }) {
  const styles: Record<ProcessingStatus, string> = {
    ready: "bg-primary/15 text-primary",
    processing: "bg-accent text-muted-foreground",
    not_started: "bg-muted text-muted-foreground",
  }
  const text: Record<ProcessingStatus, string> = {
    ready: "Tour ready",
    processing: "Tour processing",
    not_started: "Tour not started",
  }
  return <span className={`rounded-full px-2.5 py-1 text-xs ${styles[status]}`}>{text[status]}</span>
}

export function PropertyCard({ property, onToggleSave }: { property: Property; onToggleSave?: (id: string) => void }) {
  return (
    <div className="glass flex flex-col overflow-hidden rounded-3xl">
      <div className="relative aspect-video">
        <Image src={property.coverImage} alt={property.name} fill className="object-cover" sizes="(min-width:1024px) 33vw, 100vw" />
        {onToggleSave && (
          <button
            onClick={() => onToggleSave(property.id)}
            aria-label={property.saved ? "Remove from saved" : "Save property"}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-background/80 backdrop-blur"
          >
            <Bookmark className={`size-4 ${property.saved ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="font-medium">{property.name}</p>
          <p className="text-sm text-muted-foreground">{property.location} · {property.sizeSqft.toLocaleString()} sq ft</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={property.tourStatus} />
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Link href={`/platforms/skymap/dashboard/property/${property.id}`} className={buttonVariants({ className: "flex-1" })}>
            View property
          </Link>
          {onToggleSave && (
            <Button variant="outline" onClick={() => onToggleSave(property.id)}>
              <Bookmark data-icon="inline-start" className={property.saved ? "fill-primary text-primary" : ""} />
              {property.saved ? "Remove saved" : "Save"}
            </Button>
          )}
          <Link href={`/platforms/skymap/dashboard/property/${property.id}/share`} aria-label="Share property" className={buttonVariants({ variant: "outline", size: "icon" })}>
            <Share2 />
          </Link>
        </div>
      </div>
    </div>
  )
}

"use client"

import { Bookmark } from "lucide-react"
import useSWR from "swr"

import { PropertyCard } from "@/components/skymap/dashboard/property-card"
import { fetcher, unsaveProperty } from "@/lib/skymap/api"
import type { Property } from "@/lib/skymap/types"

export default function SavedPropertiesPage() {
  const { data: properties, error, isLoading, mutate } = useSWR<Property[]>(
    "/api/user/properties/saved",
    fetcher
  )

  async function onToggleSave(id: string) {
    mutate(properties?.filter((p) => p.id !== id), false)
    try {
      await unsaveProperty(id)
    } finally {
      mutate()
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Saved properties</h1>
        <p className="mt-2 text-muted-foreground">Properties you&apos;ve shortlisted for a closer look.</p>
      </div>

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1].map((i) => <div key={i} className="glass h-80 animate-pulse rounded-3xl" />)}
        </div>
      )}

      {error && !isLoading && (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <p className="font-medium">Couldn&apos;t load your saved properties</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            The backend endpoint for <code className="rounded bg-accent px-1.5 py-0.5">/api/user/properties/saved</code> isn&apos;t connected yet.
          </p>
        </div>
      )}

      {!isLoading && !error && properties?.length === 0 && (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent">
            <Bookmark className="size-5 text-muted-foreground" />
          </span>
          <p className="font-medium">Nothing saved yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tap the bookmark icon on any property to shortlist it here.
          </p>
        </div>
      )}

      {!isLoading && !error && properties && properties.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} onToggleSave={onToggleSave} />
          ))}
        </div>
      )}
    </div>
  )
}

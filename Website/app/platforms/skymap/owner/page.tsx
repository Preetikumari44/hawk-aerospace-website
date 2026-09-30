"use client"

import { Share2, SlidersHorizontal } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"

import { buttonVariants } from "@/components/skymap/ui/button"
import { fetcher } from "@/lib/skymap/api"
import type { Property } from "@/lib/skymap/types"
import { countTotalFields, countVisibleFields } from "@/lib/skymap/visibility"

export default function OwnerPropertiesPage() {
  const { data: properties, error, isLoading } = useSWR<Property[]>("/api/skymap/owner/properties", fetcher)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Listed properties</h1>
          <p className="mt-2 text-muted-foreground">Manage every property you have listed for buyer presentations.</p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-6 xl:grid-cols-2">
          {[0, 1, 2].map((i) => <div key={i} className="glass h-64 animate-pulse rounded-3xl" />)}
        </div>
      )}

      {error && !isLoading && (
        <div className="glass rounded-3xl p-8 text-sm text-muted-foreground">
          Could not load your listed properties.
        </div>
      )}

      {!isLoading && !error && properties && (
        <div className="grid gap-6 xl:grid-cols-2">
          {properties.map((property) => {
            const visible = countVisibleFields(property.defaultVisibility)
            const total = countTotalFields(property)
            return (
              <article key={property.id} className="glass grid overflow-hidden rounded-3xl sm:grid-cols-[220px_minmax(0,1fr)]">
                <div className="relative min-h-56 sm:min-h-full">
                  <Image src={property.coverImage} alt={property.name} fill className="object-cover" sizes="(min-width:1280px) 220px, 100vw" />
                </div>
                <div className="flex min-w-0 flex-col gap-5 p-5">
                  <div className="min-w-0">
                    <p className="eyebrow">Seller listing</p>
                    <h2 className="mt-2 truncate text-xl font-semibold">{property.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{property.location} · {property.sizeSqft.toLocaleString()} sq ft</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Visibility</p>
                      <p className="mt-1 font-medium">{visible} / {total}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Tour</p>
                      <p className="mt-1 font-medium capitalize">{property.tourStatus.replace("_", " ")}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Vastu</p>
                      <p className="mt-1 font-medium capitalize">{property.vastuStatus.replace("_", " ")}</p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={`/platforms/skymap/owner/properties/${property.id}/visibility`} className={buttonVariants()}>
                      <SlidersHorizontal data-icon="inline-start" /> Manage visibility
                    </Link>
                    <Link href={`/platforms/skymap/owner/properties/${property.id}/share`} className={buttonVariants({ variant: "outline" })}>
                      <Share2 data-icon="inline-start" /> Share
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

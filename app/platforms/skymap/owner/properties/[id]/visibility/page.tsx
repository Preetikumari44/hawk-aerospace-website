"use client"

import { ArrowLeft, Check, Loader2, Move3d, Save } from "lucide-react"
import Link from "next/link"
import { use, useEffect, useState } from "react"
import useSWR from "swr"

import { FieldVisibilityPicker } from "@/components/skymap/dashboard/field-visibility-picker"
import { Button } from "@/components/skymap/ui/button"
import { fetcher, updateOwnerPropertyVisibility } from "@/lib/skymap/api"
import type { Property, PropertyFieldVisibility } from "@/lib/skymap/types"
import { cloneVisibility } from "@/lib/skymap/visibility"

export default function OwnerPropertyVisibilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: property, isLoading: propertyLoading } = useSWR<Property>(`/api/property/${id}`, fetcher)
  const { data: visibility, error, isLoading, mutate } = useSWR<PropertyFieldVisibility>(
    `/api/owner/properties/${id}/visibility`,
    fetcher
  )
  const [draft, setDraft] = useState<PropertyFieldVisibility | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding a local edit draft from freshly-fetched server data.
    if (visibility) setDraft(cloneVisibility(visibility))
  }, [visibility])

  async function save() {
    if (!draft) return
    setSaving(true)
    setSaved(false)
    try {
      const next = await updateOwnerPropertyVisibility(id, draft)
      setDraft(cloneVisibility(next))
      mutate(next, false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-svh px-5 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/platforms/skymap/owner" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Back
            </Link>
            <p className="eyebrow">Owner visibility</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{property?.name || "Loading..."}</h1>
            {property && <p className="mt-2 text-muted-foreground">{property.location} · {property.sizeSqft.toLocaleString()} sq ft</p>}
          </div>
          <Link href="/platforms/skymap" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Move3d className="size-4" />
            </span>
            SkyMap
          </Link>
        </div>

        {(isLoading || propertyLoading) && <div className="glass h-96 animate-pulse rounded-3xl" />}

        {error && !isLoading && (
          <div className="glass rounded-3xl p-8 text-sm text-muted-foreground">
            Could not load visibility settings for this property.
          </div>
        )}

        {property && draft && (
          <>
            <FieldVisibilityPicker property={property} value={draft} onChange={setDraft} />
            <div className="sticky bottom-4 flex justify-end">
              <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
                {saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : saved ? <Check data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                {saving ? "Saving..." : saved ? "Saved" : "Save visibility"}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

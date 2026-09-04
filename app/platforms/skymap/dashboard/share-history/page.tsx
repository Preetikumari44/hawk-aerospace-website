"use client"

import { Ban, RotateCcw, Search } from "lucide-react"
import { useMemo, useState } from "react"
import useSWR from "swr"

import { Input } from "@/components/skymap/ui/input"
import { fetcher, revokeShare } from "@/lib/skymap/api"
import type { Property, PropertyShare } from "@/lib/skymap/types"
import { countTotalFields, countVisibleFields } from "@/lib/skymap/visibility"

export default function ShareHistoryPage() {
  const { data: shares, error, isLoading, mutate } = useSWR<PropertyShare[]>("/api/share-history", fetcher)
  const { data: properties } = useSWR<Property[]>("/api/user/properties", fetcher)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all")
  const propertyById = useMemo(() => new Map((properties || []).map((property) => [property.id, property])), [properties])

  const filtered = useMemo(() => {
    if (!shares) return []
    return shares.filter((s) => {
      const matchesQuery = !query || [s.propertyName, s.recipientName, s.recipientEmail, s.recipientPhone || ""].some((f) => f.toLowerCase().includes(query.toLowerCase()))
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [shares, query, statusFilter])

  async function toggleRevoke(id: string) {
    mutate(shares?.map((s) => (s.id === id ? { ...s, status: s.status === "active" ? "revoked" : "active" } : s)), false)
    try {
      await revokeShare(id)
    } finally {
      mutate()
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Share history</h1>
        <p className="mt-2 text-muted-foreground">Every property link you&apos;ve shared, who it went to, and what they can see.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search property or client…" className="pl-9" />
        </div>
        <div className="glass flex w-fit rounded-lg p-1 text-xs">
          {(["all", "active", "revoked"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 capitalize transition ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="glass h-64 animate-pulse rounded-3xl" />}
      {error && !isLoading && (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl p-12 text-center">
          <p className="font-medium">Couldn&apos;t load share history</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            The backend endpoint for <code className="rounded bg-accent px-1.5 py-0.5">/api/share-history</code> isn&apos;t connected yet.
          </p>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl p-12 text-center">
          <p className="font-medium">No shares found</p>
          <p className="text-sm text-muted-foreground">Share a property from My Properties to see it here.</p>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Property</th>
                <th className="px-5 py-3 font-medium">Recipient</th>
                <th className="px-5 py-3 font-medium">Visible fields</th>
                <th className="px-5 py-3 font-medium">Sent</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((share) => {
                const visibleCount = countVisibleFields(share.visibility)
                const totalCount = propertyById.get(share.propertyId)
                  ? countTotalFields(propertyById.get(share.propertyId)!)
                  : visibleCount
                return (
                  <tr key={share.id}>
                    <td className="px-5 py-4 font-medium">{share.propertyName}</td>
                    <td className="px-5 py-4">
                      <p>{share.recipientName}</p>
                      <p className="text-xs text-muted-foreground">{share.recipientEmail}</p>
                      {share.recipientPhone && <p className="text-xs text-muted-foreground">{share.recipientPhone}</p>}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {visibleCount} of {totalCount} fields visible
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{new Date(share.sentAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${share.status === "active" ? "bg-primary/15 text-primary" : "bg-accent text-muted-foreground"}`}>
                        {share.status === "active" ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => toggleRevoke(share.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {share.status === "active" ? <><Ban className="size-3.5" /> Revoke</> : <><RotateCcw className="size-3.5" /> Reactivate</>}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

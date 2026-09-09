"use client"

import { ArrowLeft, Check, Copy, Loader2, Plus, Send, Share2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import useSWR from "swr"

import { FieldVisibilityPicker } from "@/components/skymap/dashboard/field-visibility-picker"
import { Button } from "@/components/skymap/ui/button"
import { Input } from "@/components/skymap/ui/input"
import { createPropertyShare, fetcher } from "@/lib/skymap/api"
import { canNativeShare, copyShareLink, openNativeShare, openWhatsAppShare } from "@/lib/skymap/share-actions"
import type { Property, PropertyFieldVisibility, PropertyShare } from "@/lib/skymap/types"
import { cloneVisibility } from "@/lib/skymap/visibility"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function defaultMessage(property: Property) {
  return `Hi, I'm sharing the complete virtual presentation of ${property.name}. You can explore the property through the walkthrough, room dimensions, and selected property details.`
}

interface Recipient {
  id: string
  name: string
  phone: string
  email: string
  visibility: PropertyFieldVisibility
}

export function SharePropertyPage({ propertyId, backHref }: { propertyId: string; backHref: string }) {
  const { data: property, error, isLoading } = useSWR<Property>(`/api/skymap/property/${propertyId}`, fetcher)
  const { data: defaultVisibility } = useSWR<PropertyFieldVisibility>(
    `/api/skymap/owner/properties/${propertyId}/visibility`,
    fetcher
  )
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [createdShares, setCreatedShares] = useState<PropertyShare[]>([])

  const active = recipients.find((recipient) => recipient.id === activeId) || null
  const nativeShareAvailable = useMemo(() => canNativeShare(), [])

  function addRecipient() {
    if (!property || !defaultVisibility || !name.trim() || !phone.trim() || !EMAIL_RE.test(email.trim())) return
    const recipient: Recipient = {
      id: `${email}-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      visibility: cloneVisibility(defaultVisibility),
    }
    setRecipients((prev) => [...prev, recipient])
    setActiveId(recipient.id)
    if (!message) setMessage(defaultMessage(property))
    setName("")
    setPhone("")
    setEmail("")
  }

  function removeRecipient(id: string) {
    setRecipients((prev) => prev.filter((recipient) => recipient.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function updateActiveVisibility(visibility: PropertyFieldVisibility) {
    if (!active) return
    setRecipients((prev) => prev.map((recipient) => (
      recipient.id === active.id ? { ...recipient, visibility } : recipient
    )))
  }

  function applyToAll() {
    if (!active) return
    setRecipients((prev) => prev.map((recipient) => ({
      ...recipient,
      visibility: cloneVisibility(active.visibility),
    })))
  }

  async function send() {
    if (!property || recipients.length === 0) return
    setSending(true)
    try {
      const results = await Promise.all(recipients.map((recipient) =>
        createPropertyShare(property.id, {
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          recipientPhone: recipient.phone,
          visibility: recipient.visibility,
          message: message || defaultMessage(property),
          sharingMethod: "email",
        })
      ))
      setCreatedShares(results)
    } finally {
      setSending(false)
    }
  }

  async function copyLink(share: PropertyShare, url: string) {
    await copyShareLink(url)
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  if (isLoading) return <div className="glass h-96 animate-pulse rounded-3xl" />
  if (error || !property) return <div className="glass rounded-3xl p-8 text-sm text-muted-foreground">Could not load this property.</div>

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <Link href={backHref} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <p className="eyebrow">Share property</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{property.name}</h1>
        <p className="mt-2 text-muted-foreground">{property.location}</p>
      </div>

      {createdShares.length > 0 ? (
        <div className="glass rounded-3xl p-6">
          <p className="font-medium">Share links created</p>
          <div className="mt-4 flex flex-col gap-3">
            {createdShares.map((share) => {
              const url = typeof window !== "undefined" ? `${window.location.origin}/share/${share.token}` : ""
              return (
                <div key={share.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{share.recipientName}</p>
                    <p className="truncate text-xs text-muted-foreground">{share.recipientEmail}{share.recipientPhone ? ` · ${share.recipientPhone}` : ""}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{url}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(share, url)}>
                      {copiedId === share.id ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                      Copy Link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openWhatsAppShare(message || defaultMessage(property), url)}>WhatsApp</Button>
                    {nativeShareAvailable && (
                      <Button size="sm" variant="outline" onClick={() => openNativeShare(property.name, message || defaultMessage(property), url)}>
                        <Share2 data-icon="inline-start" /> Share
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <Button className="mt-5" variant="outline" onClick={() => { setCreatedShares([]); setRecipients([]); setActiveId(null) }}>
            Share again
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="flex flex-col gap-6">
            <div className="glass rounded-3xl p-6">
              <p className="font-medium">Recipients</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="mt-3" variant="outline" onClick={addRecipient} disabled={!defaultVisibility || !name.trim() || !phone.trim() || !EMAIL_RE.test(email.trim())}>
                <Plus data-icon="inline-start" /> Add recipient
              </Button>

              {recipients.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {recipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      onClick={() => setActiveId(recipient.id)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${recipient.id === activeId ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/70"}`}
                    >
                      <span>{recipient.name}</span>
                      <span className="text-current/70">{recipient.email}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => { event.stopPropagation(); removeRecipient(recipient.id) }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            event.stopPropagation()
                            removeRecipient(recipient.id)
                          }
                        }}
                        aria-label={`Remove ${recipient.name}`}
                        className="rounded-full p-0.5 hover:bg-background/20"
                      >
                        <Trash2 className="size-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-6">
              <label htmlFor="share-message" className="text-sm font-medium">Message</label>
              <textarea
                id="share-message"
                value={message || defaultMessage(property)}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                className="mt-3 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus-visible:border-ring"
              />
            </div>

            <Button size="lg" onClick={send} disabled={recipients.length === 0 || sending}>
              {sending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />}
              {sending ? "Creating links..." : "Create share links"}
            </Button>
          </div>

          <div className="min-w-0">
            {active ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Visibility for <span className="text-foreground">{active.name}</span></p>
                  {recipients.length > 1 && <button onClick={applyToAll} className="text-xs text-primary hover:underline">Apply to all</button>}
                </div>
                <FieldVisibilityPicker property={property} value={active.visibility} onChange={updateActiveVisibility} />
              </div>
            ) : (
              <div className="glass rounded-3xl p-8 text-sm text-muted-foreground">
                Add a recipient to customize what they can see.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { Check } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/skymap/ui/button"
import { Input } from "@/components/skymap/ui/input"
import { updateProfile } from "@/lib/skymap/api"
import { useAuth } from "@/lib/skymap/auth-context"

export default function AccountPage() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.name || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile({ name, phone })
      await refresh()
      setSaved(true)
    } catch {
      // TODO(backend): PATCH /api/user/profile isn't implemented yet.
      setError("Couldn't save your changes right now.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile details.</p>
      </div>

      <form onSubmit={onSave} className="glass flex max-w-lg flex-col gap-5 rounded-3xl p-7">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm text-muted-foreground">Full name</label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-muted-foreground">Email</label>
          <Input id="email" value={user?.email || ""} disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm text-muted-foreground">Phone</label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 00000" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          {saved && <span className="flex items-center gap-1.5 text-sm text-primary"><Check className="size-4" /> Saved</span>}
        </div>
      </form>
    </div>
  )
}

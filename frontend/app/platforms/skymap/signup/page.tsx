"use client"

import { ArrowRight, Move3d } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/skymap/ui/button"
import { Input } from "@/components/skymap/ui/input"
import { useAuth } from "@/lib/skymap/auth-context"

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signup(name, email, password)
      router.push("/platforms/skymap/dashboard")
    } catch {
      // TODO(backend): /api/auth/signup isn't implemented yet, so this will
      // fail until the backend is wired up.
      setError("Couldn't create your account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center px-5 py-16">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <Link href="/platforms/skymap" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Move3d className="size-4" />
          </span>
          SkyMap
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign up to unlock 360° tours and Vastu reports shared with you.
        </p>
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm text-muted-foreground">Full name</label>
            <Input id="name" required autoComplete="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-muted-foreground">Email</label>
            <Input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-muted-foreground">Password</label>
            <Input id="password" type="password" required autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading ? "Creating account…" : "Create account"} <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/platforms/skymap/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}

"use client"

import { ArrowRight, Move3d } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense,useState } from "react"

import { Button } from "@/components/skymap/ui/button"
import { Input } from "@/components/skymap/ui/input"
import { useAuth } from "@/lib/skymap/auth-context"

function LoginForm()  {
  const { login } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      router.push(params.get("redirect") || "/dashboard")
    } catch {
      // TODO(backend): /api/auth/login isn't implemented yet, so this will
      // fail until the backend is wired up.
      setError("Couldn't sign in. Please check your details and try again.")
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
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to view your shared property tours and Vastu reports.
        </p>
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-muted-foreground">Email</label>
            <Input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-muted-foreground">Password</label>
            <Input id="password" type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading ? "Signing in…" : "Sign in"} <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to SkyMap? <Link href="/platforms/skymap/signup" className="text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  )
}
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}

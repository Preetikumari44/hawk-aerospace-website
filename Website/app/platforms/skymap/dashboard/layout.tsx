"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { DashboardShell } from "@/components/skymap/dashboard/dashboard-shell"
import { useAuth } from "@/lib/skymap/auth-context"

// Server-side protection lives in middleware.ts (checks the `skymap_session`
// cookie). This is a client-side belt-and-suspenders check so the dashboard
// UI doesn't flash for a user whose session has expired mid-visit.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/platforms/skymap/login")
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading your dashboard…</div>
  }

  return <DashboardShell>{children}</DashboardShell>
}

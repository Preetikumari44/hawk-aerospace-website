"use client"

import { Eye, LayoutGrid, LogOut, Move3d } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/skymap/ui/button"
import { useAuth } from "@/lib/skymap/auth-context"

const NAV = [
  { href: "/platforms/skymap/owner", label: "Listed properties", icon: LayoutGrid },
]

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const isAuthPage = pathname === "/platforms/skymap/owner/login" || pathname === "/platforms/skymap/owner/signup"

  useEffect(() => {
    if (isAuthPage || isLoading) return
    if (!isAuthenticated || user?.role !== "owner") router.replace("/platforms/skymap/owner/login")
  }, [isAuthPage, isAuthenticated, isLoading, router, user?.role])

  async function onLogout() {
    await logout()
    router.push("/platforms/skymap")
  }

  if (isAuthPage) return children

  if (isLoading) {
    return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading owner dashboard...</div>
  }

  return (
    <div className="min-h-svh lg:flex">
      <aside className="glass sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border px-5 py-4 lg:min-h-svh lg:w-64 lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Move3d className="size-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <Link href="/platforms/skymap">SkyMap</Link>
            <Link
              href="/platforms"
              className="text-[10px] font-normal text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to Platforms
            </Link>
          </span>
        </div>
        <nav className="flex items-center gap-1 lg:mt-8 lg:flex-col lg:items-stretch lg:gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="hidden lg:mt-auto lg:flex lg:flex-col lg:gap-3 lg:border-t lg:border-border lg:pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-medium">
              {(user?.name || "O").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || "Owner"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs text-muted-foreground">
            <Eye className="size-3.5" /> Seller admin
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut data-icon="inline-start" /> Log out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-10 lg:px-10 lg:py-12">{children}</main>
    </div>
  )
}

"use client"

import {
  Bookmark, Compass, History, LayoutDashboard, LayoutGrid, LogOut,
  Move3d, Ruler, UserRound,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Fragment, Suspense } from "react"

import { Button } from "@/components/skymap/ui/button"
import { useAuth } from "@/lib/skymap/auth-context"

const NAV = [
  { href: "/dashboard", label: "My properties", icon: LayoutGrid },
  { href: "/dashboard/saved", label: "Saved", icon: Bookmark },
  { href: "/dashboard/share-history", label: "Share history", icon: History },
  { href: "/dashboard/account", label: "Account", icon: UserRound },
]

const PROPERTY_SUBNAV = [
  { tab: "overview", label: "Overview", icon: LayoutDashboard },
  { tab: "tour360", label: "360\u00b0 Tour", icon: Move3d },
  { tab: "vastu", label: "Vastu Report", icon: Compass },
  { tab: "dimensions", label: "Dimensions", icon: Ruler },
]

function PropertySubnav({ propertyId, activeTab }: { propertyId: string; activeTab: string }) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pl-2 lg:ml-4 lg:mt-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-l lg:border-border lg:pl-4"
      aria-label="Property sections"
    >
      {PROPERTY_SUBNAV.map(({ tab, label, icon: Icon }) => {
        const active = activeTab === tab
        return (
          <Link
            key={tab}
            href={`/platforms/skymap/dashboard/property/${propertyId}?tab=${tab}`}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition ${
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </Link>
        )
      })}
    </div>
  )
}

function DashboardNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const propertyMatch = pathname.match(/^\/dashboard\/property\/([^/]+)/)
  const activePropertyId = propertyMatch?.[1] ?? null
  const rawTab = searchParams.get("tab")
  const activeTab = rawTab === "tour" ? "tour360" : rawTab || "overview"

  return (
    <nav className="flex items-center gap-1 lg:mt-8 lg:flex-col lg:items-stretch lg:gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const isMyProperties = href === "/dashboard"
        const showSubnav = isMyProperties && !!activePropertyId
        const active = pathname === href || showSubnav
        return (
          <Fragment key={href}>
            <Link
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
            {showSubnav && <PropertySubnav propertyId={activePropertyId} activeTab={activeTab} />}
          </Fragment>
        )
      })}
    </nav>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, logout } = useAuth()

  async function onLogout() {
    await logout()
    router.push("/platforms/skymap")
  }

  return (
    <div className="min-h-svh lg:flex">
      <aside className="glass sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border px-5 py-4 lg:min-h-svh lg:w-64 lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:p-6">
        <Link href="/platforms/skymap" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Move3d className="size-4" />
          </span>
          <span className="flex flex-col leading-tight">
            SkyMap
            <Link
              href="/"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-normal text-muted-foreground transition-colors hover:text-foreground"
            >
              Hawk Aerospace
            </Link>
          </span>
        </Link>
        <Suspense fallback={null}>
          <DashboardNav />
        </Suspense>
        <div className="hidden lg:mt-auto lg:flex lg:flex-col lg:gap-3 lg:border-t lg:border-border lg:pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-medium">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || "Loading\u2026"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
            </div>
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

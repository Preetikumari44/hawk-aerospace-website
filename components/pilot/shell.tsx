"use client";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";

import { useBookingAuth } from "@/lib/booking/auth-context";

import { approvedFrontendRoles } from "@/lib/booking/roles";

import { usePilot } from "@/lib/pilot/data";

const NAV = [

  { key: "Home", href: "/pilot", label: "Home", icon: "⌂" },

  { key: "Missions", href: "/pilot/missions", label: "Missions", icon: "▤" },

  { key: "Earnings", href: "/pilot/earnings", label: "Earnings", icon: "₹" },

] as const;

const ROLES = [

  { label: "Customer", icon: "♧", href: "/my-bookings", role: "customer" },

  { label: "Pilot", icon: "✈", href: "/pilot", role: "pilot" },

  { label: "Fleet Manager", icon: "▣", href: "/fleet/dashboard", role: "fleet" },

  { label: "Sales Aggregator", icon: "▱", href: "/sales/dashboard", role: "sales" },

  { label: "Technician", icon: "⚒", href: "/technician/dashboard", role: "technician" },

] as const;

type Popup = "notifications" | "apps" | "profile" | null;

export function PilotShell({ children }: { children: React.ReactNode }) {

  const path = usePathname();

  const router = useRouter();

  const { profile, unread, notifications, showToast } = usePilot();

  const { backendUser, switchRole, logout } = useBookingAuth();

  const [popup, setPopup] = useState<Popup>(null);

  const [switching, setSwitching] = useState(false);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);

  const closeMobileRef = useRef<HTMLButtonElement>(null);

  const approved = approvedFrontendRoles(backendUser);

  useEffect(() => {

    function handlePointerDown(event: PointerEvent) {

      if (

        headerRef.current &&

        event.target instanceof Node &&

        !headerRef.current.contains(event.target)

      ) {

        setPopup(null);

      }

    }

    function handleKeyDown(event: KeyboardEvent) {

      if (event.key === "Escape") {

        setPopup(null);

        setMobileNavOpen(false);

      }

    }

    document.addEventListener("pointerdown", handlePointerDown);

    document.addEventListener("keydown", handleKeyDown);

    return () => {

      document.removeEventListener("pointerdown", handlePointerDown);

      document.removeEventListener("keydown", handleKeyDown);

    };

  }, []);

  useEffect(() => {

    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    closeMobileRef.current?.focus();

    return () => {

      document.body.style.overflow = previousOverflow;

    };

  }, [mobileNavOpen]);

  const active = path.startsWith("/pilot/missions")

    ? "Missions"

    : path.startsWith("/pilot/earnings") || path.startsWith("/pilot/payout")

      ? "Earnings"

      : "Home";

  async function selectRole(href: string, role: string) {

    setPopup(null);

    if (role === "pilot") {

      router.push(href);

      return;

    }

    if ((approved as string[]).includes(role)) {

      setSwitching(true);

      try {

        await switchRole(role as "customer" | "fleet" | "sales" | "technician");

      } catch {

        showToast("Role switch failed.");

      } finally {

        setSwitching(false);

      }

      return;

    }

    router.push("/account");

  }

  function togglePopup(next: Exclude<Popup, null>) {

    setPopup((current) => (current === next ? null : next));

  }

  async function handleLogout() {

    setPopup(null);

    try {

      await logout();

    } catch {

      showToast("Logout failed. Please try again.");

    }

  }

  function closeMobileNav() {

    setMobileNavOpen(false);

  }

  const sidebarContent = (

    <div className="p-sidebar-content" style={{ display: "flex", flexDirection: "column", minHeight: "100%", boxSizing: "border-box" }}>

      <div>

        <div className="p-sidebrand">

          <span className="p-sidebrandmark">H</span>

          <span>

            <span className="p-sidename">Hawk Aerospace</span>

            <span className="p-sidesub">Pilot Workspace</span>

          </span>

        </div>

        <div className="p-sidelabel">PILOT</div>

        <nav className="p-navlist" aria-label="Pilot navigation">

          {NAV.map((item) => (

            <Link

              key={item.key}

              href={item.href}

              onClick={closeMobileNav}

              aria-current={active === item.key ? "page" : undefined}

              className={"p-navitem" + (active === item.key ? " active" : "")}

            >

              <span className="p-nav-icon" aria-hidden="true">{item.icon}</span>

              <span>{item.label}</span>

            </Link>

          ))}

          <Link

            href="/pilot/marketplace"

            onClick={closeMobileNav}

            aria-current={path.startsWith("/pilot/marketplace") ? "page" : undefined}

            className={"p-navitem" + (path.startsWith("/pilot/marketplace") ? " active" : "")}

          >

            <span className="p-nav-icon" aria-hidden="true">▱</span>

            <span>Marketplace</span>

          </Link>

        </nav>

      </div>

      <div className="p-sidecard" style={{ marginTop: "auto" }}>

        <b>Need help?</b>

        <p style={{ margin: "6px 0 10px" }}>24x7 Expert Support</p>

        <Link href="/support" onClick={closeMobileNav}>Support →</Link>

      </div>

    </div>

  );

  return (

    <div className="p-shell">

      <header className="p-header" ref={headerRef}>

        <button

          type="button"

          className="p-header-menu"

          onClick={() => setMobileNavOpen(true)}

          aria-label="Open navigation"

          aria-expanded={mobileNavOpen}

        >

          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">

            <path d="M4 6h16M4 12h16M4 18h16" />

          </svg>

        </button>

        <Link href="/pilot" className="p-brand" aria-label="Hawk Aerospace Pilot home">

          <span className="p-brandmark">H</span>

          <span>Hawk Aerospace</span>

        </Link>

        <nav className="p-centernav" aria-label="Hawk Aerospace">

          <Link href="/pilot">Solutions</Link>

          <Link href="/pilot">Technology</Link>

          <Link href="/pilot">Platforms</Link>

          <Link href="/pilot/marketplace" className={path.startsWith("/pilot/marketplace") ? "active" : ""}>Marketplace</Link>

        </nav>

        <div className="p-headerright">

          <button

            type="button"

            className={"p-iconbtn" + (popup === "notifications" ? " is-open" : "")}

            onClick={() => togglePopup("notifications")}

            aria-label="Notifications"

            aria-haspopup="true"

            aria-expanded={popup === "notifications"}

            title="Notifications"

          >

            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">

              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

              <path d="M10 21h4" />

            </svg>

            {unread > 0 && <span className="p-badge">{unread > 9 ? "9+" : unread}</span>}

          </button>

          <button

            type="button"

            className={"p-iconbtn p-launcherbtn" + (popup === "apps" ? " is-open" : "")}

            onClick={() => togglePopup("apps")}

            aria-label="Hawk Aerospace workspaces"

            aria-haspopup="true"

            aria-expanded={popup === "apps"}

            title="Hawk Aerospace Workspaces"

          >

           <span className="p-nine-dots" aria-hidden="true">
  {Array.from({ length: 9 }, (_, index) => (
    <span key={index} />
  ))}
</span>

          </button>

          <button

            type="button"

            className={"p-profile-trigger" + (popup === "profile" ? " is-open" : "")}

            onClick={() => togglePopup("profile")}

            aria-label="Profile menu"

            aria-haspopup="true"

            aria-expanded={popup === "profile"}

            title="Profile menu"

          >

            <span className="p-profile-copy">

              <span className="p-pilotname">{profile.name || "Pilot"}</span>

              <span className="p-pilotrole">Drone Pilot</span>

            </span>

            <span className="p-avatar" aria-hidden="true">{(profile.name?.[0] || "P").toUpperCase()}</span>

          </button>

        </div>

        {popup === "notifications" && (

          <section className="p-dropdown p-notification-dropdown" aria-label="Notifications">

            <div className="p-dropdown-heading">

              <strong>Notifications</strong>

              <span>{unread > 0 ? `${unread} unread` : "All caught up"}</span>

            </div>

            <div className="p-notification-list">

              {notifications.length === 0 ? (

                <p className="p-empty">No notifications.</p>

              ) : notifications.map((notification) => (

                <div className="p-notification-item" key={notification.id}>

                  <span className={"p-notification-dot" + (!notification.read ? " unread" : "")} />

                  <div className="p-notification-copy">

                    <strong>{notification.title}</strong>

                    <p>{notification.body}</p>

                    {!notification.read && <span className="p-new-label">New</span>}

                  </div>

                </div>

              ))}

            </div>

          </section>

        )}

        {popup === "apps" && (

          <section className="p-dropdown p-apps-dropdown" aria-label="Hawk Aerospace Workspaces">

            <div className="p-dropdown-heading"><strong>Hawk Aerospace Workspaces</strong></div>

            <div className="p-app-grid">

              {ROLES.map((role) => {

                const isCurrent = role.role === "pilot";

                return (

                  <button

                    type="button"

                    key={role.role}

                    className={"p-app-tile" + (isCurrent ? " current" : "")}

                    disabled={switching}

                    onClick={() => void selectRole(role.href, role.role)}

                  >

                    <span className="p-app-icon" aria-hidden="true">{role.icon}</span>

                    <span className="p-app-label">{switching && !isCurrent ? "Switching…" : role.label}</span>

                    {isCurrent && <span className="p-current-label">Current</span>}

                  </button>

                );

              })}

            </div>

          </section>

        )}

        {popup === "profile" && (

          <section className="p-dropdown p-profile-dropdown" aria-label="Profile menu">

            <div className="p-profile-summary">

              <span className="p-avatar" aria-hidden="true">{(profile.name?.[0] || "P").toUpperCase()}</span>

              <div className="p-profile-summary-copy">

                <strong>{profile.name || "Pilot"}</strong>

                <span>Drone Pilot</span>

              </div>

            </div>

            <Link className="p-profile-action" href="/pilot/account" onClick={() => setPopup(null)}>

              <span aria-hidden="true">◉</span> My account

            </Link>

            <Link className="p-profile-action" href="/chat" onClick={() => setPopup(null)}>

              <span aria-hidden="true">↗</span> Chat

            </Link>

            <Link className="p-profile-action" href="/support" onClick={() => setPopup(null)}>

              <span aria-hidden="true">?</span> Support

            </Link>

            <button type="button" className="p-profile-action danger" onClick={() => void handleLogout()} disabled={switching}>

              <span aria-hidden="true">↪</span> Sign out

            </button>

          </section>

        )}

      </header>

      <div className="p-body">

        <aside className="p-sidebar">{sidebarContent}</aside>

        <main className="p-main">{children}</main>

      </div>

      {mobileNavOpen && (

        <div className="p-mobile-drawer">

          <button type="button" className="p-mobile-backdrop" onClick={closeMobileNav} aria-label="Close navigation overlay" />

          <aside className="p-mobile-panel" role="dialog" aria-modal="true" aria-label="Pilot navigation drawer">

            <button ref={closeMobileRef} type="button" className="p-mobile-close" onClick={closeMobileNav} aria-label="Close navigation">

              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">

                <path d="M6 6l12 12M18 6L6 18" />

              </svg>

            </button>

            {sidebarContent}

          </aside>

        </div>

      )}

      <nav className="p-bottomnav" aria-label="Mobile navigation">

        {NAV.map((item) => (

          <Link key={item.key} href={item.href} onClick={closeMobileNav} className={active === item.key ? "active" : ""}>

            {item.label}

          </Link>

        ))}

      </nav>

      <footer className="p-footer">

        <span>© {new Date().getFullYear()} Hawk Aerospace</span>

        <span>Privacy · Terms · Support</span>

      </footer>

    </div>

  );

}

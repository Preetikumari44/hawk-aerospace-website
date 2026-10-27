"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useBookingAuth } from "@/lib/booking/auth-context";
import { approvedFrontendRoles, ROLE_META } from "@/lib/booking/roles";
import { useTech } from "@/lib/tech/data";

const items = [
  ["Dashboard", "/technician/dashboard", "⌂"],
  ["Tasks", "/technician/tasks", "✓"],
  ["Jobs", "/technician/jobs", "▣"],
  ["Earnings", "/technician/earnings", "₹"],
  ["Marketplace", "/technician/marketplace", "⌘"],
  ["History", "/technician/history", "◷"],
] as const;

const workspaces = [
  { label: "Customer", icon: "👤", href: "/my-bookings", role: "customer" },
  { label: "Fleet Manager", icon: "🚚", href: "/fleet/dashboard", role: "fleet" },
  { label: "Drone Pilot", icon: "🛩", href: "/pilot", role: "pilot" },
  { label: "Sales Aggregator", icon: "💼", href: "/sales/dashboard", role: "sales" },
  { label: "Technician", icon: "🔧", href: "/technician/dashboard", role: "technician" },
] as const;

type Popup = "notifications" | "workspaces" | "profile" | null;

export function TechShell({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [popup, setPopup] = useState<Popup>(null);
  const [switching, setSwitching] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { profile, cartCount, toast, showToast } = useTech();
  const { backendUser, switchRole, logout } = useBookingAuth();
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
      if (event.key === "Escape") setPopup(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function selectWorkspace(href: string, role: string) {
    setPopup(null);
    if (role === "technician") {
      router.push(href);
      return;
    }
    if ((approved as string[]).includes(role)) {
      setSwitching(true);
      try {
        await switchRole(role as "customer" | "pilot" | "fleet" | "sales");
      } catch {
        showToast("Role switch failed.");
      } finally {
        setSwitching(false);
      }
      return;
    }
    router.push("/account");
  }

  function handleLogout() {
    setPopup(null);
    logout();
    router.replace("/");
  }

  return (
    <div className="shell">
      <header className="header" ref={headerRef}>
        <div className="left">
          <button
            type="button"
            className="iconbtn mobileMenu"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>
          <Link href="/technician/dashboard" className="brand">
            <span className="mark">H</span>
            <span className="brandtext">Hawk Aerospace</span>
          </Link>
        </div>

        <nav className="nav" aria-label="Main navigation">
          <Link href="/technician/dashboard">Solutions</Link>
          <Link href="/technician/dashboard">Technology</Link>
          <Link href="/technician/dashboard">Platforms</Link>
          <Link
            className={p.includes("marketplace") ? "active" : ""}
            href="/technician/marketplace"
          >
            Marketplace
          </Link>
        </nav>

        <div className="right">
          <div className="techHeaderMenu">
            <button
              type="button"
              className={"iconbtn techNotificationButton" + (popup === "notifications" ? " is-open" : "")}
              onClick={() => setPopup((current) => current === "notifications" ? null : "notifications")}
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={popup === "notifications"}
              title="Notifications"
            >
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>
            {popup === "notifications" && (
              <section className="techPopup techNotificationsPopup" aria-label="Notifications">
                <div className="techNotificationHeader">
                  <strong>Notifications</strong>
                </div>
                <div className="techNotificationEmpty">
                  <span className="techNotificationEmptyIcon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                      <path d="M10 21h4" />
                    </svg>
                  </span>
                  <strong>No notifications</strong>
                  <span>You're all caught up.</span>
                </div>
              </section>
            )}
          </div>

          <div className="techHeaderMenu">
            <button
              type="button"
              className={"iconbtn launcherButton" + (popup === "workspaces" ? " is-open" : "")}
              onClick={() => setPopup((current) => current === "workspaces" ? null : "workspaces")}
              aria-label="Switch workspace"
              aria-expanded={popup === "workspaces"}
              title="Hawk Aerospace Apps"
            >
              <span className="techDots" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
              </span>
            </button>
            {popup === "workspaces" && (
              <section className="techPopup techAppsPopup" aria-label="Hawk Aerospace Apps">
                <div className="techPopupHeading">Hawk Aerospace Apps</div>
                <p className="techPopupSubtitle">Switch between your approved workspaces</p>
                <div className="techWorkspaceGrid">
                  {workspaces.map((workspace) => {
                    const current = workspace.role === "technician";
                    return (
                      <button
                        type="button"
                        key={workspace.role}
                        className={"techWorkspaceTile" + (current ? " current" : "")}
                        disabled={switching}
                        onClick={() => void selectWorkspace(workspace.href, workspace.role)}
                      >
                        <span className="techWorkspaceIcon" aria-hidden="true">{workspace.icon}</span>
                        <span className="techWorkspaceLabel">{workspace.label}</span>
                        {current && <span className="techCurrentLabel">Current</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <Link
            className="iconbtn techCartButton"
            href="/technician/cart"
            aria-label={`Shopping cart${cartCount ? `, ${cartCount} items` : ""}`}
            title="Cart"
          >
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && <span className="techCartCount">{cartCount > 99 ? "99+" : cartCount}</span>}
          </Link>

          <Link className="iconbtn historyButton" href="/technician/history" aria-label="Order history" title="Order history">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="historyLabel">History</span>
          </Link>

          <div className="techHeaderMenu">
            <button
              type="button"
              className={"profile" + (popup === "profile" ? " is-open" : "")}
              onClick={() => setPopup((current) => current === "profile" ? null : "profile")}
              aria-label="Open profile menu"
              aria-expanded={popup === "profile"}
              title="Profile menu"
            >
              <span className="avatar">{(profile.name?.[0] || "T").toUpperCase()}</span>
              <span className="profileName">{profile.name || "Technician"}</span>
              <svg className="profileChevron" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m5 7 5 5 5-5" />
              </svg>
            </button>
            {popup === "profile" && (
              <section className="techPopup techProfilePopup" aria-label="Profile menu">
                <div className="techProfileHeading">
                  <span className="avatar">{(profile.name?.[0] || "T").toUpperCase()}</span>
                  <div className="techProfileDetails">
                    <strong>{profile.name || "Technician"}</strong>
                    <span>Technician Workspace</span>
                  </div>
                </div>
                <Link className="techMenuItem" href="/technician/profile" onClick={() => setPopup(null)}>
                  <span aria-hidden="true">◉</span> My Profile
                </Link>
                <Link className="techMenuItem" href="/technician/cart" onClick={() => setPopup(null)}>
                  <span aria-hidden="true">🛒</span> My Cart
                </Link>
                <Link className="techMenuItem" href="/technician/history" onClick={() => setPopup(null)}>
                  <span aria-hidden="true">◷</span> Order History
                </Link>
                <button type="button" className="techMenuItem techLogoutItem" onClick={handleLogout}>
                  <span aria-hidden="true">↪</span> Sign Out
                </button>
              </section>
            )}
          </div>
        </div>
      </header>

      {popup === "workspaces" && (
        <button className="techPopupBackdrop" type="button" aria-label="Close workspace switcher" onClick={() => setPopup(null)} />
      )}

      <div className="layout">
        <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
          <div>
            <div className="sidebrand">TECHNICIAN WORKSPACE</div>
            {items.map(([label, href, icon]) => (
              <Link
                key={href}
                onClick={() => setMobileOpen(false)}
                className={`sideitem ${p === href || p.startsWith(href + "/") ? "active" : ""}`}
                href={href}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            ))}
          </div>
          <div className="card techSupportCard">
            <b className="techSupportTitle">24x7 Expert Support</b>
            <p className="sub">Get help anytime.</p>
            <Link href="/support" className="btn secondary techSupportButton">
              Support
            </Link>
            <div className="techSupportActions">
              <Link href="/chat" className="btn secondary">Chat</Link>
              <Link href="/refer" className="btn secondary">Refer</Link>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <button className="techSidebarOverlay" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
        )}

        <main className="main">{children}</main>
      </div>

      {toast && <div className="card techToast" role="status">{toast}</div>}
      <span hidden>{ROLE_META.technician.label}</span>
    </div>
  );
}

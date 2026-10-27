
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Plane,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { approvedFrontendRoles, landingForFrontendRole, ROLE_META } from "@/lib/booking/roles";
import { useFleetData } from "@/lib/fleet/data";

const navItems = [
  { href: "/fleet/dashboard", label: "Home", icon: Home },
  { href: "/fleet/missions", label: "Missions", icon: ClipboardList },
  { href: "/fleet/handover", label: "Handover", icon: KeyRound },
  { href: "/fleet/resources", label: "Resources", icon: Plane },
  { href: "/fleet/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/fleet/account", label: "Account", icon: UserRound },
];

const apps = [
  { key: "customer", name: "Customer", icon: Users, href: "/my-bookings" },
  { key: "pilot", name: "Pilot", icon: Plane, href: "/pilot" },
  { key: "fleet", name: "Fleet Manager", icon: Truck, href: "/fleet/dashboard", active: true },
  { key: "sales", name: "Sales Aggregator", icon: ShoppingBag, href: "/sales" },
  { key: "tech", name: "Technician", icon: Wrench, href: "/technician" },
];

const topNav = [
  { label: "Solutions", path: "/#solutions" },
  { label: "Technology", path: "/#technology" },
  { label: "Platforms", path: "/#platforms" },
  { label: "Marketplace", path: "/fleet/marketplace", internal: true },
];

function useOutside(ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, close]);
}

export default function FleetShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { backendUser, frontendRole, switchRole, logout } = useBookingAuth();
  const {
    user,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    toast,
    showToast,
  } = useFleetData();

  const [menu, setMenu] = useState<"" | "bell" | "apps" | "profile">("");
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const profRef = useRef<HTMLDivElement>(null);

  const closeBell = useCallback(() => setMenu((current) => (current === "bell" ? "" : current)), []);
  const closeApps = useCallback(() => setMenu((current) => (current === "apps" ? "" : current)), []);
  const closeProfile = useCallback(() => setMenu((current) => (current === "profile" ? "" : current)), []);

  useOutside(bellRef, closeBell);
  useOutside(appsRef, closeApps);
  useOutside(profRef, closeProfile);

  const unread = notifications.filter((notification) => !notification.read).length;
  const toggle = (nextMenu: "bell" | "apps" | "profile") => {
    setMenu((current) => (current === nextMenu ? "" : nextMenu));
  };
  const approved = approvedFrontendRoles(backendUser);

  async function handleSwitchRole(href: string, key: string) {
    const keyToRole: Record<string, string> = {
      customer: "customer",
      pilot: "pilot",
      fleet: "fleet",
      sales: "sales",
      tech: "technician",
    };

    const role = keyToRole[key];
    setMenu("");

    if (role === "fleet") {
      router.push(href);
      return;
    }

    if (role && approved.includes(role as (typeof approved)[number])) {
      setSwitching(true);
      try {
        await switchRole(role as (typeof approved)[number]);
      } catch {
        showToast("Role switch failed — showing Fleet workspace.");
      } finally {
        setSwitching(false);
      }
      return;
    }

    if (role) {
      router.push("/account");
      return;
    }

    router.push(href);
  }

  function handleLogout() {
    setMenu("");
    logout();
    router.replace("/");
  }

  const initials = user.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="shell">
      <header className="header">
        <button className="menuBtn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>

        <Link href="/fleet/dashboard" className="logo">
          <span className="logoMark">H</span>
          <span className="logoText">HAWK AEROSPACE</span>
        </Link>

        <nav className="topNav">
          {topNav.map((item) => {
            const active = Boolean(item.internal && path.startsWith(item.path));
            return item.internal ? (
              <Link key={item.label} href={item.path} className={active ? "active" : ""}>
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.path}>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="headerRight">
          <div className="pop" ref={bellRef}>
            <button
              className="hdrBtn"
              onClick={() => toggle("bell")}
              aria-label="Notifications"
              aria-expanded={menu === "bell"}
              title="Notifications"
            >
              <Bell size={21} />
              {unread > 0 && <i className="badgeDot">{unread > 99 ? "99+" : unread}</i>}
            </button>

            {menu === "bell" && (
              <div className="dropdown notifMenu">
                <div className="dropHead">
                  <b>Notifications</b>
                  {unread > 0 && <button onClick={markAllNotificationsRead}>Mark all read</button>}
                </div>
                <div className="notifList">
                  {notifications.length === 0 ? (
                    <div className="empty">You’re all caught up.</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        className={`notifItem ${notification.read ? "" : "unread"}`}
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        <span className="nDot" />
                        <span>
                          <b>{notification.title}</b>
                          <em>{notification.description}</em>
                          <small>{notification.time}</small>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pop" ref={appsRef}>
            <button
              className="hdrBtn"
              onClick={() => toggle("apps")}
              aria-label="Switch application"
              aria-expanded={menu === "apps"}
              title="Switch application"
            >
              <span className="dots" aria-hidden="true">
                {Array.from({ length: 9 }).map((_, index) => (
                  <i key={index} />
                ))}
              </span>
            </button>

            {menu === "apps" && (
              <div className="dropdown appsMenu">
                <div className="dropHead">
                  <b>Hawk Aerospace Apps</b>
                </div>
                <div className="appGrid">
                  {apps.map((app) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.key}
                        className={app.active ? "appTile active" : "appTile"}
                        onClick={() => void handleSwitchRole(app.href, app.key)}
                        disabled={switching}
                      >
                        <span>
                          <Icon size={20} />
                        </span>
                        {app.name}
                        {app.active && <small>Current</small>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pop profilePop" ref={profRef}>
            <button
              className="profileTrigger"
              onClick={() => toggle("profile")}
              aria-label="Profile menu"
              aria-expanded={menu === "profile"}
              title="Profile"
            >
              <span className="avatarBtn">{initials}</span>
              <span className="profileTriggerInfo">
                <b>{user.name}</b>
                <small>Fleet Manager</small>
              </span>
              <ChevronDown className="profileChevron" size={16} />
            </button>

            {menu === "profile" && (
              <div className="dropdown profileMenu">
                <div className="profHead">
                  <div className="avatarBtn static">{initials}</div>
                  <div>
                    <b>{user.name}</b>
                    <small>
                      {user.role} · {user.id}
                    </small>
                  </div>
                </div>
                <Link href="/fleet/account" onClick={() => setMenu("")}>
                  <User size={15} />
                  Profile
                </Link>
                <Link href="/fleet/account" onClick={() => setMenu("")}>
                  <Settings size={15} />
                  Settings
                </Link>
                <Link href="/fleet/marketplace/cart" onClick={() => setMenu("")}>
                  <ShoppingCart size={15} />
                  Cart
                </Link>
                <Link href="/chat" onClick={() => setMenu("")}>
                  <Users size={15} />
                  Chat
                </Link>
                <Link href="/support" onClick={() => setMenu("")}>
                  <Settings size={15} />
                  Support
                </Link>
                <Link href="/refer" onClick={() => setMenu("")}>
                  <ShoppingBag size={15} />
                  Refer &amp; Earn
                </Link>
                {approved
                  .filter((role) => role !== "fleet")
                  .map((role) => (
                    <button
                      key={role}
                      disabled={switching}
                      onClick={() =>
                        void handleSwitchRole(
                          landingForFrontendRole(role),
                          role === "technician" ? "tech" : role,
                        )
                      }
                    >
                      <Users size={15} />
                      {switching ? "Switching…" : `Switch to ${ROLE_META[role]?.label ?? role}`}
                    </button>
                  ))}
                <button className="danger" onClick={handleLogout}>
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sideBrand">
          <div className="sideMark">H</div>
          <div>
            <b>Hawk Aerospace</b>
            <span>Fleet Manager Workspace</span>
          </div>
          <button className="mobileClose" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="sideLabel">FLEET MANAGER</div>
        <nav className="sideNav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = path === item.href || path.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "navItem active" : "navItem"}
                onClick={() => setOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="helpCard">
          <b>Need help?</b>
          <strong>24x7 Expert Support</strong>
          <p>Get help from our agricultural drone specialists anytime.</p>
          <Link href="/support">Support →</Link>
        </div>
      </aside>

      {open && <button className="overlay" onClick={() => setOpen(false)} aria-label="Close menu" />}

      <main className="main">
        <section className="content">{children}</section>
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <span data-frontend-role={frontendRole} hidden />
    </div>
  );
}

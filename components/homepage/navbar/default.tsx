"use client";

import { ExternalLinkIcon, LogOutIcon, Menu, PhoneIcon, RepeatIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBookingAuth } from "@/lib/booking/auth-context";
import {
  approvedFrontendRoles,
  landingForFrontendRole,
  ROLE_META,
  type FrontendRole,
} from "@/lib/booking/roles";
import { headerNavLinks, workspaces } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";
import { useWorkspaceNavigation,type WorkspaceKey } from "@/lib/workspaces";

import { WorkspaceLauncher } from "../workspace-launcher";

function RoleSwitcher() {
  const { backendUser, frontendRole, switchRole } = useBookingAuth();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<FrontendRole | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const approved = approvedFrontendRoles(backendUser);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  async function handleSwitch(role: FrontendRole) {
    if (role === frontendRole) {
      setOpen(false);
      return;
    }
    setBusy(role);
    setError(null);
    try {
      await switchRole(role);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role switch failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={containerRef} className="relative hidden xl:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Switch role"
        className="text-foreground hover:bg-accent focus-visible:ring-ring flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
      >
        <RepeatIcon className="size-4" />
        {ROLE_META[frontendRole]?.label ?? frontendRole}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Switch role"
          className="hawk-theme border-border bg-popover absolute right-0 z-50 mt-2 w-64 rounded-xl border p-2 shadow-lg"
        >
          <p className="text-muted-foreground px-3 pt-1 text-[11px] font-semibold tracking-widest uppercase">
            Switch role
          </p>
          {approved.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy !== null}
              onClick={() => void handleSwitch(r)}
              className={cn(
                "text-foreground hover:bg-accent flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:opacity-60",
                r === frontendRole && "text-brand font-semibold",
              )}
            >
              {busy === r ? "Switching…" : (ROLE_META[r]?.label ?? r)}
              {r === frontendRole ? <span className="text-xs opacity-60">· current</span> : null}
            </button>
          ))}
          {error ? <p className="text-destructive px-3 py-1 text-xs">{error}</p> : null}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground block rounded-xl px-3 py-2 text-left text-sm transition-colors"
          >
            My Roles · apply for more…
          </Link>
        </div>
      )}
    </div>
  );
}

// A nav item is "current" when its path matches the page. Same-page hash links (Solutions,
// Technology) are never marked current because they point at a section of the homepage.
function isActiveLink(pathname: string, href: string) {
  if (href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const { open: openWorkspace } = useWorkspaceNavigation();
  const { user, isAuthenticated, logout, signOut, requestLogin } = useBookingAuth();
  // On the public homepage a logout just signs out in place; everywhere else
  // (every dashboard) it is a full sign-out that lands on the login page.
  const handleLogout = pathname === "/" ? logout : signOut;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "hawk-theme fixed top-0 z-50 w-full border-b px-4 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled
          ? "border-border bg-white/95 shadow-[0_6px_18px_-14px_rgba(36,78,112,0.35)] backdrop-blur-xl"
          : "border-border/70 bg-white/85 backdrop-blur-md",
      )}
    >
      <div className="max-w-container mx-auto flex h-14 items-center justify-between gap-4">
        <a
          href="/#home"
          className="text-foreground focus-visible:ring-ring flex items-center gap-2 rounded-md text-base font-bold tracking-tight focus-visible:ring-2 focus-visible:outline-hidden sm:text-lg"
        >
          <Image src="/images/hawk-icon.png" alt="Hawk Aerospace" width={311} height={360} priority className="h-9 w-auto" />
        </a>

        <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
          {headerNavLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);
            const className = cn(
              "focus-visible:ring-ring text-foreground hover:bg-accent hover:text-brand inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium tracking-[0.005em] transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
              active && "bg-accent text-brand",
            );
            return link.newTab ? (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                {link.title}
                <ExternalLinkIcon className="size-3.5 opacity-60" aria-hidden />
              </a>
            ) : (
              <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={className}>
                {link.title}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {isAuthenticated ? (
            <>
              <span
                className="text-muted-foreground hidden items-center gap-1.5 px-2 text-sm font-medium xl:flex"
              >
                <PhoneIcon className="size-4" />
                {user?.phone}
              </span>
              {/* Role switcher (USER_API approved roles) — left of workspace launcher. */}
              <RoleSwitcher />
              {/* Hawk-branded 9-dot workspace launcher — after login only. */}
              <WorkspaceLauncher variant="light" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Logout"
                className="text-foreground hover:bg-accent hidden size-9 cursor-pointer rounded-md xl:inline-flex"
              >
                <LogOutIcon className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="lg"
              onClick={() => requestLogin("/")}
              className="hidden h-9 cursor-pointer rounded-md px-5 text-sm font-semibold tracking-[0.01em] xl:inline-flex"
            >
              Login
            </Button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-border bg-card text-foreground hover:bg-accent size-9 shrink-0 cursor-pointer rounded-md xl:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="hawk-theme overflow-y-auto">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav aria-label="Mobile" className="grid gap-1 pt-2">
                <a href="/#home" className="text-foreground mb-4 flex items-center gap-2 text-xl font-bold">
                  <Image src="/images/hawk-icon.png" alt="Hawk Aerospace" width={311} height={360} className="h-10 w-auto" />
                </a>
                {headerNavLinks.map((link) => {
                  const active = isActiveLink(pathname, link.href);
                  const className =
                    "text-foreground hover:text-brand focus-visible:outline-ring flex cursor-pointer items-center justify-between border-b py-4 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2";
                  return link.newTab ? (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className={className}
                    >
                      {link.title}
                      <ExternalLinkIcon className="size-4 opacity-60" aria-hidden />
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={cn(className, active && "text-brand")}
                    >
                      {link.title}
                    </Link>
                  );
                })}

                {isAuthenticated ? (
                  <>
                    <div className="text-muted-foreground flex items-center gap-1.5 border-b py-4 text-base font-medium">
                      <PhoneIcon className="size-4" />
                      {user?.phone}
                    </div>
                    <p className="text-brand pt-5 pb-1 text-xs font-semibold tracking-[0.15em] uppercase">
                      Workspaces
                    </p>
                    {workspaces.map((workspace) => {
                      const active =
                        pathname === workspace.href || pathname.startsWith(`${workspace.href}/`);
                      return (
                        <button
                          key={workspace.key}
                          type="button"
                          onClick={() => {
                            if (active) return;
                            openWorkspace(workspace.key as WorkspaceKey);
                          }}
                          className="flex w-full flex-col gap-0.5 border-b py-3.5 text-left"
                        >
                          <span className="text-foreground flex items-center gap-2 text-base font-medium">
                            {workspace.title}
                            {active && (
                              <span className="bg-brand/20 text-brand rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                                Current
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs">{workspace.description}</span>
                        </button>
                      );
                    })}
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="text-foreground hover:text-brand flex items-center justify-between border-b py-4 text-base font-medium"
                    >
                      My Roles · switch / apply for more…
                    </Link>
                    <Button variant="outline" onClick={handleLogout} className="mt-5 h-12 w-full text-base">
                      <LogOutIcon className="size-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => {
                      setMenuOpen(false);
                      requestLogin("/");
                    }}
                    className="mt-5 h-12 w-full cursor-pointer text-base"
                  >
                    Login
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

    </header>
  );
}

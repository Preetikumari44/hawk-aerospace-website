"use client";

import { ExternalLinkIcon, LogOutIcon, Menu, PhoneIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { headerNavLinks, workspaces } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";
import { useWorkspaceNavigation,type WorkspaceKey } from "@/lib/workspaces";

import { WorkspaceLauncher } from "../workspace-launcher";

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

  // Reference-image light navbar ONLY over the homepage's unscrolled hero
  // (transparent/white glass, dark navy text) — every other page, and the
  // homepage itself once scrolled, keeps the original deep-green bar
  // completely unchanged. Only the desktop bar swaps; the mobile sheet
  // menu stays the existing dark panel either way.
  const isLightHero = pathname === "/" && !scrolled;

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full px-4 transition-all duration-300",
        isLightHero
          ? "border-b border-black/5 bg-white/70 backdrop-blur-md"
          : cn(
              "hawk-forest",
              scrolled
                ? "border-b border-white/10 bg-[#0b2418]/92 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                : "border-b border-white/5 bg-[#0b2418]/45 backdrop-blur-md",
            ),
      )}
    >
      <div className="max-w-container mx-auto flex h-16 items-center justify-between gap-4 sm:h-18">
        <a
          href="/#home"
          className={cn(
            "focus-visible:ring-ring flex items-center gap-2 rounded-md text-base font-bold tracking-tight focus-visible:ring-2 focus-visible:outline-hidden sm:text-lg",
            isLightHero ? "text-[#16231a]" : "text-white",
          )}
        >
          <Image src="/images/hawk-icon.png" alt="Hawk Aerospace" width={311} height={360} priority className="h-10 w-auto" />
        </a>

        <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
          {headerNavLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);
            const className = cn(
              "focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
              isLightHero
                ? "text-[#16231a] hover:bg-black/5 hover:text-[#1f7a43]"
                : "hover:text-brand text-[#d3e4d7] hover:bg-white/10",
              active && !isLightHero && "bg-white/10 text-white",
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

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span
                className={cn(
                  "hidden items-center gap-1.5 px-2 text-sm font-medium xl:flex",
                  isLightHero ? "text-[#3f4d43]" : "text-[#b9cfbe]",
                )}
              >
                <PhoneIcon className="size-4" />
                {user?.phone}
              </span>
              {/* Hawk-branded 9-dot workspace launcher — after login only. */}
              <WorkspaceLauncher />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Logout"
                className={cn(
                  "hidden size-11 cursor-pointer xl:inline-flex",
                  isLightHero ? "text-[#16231a] hover:bg-black/5" : "text-[#d3e4d7] hover:bg-white/10",
                )}
              >
                <LogOutIcon className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="lg"
              onClick={() => requestLogin("/")}
              className="hidden h-11 cursor-pointer px-6 text-[15px] xl:inline-flex"
            >
              Login
            </Button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "size-11 shrink-0 cursor-pointer xl:hidden",
                  isLightHero
                    ? "border-black/10 bg-black/5 text-[#16231a] hover:bg-black/10"
                    : "border-white/25 bg-white/5 text-white hover:bg-white/15",
                )}
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="hawk-theme hawk-forest overflow-y-auto border-white/10">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav aria-label="Mobile" className="grid gap-1 pt-2">
                <a href="/#home" className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                  <Image src="/images/hawk-icon.png" alt="Hawk Aerospace" width={311} height={360} className="h-10 w-auto" />
                </a>
                {headerNavLinks.map((link) => {
                  const active = isActiveLink(pathname, link.href);
                  const className =
                    "flex cursor-pointer items-center justify-between border-b border-white/10 py-4 text-base font-medium text-white hover:text-[#a6d7b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a6d7b4]";
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
                      className={cn(className, active && "text-[#a6d7b4]")}
                    >
                      {link.title}
                    </Link>
                  );
                })}

                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-1.5 border-b border-white/10 py-4 text-base font-medium text-[#b9cfbe]">
                      <PhoneIcon className="size-4" />
                      {user?.phone}
                    </div>
                    <p className="pt-5 pb-1 text-xs font-semibold tracking-[0.15em] text-[#9fd4b0] uppercase">
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
                          className="flex w-full flex-col gap-0.5 border-b border-white/10 py-3.5 text-left"
                        >
                          <span className="flex items-center gap-2 text-base font-medium text-white">
                            {workspace.title}
                            {active && (
                              <span className="bg-brand/20 text-brand rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                                Current
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-[#b9cfbe]">{workspace.description}</span>
                        </button>
                      );
                    })}
                    <Button variant="outline" onClick={handleLogout} className="mt-5 h-12 w-full border-white/25 text-base text-white hover:bg-white/15">
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

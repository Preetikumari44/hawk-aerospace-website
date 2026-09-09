"use client";

import { LogOutIcon, Menu, PhoneIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { navLinks } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";

import HawkLogo from "../../logos/hawk";

export default function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const { user, isAuthenticated, logout, requestLogin } = useBookingAuth();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full px-4 transition-colors duration-300",
        scrolled
          ? "bg-background/85 border-border/60 border-b backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="max-w-container mx-auto flex h-16 items-center justify-between sm:h-20">
        <a href="#home" className="text-foreground flex items-center gap-2 text-lg font-bold tracking-tight">
          <HawkLogo className="text-brand" />
          Hawk Aerospace
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {link.title}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <div className="hidden items-center gap-1 lg:flex">
              <Button variant="ghost" size="sm" asChild>
                <a href="/my-bookings">My Bookings</a>
              </Button>
              <span className="text-muted-foreground flex items-center gap-1.5 px-2 text-sm font-medium">
                <PhoneIcon className="size-4" />
                {user?.phone}
              </span>
              <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
                <LogOutIcon className="size-4" />
              </Button>
            </div>
          )}
          {/* Login lives in the header, beside Request a Consultation — see
              the STRICT DO NOT CHANGE / header requirements. */}
          {!isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => requestLogin("/")}
              className="hidden lg:inline-flex"
            >
              Login
            </Button>
          )}
          <Button variant="default" size="sm" asChild className="hidden lg:inline-flex">
            <a href="#contact">Request a Consultation</a>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav className="grid gap-1 pt-6">
                <a href="#home" className="mb-4 flex items-center gap-2 text-xl font-bold">
                  <HawkLogo className="text-brand" />
                  Hawk Aerospace
                </a>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-foreground border-border/50 border-b py-3 text-base font-medium"
                  >
                    {link.title}
                  </a>
                ))}
                {isAuthenticated ? (
                  <>
                    <a
                      href="/my-bookings"
                      className="text-foreground border-border/50 border-b py-3 text-base font-medium"
                    >
                      My Bookings
                    </a>
                    <div className="text-muted-foreground flex items-center gap-1.5 border-b border-border/50 py-3 text-base font-medium">
                      <PhoneIcon className="size-4" />
                      {user?.phone}
                    </div>
                    <Button variant="outline" onClick={logout} className="mt-4 w-full">
                      <LogOutIcon className="size-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => requestLogin("/")} className="mt-4 w-full">
                    Login
                  </Button>
                )}
                <Button variant="default" asChild className="mt-2 w-full">
                  <a href="#contact">Request a Consultation</a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

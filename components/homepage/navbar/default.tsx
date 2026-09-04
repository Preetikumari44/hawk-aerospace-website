"use client";

import { Menu } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navLinks } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";

import HawkLogo from "../../logos/hawk";

export default function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);

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
                <Button variant="default" asChild className="mt-4 w-full">
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

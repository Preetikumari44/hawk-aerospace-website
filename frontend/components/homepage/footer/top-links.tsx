"use client";

import { usePathname } from "next/navigation";

import { footerTopLinks } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";

// Quick links at the top of the footer (Distributor Application, Contact Us).
// The current page is worked out from the real pathname, so it survives a refresh
// and a direct visit to the URL.
function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function FooterTopLinks() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Quick links"
      className="mb-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-white/12 pb-6"
    >
      {footerTopLinks.map((link) => {
        const active = isCurrent(pathname, link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mx-2.5 -my-1 w-fit rounded-md px-2.5 py-1 text-[15px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#9ec6a5] focus-visible:outline-hidden",
              active
                ? "bg-white/10 text-[#a6d7b4] underline decoration-[#5fbf7f] decoration-2 underline-offset-[6px]"
                : "text-white hover:text-[#9ec6a5]",
            )}
          >
            {link.text}
          </a>
        );
      })}
    </nav>
  );
}

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
      className="mb-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-[#d3dfe9] pb-5"
    >
      {footerTopLinks.map((link) => {
        const active = isCurrent(pathname, link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mx-2.5 -my-1 w-fit rounded-md px-2.5 py-1 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#244e70] focus-visible:outline-hidden",
              active
                ? "bg-white text-[#244e70] underline decoration-[#34745a] decoration-2 underline-offset-[6px]"
                : "text-[#1b3a57] hover:text-[#244e70]",
            )}
          >
            {link.text}
          </a>
        );
      })}
    </nav>
  );
}

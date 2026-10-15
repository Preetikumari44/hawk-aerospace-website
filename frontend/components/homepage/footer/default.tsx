import { Globe, Mail } from "lucide-react";
import Image from "next/image";

import { siteConfig } from "@/config/site";
import { footerColumns, PLATFORMS_ROUTE } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";

import FooterTopLinks from "./top-links";

// Deep forest-green footer (never pure black), with fixed colours of its own
// so it reads identically on the ivory marketing pages and on any darker
// surface. About now lives here, after being removed from the header.
export default function FooterSection({ className }: { className?: string }) {
  return (
    <footer
      className={cn("w-full px-4 text-[#e8eee8]", className)}
      style={{
        background: "linear-gradient(180deg, #0f4030 0%, #0b2f22 55%, #08251b 100%)",
      }}
    >
      <div className="max-w-container mx-auto pt-14 pb-6">
        <FooterTopLinks />

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Image src="/images/hawk-icon.png" alt="" aria-hidden="true" width={311} height={360} className="h-10 w-auto" />
              <span className="text-xl font-semibold tracking-tight text-white">Hawk Aerospace</span>
            </div>
            <p className="max-w-[300px] text-sm leading-relaxed text-[#c3d5c6]">
              Drone-powered reality capture, AI analytics and cloud platforms for
              real estate and agriculture.
            </p>
            <div className="flex flex-col gap-2 text-sm text-[#c3d5c6]">
              <a
                href={siteConfig.url}
                className="flex items-center gap-2 rounded-md transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#9ec6a5] focus-visible:outline-hidden"
              >
                <Globe className="size-4" />
                www.hawkaerospace.in
              </a>
              <a
                href={siteConfig.contactHref}
                className="flex items-center gap-2 rounded-md transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#9ec6a5] focus-visible:outline-hidden"
              >
                <Mail className="size-4" />
                {siteConfig.email}
              </a>
            </div>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-[0.12em] text-white uppercase">
                {column.title}
              </h3>
              {column.links.map((link) => (
                <a
                  key={`${link.href}-${link.text}`}
                  href={link.href}
                  {...(link.href === PLATFORMS_ROUTE
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="w-fit rounded-md text-[15px] text-[#c3d5c6] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#9ec6a5] focus-visible:outline-hidden"
                >
                  {link.text}
                </a>
              ))}
            </nav>
          ))}

        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 border-t border-white/12 pt-8 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold tracking-[0.12em] text-white uppercase">
              Registered Office — India
            </h3>
            <p className="text-xs leading-relaxed text-[#b3c8b7]">
              Hawk Aerospace Private Limited
              <br />
              Sambhav, C-20, G Block Rd, BKC, Bandra Kurla Complex, Bandra East,
              Mumbai, Maharashtra, India – 400051
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold tracking-[0.12em] text-white uppercase">
              Registered Office — United Kingdom
            </h3>
            <p className="text-xs leading-relaxed text-[#b3c8b7]">
              Hawk Aerosystem Limited
              <br />
              71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/12 pt-5 text-xs text-[#b3c8b7] sm:flex-row">
          <div>
            © {new Date().getFullYear()} Hawk Aerospace Private Limited. All rights reserved.
          </div>
          <div className="flex items-center gap-5">
            <a href="/about" className="transition-colors hover:text-white">
              About
            </a>
            <a
              href={PLATFORMS_ROUTE}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              Platforms
            </a>
            <a href="/#contact" className="transition-colors hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

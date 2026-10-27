import { Globe, Mail } from "lucide-react";
import Image from "next/image";
import type { ReactElement } from "react";

import { siteConfig } from "@/config/site";
import { footerColumns, PLATFORMS_ROUTE } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";

import FooterTopLinks from "./top-links";

// Official Hawk Aerospace social profiles, supplied by the company.
// Verification status (checked during this refinement):
//  - YouTube: resolves to the "Hawk Aerospace" aviation & aerospace channel — verified.
//  - LinkedIn / X / Instagram: could not be verified automatically (bot-protection / robots restrictions);
//    kept exactly as supplied — please confirm they open the intended accounts.
//  - Facebook: no URL supplied and none verified, so it is intentionally omitted (never invent one).
type SocialIcon = (props: { className?: string }) => ReactElement;

const InstagramIcon: SocialIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
    aria-hidden
  >
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const LinkedInIcon: SocialIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" />
  </svg>
);
const XIcon: SocialIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const YouTubeIcon: SocialIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
    aria-hidden
  >
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" />
  </svg>
);

const socialLinks: { label: string; href: string; Icon: SocialIcon }[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/hawkaerospacein?cplk=MTRhdmZlbDVyZ2Jpag==",
    Icon: InstagramIcon,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/hawkaerospace/",
    Icon: LinkedInIcon,
  },
  { label: "X", href: "https://x.com/HawkAerospace", Icon: XIcon },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@HawkAerospace",
    Icon: YouTubeIcon,
  },
];

// Light corporate footer: pale-blue surface, dark slate text and a fine top
// border. It carries fixed colours of its own so it reads identically on every
// page, whatever section scope surrounds it. About lives here, after being
// removed from the header.
export default function FooterSection({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "w-full border-t border-[#dce5ec] bg-[#eaf1f7] px-4 text-[#263442]",
        className,
      )}
    >
      <div className="max-w-container mx-auto pt-12 pb-6">
        <FooterTopLinks />

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-2 lg:pr-6">
            <div className="flex items-center gap-2">
              <Image
                src="/images/hawk-icon.png"
                alt=""
                aria-hidden="true"
                width={311}
                height={360}
                className="h-9 w-auto"
              />
              <span className="text-lg font-semibold tracking-tight text-[#1b3a57]">
                Hawk Aerospace
              </span>
            </div>
            <p className="max-w-[320px] text-sm leading-6 text-[#455666]">
              Drone-powered reality capture, AI analytics and cloud platforms
              for real estate and agriculture.
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-[#455666]">
              <a
                href={siteConfig.url}
                className="flex items-center gap-2 rounded-md transition-colors hover:text-[#244e70] focus-visible:ring-2 focus-visible:ring-[#244e70] focus-visible:outline-hidden"
              >
                <Globe className="size-4" />
                www.hawkaerospace.in
              </a>
              <a
                href={siteConfig.contactHref}
                className="flex items-center gap-2 rounded-md transition-colors hover:text-[#244e70] focus-visible:ring-2 focus-visible:ring-[#244e70] focus-visible:outline-hidden"
              >
                <Mail className="size-4" />
                {siteConfig.email}
              </a>
            </div>
          </div>

          {footerColumns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="flex min-w-0 flex-col gap-3"
            >
              <h3 className="mb-1 text-xs font-semibold tracking-[0.14em] text-[#1b3a57] uppercase">
                {column.title}
              </h3>
              {column.links.map((link) => (
                <a
                  key={`${link.href}-${link.text}`}
                  href={link.href}
                  {...(link.href === PLATFORMS_ROUTE
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="w-fit rounded-md text-sm leading-5 text-[#455666] transition-colors hover:text-[#244e70] hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#244e70] focus-visible:outline-hidden"
                >
                  {link.text}
                </a>
              ))}
            </nav>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 border-t border-[#d3dfe9] pt-8 sm:grid-cols-2 sm:gap-0">
          <div className="flex flex-col gap-2 sm:pr-8">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-[#1b3a57] uppercase">
              Registered Office — India
            </h3>
            <p className="text-sm leading-6 text-[#455666]">
              Hawk Aerospace Private Limited
              <br />
              Sambhav, C-20, G Block Rd, BKC, Bandra Kurla Complex, Bandra East,
              Mumbai, Maharashtra, India – 400051
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:border-l sm:border-[#d3dfe9] sm:pl-8">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-[#1b3a57] uppercase">
              Registered Office — United Kingdom
            </h3>
            <p className="text-sm leading-6 text-[#455666]">
              Hawk Aerosystem Limited
              <br />
              71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H
              9JQ
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-[#d3dfe9] pt-6 sm:items-start">
          <ul
            className="flex items-center gap-2.5"
            aria-label="Hawk Aerospace on social media"
          >
            {socialLinks.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Hawk Aerospace on ${label} (opens in a new tab)`}
                  title={label}
                  className="flex size-9 items-center justify-center rounded-full border border-[#c5d4e1] bg-white/60 text-[#244e70] transition-colors hover:border-[#244e70] hover:bg-[#244e70] hover:text-white focus-visible:ring-2 focus-visible:ring-[#244e70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eaf1f7] focus-visible:outline-hidden"
                >
                  <Icon className="size-[17px]" />
                </a>
              </li>
            ))}
          </ul>
          <div className="flex w-full flex-col items-center justify-between gap-3 border-t border-[#d3dfe9] pt-4 text-center text-[13px] leading-5 text-[#455666] sm:flex-row sm:text-left">
            <div>
              © {new Date().getFullYear()} Hawk Aerospace Private Limited. All
              rights reserved.
            </div>
            <div className="flex items-center gap-5">
              <a
                href="/about"
                className="transition-colors hover:text-[#244e70]"
              >
                About
              </a>
              <a
                href={PLATFORMS_ROUTE}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[#244e70]"
              >
                Platforms
              </a>
              <a
                href="/#contact"
                className="transition-colors hover:text-[#244e70]"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { Globe, Mail } from "lucide-react";

import { siteConfig } from "@/config/site";
import { footerColumns, SKYMAP_ROUTE } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";

import HawkLogo from "../../logos/hawk";
import { Footer, FooterBottom, FooterColumn, FooterContent } from "../../ui/footer";

export default function FooterSection({ className }: { className?: string }) {
  return (
    <footer className={cn("bg-background w-full px-4", className)}>
      <div className="max-w-container mx-auto">
        <Footer>
          <FooterContent>
            <FooterColumn className="col-span-2 sm:col-span-3 md:col-span-2">
              <div className="flex items-center gap-2">
                <HawkLogo className="text-brand" />
                <h3 className="text-lg font-bold tracking-tight">
                  Hawk Aerospace
                </h3>
              </div>
              <p className="text-muted-foreground max-w-[300px] text-sm">
                Drone-powered reality capture, AI analytics and cloud
                platforms for real estate and agriculture.
              </p>
              <div className="text-muted-foreground flex flex-col gap-2 text-sm">
                <a href={siteConfig.url} className="hover:text-foreground flex items-center gap-2">
                  <Globe className="size-4" />
                  www.hawkaerospace.in
                </a>
                <a href={siteConfig.contactHref} className="hover:text-foreground flex items-center gap-2">
                  <Mail className="size-4" />
                  {siteConfig.email}
                </a>
              </div>
            </FooterColumn>
            {footerColumns.map((column) => (
              <FooterColumn key={column.title}>
                <h3 className="text-md pt-1 font-semibold">{column.title}</h3>
                {column.links.map((link) => (
                  <a
                    key={`${link.href}-${link.text}`}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
                  >
                    {link.text}
                  </a>
                ))}
              </FooterColumn>
            ))}
            <FooterColumn className="col-span-2 sm:col-span-3 md:col-span-1">
              <h3 className="text-md pt-1 font-semibold">Registered Offices</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                <span className="text-foreground/80 font-medium">
                  Hawk Aerospace Private Limited
                </span>
                <br />
                Sambhav, C-20, G Block Rd, BKC, Bandra Kurla Complex,
                Bandra East, Mumbai, Maharashtra, India – 400051
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                <span className="text-foreground/80 font-medium">
                  Hawk Aerosystem Limited
                </span>
                <br />
                71-75 Shelton Street, Covent Garden, London, United Kingdom,
                WC2H 9JQ
              </p>
            </FooterColumn>
          </FooterContent>
          <FooterBottom>
            <div>
              © {new Date().getFullYear()} Hawk Aerospace Private Limited. All
              rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <a href="#solutions">Solutions</a>
              <a href={SKYMAP_ROUTE}>Platforms</a>
              <a href="#contact">Contact</a>
            </div>
          </FooterBottom>
        </Footer>
      </div>
    </footer>
  );
}

"use client";

import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { AerialScene } from "@/components/visuals/aerial-scene";
import { siteConfig } from "@/config/site";
import { platforms } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";

import { Button } from "../../ui/button";

// The two Hawk products, presented as two serious platform cards.
//
// SkyMap links to its EXISTING route and opens in a new tab; SkyMap's own UI
// is untouched. AgriSure has no application route in this project yet, so its
// card intentionally routes to the existing contact address instead of an
// invented URL.
interface PlatformCardsProps {
  /** Optional section header — passed on the homepage, omitted on /platforms
   *  where the page already has its own hero. */
  eyebrow?: string;
  heading?: string;
}

export function PlatformCards({ eyebrow, heading }: PlatformCardsProps = {}) {
  return (
    <section id="platforms" className="px-4 py-14 sm:py-20">
      <div className="max-w-container mx-auto flex flex-col gap-8">
        {(eyebrow || heading) && (
          <div className="flex max-w-[680px] flex-col gap-2">
            {eyebrow && (
              <span className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">
                {eyebrow}
              </span>
            )}
            {heading && (
              <h2 className="text-3xl font-semibold text-balance sm:text-4xl">{heading}</h2>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {platforms.map((platform) => {
          const isSkyMap = platform.key === "skymap";
          const hasRoute = Boolean(platform.href);
          return (
            <article
              key={platform.key}
              className="group border-border bg-card hover:border-brand/50 flex flex-col overflow-hidden rounded-3xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="relative h-48 overflow-hidden sm:h-56">
                {isSkyMap ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- existing static asset, no layout-shift concern inside a fixed-height banner */}
                    <img
                      src="/images/skymap-hero.png"
                      alt=""
                      aria-hidden
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(140deg, rgba(18,53,36,0.72) 0%, rgba(47,111,235,0.42) 100%)",
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      aria-hidden
                      className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
                    >
                      <AerialScene variant="fields" />
                    </div>
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(140deg, rgba(11,36,24,0.72) 0%, rgba(20,96,63,0.42) 100%)",
                      }}
                    />
                  </>
                )}
                <span className="absolute bottom-4 left-5 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
                  {platform.name}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                <p className="text-brand text-sm font-semibold">{platform.tagline}</p>
                <p className="text-foreground/90 text-[15px] leading-relaxed">
                  {platform.description}
                </p>

                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {platform.capabilities.map((capability) => (
                    <li key={capability} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="text-brand mt-0.5 size-4 shrink-0" />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>

                <div className="border-border/70 mt-auto flex flex-wrap gap-6 border-t pt-5">
                  {platform.stats.map((stat) => (
                    <div key={stat.label} className="flex flex-col">
                      <span className="text-foreground text-lg font-bold">{stat.value}</span>
                      <span className="text-muted-foreground text-xs">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {hasRoute ? (
                  <Button asChild size="lg" className="h-12 w-full text-base sm:w-auto sm:self-start sm:px-7">
                    <a href={platform.href} target="_blank" rel="noopener noreferrer">
                      Open {platform.name.replace("™", "")}
                      <ArrowRightIcon
                        className={cn(
                          "size-4 transition-transform duration-200",
                          "group-hover:translate-x-1 motion-reduce:transform-none",
                        )}
                      />
                    </a>
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="h-12 w-full text-base sm:w-auto sm:self-start sm:px-7"
                    >
                      <a href={siteConfig.contactHref}>
                        Request {platform.name.replace("™", "")} Access
                        <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
                      </a>
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      AgriSure access is arranged with the Hawk Aerospace team.
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        </div>
      </div>
    </section>
  );
}

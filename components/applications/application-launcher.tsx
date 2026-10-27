import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { siteConfig } from "@/config/site";
import { platforms, SKYMAP_ROUTE } from "@/lib/data/hawk";

// Applications launcher cards. Content comes from the existing `platforms` data (no new copy or numbers).
//
// SkyMap  -> its existing route (SKYMAP_ROUTE), opened in a new tab; SkyMap itself is untouched.
// AgriSure -> the project has no AgriSure route, so the destination is read from the AGRISURE_URL environment
//             variable. When it is not set (or is not an http/https URL) the card shows an unavailable state
//             instead of a link, so no broken or invented destination is ever presented as working.

function resolveAgriSureUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function ApplicationLauncher() {
  const agriSureUrl = resolveAgriSureUrl(process.env.AGRISURE_URL);

  return (
    <section id="applications" className="px-4 py-12 sm:py-16">
      <div className="max-w-container mx-auto grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {platforms.map((platform) => {
          const isSkyMap = platform.key === "skymap";
          const href = isSkyMap ? SKYMAP_ROUTE : agriSureUrl;
          const shortName = platform.name.replace("™", "");
          return (
            <article
              key={platform.key}
              className="group border-border bg-card hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(11,36,24,0.06),0_8px_24px_-16px_rgba(11,36,24,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(11,36,24,0.4)] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="relative h-48 overflow-hidden sm:h-56">
                {isSkyMap ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- existing static asset inside a fixed-height banner */}
                    <img
                      src="/images/skymap-hero.png"
                      alt=""
                      aria-hidden
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(140deg, rgba(11,36,24,0.72) 0%, rgba(20,96,63,0.42) 100%)" }}
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
                      style={{ background: "linear-gradient(140deg, rgba(11,36,24,0.72) 0%, rgba(20,96,63,0.42) 100%)" }}
                    />
                  </>
                )}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-2/3"
                  style={{ background: "linear-gradient(to top, rgba(6,24,16,0.7) 0%, rgba(6,24,16,0) 100%)" }}
                />
                <span className="absolute bottom-5 left-6 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
                  {platform.name}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
                <p className="text-brand text-sm font-semibold tracking-[0.01em]">{platform.tagline}</p>
                <p className="text-foreground/85 text-[15px] leading-7">{platform.description}</p>

                <ul className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {platform.capabilities.map((capability) => (
                    <li key={capability} className="flex items-start gap-2.5 text-sm leading-5">
                      <span className="bg-brand/12 mt-px grid size-5 shrink-0 place-items-center rounded-full">
                        <CheckIcon className="text-brand size-3" strokeWidth={3} />
                      </span>
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>

                <div className="border-border/70 mt-auto flex flex-col gap-2 border-t pt-5">
                  {href ? (
                    <Button asChild size="lg" className="h-11 w-full rounded-lg text-sm font-semibold sm:w-auto sm:self-start sm:px-7">
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        Launch {shortName}
                        <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
                      </a>
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled
                        className="h-11 w-full rounded-lg text-sm font-semibold sm:w-auto sm:self-start sm:px-7"
                      >
                        {shortName} launch unavailable
                      </Button>
                      <p className="text-muted-foreground text-xs">
                        The {shortName} launch address has not been configured yet. Access is arranged with the Hawk
                        Aerospace team —{" "}
                        <a href={siteConfig.contactHref} className="text-brand underline-offset-4 hover:underline">
                          {siteConfig.email}
                        </a>
                        .
                      </p>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

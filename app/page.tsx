import { BookingHub } from "../components/booking/booking-hub";
import CapabilityStrip from "../components/homepage/capability-strip/default";
import CTA from "../components/homepage/cta/default";
import FooterSection from "../components/homepage/footer/default";
import Hardware from "../components/homepage/hardware/default";
import { HawkForestBackdrop } from "../components/homepage/hawk-forest-backdrop";
import { AerialHeroBackdrop } from "../components/homepage/hero/aerial-hero-backdrop";
import Hero from "../components/homepage/hero/default";
import HowWhy from "../components/homepage/how-why/default";
import MarketplaceTeaser from "../components/homepage/marketplace-teaser/default";
import Navbar from "../components/homepage/navbar/default";
import Pipeline from "../components/homepage/pipeline/default";
import Solutions from "../components/homepage/solutions/default";
import { LayoutLines } from "../components/ui/layout-lines";

// STRICT THEME-ONLY / HOMEPAGE-ONLY PASS.
//
// Section order, content and components below are unchanged from the
// original project (Navbar, BookingHub, Hero, CapabilityStrip, Pipeline,
// Solutions, Hardware, MarketplaceTeaser, HowWhy, CTA, Footer — nothing
// reordered, added or removed).
//
// LATEST PASS: the very first section (Book a Raider) was redesigned to
// match a supplied reference image — light aerial-landscape backdrop
// (AerialHeroBackdrop) instead of the flat dark-forest fill, wrapped in the
// new `.hawk-aerial` light token scope (see app/globals.css) instead of
// `.hawk-forest`. This only affects this one section: every other section
// below keeps its existing palette scope untouched, and the CTA section
// keeps `.hawk-forest` + `HawkForestBackdrop` exactly as before.
export default function Home() {
  return (
    <main className="hawk-theme bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />

      {/* `isolate` forces this wrapper to establish its own stacking
          context. Without it, `position:relative` + `z-index:auto` does
          NOT create one (a common CSS gotcha), so AerialHeroBackdrop's
          `-z-10` escapes past this div entirely and gets painted behind
          <main>'s own `bg-background` instead of just behind BookingHub —
          i.e. the backdrop silently renders with zero visible effect. Every
          other `hawk-forest`/`hawk-aerial` backdrop wrapper in this codebase
          (app/platforms/page.tsx, customer-welcome.tsx) already includes
          `isolate`; this one and the CTA wrapper below were missing it. */}
      <div className="hawk-aerial relative isolate">
        <AerialHeroBackdrop />
        <BookingHub />
      </div>

      <div className="hawk-sage">
        <Hero />
      </div>

      <div className="hawk-mist">
        <CapabilityStrip />
      </div>

      <div className="hawk-sage">
        <Pipeline />
      </div>

      <div className="hawk-sand">
        <Solutions />
      </div>

      <div className="hawk-mist">
        <Hardware />
      </div>

      <div className="hawk-sand">
        <MarketplaceTeaser />
      </div>

      <div className="hawk-sage">
        <HowWhy />
      </div>

      {/* Same `isolate` fix as the booking-hub wrapper above — otherwise
          HawkForestBackdrop's `-z-10` also escapes behind <main>'s
          background instead of staying local to this CTA section. */}
      <div className="hawk-sage relative isolate">
        <HawkForestBackdrop />
        <CTA />
      </div>

      <FooterSection />
    </main>
  );
}

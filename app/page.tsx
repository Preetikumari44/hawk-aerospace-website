import CapabilityStrip from "../components/homepage/capability-strip/default";
import CTA from "../components/homepage/cta/default";
import Footer from "../components/homepage/footer/default";
import Hardware from "../components/homepage/hardware/default";
import Hero from "../components/homepage/hero/default";
import HowWhy from "../components/homepage/how-why/default";
import Navbar from "../components/homepage/navbar/default";
import Pipeline from "../components/homepage/pipeline/default";
import Solutions from "../components/homepage/solutions/default";
import { LayoutLines } from "../components/ui/layout-lines";

export default function Home() {
  return (
    <main className="bg-background text-foreground min-h-screen w-full">
      <LayoutLines />
      <Navbar />
      <Hero />
      <CapabilityStrip />
      <Pipeline />
      <Solutions />
      <Hardware />
      <HowWhy />
      <CTA />
      <Footer />
    </main>
  );
}

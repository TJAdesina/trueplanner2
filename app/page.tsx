import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Problem } from "@/components/landing/Problem";
import { Solution } from "@/components/landing/Solution";
import { CoreActions } from "@/components/landing/CoreActions";
import { Demo } from "@/components/landing/Demo";
import { Features } from "@/components/landing/Features";
import { Audience } from "@/components/landing/Audience";
import { EmotionalPositioning } from "@/components/landing/EmotionalPositioning";
import { EndOfDaySection } from "@/components/landing/EndOfDaySection";
import { FounderNote } from "@/components/landing/FounderNote";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main>
      <Nav />
      <Hero />
      <TrustStrip />
      <Problem />
      <Solution />
      <CoreActions />
      <Demo />
      <Features />
      <Audience />
      <EmotionalPositioning />
      <EndOfDaySection />
      <FounderNote />
      <FinalCTA />
      <Footer />
    </main>
  );
}

import { FinalCtaSection } from "./FinalCtaSection";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { LandingFooter } from "./LandingFooter";
import { LandingNavbar } from "./LandingNavbar";
import { TrustSection } from "./TrustSection";

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-night text-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <TrustSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}

export { FinalCtaSection } from "./FinalCtaSection";
export { HeroSection } from "./HeroSection";
export { HowItWorksSection } from "./HowItWorksSection";
export { LandingFooter } from "./LandingFooter";
export { LandingNavbar } from "./LandingNavbar";
export { TrustSection } from "./TrustSection";

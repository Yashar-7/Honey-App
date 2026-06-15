import { BenefitsSection } from "./BenefitsSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { LandingFooter } from "./LandingFooter";
import { LandingNavbar } from "./LandingNavbar";
import { SocialProofSection } from "./SocialProofSection";
import { StickyMobileCta } from "./StickyMobileCta";
import { TrustSection } from "./TrustSection";

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-night text-white">
      <LandingNavbar />
      <main className="pb-6 md:pb-0">
        <HeroSection />
        <SocialProofSection />
        <HowItWorksSection />
        <BenefitsSection />
        <TrustSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
      <StickyMobileCta />
    </div>
  );
}

export { BenefitsSection } from "./BenefitsSection";
export { FinalCtaSection } from "./FinalCtaSection";
export { HeroSection } from "./HeroSection";
export { HowItWorksSection } from "./HowItWorksSection";
export { LandingFooter } from "./LandingFooter";
export { LandingNavbar } from "./LandingNavbar";
export { LoginLink } from "./LoginLink";
export { PrimaryCta } from "./PrimaryCta";
export { SocialProofSection } from "./SocialProofSection";
export { TestimonialsMarquee } from "./TestimonialsMarquee";
export { TESTIMONIALS } from "./testimonials";
export { StickyMobileCta } from "./StickyMobileCta";
export { TrustSection } from "./TrustSection";

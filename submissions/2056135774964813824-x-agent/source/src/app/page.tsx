import { LandingTopNav } from "@/components/landing/top-nav";
import { LandingHero } from "@/components/landing/hero";
import { AgentOrbit } from "@/components/landing/agent-orbit";
import { ResearchExample } from "@/components/landing/research-example";
import { SkillsGrid } from "@/components/landing/skills-grid";
import { NarrativesPreview } from "@/components/landing/narratives-preview";
import { HowItWorks } from "@/components/landing/how-it-works";
import { OpenSourceCta } from "@/components/landing/open-source-cta";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <LandingTopNav />

      <LandingHero />

      <section id="agents" className="scroll-mt-24">
        <AgentOrbit />
      </section>

      <ResearchExample />

      <section id="skills" className="scroll-mt-24">
        <SkillsGrid />
      </section>

      <section id="narratives" className="scroll-mt-24">
        <NarrativesPreview />
      </section>

      <section id="how" className="scroll-mt-24">
        <HowItWorks />
      </section>

      <OpenSourceCta />

      <LandingFooter />
    </main>
  );
}

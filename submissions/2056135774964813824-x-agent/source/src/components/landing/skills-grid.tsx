"use client";

import { SkillCard } from "@/components/skill-card";
import { SectionHeader } from "@/components/landing/agent-orbit";
import { SKILLS } from "@/lib/skills";

export function SkillsGrid() {
  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
      <SectionHeader
        kicker="OKX skills · native"
        title="Skills your agents already know how to invoke"
        body="Every agent can reach OKX's public skill surface — DEX market data, on-chain gateway, wallet portfolio, dApp discovery, bridge routes, security checks. No new credentials, no glue code."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((s) => (
          <SkillCard key={s.id} skill={s} />
        ))}
      </div>
    </section>
  );
}

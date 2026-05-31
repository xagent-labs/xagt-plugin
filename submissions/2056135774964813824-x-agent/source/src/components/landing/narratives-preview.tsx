"use client";

import { NarrativeCard } from "@/components/narrative-card";
import { SectionHeader } from "@/components/landing/agent-orbit";
import { NARRATIVES } from "@/lib/narratives";

export function NarrativesPreview() {
  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
      <SectionHeader
        kicker="Autonomous narratives"
        title="The themes moving capital — detected, scored, kept honest"
        body="Narratives emerge from what crawlers actually read on the open web — not paid feeds. Momentum, sentiment and volume are continuously re-scored as new sources land."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NARRATIVES.slice(0, 8).map((n) => (
          <NarrativeCard key={n.id} narrative={n} />
        ))}
      </div>
    </section>
  );
}

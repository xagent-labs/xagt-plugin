"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { SKILLS } from "@/lib/skills";
import { SkillCard } from "@/components/skill-card";
import { PageHeader, PageShell } from "@/components/app/page-header";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "all",
  "dex",
  "wallet",
  "signal",
  "strategy",
  "dapp",
  "security",
  "onchain",
  "portfolio",
  "bridge",
] as const;

type Cat = (typeof CATEGORIES)[number];

export default function SkillsPage() {
  const [cat, setCat] = useState<Cat>("all");
  const visible = cat === "all" ? SKILLS : SKILLS.filter((s) => s.category === cat);
  const installed = SKILLS.filter((s) => s.installed).length;

  return (
    <PageShell>
      <PageHeader
        kicker="okx + native skills"
        tone="warning"
        title="Skills"
        description="Reusable capabilities your agents can invoke. Pre-wired to OKX skills — every skill exposes a stable JSON interface to the agent runtime."
        actions={
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 font-mono text-[11px] backdrop-blur-md sm:flex">
            <Wrench className="h-3 w-3 text-warning" />
            <span className="text-foreground">{installed}</span>
            <span className="text-muted-foreground">installed</span>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
              cat === c
                ? "border-electric/40 bg-electric/10 text-electric"
                : "border-border bg-card/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
          >
            <SkillCard skill={s} />
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}

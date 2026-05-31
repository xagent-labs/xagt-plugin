"use client";

import { motion } from "framer-motion";
import { Bot, Cpu, Network, Radio } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { AgentCard } from "@/components/agent-card";
import { PageHeader, PageShell } from "@/components/app/page-header";

const META = [
  { label: "Agents online", value: AGENTS.length.toString(), icon: Bot },
  { label: "Topology", value: "hierarchical-mesh", icon: Network },
  { label: "Routing", value: "openrouter", icon: Radio },
  { label: "Coordination", value: "SendMessage", icon: Cpu },
];

export default function AgentsPage() {
  return (
    <PageShell>
      <PageHeader
        kicker="agent fleet"
        tone="electric"
        title="Agents"
        description="Specialized autonomous agents coordinated over a hierarchical-mesh topology. Each agent owns its skills, model and reasoning trace."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {META.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3 w-3 text-electric" />
                {m.label}
              </div>
              <div className="mt-2 text-base font-medium">{m.value}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
          >
            <AgentCard agent={a} />
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}

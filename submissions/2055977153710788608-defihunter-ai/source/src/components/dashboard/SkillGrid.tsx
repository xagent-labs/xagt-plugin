"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NeonCard } from "@/components/ui/NeonCard";
import { listSkills } from "@/lib/api/client";

export function SkillGrid() {
  const [skills, setSkills] = useState<
    { id: string; name: string; description: string; category: string }[]
  >([]);

  useEffect(() => {
    listSkills()
      .then((r) => setSkills(r.skills))
      .catch(() => setSkills([]));
  }, []);

  return (
    <NeonCard title="Skill Modules" delay={0.25}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {skills.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ borderColor: "rgba(0,255,136,0.5)" }}
            className="rounded border border-hunter-border p-2 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-hunter-cyan">{s.category}</span>
              <span className="text-[9px] text-hunter-muted">MCP</span>
            </div>
            <p className="mt-1 text-xs font-bold text-hunter-neon">{s.name}</p>
            <p className="mt-1 line-clamp-2 text-[10px] text-hunter-muted">{s.description}</p>
          </motion.div>
        ))}
      </div>
    </NeonCard>
  );
}

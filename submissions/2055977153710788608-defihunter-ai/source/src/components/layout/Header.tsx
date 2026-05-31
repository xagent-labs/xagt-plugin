"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function Header() {
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setLive(d.liveEnabled === true))
      .catch(() => setLive(false));
  }, []);
  return (
    <header className="flex items-center justify-between border-b border-hunter-border bg-hunter-panel/60 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <motion.div
          className="flex h-10 w-10 items-center justify-center rounded border border-hunter-neon/50 bg-hunter-neon/5 font-display text-lg font-black text-hunter-neon shadow-neon"
          animate={{ boxShadow: ["0 0 10px rgba(0,255,136,0.2)", "0 0 25px rgba(0,255,136,0.4)", "0 0 10px rgba(0,255,136,0.2)"] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          DH
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="font-display text-xl font-black tracking-wider text-hunter-neon">
            DEFIHUNTER AI
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-hunter-muted">
            On-Chain Opportunity OS
          </p>
        </motion.div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge
          label={live ? "Live APIs" : "Mock Fallback"}
          variant={live ? "success" : "warning"}
        />
        <StatusBadge label="Skill OS v1.2" variant="neutral" />
        <motion.span
          className="h-2 w-2 rounded-full bg-hunter-neon"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-xs text-hunter-muted">LIVE</span>
      </div>
    </header>
  );
}

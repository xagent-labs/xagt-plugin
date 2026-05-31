"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { ReactNode } from "react";

interface NeonCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  delay?: number;
}

export function NeonCard({ title, children, className, glow, delay = 0 }: NeonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={clsx(
        "relative overflow-hidden rounded-lg border border-hunter-border bg-hunter-panel/80 backdrop-blur-sm",
        glow && "shadow-neon",
        className
      )}
    >
      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hunter-neon to-transparent opacity-60"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {title && (
        <motion.div
          className="border-b border-hunter-border px-4 py-2 font-display text-xs font-bold uppercase tracking-widest text-hunter-neon"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {title}
        </motion.div>
      )}
      <motion.div className="p-4">{children}</motion.div>
    </motion.div>
  );
}

"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Particles } from "./Particles";

export function LoadingIntro() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 2200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 350);
    };
    raf = requestAnimationFrame(tick);
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (done) document.documentElement.style.overflow = "";
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.65, 0, 0.35, 1] } }}
          className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden noise-texture"
          style={{
            width: "100vw",
            height: "100dvh",
            minHeight: "100vh",
            background: "radial-gradient(900px 600px at 50% 40%, rgba(59, 130, 246, 0.18), transparent 60%), #0F172A",
          }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 260 / 0.6), transparent)" }}
            />
            <div className="absolute inset-0 grid-texture opacity-20" />
          </div>
          <Particles count={26} color="oklch(0.82 0.11 220)" />

          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <span className="absolute inset-0 rounded-full bg-electric/30 blur-2xl animate-pulse-ring" />
              <Image src="/aegis-mark.png" alt="PhylaX" width={120} height={120} className="relative w-[110px] h-[110px] drop-shadow-2xl" priority />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-10 font-display text-3xl font-semibold tracking-tight text-white tabular-nums"
            >
              {progress.toString().padStart(3, "0")}
              <span className="text-white/40">%</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-6 h-px w-[260px] md:w-[360px] bg-white/10 overflow-hidden relative"
            >
              <div
                className="h-full bg-gradient-to-r from-transparent via-white to-white/80"
                style={{ width: `${progress}%`, boxShadow: "0 0 18px oklch(0.82 0.11 220 / 0.8)", transition: "width 80ms linear" }}
              />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-6 text-[10px] uppercase tracking-[0.4em] text-white/40"
            >
              Initializing intelligence layer
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";

type Props = {
  count?: number;
  className?: string;
  color?: string;
};

type Particle = {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
};

export function Particles({ count = 18, className = "", color = "oklch(0.62 0.19 260)" }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setParticles(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: 60 + Math.random() * 40,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 6,
        size: 1 + Math.random() * 2,
      }))
    );
  }, [count]);

  if (particles.length === 0) return null;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-particle-rise"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            willChange: "transform, opacity",
            contain: "strict",
          }}
        />
      ))}
    </div>
  );
}

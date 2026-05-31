"use client";
import { useState, useEffect } from "react";

type Particle = { id: number; left: number; top: number; delay: number; duration: number; size: number };
type Props = { count?: number; className?: string; color?: string };

export function Particles({ count = 18, className = "", color = "oklch(0.62 0.19 260)" }: Props) {
  // Initialize as empty so server HTML and first client render are identical — no hydration mismatch.
  // Particles are purely decorative (aria-hidden) so the empty-on-first-paint is invisible to users.
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Math.random() runs only after mount — never during SSR or initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Return stable empty container until mounted — layout stays consistent.
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
            boxShadow: `0 0 8px ${color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

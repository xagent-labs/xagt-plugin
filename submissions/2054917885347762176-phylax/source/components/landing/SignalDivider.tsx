"use client";
export function SignalDivider() {
  return (
    <div className="relative w-full h-px overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-line)" }} />
      <div
        className="absolute inset-y-0 w-1/3 animate-signal-flow"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.62 0.19 260), oklch(0.82 0.11 220), transparent)",
          filter: "blur(0.5px)",
        }}
      />
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute top-1/2 -translate-y-1/2 h-1 w-1 rounded-full"
          style={{
            background: "oklch(0.62 0.19 260)",
            boxShadow: "0 0 8px oklch(0.62 0.19 260)",
            animation: `signal-flow ${4 + i}s linear ${i * 1.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

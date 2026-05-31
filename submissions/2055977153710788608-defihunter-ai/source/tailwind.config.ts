import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hunter: {
          bg: "#0a0e0f",
          panel: "#0d1412",
          border: "#1a2f28",
          neon: "#00ff88",
          neonDim: "#00cc6a",
          cyan: "#00e5ff",
          amber: "#ffb800",
          danger: "#ff3366",
          muted: "#5a7a6e",
          text: "#c8e6d0",
        },
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        display: ["var(--font-orbitron)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 255, 136, 0.25)",
        "neon-lg": "0 0 40px rgba(0, 255, 136, 0.35)",
      },
      animation: {
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
        scan: "scan 3s linear infinite",
        flicker: "flicker 4s linear infinite",
      },
      keyframes: {
        "pulse-neon": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.85" },
          "94%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
        bullish: "hsl(var(--bullish) / <alpha-value>)",
        bearish: "hsl(var(--bearish) / <alpha-value>)",
        electric: "hsl(var(--electric) / <alpha-value>)",
        plasma: "hsl(var(--plasma) / <alpha-value>)",
        cyan: "hsl(var(--cyan) / <alpha-value>)",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--electric)/0.35), 0 0 24px hsl(var(--electric)/0.25)",
        "glow-lg": "0 0 0 1px hsl(var(--electric)/0.45), 0 0 60px hsl(var(--electric)/0.35)",
        inset: "inset 0 1px 0 0 hsl(var(--foreground)/0.04)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse at top, hsl(var(--electric)/0.12), transparent 60%), radial-gradient(ellipse at bottom, hsl(var(--plasma)/0.08), transparent 60%)",
        "noise":
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        "shimmer":
          "linear-gradient(90deg, transparent 0%, hsl(var(--electric)/0.08) 20%, hsl(var(--plasma)/0.12) 50%, hsl(var(--electric)/0.08) 80%, transparent 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "ticker": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "orbit": {
          "0%": { transform: "rotate(0deg) translateX(28px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(28px) rotate(-360deg)" },
        },
        "blink": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "shimmer": "shimmer 2.2s linear infinite",
        "scan": "scan 4s linear infinite",
        "ticker": "ticker 60s linear infinite",
        "orbit": "orbit 8s linear infinite",
        "blink": "blink 1s steps(2,start) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

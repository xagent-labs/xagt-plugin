import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      fontSize: {
        base: ["16px", { lineHeight: "1.5", letterSpacing: "-0.02em" }],
      },
      boxShadow: {
        card: "0 1px 4px rgba(0, 0, 0, 0.06)",
      },
      letterSpacing: {
        tight: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Only run unit tests for the dashboard itself. The `context/` subtree
    // vendors other projects with their own (often Bun-specific) test setups.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["context/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

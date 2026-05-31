import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  publicDir: "public",
  plugins: [react({ fastRefresh: false })],
  build: {
    outDir: "../web-dist",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});

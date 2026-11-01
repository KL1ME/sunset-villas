import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "frontend",
  base: process.env.PAGES_BASE_PATH || "/sunset-villas/",
  publicDir: "../public",
  plugins: [react()],
  build: { outDir: "../dist-pages", emptyOutDir: true },
});

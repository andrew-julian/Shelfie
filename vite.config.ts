// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  //root: path.resolve(import.meta.dirname, "client"),
  root: "client",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  //publicDir: path.resolve(import.meta.dirname, "client", "public"),
  publicDir: "client/public",
  build: {
    //outDir: path.resolve(import.meta.dirname, "dist", "public"),
    outDir: "dist/public",
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  appType: "spa",
});

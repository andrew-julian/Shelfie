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
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  console.log("Vite root:", process.cwd(), __dirname)
  //publicDir: "client/public",
  build: {
    //outDir: path.resolve(import.meta.dirname, "dist", "public"),
    //outDir: "dist",
    //emptyOutDir: true,
    // change to commit dist instead of client/dist
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "client/index.html"),
    },
    outDir: path.resolve(import.meta.dirname, "dist", "public"),
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
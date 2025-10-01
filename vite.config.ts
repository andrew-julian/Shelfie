// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async () => {
  // Conditionally load Replit-only plugins (no top-level await)
  const replitPlugins =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          // Lazy import so CI (Vercel) never needs these
          (await import("@replit/vite-plugin-runtime-error-modal")).default(),
          (await import("@replit/vite-plugin-cartographer")).cartographer(),
        ]
      : [];

  return {
    root: path.resolve(import.meta.dirname, "client"),          // <- keep the app rooted in /client
    plugins: [
      react(),
      // Only add Replit dev plugins when actually in Replit
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    // Ensure Vite uses the /client/public directory, not the repo-root /public
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      // Keep your server expecting dist/public
      outDir: path.resolve(import.meta.dirname, "dist", "public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    // Optional: make it explicit we’re building a SPA
    appType: "spa",
  };
});
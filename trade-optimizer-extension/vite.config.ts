// Extension pages (side panel + popup). Content script and service worker are
// separate builds because they must be single-file bundles (see the other
// vite.*.config.ts files).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { alias, define } from "./vite.shared";

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  define,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        sidepanel: path.resolve(__dirname, "src/ui/sidepanel/index.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});

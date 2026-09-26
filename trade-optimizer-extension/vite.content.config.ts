// Content script: must be one classic (non-module) script.
import { defineConfig } from "vite";
import path from "node:path";
import { alias, define } from "./vite.shared";

export default defineConfig({
  resolve: { alias },
  define,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, "src/content/index.ts"),
      name: "OddsVisTradeOptimizerContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: { output: { extend: true } },
  },
});

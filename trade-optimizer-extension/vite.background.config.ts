// Service worker: one ES module file (manifest declares "type": "module").
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
      entry: path.resolve(__dirname, "src/background/serviceWorker.ts"),
      formats: ["es"],
      fileName: () => "background.js",
    },
  },
});

// Library build for the OddsVis website: engine + adapters' normalizers +
// panel components as one ES module with React external. The site's own
// projection module is referenced relatively instead of being bundled.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { alias, define } from "./vite.shared";

const outDir = path.resolve(__dirname, "../odds-react-app/src/tradeOptimizer");

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  define,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "src/lib/index.ts"),
      formats: ["es"],
      fileName: () => "engine.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", /^@oddsvis\//],
      output: {
        paths: (id) => (id.startsWith("@oddsvis/") ? id.replace("@oddsvis/", "../") : id),
        assetFileNames: "engine[extname]",
      },
    },
  },
});

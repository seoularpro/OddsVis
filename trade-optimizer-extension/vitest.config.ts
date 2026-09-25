import { defineConfig } from "vitest/config";
import { alias, define } from "./vite.shared";

export default defineConfig({
  resolve: { alias },
  define,
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

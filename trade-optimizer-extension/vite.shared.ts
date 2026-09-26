// Settings shared by the three Vite builds (UI pages, content script, service
// worker) and by Vitest.
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const alias = {
  // The projection math lives in the React site; the extension reuses it
  // rather than copying ~500 lines of prop parsing.
  "@oddsvis": path.resolve(here, "../odds-react-app/src"),
  "@": path.resolve(here, "src"),
};

// The React site reads CRA-style env vars; the extension has none, so they
// resolve to undefined and the module falls back to its GitHub defaults.
export const define = {
  "process.env.REACT_APP_BP_BASE": "undefined",
  "process.env.REACT_APP_TRADE_VALUES_BASE": "undefined",
  "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
};

#!/usr/bin/env node
// Dump this week's median projections per position, computed by the site's own
// projection code (odds-react-app/src/bpProjections.js), for the trade value
// re-seed in build_trade_values.py.
//
//   node scripts/trade-values/dump_projections.mjs [--week N] [--year Y] [--mode 0|1|2] [--out FILE]
//
// Defaults: the latest week with a BettingProsFiles/<year>lastIndex<week>.txt,
// season 2026, Half PPR (mode 0), out TradeValueSheets/weekly-projections.json.
// Reads the odds files from disk (no network) and needs no npm install.
import { register } from "node:module";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The CRA package has no "type" field, so Node prints a module-type notice while
// auto-detecting ESM; re-run under --no-warnings to keep the output clean.
if (!process.execArgv.includes("--no-warnings")) {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, ["--no-warnings", ...process.execArgv, ...process.argv.slice(1)], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : null)).filter(Boolean)
);
const year = Number(args.year || 2026);
const mode = Number(args.mode || 0);
const out = resolve(args.out || join(REPO, "TradeValueSheets", "weekly-projections.json"));

// CRA source uses extensionless relative imports; Node ESM needs the ".js".
register(
  "data:text/javascript," +
    encodeURIComponent(`
      import { existsSync } from "node:fs";
      import { fileURLToPath } from "node:url";
      export async function resolve(spec, ctx, next) {
        if (spec.startsWith(".") && !/\\.[a-z]+$/i.test(spec) && ctx.parentURL) {
          const base = new URL(spec, ctx.parentURL);
          if (existsSync(fileURLToPath(base) + ".js")) return next(spec + ".js", ctx);
        }
        return next(spec, ctx);
      }`)
);

// Serve the odds files from the repo instead of raw.githubusercontent.com.
const prefix = year === 2023 ? "" : String(year);
let week = args.week ? Number(args.week) : null;
if (!week) {
  for (let w = 18; w >= 1; w--) {
    if (existsSync(join(REPO, "BettingProsFiles", `${prefix}lastIndex${w}.txt`))) { week = w; break; }
  }
  if (!week) throw new Error("no BettingProsFiles/<year>lastIndex<week>.txt found");
}
process.env.REACT_APP_BP_BASE = "/BettingProsFiles/";
globalThis.fetch = async (url) => {
  const file = join(REPO, "BettingProsFiles", String(url).split("/BettingProsFiles/")[1] || "");
  if (!existsSync(file)) return { ok: false, status: 404, text: async () => "", json: async () => null };
  const text = readFileSync(file, "utf8");
  return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) };
};

const { computeBPProjectionsByPosition } = await import(
  pathToFileURL(join(REPO, "odds-react-app/src/bpProjections.js")).href
);
const { byPosition, lastIndex } = await computeBPProjectionsByPosition({ mode, week, year });
const POS = { 0: "QB", 1: "RB", 2: "WR", 3: "TE" };
const positions = {};
byPosition.forEach(({ finalList }, pos) => {
  positions[POS[pos]] = finalList.map(([name, d]) => ({ name, ev: Math.round(d.ev * 100) / 100, stale: !!d.stale }));
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ season: year, week, mode, snapshotIndex: lastIndex,
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), positions }, null, 1));
console.log(`wrote ${out}: ${year} week ${week} (snapshot ${lastIndex}), mode ${mode},`,
  Object.entries(positions).map(([p, l]) => `${p} ${l.length}`).join(", "));

// Build and zip dist/ into release/<name>-<version>.zip for the Chrome Web Store.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(path.join(root, "public/manifest.json"), "utf8"));
const out = path.join(root, "release");
const zip = path.join(out, `vegaslytics-trade-optimizer-${manifest.version}.zip`);

if (!existsSync(path.join(root, ".env"))) {
  console.warn("warning: no .env found; building with default paywall settings (no checkout URL). See .env.example.");
}
execSync("npm run build", { cwd: root, stdio: "inherit" });
mkdirSync(out, { recursive: true });
if (existsSync(zip)) rmSync(zip);
execSync(`zip -r -X "${zip}" .`, { cwd: path.join(root, "dist"), stdio: "inherit" });
console.log(`\npackaged ${path.relative(root, zip)} (manifest version ${manifest.version})`);

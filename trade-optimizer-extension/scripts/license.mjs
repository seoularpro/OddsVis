// Issue offline license keys for VITE_PAYWALL_PROVIDER=signed.
//
//   npm run license -- keygen
//   npm run license -- issue --plan season --email buyer@example.com [--expires 2027-02-01]
//
// The signing key lives outside the repo (~/.oddsvis/license-signing-key.json,
// or ODDSVIS_LICENSE_KEY_FILE) and every issued key is appended to
// issued.jsonl beside it. `keygen --force` rotates the key pair, which
// invalidates every key issued so far once a build with the new public key
// ships.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const ALGORITHM = { name: "ECDSA", namedCurve: "P-256" };
const PLANS = ["weekend", "monthly", "season", "lifetime"];
const DAY = 24 * 60 * 60 * 1000;

const base64Url = (bytes) => Buffer.from(bytes).toString("base64url");

/** New signing pair: the private JWK stays local, the public key goes in VITE_PAYWALL_PUBLIC_KEY. */
export async function generateKeyPair() {
  const pair = await crypto.subtle.generateKey(ALGORITHM, true, ["sign", "verify"]);
  return {
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicKey: base64Url(await crypto.subtle.exportKey("raw", pair.publicKey)),
  };
}

/** `<payload>.<signature>` as checked by SignedKeyValidator in src/shared/license.ts. */
export async function signLicense(claims, privateJwk) {
  const payload = base64Url(JSON.stringify(claims));
  const key = await crypto.subtle.importKey("jwk", privateJwk, ALGORITHM, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(payload));
  return `${payload}.${base64Url(signature)}`;
}

/** Expiry matching each plan's description on the paywall; null never expires. */
export function defaultExpiry(plan, now = Date.now()) {
  const d = new Date(now);
  switch (plan) {
    case "weekend": {
      // Through Monday night's game: noon UTC on the next Tuesday.
      const days = (2 - d.getUTCDay() + 7) % 7 || 7;
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days, 12)).toISOString();
    }
    case "monthly":
      return new Date(now + 31 * DAY).toISOString();
    case "season":
      // Past the fantasy playoffs: the next 1 February.
      return new Date(Date.UTC(d.getUTCFullYear() + (d.getUTCMonth() >= 1 ? 1 : 0), 1, 1)).toISOString();
    case "lifetime":
      return null;
    default:
      throw new Error(`Unknown plan "${plan}" (expected ${PLANS.join(", ")}).`);
  }
}

// ---- CLI ---------------------------------------------------------------------

const keyFile = () => process.env.ODDSVIS_LICENSE_KEY_FILE || path.join(os.homedir(), ".oddsvis", "license-signing-key.json");

async function keygen({ force }) {
  const file = keyFile();
  if (existsSync(file) && !force) {
    console.log(`Signing key already exists at ${file} (use --force to rotate; that invalidates every issued key).`);
    console.log(`\nVITE_PAYWALL_PUBLIC_KEY=${JSON.parse(readFileSync(file, "utf8")).publicKey}`);
    return;
  }
  const pair = await generateKeyPair();
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, JSON.stringify(pair, null, 2) + "\n", { mode: 0o600 });
  console.log(`Signing key written to ${file}. Keep it private and backed up.`);
  console.log(`\nAdd to .env, then rebuild:\n\nVITE_PAYWALL_PROVIDER=signed\nVITE_PAYWALL_PUBLIC_KEY=${pair.publicKey}`);
}

async function issue({ plan = "season", email, expires }) {
  const file = keyFile();
  if (!existsSync(file)) throw new Error(`No signing key at ${file}. Run "npm run license -- keygen" first.`);
  if (!email) throw new Error("--email is required (it is shown in the extension and recorded in issued.jsonl).");
  let exp = defaultExpiry(plan);
  if (expires) {
    if (Number.isNaN(Date.parse(expires))) throw new Error(`--expires "${expires}" is not a date.`);
    exp = new Date(expires).toISOString();
  }
  const claims = { plan, exp, email, iat: new Date().toISOString() };
  const key = await signLicense(claims, JSON.parse(readFileSync(file, "utf8")).privateKey);
  appendFileSync(path.join(path.dirname(file), "issued.jsonl"), JSON.stringify({ ...claims, key }) + "\n", { mode: 0o600 });
  console.error(`${plan} license for ${email}, ${exp ? `expires ${exp}` : "never expires"}:\n`);
  console.log(key);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { plan: { type: "string" }, email: { type: "string" }, expires: { type: "string" }, force: { type: "boolean" } },
  });
  if (positionals[0] === "keygen") return keygen(values);
  if (positionals[0] === "issue") return issue(values);
  console.log("usage:\n  license.mjs keygen [--force]\n  license.mjs issue --email <buyer> [--plan weekend|monthly|season|lifetime] [--expires <date>]");
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}

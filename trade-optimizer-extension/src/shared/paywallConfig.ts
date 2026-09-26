// Paywall configuration. Build-time values come from a `.env` file (see
// .env.example); everything has a safe default so the extension builds and
// runs without any billing set up.
//
//   VITE_PAYWALL_PROVIDER        none | lemonsqueezy | remote
//   VITE_PAYWALL_STORE           Lemon Squeezy store subdomain (<store>.lemonsqueezy.com)
//   VITE_PAYWALL_VARIANT_<PLAN>  variant id per plan: WEEKEND, MONTHLY, SEASON, LIFETIME
//   VITE_PAYWALL_PRICE_<PLAN>    price label per plan, e.g. "$4.99"
//   VITE_PAYWALL_CHECKOUT_<PLAN> full checkout URL override per plan (optional)
//   VITE_PAYWALL_DEFAULT_PLAN    plan the "Unlock" buttons open (default: season)
//   VITE_PAYWALL_VALIDATE        (remote only) endpoint that validates a key
//   VITE_PAYWALL_FREE_RANKS      ranks shown in full for free, comma-separated (default "2")
//   VITE_PAYWALL_FREE_TRADES     legacy: N means ranks 1..N

export type PaywallProviderKind = "none" | "lemonsqueezy" | "remote";

export type PlanId = "weekend" | "monthly" | "season" | "lifetime";

export interface PaywallPlan {
  id: PlanId;
  label: string;
  description: string;
  /** Billing provider's variant / price id. */
  variantId: string;
  /** Hosted checkout page opened in a new tab. */
  checkoutUrl: string;
  /** Price label shown on the button, e.g. "$4.99". */
  priceLabel: string;
}

export interface PaywallConfig {
  provider: PaywallProviderKind;
  productName: string;
  /** Plans with a checkout URL, in display order. Empty when billing is unconfigured. */
  plans: PaywallPlan[];
  /** Plan opened by the generic "Unlock all trades" buttons. */
  defaultPlan: PaywallPlan | null;
  /** Kept for hosts that only need one URL (the default plan's). */
  checkoutUrl: string;
  priceLabel: string;
  validateUrl: string;
  /** Ranks (1-based) shown in full without a license; every other trade is teased. */
  freeRanks: number[];
  /** Days a previously valid license keeps working when re-validation fails (offline etc.). */
  graceDays: number;
  /** How often a stored license is re-checked with the provider. */
  revalidateHours: number;
}

const PLAN_META: { id: PlanId; label: string; description: string }[] = [
  { id: "weekend", label: "Weekend pass", description: "Every trade for one slate. Good through Monday night." },
  { id: "monthly", label: "Monthly", description: "Renews monthly. Cancel any time." },
  { id: "season", label: "Season pass", description: "Every week through the fantasy playoffs." },
  { id: "lifetime", label: "Lifetime", description: "Pay once, every season." },
];

export type EnvLike = Record<string, string | undefined>;

export function buildPaywallConfig(env: EnvLike): PaywallConfig {
  const providerRaw = (env.VITE_PAYWALL_PROVIDER ?? "lemonsqueezy").toLowerCase();
  const provider: PaywallProviderKind = providerRaw === "none" || providerRaw === "remote" || providerRaw === "lemonsqueezy" ? providerRaw : "lemonsqueezy";
  const store = (env.VITE_PAYWALL_STORE ?? "").trim();

  const plans: PaywallPlan[] = [];
  for (const meta of PLAN_META) {
    const key = meta.id.toUpperCase();
    const variantId = (env[`VITE_PAYWALL_VARIANT_${key}`] ?? "").trim();
    const override = (env[`VITE_PAYWALL_CHECKOUT_${key}`] ?? "").trim();
    const checkoutUrl = override || (store && variantId ? `https://${store}.lemonsqueezy.com/checkout/buy/${variantId}` : "");
    if (!checkoutUrl) continue;
    plans.push({ ...meta, variantId, checkoutUrl, priceLabel: (env[`VITE_PAYWALL_PRICE_${key}`] ?? "").trim() });
  }

  const wanted = (env.VITE_PAYWALL_DEFAULT_PLAN ?? "season").toLowerCase();
  const defaultPlan = plans.find((p) => p.id === wanted) ?? plans[0] ?? null;

  return {
    provider,
    productName: env.VITE_PAYWALL_PRODUCT ?? "OddsVis Trade Optimizer Pro",
    plans,
    defaultPlan,
    checkoutUrl: defaultPlan?.checkoutUrl ?? "",
    priceLabel: defaultPlan?.priceLabel ? `from ${cheapest(plans)}` : "",
    validateUrl: env.VITE_PAYWALL_VALIDATE ?? "",
    freeRanks: parseFreeRanks(env),
    graceDays: 7,
    revalidateHours: 24,
  };
}

function parseFreeRanks(env: EnvLike): number[] {
  const explicit = (env.VITE_PAYWALL_FREE_RANKS ?? "").split(",").map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= 1);
  if (explicit.length) return [...new Set(explicit)].sort((a, b) => a - b);
  const legacy = Number(env.VITE_PAYWALL_FREE_TRADES);
  if (Number.isInteger(legacy) && legacy >= 0) return Array.from({ length: legacy }, (_, i) => i + 1);
  return [2];
}

/** Lowest numeric price label among plans (for "from $X"). */
function cheapest(plans: PaywallPlan[]): string {
  const priced = plans
    .map((p) => ({ p, n: Number(p.priceLabel.replace(/[^0-9.]/g, "")) }))
    .filter((x) => Number.isFinite(x.n) && x.n > 0)
    .sort((a, b) => a.n - b.n);
  return priced[0]?.p.priceLabel ?? "";
}

const env = (import.meta as unknown as { env?: EnvLike }).env ?? {};

export const PAYWALL_CONFIG: PaywallConfig = buildPaywallConfig(env);

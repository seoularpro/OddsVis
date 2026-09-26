// Paywall configuration. Build-time values come from a `.env` file (see
// README "Paywall"); everything here has a safe default so the extension
// builds and runs without any billing set up.
//
//   VITE_PAYWALL_PROVIDER   none | lemonsqueezy | remote
//   VITE_PAYWALL_CHECKOUT   hosted checkout URL opened by "Upgrade"
//   VITE_PAYWALL_VALIDATE   (remote only) endpoint that validates a key
//   VITE_PAYWALL_PRICE      label shown next to the Upgrade button
//   VITE_PAYWALL_FREE_TRADES number of trades shown in full for free

export type PaywallProviderKind = "none" | "lemonsqueezy" | "remote";

export interface PaywallConfig {
  provider: PaywallProviderKind;
  productName: string;
  checkoutUrl: string;
  validateUrl: string;
  priceLabel: string;
  /** Trades shown in full without a license; the rest are teased. */
  freeTrades: number;
  /** Days a previously valid license keeps working when re-validation fails (offline etc.). */
  graceDays: number;
  /** How often a stored license is re-checked with the provider. */
  revalidateHours: number;
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

function providerFromEnv(): PaywallProviderKind {
  const v = (env.VITE_PAYWALL_PROVIDER ?? "lemonsqueezy").toLowerCase();
  return v === "none" || v === "remote" || v === "lemonsqueezy" ? v : "lemonsqueezy";
}

export const PAYWALL_CONFIG: PaywallConfig = {
  provider: providerFromEnv(),
  productName: env.VITE_PAYWALL_PRODUCT ?? "OddsVis Trade Optimizer Pro",
  checkoutUrl: env.VITE_PAYWALL_CHECKOUT ?? "",
  validateUrl: env.VITE_PAYWALL_VALIDATE ?? "",
  priceLabel: env.VITE_PAYWALL_PRICE ?? "",
  freeTrades: Math.max(0, Number(env.VITE_PAYWALL_FREE_TRADES ?? 1) || 0),
  graceDays: 7,
  revalidateHours: 24,
};

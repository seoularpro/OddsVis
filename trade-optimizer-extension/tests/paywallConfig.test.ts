import { describe, expect, it } from "vitest";
import { buildPaywallConfig } from "../src/shared/paywallConfig";

describe("paywall config", () => {
  const env = {
    VITE_PAYWALL_STORE: "oddsvis",
    VITE_PAYWALL_VARIANT_WEEKEND: "2171618",
    VITE_PAYWALL_VARIANT_MONTHLY: "2171604",
    VITE_PAYWALL_VARIANT_SEASON: "2171607",
    VITE_PAYWALL_VARIANT_LIFETIME: "2171612",
    VITE_PAYWALL_PRICE_WEEKEND: "$2.99",
    VITE_PAYWALL_PRICE_SEASON: "$14.99",
  };

  it("builds one plan per variant in display order with store checkout URLs", () => {
    const cfg = buildPaywallConfig(env);
    expect(cfg.plans.map((p) => p.id)).toEqual(["weekend", "monthly", "season", "lifetime"]);
    expect(cfg.plans[2].checkoutUrl).toBe("https://oddsvis.lemonsqueezy.com/checkout/buy/2171607");
    expect(cfg.defaultPlan?.id).toBe("season");
    expect(cfg.checkoutUrl).toBe(cfg.plans[2].checkoutUrl);
    expect(cfg.priceLabel).toBe("from $2.99");
  });

  it("honours per-plan URL overrides, default plan and provider none", () => {
    const cfg = buildPaywallConfig({ ...env, VITE_PAYWALL_CHECKOUT_MONTHLY: "https://buy.example/monthly", VITE_PAYWALL_DEFAULT_PLAN: "monthly" });
    expect(cfg.plans.find((p) => p.id === "monthly")?.checkoutUrl).toBe("https://buy.example/monthly");
    expect(cfg.defaultPlan?.id).toBe("monthly");
    expect(buildPaywallConfig({ VITE_PAYWALL_PROVIDER: "none" }).provider).toBe("none");
    const signed = buildPaywallConfig({ ...env, VITE_PAYWALL_PROVIDER: "signed", VITE_PAYWALL_PUBLIC_KEY: " BPub " });
    expect(signed.provider).toBe("signed");
    expect(signed.publicKey).toBe("BPub");
    expect(signed.plans.find((p) => p.id === "monthly")?.description).toMatch(/No auto-renewal/);
    expect(buildPaywallConfig(env).plans.find((p) => p.id === "monthly")?.description).toMatch(/Renews monthly/);
  });

  it("sends every plan to one checkout link when VITE_PAYWALL_CHECKOUT is set", () => {
    const cfg = buildPaywallConfig({ ...env, VITE_PAYWALL_CHECKOUT: " https://pay.example/all ", VITE_PAYWALL_CHECKOUT_MONTHLY: "https://buy.example/monthly" });
    expect(cfg.singleCheckout).toBe(true);
    expect(cfg.plans.map((p) => p.id)).toEqual(["weekend", "monthly", "season", "lifetime"]);
    expect(new Set(cfg.plans.map((p) => p.checkoutUrl))).toEqual(new Set(["https://pay.example/all"]));
    expect(cfg.checkoutUrl).toBe("https://pay.example/all");
    expect(cfg.priceLabel).toBe("from $2.99");
    // No store or variants needed.
    const bare = buildPaywallConfig({ VITE_PAYWALL_CHECKOUT: "https://pay.example/all" });
    expect(bare.plans).toHaveLength(4);
    expect(bare.checkoutUrl).toBe("https://pay.example/all");
    expect(buildPaywallConfig(env).singleCheckout).toBe(false);
  });

  it("parses free ranks, defaulting to the #1 trade, with the legacy count still honoured", () => {
    expect(buildPaywallConfig({}).freeRanks).toEqual([1]);
    expect(buildPaywallConfig({ VITE_PAYWALL_FREE_RANKS: "2, 4,4" }).freeRanks).toEqual([2, 4]);
    expect(buildPaywallConfig({ VITE_PAYWALL_FREE_TRADES: "3" }).freeRanks).toEqual([1, 2, 3]);
    expect(buildPaywallConfig({ VITE_PAYWALL_FREE_RANKS: "" , VITE_PAYWALL_FREE_TRADES: "0" }).freeRanks).toEqual([]);
  });

  it("has no plans without a store or variants, so Upgrade stays disabled", () => {
    const cfg = buildPaywallConfig({ VITE_PAYWALL_VARIANT_SEASON: "1" });
    expect(cfg.plans).toEqual([]);
    expect(cfg.defaultPlan).toBeNull();
    expect(cfg.checkoutUrl).toBe("");
    const fallback = buildPaywallConfig({ VITE_PAYWALL_STORE: "s", VITE_PAYWALL_VARIANT_LIFETIME: "9", VITE_PAYWALL_DEFAULT_PLAN: "season" });
    expect(fallback.defaultPlan?.id).toBe("lifetime");
  });
});

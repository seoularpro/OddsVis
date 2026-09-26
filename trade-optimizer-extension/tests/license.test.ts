import { describe, expect, it } from "vitest";
import { EMPTY_LICENSE, LemonSqueezyValidator, RemoteValidator, activateLicense, applyResult, isEntitled, needsRevalidation, refreshLicense, type LicenseState } from "../src/shared/license";
import type { PaywallConfig } from "../src/shared/paywallConfig";

const cfg: PaywallConfig = { provider: "lemonsqueezy", productName: "Pro", plans: [], defaultPlan: null, checkoutUrl: "https://x", validateUrl: "", priceLabel: "$5", freeTrades: 1, graceDays: 7, revalidateHours: 24 };
const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-26T12:00:00Z");

const fakeFetch = (handler: (url: string, body: any) => any): typeof fetch =>
  (async (url: any, init?: any) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    const out = handler(String(url), body);
    if (out instanceof Error) throw out;
    return { status: 200, json: async () => out } as Response;
  }) as typeof fetch;

describe("entitlement", () => {
  it("is free-for-all when the provider is none", () => {
    expect(isEntitled(EMPTY_LICENSE, { ...cfg, provider: "none" })).toBe(true);
    expect(isEntitled(EMPTY_LICENSE, cfg)).toBe(false);
  });

  it("honours active status, expiry and the grace window", () => {
    const active: LicenseState = { ...EMPTY_LICENSE, key: "k", status: "active", validatedAt: now - DAY };
    expect(isEntitled(active, cfg, now)).toBe(true);
    expect(isEntitled({ ...active, validatedAt: now - 8 * DAY }, cfg, now)).toBe(false);
    expect(isEntitled({ ...active, expiresAt: "2026-09-01T00:00:00Z" }, cfg, now)).toBe(false);
    expect(isEntitled({ ...active, status: "expired" }, cfg, now)).toBe(false);
  });

  it("re-validates only when stale", () => {
    const active: LicenseState = { ...EMPTY_LICENSE, key: "k", status: "active", validatedAt: now - 2 * 60 * 60 * 1000 };
    expect(needsRevalidation(active, cfg, now)).toBe(false);
    expect(needsRevalidation({ ...active, validatedAt: now - 2 * DAY }, cfg, now)).toBe(true);
    expect(needsRevalidation(EMPTY_LICENSE, cfg, now)).toBe(false);
  });

  it("keeps the last known status on network errors and marks invalid/expired keys", () => {
    const active: LicenseState = { ...EMPTY_LICENSE, key: "k", status: "active", validatedAt: now - 2 * DAY };
    const offline = applyResult(active, "k", { valid: false, networkError: true }, now);
    expect(offline.status).toBe("active");
    expect(offline.validatedAt).toBe(now - 2 * DAY);
    expect(isEntitled(offline, cfg, now)).toBe(true);
    const bad = applyResult(EMPTY_LICENSE, "nope", { valid: false }, now);
    expect(bad.status).toBe("invalid");
    expect(isEntitled(bad, cfg, now)).toBe(false);
    const expired = applyResult(active, "k", { valid: false, expiresAt: "2026-09-20T00:00:00Z" }, now);
    expect(expired.status).toBe("expired");
  });
});

describe("Lemon Squeezy validator", () => {
  it("activates then validates with the returned instance id", async () => {
    const calls: { url: string; body: any }[] = [];
    const validator = new LemonSqueezyValidator(
      "https://ls.test/v1/licenses",
      fakeFetch((url, body) => {
        calls.push({ url, body });
        if (url.endsWith("/activate")) return { activated: true, license_key: { status: "active", expires_at: "2027-01-01T00:00:00Z" }, instance: { id: "inst-1" }, meta: { customer_email: "a@b.c" } };
        return { valid: body.instance_id === "inst-1", license_key: { status: "active" }, meta: { customer_email: "a@b.c" } };
      })
    );
    const state = await activateLicense("KEY-1", validator, "Chrome macOS", now);
    expect(state.status).toBe("active");
    expect(state.instanceId).toBe("inst-1");
    expect(state.email).toBe("a@b.c");
    expect(calls[0].body).toEqual({ license_key: "KEY-1", instance_name: "Chrome macOS" });
    const later = await refreshLicense({ ...state, validatedAt: now - 2 * DAY }, validator, cfg, now);
    expect(later.status).toBe("active");
    expect(later.validatedAt).toBe(now);
    expect(calls[1].body).toEqual({ license_key: "KEY-1", instance_id: "inst-1" });
  });

  it("reports disabled keys and provider errors", async () => {
    const validator = new LemonSqueezyValidator("https://ls.test/v1/licenses", fakeFetch(() => ({ activated: false, error: "license_key not found" })));
    const state = await activateLicense("bad", validator, "x", now);
    expect(state.status).toBe("invalid");
    expect(state.message).toBe("license_key not found");
    const disabled = new LemonSqueezyValidator("https://ls.test/v1/licenses", fakeFetch(() => ({ valid: true, license_key: { status: "disabled" } })));
    expect((await disabled.validate("k", null)).valid).toBe(false);
    const down = new LemonSqueezyValidator("https://ls.test/v1/licenses", fakeFetch(() => new Error("offline")));
    expect((await down.validate("k", null)).networkError).toBe(true);
    const offlineActivation = await activateLicense("k", down, "x", now);
    expect(offlineActivation.status).toBe("none");
    expect(offlineActivation.message).toMatch(/Could not reach/);
  });
});

describe("remote validator", () => {
  it("posts to the configured endpoint and fails closed when unconfigured", async () => {
    const validator = new RemoteValidator("https://api.test/validate", fakeFetch((_, body) => ({ valid: body.key === "good", expiresAt: null })));
    expect((await validator.activate("good", "x")).valid).toBe(true);
    expect((await validator.validate("bad", null)).valid).toBe(false);
    expect((await new RemoteValidator("").validate("good", null)).valid).toBe(false);
  });
});

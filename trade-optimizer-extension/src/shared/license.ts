// License state and validation. Pure logic (testable) plus small storage
// helpers. Providers implement LicenseValidator; the UI never talks to a
// billing API directly.
//
// Honest limitation: the optimizer runs in the browser, so this gate keeps
// honest users honest. Moving `runTradeOptimizer` behind a server endpoint
// that checks the same key is what makes it enforceable (see README).

import type { PaywallConfig } from "./paywallConfig";

export type LicenseStatus = "none" | "active" | "expired" | "invalid";

export interface LicenseState {
  key: string | null;
  status: LicenseStatus;
  /** Epoch ms of the last successful validation. */
  validatedAt: number | null;
  /** ISO date the provider reports, if any. */
  expiresAt: string | null;
  /** Provider-side activation id (Lemon Squeezy instance). */
  instanceId: string | null;
  email: string | null;
  message: string | null;
}

export const EMPTY_LICENSE: LicenseState = {
  key: null,
  status: "none",
  validatedAt: null,
  expiresAt: null,
  instanceId: null,
  email: null,
  message: null,
};

export interface ValidationResult {
  valid: boolean;
  expiresAt?: string | null;
  instanceId?: string | null;
  email?: string | null;
  message?: string | null;
  /** True when the provider could not be reached (keep the old state, apply grace). */
  networkError?: boolean;
}

export interface LicenseValidator {
  /** First-time check of a key; may register this install with the provider. */
  activate(key: string, instanceName: string): Promise<ValidationResult>;
  /** Periodic re-check of a stored key. */
  validate(key: string, instanceId: string | null): Promise<ValidationResult>;
}

const DAY = 24 * 60 * 60 * 1000;

/** Whether the paid tier is unlocked right now. */
export function isEntitled(state: LicenseState, config: PaywallConfig, now = Date.now()): boolean {
  if (config.provider === "none") return true;
  if (state.status !== "active" || !state.validatedAt) return false;
  if (state.expiresAt && Date.parse(state.expiresAt) < now) return false;
  return now - state.validatedAt <= config.graceDays * DAY;
}

/** True when the stored license should be re-checked with the provider. */
export function needsRevalidation(state: LicenseState, config: PaywallConfig, now = Date.now()): boolean {
  if (config.provider === "none" || !state.key) return false;
  if (!state.validatedAt) return true;
  return now - state.validatedAt > config.revalidateHours * 60 * 60 * 1000;
}

export function applyResult(previous: LicenseState, key: string, result: ValidationResult, now = Date.now()): LicenseState {
  if (result.networkError) {
    // Keep what we had; isEntitled applies the grace window.
    return { ...previous, key, message: result.message ?? "Could not reach the license server; using the last known status." };
  }
  if (!result.valid) {
    const expired = result.expiresAt ? Date.parse(result.expiresAt) < now : false;
    return {
      ...previous,
      key,
      status: expired ? "expired" : "invalid",
      validatedAt: previous.status === "active" ? previous.validatedAt : null,
      expiresAt: result.expiresAt ?? previous.expiresAt,
      message: result.message ?? (expired ? "This license has expired." : "This license key is not valid."),
    };
  }
  return {
    key,
    status: "active",
    validatedAt: now,
    expiresAt: result.expiresAt ?? null,
    instanceId: result.instanceId ?? previous.instanceId ?? null,
    email: result.email ?? previous.email ?? null,
    message: null,
  };
}

export async function activateLicense(key: string, validator: LicenseValidator, instanceName: string, now = Date.now()): Promise<LicenseState> {
  const trimmed = key.trim();
  if (!trimmed) return { ...EMPTY_LICENSE, message: "Enter a license key." };
  const result = await validator.activate(trimmed, instanceName);
  if (result.networkError) {
    return { ...EMPTY_LICENSE, message: result.message ?? "Could not reach the license server. Check your connection and try again." };
  }
  return applyResult(EMPTY_LICENSE, trimmed, result, now);
}

export async function refreshLicense(state: LicenseState, validator: LicenseValidator, config: PaywallConfig, now = Date.now()): Promise<LicenseState> {
  if (!state.key || !needsRevalidation(state, config, now)) return state;
  const result = await validator.validate(state.key, state.instanceId);
  return applyResult(state, state.key, result, now);
}

// ---- providers -------------------------------------------------------------

/** Lemon Squeezy license API (public, no API key needed, CORS enabled). */
export class LemonSqueezyValidator implements LicenseValidator {
  constructor(private base = "https://api.lemonsqueezy.com/v1/licenses", private fetchFn: typeof fetch = fetch) {}

  private async post(path: string, body: Record<string, string>): Promise<ValidationResult> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.base}/${path}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return { valid: false, networkError: true };
    }
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      return { valid: false, networkError: true, message: `Unexpected response (${res.status}).` };
    }
    const ok = path === "activate" ? data?.activated === true : data?.valid === true;
    const status = data?.license_key?.status as string | undefined;
    return {
      valid: ok && (status === undefined || status === "active"),
      expiresAt: data?.license_key?.expires_at ?? null,
      instanceId: data?.instance?.id ?? null,
      email: data?.meta?.customer_email ?? null,
      message: data?.error ?? (status && status !== "active" ? `License is ${status}.` : null),
    };
  }

  activate(key: string, instanceName: string) {
    return this.post("activate", { license_key: key, instance_name: instanceName });
  }

  validate(key: string, instanceId: string | null) {
    return this.post("validate", instanceId ? { license_key: key, instance_id: instanceId } : { license_key: key });
  }
}

/**
 * Your own endpoint (e.g. a Netlify function backed by Stripe, Paddle,
 * Gumroad or ExtensionPay). Contract:
 *   POST { key, instanceId?, instanceName? } -> { valid, expiresAt?, instanceId?, email?, message? }
 */
export class RemoteValidator implements LicenseValidator {
  constructor(private url: string, private fetchFn: typeof fetch = fetch) {}

  private async post(body: Record<string, string | null>): Promise<ValidationResult> {
    if (!this.url) return { valid: false, message: "License server is not configured (VITE_PAYWALL_VALIDATE)." };
    try {
      const res = await this.fetchFn(this.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as ValidationResult;
      return { ...data, valid: data.valid === true };
    } catch {
      return { valid: false, networkError: true };
    }
  }

  activate(key: string, instanceName: string) {
    return this.post({ key, instanceName });
  }

  validate(key: string, instanceId: string | null) {
    return this.post({ key, instanceId });
  }
}

export class AlwaysValidValidator implements LicenseValidator {
  async activate(): Promise<ValidationResult> {
    return { valid: true };
  }
  async validate(): Promise<ValidationResult> {
    return { valid: true };
  }
}

export function validatorFor(config: PaywallConfig): LicenseValidator {
  switch (config.provider) {
    case "lemonsqueezy":
      return new LemonSqueezyValidator();
    case "remote":
      return new RemoteValidator(config.validateUrl);
    default:
      return new AlwaysValidValidator();
  }
}

// ---- storage ---------------------------------------------------------------

const KEY = "oddsvisTradeOptimizerLicense";
let memory: LicenseState = EMPTY_LICENSE;

export async function loadLicense(): Promise<LicenseState> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      const raw = await chrome.storage.sync.get(KEY);
      const stored = raw[KEY] as Partial<LicenseState> | undefined;
      return { ...EMPTY_LICENSE, ...(stored ?? {}) };
    }
  } catch {
    // fall through to memory
  }
  return memory;
}

export async function saveLicense(state: LicenseState): Promise<void> {
  memory = state;
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) await chrome.storage.sync.set({ [KEY]: state });
  } catch {
    // storage unavailable: memory copy still applies for this session
  }
}

/** A stable-ish name for this install, shown in the provider's dashboard. */
export function instanceName(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : "Browser";
  const os = /Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser} ${os}`.trim() || "extension";
}

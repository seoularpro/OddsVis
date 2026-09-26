// Extension settings persisted in chrome.storage.sync (falls back to memory
// when running outside the extension, e.g. tests or a plain Vite dev page).

import type { OptimizerConfig } from "../optimization/config";

export interface ExtensionSettings {
  /** Override the detected user team. */
  manualTeamIds: Record<string, string>;
  /** Optional custom dataset URLs (JSON). Empty = use OddsVis datasets. */
  projectionUrl: string;
  tradeValueUrl: string;
  /** Optional pasted datasets (JSON text). */
  projectionJson: string;
  tradeValueJson: string;
  /** Optimizer overrides exposed in the UI. */
  config: Partial<Pick<OptimizerConfig, "maxTradeValueDifferencePercent" | "minUserGain" | "maxOpponentLoss" | "topN" | "maxTradesPerPartner" | "unlistedTradeValue" | "rankingMode">>;
  /** Scoring overrides when detection is wrong. */
  scoringOverride: { receptionPoints?: number; passTdPoints?: number } | null;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  manualTeamIds: {},
  projectionUrl: "",
  tradeValueUrl: "",
  projectionJson: "",
  tradeValueJson: "",
  config: {},
  scoringOverride: null,
};

const KEY = "oddsvisTradeOptimizerSettings";
let memory: ExtensionSettings = { ...DEFAULT_SETTINGS };

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.sync;
}

export async function loadSettings(): Promise<ExtensionSettings> {
  let stored: Partial<ExtensionSettings> | undefined;
  try {
    if (hasChromeStorage()) {
      stored = (await chrome.storage.sync.get(KEY))[KEY] as Partial<ExtensionSettings> | undefined;
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(KEY);
      stored = raw ? (JSON.parse(raw) as Partial<ExtensionSettings>) : undefined;
    } else {
      return memory;
    }
  } catch {
    return memory;
  }
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}), config: { ...(stored?.config ?? {}) } };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  memory = settings;
  try {
    if (hasChromeStorage()) await chrome.storage.sync.set({ [KEY]: settings });
    else if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable
  }
}

// Small local cache (chrome.storage.local) for large downloads such as the
// Sleeper player file.
export async function cacheGet<T>(key: string, maxAgeMs: number): Promise<T | null> {
  try {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    const raw = await chrome.storage.local.get(key);
    const entry = raw[key] as { savedAt: number; value: T } | undefined;
    if (!entry || Date.now() - entry.savedAt > maxAgeMs) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [key]: { savedAt: Date.now(), value } });
  } catch {
    // quota or disabled storage: the in-memory copy still works
  }
}

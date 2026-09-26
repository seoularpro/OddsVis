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
  config: Partial<Pick<OptimizerConfig, "maxTradeValueDifferencePercent" | "minUserGain" | "maxOpponentLoss" | "topN" | "maxTradesPerPartner" | "unlistedTradeValue">>;
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
  if (!hasChromeStorage()) return memory;
  const raw = await chrome.storage.sync.get(KEY);
  const stored = raw[KEY] as Partial<ExtensionSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}), config: { ...(stored?.config ?? {}) } };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  memory = settings;
  if (!hasChromeStorage()) return;
  await chrome.storage.sync.set({ [KEY]: settings });
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

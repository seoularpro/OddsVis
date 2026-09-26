import type { FantasyPlatformAdapter } from "./adapters/types";
import { espnAdapter } from "./adapters/espn/espnAdapter";
import { sleeperAdapter } from "./adapters/sleeper/sleeperAdapter";
import { yahooAdapter } from "./adapters/yahoo/yahooAdapter";
import type { DetectResult } from "../shared/messages";

export const ADAPTERS: FantasyPlatformAdapter[] = [espnAdapter, sleeperAdapter, yahooAdapter];

export function detectAdapter(location: Location): FantasyPlatformAdapter | null {
  return ADAPTERS.find((a) => a.detect(location)) ?? null;
}

export function describePage(location: Location): DetectResult {
  const adapter = detectAdapter(location);
  if (!adapter) return { platform: null, supported: false, leagueId: null, reason: "Not a supported fantasy football site.", url: location.href };
  return adapter.describe(location);
}

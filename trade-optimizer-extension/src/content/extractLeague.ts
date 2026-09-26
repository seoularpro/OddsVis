import type { RawLeague } from "../domain/types";
import { AdapterError } from "../shared/messages";
import { extractWithAdapter, type AdapterContext } from "./adapters/types";
import { detectAdapter } from "./detectPlatform";

export async function extractLeague(location: Location, teamIdHint?: string | null): Promise<{ league: RawLeague; warnings: string[] }> {
  const adapter = detectAdapter(location);
  if (!adapter) throw new AdapterError("UNSUPPORTED_SITE", "This page is not a supported fantasy football site.");
  const described = adapter.describe(location);
  if (!described.supported || !described.leagueId) {
    throw new AdapterError("NO_LEAGUE", described.reason ?? "Could not find a league on this page.");
  }
  const ctx: AdapterContext = { location, leagueId: described.leagueId, teamIdHint, cache: new Map(), warnings: [] };
  const league = await extractWithAdapter(adapter, ctx);
  return { league, warnings: ctx.warnings };
}

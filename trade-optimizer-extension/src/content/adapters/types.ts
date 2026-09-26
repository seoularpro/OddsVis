import type { Platform, RawLeague, RawPlayer, LeagueSettings, RawTeam } from "../../domain/types";
import type { DetectResult } from "../../shared/messages";

/**
 * A fantasy platform adapter. Everything platform-specific (URLs, cookies,
 * API shapes, slot ids) stays behind this interface; the engine only ever
 * sees RawLeague.
 */
export interface FantasyPlatformAdapter {
  platform: Platform;
  /** True when the current page belongs to this platform. */
  detect(location: Location): boolean;
  /** Cheap description of what was detected (league id, support status). */
  describe(location: Location): DetectResult;
  getLeagueSettings(ctx: AdapterContext): Promise<LeagueSettings>;
  getTeams(ctx: AdapterContext): Promise<RawTeam[]>;
  getAvailablePlayers(ctx: AdapterContext): Promise<RawPlayer[]>;
  getCurrentUserTeam(ctx: AdapterContext, teams: RawTeam[]): Promise<{ teamId: string | null; detection: RawLeague["userTeamDetection"] }>;
}

export interface AdapterContext {
  location: Location;
  leagueId: string;
  /** Explicit team id the UI asked for (manual override). */
  teamIdHint?: string | null;
  /** Adapters stash fetched payloads here so getTeams/getSettings share one request. */
  cache: Map<string, unknown>;
  warnings: string[];
}

/** Run the full extraction for one adapter. */
export async function extractWithAdapter(adapter: FantasyPlatformAdapter, ctx: AdapterContext): Promise<RawLeague> {
  const settings = await adapter.getLeagueSettings(ctx);
  const teams = await adapter.getTeams(ctx);
  let availablePlayers: RawPlayer[] = [];
  try {
    availablePlayers = await adapter.getAvailablePlayers(ctx);
  } catch (e) {
    ctx.warnings.push(`Could not read the waiver wire (${(e as Error).message}); replacement level will use the projection dataset.`);
  }
  const user = await adapter.getCurrentUserTeam(ctx, teams);
  return { settings, teams, availablePlayers, userTeamId: user.teamId, userTeamDetection: user.detection };
}

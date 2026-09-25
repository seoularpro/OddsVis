// ESPN Fantasy Football adapter.
//
// Runs inside fantasy.espn.com, so requests to lm-api-reads.fantasy.espn.com
// are same-site: the user's SWID / espn_s2 cookies ride along automatically
// and private leagues work without pasting cookies anywhere. Everything comes
// from ESPN's structured v3 API; no DOM scraping.

import type { LeagueSettings, LineupSlot, RawLeague, RawPlayer, RawTeam } from "../../../domain/types";
import { OFFENSE_POSITIONS } from "../../../domain/types";
import { AdapterError, type DetectResult } from "../../../shared/messages";
import type { AdapterContext, FantasyPlatformAdapter } from "../types";
import {
  ESPN_API_BASE,
  ESPN_BENCH_SLOT,
  ESPN_IR_SLOT,
  ESPN_POSITION_BY_DEFAULT_ID,
  ESPN_PRO_TEAMS,
  ESPN_SLOT_TO_LINEUP,
  ESPN_STAT_PASS_TD,
  ESPN_STAT_RECEPTIONS,
} from "./espnMappings";

// ---- ESPN payload shapes (only the fields used) ----------------------------
export interface EspnLeaguePayload {
  id: number;
  seasonId: number;
  scoringPeriodId: number;
  status?: { currentMatchupPeriod?: number; firstScoringPeriod?: number; finalScoringPeriod?: number; isActive?: boolean };
  settings?: {
    name?: string;
    size?: number;
    rosterSettings?: { lineupSlotCounts?: Record<string, number> };
    scoringSettings?: { scoringItems?: { statId: number; points: number }[] };
  };
  members?: { id: string; displayName?: string; firstName?: string; lastName?: string }[];
  teams?: EspnTeamPayload[];
}

export interface EspnTeamPayload {
  id: number;
  abbrev?: string;
  name?: string;
  location?: string;
  nickname?: string;
  owners?: string[];
  primaryOwner?: string;
  roster?: { entries?: EspnRosterEntry[] };
}

export interface EspnRosterEntry {
  playerId: number;
  lineupSlotId: number;
  playerPoolEntry?: { player?: EspnPlayer };
}

export interface EspnPlayer {
  id: number;
  fullName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  injuryStatus?: string;
}

export interface EspnPlayerPoolPayload {
  players?: { id: number; player?: EspnPlayer; status?: string; onTeamId?: number }[];
}

// ---- pure normalization (tested) -------------------------------------------

export function espnSeasonFromDate(date = new Date()): number {
  // ESPN seasons roll over in the spring; Jan-Apr still belong to the previous season.
  return date.getMonth() >= 4 ? date.getFullYear() : date.getFullYear() - 1;
}

export function espnLineupSlots(counts: Record<string, number>): { slots: LineupSlot[]; rosterSize: number; skipped: string[] } {
  const slots: LineupSlot[] = [];
  const skipped: string[] = [];
  let rosterSize = 0;
  for (const [idStr, count] of Object.entries(counts)) {
    const id = Number(idStr);
    if (!count) continue;
    if (id === ESPN_IR_SLOT) continue;
    if (id === ESPN_BENCH_SLOT) {
      rosterSize += count;
      continue;
    }
    const preset = ESPN_SLOT_TO_LINEUP[id];
    if (!preset) {
      skipped.push(`slot ${id}`);
      continue;
    }
    rosterSize += count;
    slots.push({ ...preset, count });
  }
  // Keep a stable, readable order.
  const order = ["QB", "RB", "WR", "TE", "FLEX", "RB/WR", "WR/TE", "SUPERFLEX", "K", "DST"];
  slots.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return { slots, rosterSize, skipped };
}

export function espnScoring(items: { statId: number; points: number }[] | undefined): LeagueSettings["scoring"] {
  const find = (statId: number) => items?.find((i) => i.statId === statId)?.points;
  return {
    receptionPoints: find(ESPN_STAT_RECEPTIONS) ?? 0,
    passTdPoints: find(ESPN_STAT_PASS_TD) ?? 4,
  };
}

export function espnTeamName(team: EspnTeamPayload): string {
  const name = typeof team.name === "string" ? team.name.trim() : "";
  if (name) return name;
  const legacy = [team.location, team.nickname].filter(Boolean).join(" ").trim();
  return legacy || team.abbrev || `Team ${team.id}`;
}

export function espnRawPlayer(player: EspnPlayer | undefined, fallbackId: number): RawPlayer | null {
  if (!player) return null;
  const position = ESPN_POSITION_BY_DEFAULT_ID[player.defaultPositionId ?? -1];
  if (!position) return null; // IDP or unknown
  return {
    platformId: String(player.id ?? fallbackId),
    name: player.fullName ?? `Player ${player.id ?? fallbackId}`,
    position,
    nflTeam: player.proTeamId ? ESPN_PRO_TEAMS[player.proTeamId] : undefined,
    injuryStatus: player.injuryStatus,
  };
}

export interface EspnNormalized {
  settings: LeagueSettings;
  teams: RawTeam[];
  warnings: string[];
}

export function normalizeEspnLeague(payload: EspnLeaguePayload, leagueId: string): EspnNormalized {
  const warnings: string[] = [];
  const counts = payload.settings?.rosterSettings?.lineupSlotCounts;
  if (!counts) throw new AdapterError("ESPN_INVALID_RESPONSE", "ESPN did not return roster settings.");
  const { slots, rosterSize, skipped } = espnLineupSlots(counts);
  if (skipped.length) warnings.push(`Ignored unsupported ESPN lineup slots: ${skipped.join(", ")}.`);
  const memberName = new Map((payload.members ?? []).map((m) => [m.id, m.displayName || [m.firstName, m.lastName].filter(Boolean).join(" ")]));

  const teams: RawTeam[] = (payload.teams ?? []).map((t) => {
    const entries = t.roster?.entries ?? [];
    const players: RawPlayer[] = [];
    for (const e of entries) {
      if (e.lineupSlotId === ESPN_IR_SLOT) continue;
      const rp = espnRawPlayer(e.playerPoolEntry?.player, e.playerId);
      if (rp) players.push(rp);
    }
    return {
      id: String(t.id),
      name: espnTeamName(t),
      ownerName: t.primaryOwner ? memberName.get(t.primaryOwner) : undefined,
      players,
    };
  });
  if (!teams.length) throw new AdapterError("ESPN_INVALID_RESPONSE", "ESPN returned no teams (is this league visible to your account?).");

  const week = Math.max(1, payload.scoringPeriodId || payload.status?.currentMatchupPeriod || 1);
  const settings: LeagueSettings = {
    platform: "espn",
    leagueId,
    leagueName: payload.settings?.name ?? `ESPN league ${leagueId}`,
    season: payload.seasonId,
    week,
    teamCount: payload.settings?.size ?? teams.length,
    rosterSize,
    scoring: espnScoring(payload.settings?.scoringSettings?.scoringItems),
    lineupSlots: slots,
  };
  return { settings, teams, warnings };
}

export function normalizeEspnPlayerPool(payload: EspnPlayerPoolPayload): RawPlayer[] {
  const out: RawPlayer[] = [];
  for (const entry of payload.players ?? []) {
    if (entry.onTeamId && entry.onTeamId !== 0) continue;
    const rp = espnRawPlayer(entry.player, entry.id);
    if (rp && OFFENSE_POSITIONS.includes(rp.position)) out.push(rp);
  }
  return out;
}

/** Find the team owned by a SWID (ESPN member id, braces included). */
export function espnTeamForSwid(payload: EspnLeaguePayload, swid: string | null): string | null {
  if (!swid) return null;
  const norm = swid.trim().toUpperCase();
  const t = (payload.teams ?? []).find((team) => (team.owners ?? []).some((o) => o.toUpperCase() === norm));
  return t ? String(t.id) : null;
}

// ---- live adapter ----------------------------------------------------------

function leagueIdFrom(location: Location): string | null {
  const id = new URLSearchParams(location.search).get("leagueId");
  return id && /^\d+$/.test(id) ? id : null;
}

async function espnFetch<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", headers });
  } catch {
    throw new AdapterError("ESPN_NETWORK", "Could not reach ESPN's fantasy API.");
  }
  if (res.status === 401 || res.status === 403) throw new AdapterError("ESPN_PRIVATE", "ESPN says this league is not visible to the signed-in account.");
  if (res.status === 404) throw new AdapterError("ESPN_NOT_FOUND", "ESPN has no league with that id for this season.");
  if (res.status === 429) throw new AdapterError("ESPN_RATE_LIMITED", "ESPN is rate limiting requests; try again in a moment.");
  if (!res.ok) throw new AdapterError("ESPN_API", `ESPN returned HTTP ${res.status}.`);
  return (await res.json()) as T;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function cookieViaBackground(url: string, name: string): Promise<string | null> {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return null;
    const res = (await chrome.runtime.sendMessage({ type: "GET_COOKIE", url, name })) as { ok: boolean; value?: string | null };
    return res?.ok ? res.value ?? null : null;
  } catch {
    return null;
  }
}

async function loadLeague(ctx: AdapterContext): Promise<{ payload: EspnLeaguePayload; normalized: EspnNormalized }> {
  const cached = ctx.cache.get("espn:league") as { payload: EspnLeaguePayload; normalized: EspnNormalized } | undefined;
  if (cached) return cached;
  const params = new URLSearchParams(ctx.location.search);
  const season = Number(params.get("seasonId")) || espnSeasonFromDate();
  const views = ["mSettings", "mStatus", "mTeam", "mRoster"].map((v) => `view=${v}`).join("&");
  const url = `${ESPN_API_BASE}/${season}/segments/0/leagues/${ctx.leagueId}?${views}`;
  const payload = await espnFetch<EspnLeaguePayload>(url);
  const normalized = normalizeEspnLeague(payload, ctx.leagueId);
  ctx.warnings.push(...normalized.warnings);
  const value = { payload, normalized };
  ctx.cache.set("espn:league", value);
  return value;
}

export const espnAdapter: FantasyPlatformAdapter = {
  platform: "espn",
  detect(location) {
    return /(^|\.)fantasy\.espn\.com$/.test(location.hostname) && location.pathname.startsWith("/football");
  },
  describe(location): DetectResult {
    const leagueId = leagueIdFrom(location);
    return {
      platform: "espn",
      supported: !!leagueId,
      leagueId,
      reason: leagueId ? undefined : "Open a league page (the URL needs a leagueId).",
      url: location.href,
    };
  },
  async getLeagueSettings(ctx) {
    return (await loadLeague(ctx)).normalized.settings;
  },
  async getTeams(ctx) {
    return (await loadLeague(ctx)).normalized.teams;
  },
  async getAvailablePlayers(ctx) {
    const { payload } = await loadLeague(ctx);
    const filter = {
      players: {
        filterStatus: { value: ["FREEAGENT", "WAIVERS"] },
        filterSlotIds: { value: [0, 2, 4, 6] },
        limit: 150,
        sortPercOwned: { sortAsc: false, sortPriority: 1 },
      },
    };
    const url = `${ESPN_API_BASE}/${payload.seasonId}/segments/0/leagues/${ctx.leagueId}?view=kona_player_info&scoringPeriodId=${payload.scoringPeriodId || 1}`;
    const pool = await espnFetch<EspnPlayerPoolPayload>(url, { "X-Fantasy-Filter": JSON.stringify(filter) });
    return normalizeEspnPlayerPool(pool);
  },
  async getCurrentUserTeam(ctx, teams) {
    if (ctx.teamIdHint && teams.some((t) => t.id === ctx.teamIdHint)) return { teamId: ctx.teamIdHint, detection: "manual" };
    const params = new URLSearchParams(ctx.location.search);
    const urlTeam = params.get("teamId");
    if (ctx.location.pathname.startsWith("/football/team") && urlTeam && teams.some((t) => t.id === urlTeam)) {
      return { teamId: urlTeam, detection: "url" };
    }
    const { payload } = await loadLeague(ctx);
    const swid = readCookie("SWID") ?? (await cookieViaBackground("https://fantasy.espn.com/", "SWID"));
    const owned = espnTeamForSwid(payload, swid);
    if (owned) return { teamId: owned, detection: "owner" };
    if (urlTeam && teams.some((t) => t.id === urlTeam)) return { teamId: urlTeam, detection: "url" };
    ctx.warnings.push("Could not tell which team is yours; pick it in the panel.");
    return { teamId: null, detection: "none" };
  },
};

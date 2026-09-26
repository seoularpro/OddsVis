// Sleeper adapter. Sleeper's v1 API is public and CORS-open, so everything is
// read by league id. The ~15MB player file is trimmed to id -> [name, pos,
// team] and cached for a day in chrome.storage.local.

import type { LeagueSettings, LineupSlot, RawPlayer, RawTeam } from "../../../domain/types";
import { SLOT_PRESETS, normalizePosition } from "../../../domain/positions";
import { AdapterError, type DetectResult } from "../../../shared/messages";
import { cacheGet, cacheSet } from "../../../shared/storage";
import type { AdapterContext, FantasyPlatformAdapter } from "../types";

const API = "https://api.sleeper.app/v1";
const PLAYER_CACHE_KEY = "sleeperPlayersTrimmedV1";
const PLAYER_CACHE_TTL = 24 * 60 * 60 * 1000;

export interface SleeperLeaguePayload {
  name?: string;
  season?: string | number;
  total_rosters?: number;
  roster_positions?: string[];
  scoring_settings?: Record<string, number>;
}
export interface SleeperRosterPayload {
  roster_id: number;
  owner_id: string | null;
  players?: string[] | null;
  starters?: string[] | null;
  reserve?: string[] | null;
  taxi?: string[] | null;
}
export interface SleeperUserPayload {
  user_id: string;
  display_name?: string;
  metadata?: { team_name?: string };
}
export interface SleeperStatePayload {
  week?: number;
  leg?: number;
  display_week?: number;
  season?: string;
}
/** id -> [name, position, team] */
export type SleeperPlayersTrimmed = Record<string, [string, string | undefined, string | undefined]>;

const SLOT_BY_POSITION: Record<string, Omit<LineupSlot, "count"> | null> = {
  QB: SLOT_PRESETS.QB,
  RB: SLOT_PRESETS.RB,
  WR: SLOT_PRESETS.WR,
  TE: SLOT_PRESETS.TE,
  FLEX: SLOT_PRESETS.FLEX,
  SUPER_FLEX: SLOT_PRESETS.SUPERFLEX,
  REC_FLEX: SLOT_PRESETS["WR/TE"],
  WRRB_FLEX: SLOT_PRESETS["RB/WR"],
  K: SLOT_PRESETS.K,
  DEF: SLOT_PRESETS.DST,
};
const NON_ROSTER = new Set(["IR", "TAXI"]);

export function sleeperLineupSlots(positions: string[]): { slots: LineupSlot[]; rosterSize: number; skipped: string[] } {
  const counts = new Map<string, number>();
  const skipped: string[] = [];
  let rosterSize = 0;
  for (const p of positions) {
    if (NON_ROSTER.has(p)) continue;
    if (p === "BN") {
      rosterSize++;
      continue;
    }
    if (!(p in SLOT_BY_POSITION) || SLOT_BY_POSITION[p] === null) {
      if (!skipped.includes(p)) skipped.push(p);
      continue;
    }
    rosterSize++;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const slots: LineupSlot[] = [];
  for (const [p, count] of counts) slots.push({ ...SLOT_BY_POSITION[p]!, count });
  return { slots, rosterSize, skipped };
}

export function trimSleeperPlayers(raw: Record<string, any>): SleeperPlayersTrimmed {
  const out: SleeperPlayersTrimmed = {};
  for (const [id, p] of Object.entries(raw)) {
    if (!p || (!p.position && !Array.isArray(p.fantasy_positions))) continue;
    const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ");
    if (!name) continue;
    out[id] = [name, p.position || undefined, p.team || undefined];
  }
  return out;
}

export function normalizeSleeperLeague(args: {
  leagueId: string;
  league: SleeperLeaguePayload;
  rosters: SleeperRosterPayload[];
  users: SleeperUserPayload[];
  players: SleeperPlayersTrimmed;
  state: SleeperStatePayload;
}): { settings: LeagueSettings; teams: RawTeam[]; warnings: string[] } {
  const { leagueId, league, rosters, users, players, state } = args;
  const warnings: string[] = [];
  if (!Array.isArray(league.roster_positions) || !Array.isArray(rosters)) {
    throw new AdapterError("SLEEPER_INVALID_RESPONSE", "Sleeper returned data in an unexpected shape.");
  }
  const { slots, rosterSize, skipped } = sleeperLineupSlots(league.roster_positions);
  if (skipped.length) warnings.push(`Ignored unsupported Sleeper roster positions: ${skipped.join(", ")}.`);
  const usersById = new Map(users.map((u) => [u.user_id, u]));

  const teams: RawTeam[] = rosters.map((r) => {
    const user = r.owner_id ? usersById.get(r.owner_id) : undefined;
    const excluded = new Set([...(r.reserve ?? []), ...(r.taxi ?? [])]);
    const out: RawPlayer[] = [];
    for (const id of r.players ?? []) {
      if (!id || id === "0" || excluded.has(id)) continue;
      const meta = players[id];
      const position = normalizePosition(meta?.[1]);
      if (!position) continue; // IDP or unknown
      out.push({ platformId: id, name: meta ? meta[0] : `Player ${id}`, position, nflTeam: meta?.[2] });
    }
    return {
      id: String(r.roster_id),
      name: user?.metadata?.team_name?.trim() || user?.display_name || `Team ${r.roster_id}`,
      ownerName: user?.display_name,
      players: out,
    };
  });

  const weekCandidates = [state?.leg, state?.display_week, state?.week];
  const week = weekCandidates.find((w) => Number.isInteger(w) && (w as number) > 0) ?? 1;
  const settings: LeagueSettings = {
    platform: "sleeper",
    leagueId,
    leagueName: league.name ?? `Sleeper league ${leagueId}`,
    season: Number(league.season) || Number(state?.season) || new Date().getFullYear(),
    week: week as number,
    teamCount: league.total_rosters ?? teams.length,
    rosterSize,
    scoring: {
      receptionPoints: league.scoring_settings?.rec ?? 0,
      passTdPoints: league.scoring_settings?.pass_td ?? 4,
    },
    lineupSlots: slots,
  };
  return { settings, teams, warnings };
}

/** Best-effort: find the signed-in Sleeper user id in the page's localStorage. */
export function findSleeperUserId(storage: Pick<Storage, "length" | "key" | "getItem">): string | null {
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      const value = storage.getItem(key);
      if (!value) continue;
      const m = value.match(/"user_id"\s*:\s*"(\d{6,})"/);
      if (m) return m[1];
    }
  } catch {
    // storage blocked
  }
  return null;
}

// ---- live adapter ----------------------------------------------------------

async function sleeperFetch<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`);
  } catch {
    throw new AdapterError("SLEEPER_NETWORK", "Could not reach Sleeper's API.");
  }
  if (res.status === 404) throw new AdapterError("SLEEPER_NOT_FOUND", "Sleeper has no league with that id.");
  if (res.status === 429) throw new AdapterError("SLEEPER_RATE_LIMITED", "Sleeper is rate limiting requests; try again shortly.");
  if (!res.ok) throw new AdapterError("SLEEPER_API", `Sleeper returned HTTP ${res.status}.`);
  const body = (await res.json()) as T;
  if (body === null) throw new AdapterError("SLEEPER_NOT_FOUND", "Sleeper has no league with that id.");
  return body;
}

async function loadPlayers(): Promise<SleeperPlayersTrimmed> {
  const cached = await cacheGet<SleeperPlayersTrimmed>(PLAYER_CACHE_KEY, PLAYER_CACHE_TTL);
  if (cached) return cached;
  const trimmed = trimSleeperPlayers(await sleeperFetch<Record<string, any>>("/players/nfl"));
  await cacheSet(PLAYER_CACHE_KEY, trimmed);
  return trimmed;
}

interface Loaded {
  normalized: ReturnType<typeof normalizeSleeperLeague>;
  rosters: SleeperRosterPayload[];
}

async function load(ctx: AdapterContext): Promise<Loaded> {
  const cached = ctx.cache.get("sleeper:league") as Loaded | undefined;
  if (cached) return cached;
  const [league, rosters, users, state, players] = await Promise.all([
    sleeperFetch<SleeperLeaguePayload>(`/league/${ctx.leagueId}`),
    sleeperFetch<SleeperRosterPayload[]>(`/league/${ctx.leagueId}/rosters`),
    sleeperFetch<SleeperUserPayload[]>(`/league/${ctx.leagueId}/users`),
    sleeperFetch<SleeperStatePayload>("/state/nfl"),
    loadPlayers(),
  ]);
  const normalized = normalizeSleeperLeague({ leagueId: ctx.leagueId, league, rosters, users, players, state });
  ctx.warnings.push(...normalized.warnings);
  const value = { normalized, rosters };
  ctx.cache.set("sleeper:league", value);
  return value;
}

function leagueIdFrom(location: Location): string | null {
  const m = location.pathname.match(/\/leagues\/(\d+)/);
  return m ? m[1] : null;
}

export const sleeperAdapter: FantasyPlatformAdapter = {
  platform: "sleeper",
  detect(location) {
    return /(^|\.)sleeper\.com$/.test(location.hostname);
  },
  describe(location): DetectResult {
    const leagueId = leagueIdFrom(location);
    return { platform: "sleeper", supported: !!leagueId, leagueId, reason: leagueId ? undefined : "Open a league page (sleeper.com/leagues/<id>/…).", url: location.href };
  },
  async getLeagueSettings(ctx) {
    return (await load(ctx)).normalized.settings;
  },
  async getTeams(ctx) {
    return (await load(ctx)).normalized.teams;
  },
  async getAvailablePlayers() {
    // Derived from the projection dataset (anyone projected but unrostered).
    return [];
  },
  async getCurrentUserTeam(ctx, teams) {
    if (ctx.teamIdHint && teams.some((t) => t.id === ctx.teamIdHint)) return { teamId: ctx.teamIdHint, detection: "manual" };
    const { rosters } = await load(ctx);
    const userId = typeof localStorage !== "undefined" ? findSleeperUserId(localStorage) : null;
    if (userId) {
      const roster = rosters.find((r) => r.owner_id === userId);
      if (roster) return { teamId: String(roster.roster_id), detection: "storage" };
    }
    ctx.warnings.push("Could not tell which team is yours; pick it in the panel.");
    return { teamId: null, detection: "none" };
  },
};

// Live ESPN Fantasy Football actual (and ESPN's own projected) points for one
// scoring period, for the "ESPN Act" column of the projections table.
//
// Source: ESPN's public "kona_player_info" player pool, read anonymously in
// the browser (ESPN's API allows cross-origin reads and whitelists the
// X-Fantasy-Filter header). No league is involved, so every QB/RB/WR/TE in
// the pool is available, not just the players rostered in one league.
//
// ESPN's appliedTotal is scored with ESPN's default (full PPR, 4pt pass TD)
// rules, which would not be comparable to a Half PPR / 6pt projection, so
// points are recomputed here from ESPN's raw stat lines using the scoring
// settings the projection was built with.

import { CURRENT_SEASON } from "../constants";
import { normalizePlayerName } from "../bpProjections";

const ESPN_API_BASE =
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

// ESPN's default league used only as a public player pool.
const DEFAULT_LEAGUE_PATH = "leaguedefaults/3";

// Lineup slots for the positions the projections cover: QB, RB, WR, TE.
const OFFENSE_SLOT_IDS = [0, 2, 4, 6];

// How many players (ordered by percent owned) to pull. The projection table
// tops out well under this even on SUPERFLEX.
export const ESPN_PLAYER_LIMIT = 600;

// ESPN stat line ids (verified against live v3 responses).
export const ESPN_STAT_IDS = {
  passYds: "3",
  passTD: "4",
  pass2pt: "19",
  ints: "20",
  rushYds: "24",
  rushTD: "25",
  rush2pt: "26",
  recYds: "42",
  recTD: "43",
  rec2pt: "44",
  receptions: "53",
  fumblesLost: "72",
};

// statSourceId: 0 = what actually happened, 1 = ESPN's projection.
const STAT_SOURCE_ACTUAL = 0;
const STAT_SOURCE_PROJECTED = 1;

// Points per reception for the app's scoring modes (0 Half PPR, 1 Standard,
// 2 Full PPR) — the same mapping the projections use.
export function receptionMultiplierFor(mode) {
  if (mode == 1) return 0;
  if (mode == 2) return 1;
  return 0.5;
}

/**
 * Fantasy points for an ESPN raw stat line under the given scoring.
 * Matches ESPN's default scoring (yards, TDs, 2pt, -2 INT, -2 fumble lost)
 * except that receptions and passing TDs follow the selected settings.
 */
export function scoreEspnStats(stats, { receptionMultiplier = 0.5, passTdPoints = 4 } = {}) {
  if (!stats || typeof stats !== "object") return 0;
  const n = (id) => Number(stats[id]) || 0;
  const S = ESPN_STAT_IDS;
  return (
    n(S.passYds) / 25 +
    n(S.passTD) * passTdPoints +
    n(S.ints) * -2 +
    n(S.rushYds) / 10 +
    n(S.rushTD) * 6 +
    n(S.recYds) / 10 +
    n(S.recTD) * 6 +
    n(S.receptions) * receptionMultiplier +
    (n(S.pass2pt) + n(S.rush2pt) + n(S.rec2pt)) * 2 +
    n(S.fumblesLost) * -2
  );
}

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Turn a kona_player_info response into a Map keyed by the projection
 * tables' normalized player name.
 *
 * @returns {Map<string, { act: number|null, proj: number|null,
 *   espnId: number, name: string }>}
 *   `act` is null until ESPN has an actual stat line for the week (i.e. the
 *   player's game has started); `proj` is ESPN's own projection.
 */
export function parseEspnWeekStats(body, { week, season, receptionMultiplier, passTdPoints }) {
  const out = new Map();
  const players = Array.isArray(body?.players) ? body.players : [];
  for (const entry of players) {
    const player = entry?.player;
    if (!player || typeof player.fullName !== "string") continue;
    let act = null;
    let proj = null;
    for (const line of player.stats || []) {
      if (line.scoringPeriodId !== week) continue;
      if (season != null && line.seasonId != null && line.seasonId !== season) continue;
      const pts = round2(scoreEspnStats(line.stats, { receptionMultiplier, passTdPoints }));
      if (line.statSourceId === STAT_SOURCE_ACTUAL) act = pts;
      else if (line.statSourceId === STAT_SOURCE_PROJECTED) proj = pts;
    }
    if (act === null && proj === null) continue;
    const name = normalizePlayerName(player.fullName);
    // The pool is sorted by ownership, so on a name collision keep the
    // more-owned player.
    if (out.has(name)) continue;
    out.set(name, { act, proj, espnId: player.id, name: player.fullName });
  }
  return out;
}

function buildUrl({ season, week }) {
  const params = new URLSearchParams({
    scoringPeriodId: String(week),
    view: "kona_player_info",
  });
  return `${ESPN_API_BASE}/${season}/segments/0/${DEFAULT_LEAGUE_PATH}?${params}`;
}

function buildFilter({ week, limit }) {
  return JSON.stringify({
    players: {
      filterSlotIds: { value: OFFENSE_SLOT_IDS },
      filterStatsForCurrentSeasonScoringPeriodId: { value: [week] },
      limit,
      sortPercOwned: { sortAsc: false, sortPriority: 1 },
    },
  });
}

/**
 * Fetch ESPN's actual and projected fantasy points for every offensive
 * player in a week, scored with the app's selected settings.
 *
 * @param {{ season?: number, week: number, mode?: number, passTdPoints?: number,
 *           limit?: number, signal?: AbortSignal }} opts
 * @returns {Promise<Map<string, { act: number|null, proj: number|null,
 *   espnId: number, name: string }>>}
 */
export async function fetchEspnWeekStats({
  season = CURRENT_SEASON,
  week,
  mode = 0,
  passTdPoints = 4,
  limit = ESPN_PLAYER_LIMIT,
  signal,
}) {
  const wk = Number(week);
  if (!Number.isInteger(wk) || wk < 1) throw new Error("ESPN actuals: invalid week");
  const response = await fetch(buildUrl({ season, week: wk }), {
    headers: { "X-Fantasy-Filter": buildFilter({ week: wk, limit }) },
    signal,
  });
  if (!response.ok) throw new Error(`ESPN actuals: HTTP ${response.status}`);
  const body = await response.json();
  return parseEspnWeekStats(body, {
    week: wk,
    season,
    receptionMultiplier: receptionMultiplierFor(mode),
    passTdPoints,
  });
}

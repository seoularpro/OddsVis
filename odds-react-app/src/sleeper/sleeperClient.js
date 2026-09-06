// Sleeper Fantasy Football league client.
//
// Sleeper's v1 API is public and read-only: no token, no cookies, CORS open,
// and league/roster endpoints work by league ID alone (verified 2026-09-06).
// Rosters return the live current lineup rather than a week-specific one, so
// the "current week" only comes from the NFL state endpoint for display and
// for matching this app's weekly projections.

const SLEEPER_API_BASE = "https://api.sleeper.app/v1";

// Sleeper asks that the player file be fetched at most once per day.
const PLAYER_CACHE_KEY = "sleeperPlayersV1";
const PLAYER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Roster slots that are not part of the active lineup.
const NON_STARTING_ROSTER_POSITIONS = new Set(["BN", "IR", "TAXI"]);

const ROSTER_POSITION_LABELS = {
  SUPER_FLEX: "SFLEX",
  REC_FLEX: "WR/TE",
  WRRB_FLEX: "RB/WR",
  IDP_FLEX: "IDP",
  DEF: "D/ST",
};

export const SLEEPER_ERROR_MESSAGES = {
  SLEEPER_INVALID_LEAGUE_ID: "Enter a numeric Sleeper league ID (the number in sleeper.com/leagues/…).",
  SLEEPER_LEAGUE_NOT_FOUND: "We couldn't find that Sleeper league.",
  SLEEPER_RATE_LIMITED: "Sleeper is rate limiting requests. Wait a moment and try again.",
  SLEEPER_API_ERROR: "Sleeper returned an unexpected error.",
  SLEEPER_INVALID_RESPONSE: "Sleeper returned data in an unexpected shape.",
};

export class SleeperApiError extends Error {
  constructor(code, message, status) {
    super(message || SLEEPER_ERROR_MESSAGES[code] || SLEEPER_ERROR_MESSAGES.SLEEPER_API_ERROR);
    this.name = "SleeperApiError";
    this.code = code;
    this.status = status;
  }
}

async function requestSleeper(path) {
  let response;
  try {
    response = await fetch(`${SLEEPER_API_BASE}${path}`);
  } catch (e) {
    throw new SleeperApiError("SLEEPER_API_ERROR", "Could not reach Sleeper. Check your connection and try again.");
  }
  if (response.status === 404) throw new SleeperApiError("SLEEPER_LEAGUE_NOT_FOUND", undefined, 404);
  if (response.status === 429) throw new SleeperApiError("SLEEPER_RATE_LIMITED", undefined, 429);
  if (!response.ok) throw new SleeperApiError("SLEEPER_API_ERROR", undefined, response.status);
  let body;
  try {
    body = await response.json();
  } catch (e) {
    throw new SleeperApiError("SLEEPER_INVALID_RESPONSE");
  }
  // Sleeper answers some unknown IDs with 200 + null rather than 404.
  if (body === null) throw new SleeperApiError("SLEEPER_LEAGUE_NOT_FOUND", undefined, response.status);
  return body;
}

// ---- player metadata -------------------------------------------------------
// The full player file is ~15MB, so it is trimmed to id -> [name, position,
// team] for players with a fantasy position, kept in memory for the session,
// and cached in localStorage for a day (storage failures just skip caching).

let playersPromise = null;

function readCachedPlayers() {
  try {
    const raw = localStorage.getItem(PLAYER_CACHE_KEY);
    if (!raw) return null;
    const { savedAt, players } = JSON.parse(raw);
    if (!savedAt || Date.now() - savedAt > PLAYER_CACHE_TTL_MS) return null;
    return players;
  } catch (e) {
    return null;
  }
}

function writeCachedPlayers(players) {
  try {
    localStorage.setItem(PLAYER_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), players }));
  } catch (e) {
    // Quota or disabled storage: fine, the in-memory copy still works.
  }
}

function trimPlayers(raw) {
  const players = {};
  for (const [id, p] of Object.entries(raw)) {
    if (!p || (!p.position && !Array.isArray(p.fantasy_positions))) continue;
    const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ");
    if (!name) continue;
    players[id] = [name, p.position || undefined, p.team || undefined];
  }
  return players;
}

function loadSleeperPlayers() {
  if (!playersPromise) {
    playersPromise = (async () => {
      const cached = readCachedPlayers();
      if (cached) return cached;
      const players = trimPlayers(await requestSleeper("/players/nfl"));
      writeCachedPlayers(players);
      return players;
    })().catch((e) => {
      playersPromise = null;
      throw e;
    });
  }
  return playersPromise;
}

// ---- normalization ---------------------------------------------------------

function rosterPositionLabel(position) {
  return ROSTER_POSITION_LABELS[position] || position;
}

function teamDisplayName(user, rosterId) {
  const custom = user?.metadata?.team_name;
  if (typeof custom === "string" && custom.trim()) return custom.trim();
  if (user?.display_name) return user.display_name;
  return `Team ${rosterId}`;
}

function resolveCurrentWeek(state) {
  // `leg` is the regular-season week; `week` counts preseason too.
  const candidates = [state?.leg, state?.display_week, state?.week];
  const week = candidates.find((w) => Number.isInteger(w) && w > 0);
  return week || 1;
}

function normalizeSleeperLeagueLineups({ leagueId, league, rosters, users, players, state }) {
  if (!Array.isArray(rosters) || !Array.isArray(users) || !Array.isArray(league.roster_positions)) {
    throw new SleeperApiError("SLEEPER_INVALID_RESPONSE");
  }
  const usersById = new Map(users.map((u) => [u.user_id, u]));
  const starterSlots = league.roster_positions.filter((p) => !NON_STARTING_ROSTER_POSITIONS.has(p));

  const teams = rosters
    .map((roster) => {
      const starterIds = Array.isArray(roster.starters) ? roster.starters : [];
      const starters = starterIds
        .map((playerId, index) => {
          // Sleeper fills unset slots with "0".
          if (!playerId || playerId === "0") return null;
          const meta = players[playerId];
          return {
            playerId: String(playerId),
            name: meta ? meta[0] : `Player ${playerId}`,
            position: meta ? meta[1] : undefined,
            proTeam: meta ? meta[2] : undefined,
            lineupSlotId: index,
            lineupSlot: rosterPositionLabel(starterSlots[index] || "FLEX"),
          };
        })
        .filter(Boolean);
      return {
        teamId: String(roster.roster_id),
        teamName: teamDisplayName(usersById.get(roster.owner_id), roster.roster_id),
        starters,
      };
    })
    .sort((a, b) => Number(a.teamId) - Number(b.teamId));

  const week = resolveCurrentWeek(state);
  return {
    provider: "sleeper",
    leagueId,
    leagueName: league.name,
    season: Number(league.season) || Number(state?.season),
    week,
    scoringPeriodId: week,
    teams,
  };
}

/**
 * Fetch every team's current starting lineup for a Sleeper league.
 * Same output shape as fetchEspnLeagueLineups, with provider "sleeper".
 */
export async function fetchSleeperLeagueLineups({ leagueId }) {
  const id = String(leagueId ?? "").trim();
  if (!/^\d+$/.test(id)) throw new SleeperApiError("SLEEPER_INVALID_LEAGUE_ID");

  const [league, rosters, users, state, players] = await Promise.all([
    requestSleeper(`/league/${id}`),
    requestSleeper(`/league/${id}/rosters`),
    requestSleeper(`/league/${id}/users`),
    requestSleeper("/state/nfl"),
    loadSleeperPlayers(),
  ]);

  return normalizeSleeperLeagueLineups({ leagueId: id, league, rosters, users, players, state });
}

// ESPN Fantasy Football league client.
//
// Public leagues are fetched straight from ESPN in the browser (ESPN's API
// allows anonymous cross-origin reads). Private leagues need the user's
// SWID / espn_s2 cookies, which the browser will not attach cross-site, so
// those requests go through the site's Netlify function, which forwards the
// cookies to ESPN and returns ESPN's response. Credentials live only in memory
// and only ever travel in a POST body.

import { CURRENT_SEASON } from "../constants";
import {
  compareLineupSlots,
  defaultPositionLabel,
  isStartingLineupSlot,
  lineupSlotLabel,
} from "./espnLineupSlots";

const ESPN_API_BASE =
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

// Netlify serves functions at this path on the deployed site (and under
// `netlify dev` locally). Plain `npm start` has no proxy.
const PRIVATE_LEAGUE_PROXY_URL = "/.netlify/functions/espn-league";

export const ESPN_ERROR_MESSAGES = {
  ESPN_INVALID_LEAGUE_ID: "Enter a numeric ESPN league ID.",
  ESPN_LEAGUE_NOT_FOUND: "ESPN has no league with that ID for this season.",
  ESPN_PRIVATE_LEAGUE:
    "This league is private. ESPN cookies from a signed-in account are needed to view it.",
  ESPN_AUTH_FAILED:
    "ESPN rejected the cookies. They may be expired or pasted incorrectly, or the account isn't in this league.",
  ESPN_RATE_LIMITED: "ESPN is rate limiting requests. Wait a moment and try again.",
  ESPN_API_ERROR: "ESPN returned an unexpected error.",
  ESPN_INVALID_RESPONSE: "ESPN returned data in an unexpected shape.",
  ESPN_PROXY_UNAVAILABLE:
    "Private-league import needs the site's server function, which isn't available in this environment.",
};

export class EspnApiError extends Error {
  constructor(code, message, status) {
    super(message || ESPN_ERROR_MESSAGES[code] || ESPN_ERROR_MESSAGES.ESPN_API_ERROR);
    this.name = "EspnApiError";
    this.code = code;
    this.status = status;
  }
}

function buildEspnUrl({ season, leagueId, views, scoringPeriodId }) {
  const params = new URLSearchParams();
  views.forEach((v) => params.append("view", v));
  if (scoringPeriodId != null) params.set("scoringPeriodId", String(scoringPeriodId));
  return `${ESPN_API_BASE}/${season}/segments/0/leagues/${leagueId}?${params}`;
}

// Translate an HTTP failure (from ESPN directly or relayed by the proxy) into
// an application error. Never includes credentials.
function toEspnError(status, body, hasCredentials) {
  if (body && typeof body.error === "string" && ESPN_ERROR_MESSAGES[body.error]) {
    return new EspnApiError(body.error, body.message, status);
  }
  if (status === 401 || status === 403) {
    return new EspnApiError(
      hasCredentials ? "ESPN_AUTH_FAILED" : "ESPN_PRIVATE_LEAGUE",
      undefined,
      status
    );
  }
  if (status === 404) return new EspnApiError("ESPN_LEAGUE_NOT_FOUND", undefined, status);
  if (status === 429) return new EspnApiError("ESPN_RATE_LIMITED", undefined, status);
  const detail = Array.isArray(body?.messages) ? body.messages[0] : undefined;
  return new EspnApiError(
    "ESPN_API_ERROR",
    detail ? `ESPN returned an error: ${detail}` : undefined,
    status
  );
}

async function requestEspn({ leagueId, season, views, scoringPeriodId, credentials }) {
  let response;
  try {
    if (credentials) {
      response = await fetch(PRIVATE_LEAGUE_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId,
          season,
          views,
          scoringPeriodId,
          swid: credentials.swid,
          espnS2: credentials.espnS2,
        }),
      });
    } else {
      response = await fetch(buildEspnUrl({ season, leagueId, views, scoringPeriodId }));
    }
  } catch (e) {
    throw new EspnApiError("ESPN_API_ERROR", "Could not reach ESPN. Check your connection and try again.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (credentials && !contentType.includes("json")) {
    // The SPA fallback (index.html) answered instead of the function.
    throw new EspnApiError("ESPN_PROXY_UNAVAILABLE", undefined, response.status);
  }

  let body = null;
  try {
    body = await response.json();
  } catch (e) {
    body = null;
  }

  if (!response.ok) throw toEspnError(response.status, body, Boolean(credentials));
  if (!body || typeof body !== "object") throw new EspnApiError("ESPN_INVALID_RESPONSE");
  return body;
}

// The lineup ESPN returns depends on the requested scoringPeriodId, so the
// "current" week is read from the league's own status rather than guessed.
// ESPN reports 0 before the season starts; clamp into the season's range.
function resolveCurrentScoringPeriod(league) {
  const status = league.status || {};
  const first = Number.isInteger(status.firstScoringPeriod) && status.firstScoringPeriod > 0
    ? status.firstScoringPeriod
    : 1;
  const final = status.finalScoringPeriod;
  let current = Number(league.scoringPeriodId);
  if (!Number.isInteger(current) || current < first) current = first;
  if (Number.isInteger(final) && final > 0 && current > final) current = final;
  return current;
}

function teamDisplayName(team) {
  const name = typeof team.name === "string" ? team.name.trim() : "";
  if (name) return name;
  const legacy = [team.location, team.nickname].filter(Boolean).join(" ").trim();
  return legacy || team.abbrev || `Team ${team.id}`;
}

function normalizeEspnLeagueLineups({ leagueId, season, scoringPeriodId, league, rosters }) {
  if (!Array.isArray(rosters.teams)) throw new EspnApiError("ESPN_INVALID_RESPONSE");
  const teamMeta = new Map((league.teams || []).map((t) => [t.id, t]));

  const teams = rosters.teams
    .map((team) => {
      const entries = team.roster?.entries;
      if (!Array.isArray(entries)) throw new EspnApiError("ESPN_INVALID_RESPONSE");

      const starters = entries
        .filter((entry) => isStartingLineupSlot(entry.lineupSlotId))
        .map((entry) => {
          const player = entry.playerPoolEntry?.player;
          if (!player || typeof player.fullName !== "string") {
            throw new EspnApiError("ESPN_INVALID_RESPONSE");
          }
          return {
            playerId: player.id ?? entry.playerId,
            name: player.fullName,
            position: defaultPositionLabel(player.defaultPositionId),
            lineupSlotId: entry.lineupSlotId,
            lineupSlot: lineupSlotLabel(entry.lineupSlotId),
            proTeamId: player.proTeamId,
            injuryStatus: player.injuryStatus,
          };
        })
        .sort(
          (a, b) =>
            compareLineupSlots(a.lineupSlotId, b.lineupSlotId) ||
            a.name.localeCompare(b.name)
        );

      return {
        teamId: team.id,
        teamName: teamDisplayName(teamMeta.get(team.id) || team),
        starters,
      };
    })
    .sort((a, b) => a.teamId - b.teamId);

  return {
    leagueId,
    leagueName: league.settings?.name,
    season,
    scoringPeriodId,
    teams,
  };
}

/**
 * Fetch every team's current starting lineup for an ESPN league.
 *
 * @param {{ leagueId: string|number, season?: number,
 *           credentials?: { swid: string, espnS2: string } }} opts
 * @returns {Promise<{ leagueId: string, leagueName?: string, season: number,
 *   scoringPeriodId: number, teams: { teamId: number, teamName: string,
 *   starters: { playerId: number, name: string, position?: string,
 *   lineupSlotId: number, lineupSlot: string, proTeamId?: number,
 *   injuryStatus?: string }[] }[] }>}
 */
export async function fetchEspnLeagueLineups({ leagueId, season = CURRENT_SEASON, credentials }) {
  const id = String(leagueId ?? "").trim();
  if (!/^\d+$/.test(id)) throw new EspnApiError("ESPN_INVALID_LEAGUE_ID");

  const common = { leagueId: id, season, credentials };

  // 1. League status/settings/teams -> which scoring period is current.
  const league = await requestEspn({ ...common, views: ["mSettings", "mStatus", "mTeam"] });
  const scoringPeriodId = resolveCurrentScoringPeriod(league);

  // 2. Rosters as they stand for that scoring period.
  const rosters = await requestEspn({ ...common, views: ["mRoster"], scoringPeriodId });

  return normalizeEspnLeagueLineups({ leagueId: id, season, scoringPeriodId, league, rosters });
}

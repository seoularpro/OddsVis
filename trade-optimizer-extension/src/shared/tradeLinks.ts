// Links from a suggested trade to the fantasy site's own trade screen. The
// extension never proposes a trade itself; it only opens the site's screen.

import type { League, Player } from "../domain/types";

export interface TradeScreenLink {
  url: string;
  label: string;
  /** What the user still has to do on the site once the screen is open. */
  hint: string;
}

const isNumeric = (v: string | null | undefined): v is string => !!v && /^\d+$/.test(v);

/**
 * ESPN's propose-trade page, in the shape ESPN's own "Trade" button on a
 * player card builds. `teamId` is the partner, `fromTeamId` the user, and
 * `players` pre-selects players on the partner's roster only (ids that are
 * not on that roster are ignored), so the user's side is ticked by hand.
 */
function espnTradeUrl(league: League, partnerTeamId: string, userReceives: Player[]): string | null {
  const { leagueId, season } = league.settings;
  if (!isNumeric(leagueId) || !isNumeric(league.userTeamId) || !isNumeric(partnerTeamId)) return null;
  const players = userReceives.map((p) => p.platformId).filter(isNumeric);
  return (
    `https://fantasy.espn.com/football/team/trade?leagueId=${leagueId}&seasonId=${season}` +
    `&teamId=${partnerTeamId}&fromTeamId=${league.userTeamId}&step=1${players.length ? `&players=${players.join(",")}` : ""}`
  );
}

export function tradeScreenLink(league: League, trade: { partnerTeamId: string; userReceives: Player[] }, partnerName: string): TradeScreenLink | null {
  switch (league.settings.platform) {
    case "espn": {
      const url = espnTradeUrl(league, trade.partnerTeamId, trade.userReceives);
      if (!url) return null;
      return { url, label: "Open in ESPN", hint: "Opens ESPN's trade screen with the players you receive selected. Tick the players you send there." };
    }
    case "sleeper": {
      if (!isNumeric(league.settings.leagueId)) return null;
      return {
        url: `https://sleeper.com/leagues/${league.settings.leagueId}/trades`,
        label: "Open Sleeper trade center",
        hint: `Sleeper can't pre-fill a trade: pick ${partnerName} and these players there.`,
      };
    }
    default:
      return null;
  }
}

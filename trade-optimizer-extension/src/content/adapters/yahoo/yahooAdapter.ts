// Yahoo Fantasy: detection only. Yahoo's API is OAuth-only and the web app
// exposes no stable structured state, so a full adapter needs either an
// OAuth flow or DOM scraping of the roster pages. The interface is in place;
// extraction reports a clear "not supported yet".

import { AdapterError, type DetectResult } from "../../../shared/messages";
import type { FantasyPlatformAdapter } from "../types";

const REASON = "Yahoo Fantasy is detected but not supported yet: its API is OAuth-only and the site exposes no structured league state.";

export const yahooAdapter: FantasyPlatformAdapter = {
  platform: "yahoo",
  detect(location) {
    return /(^|\.)fantasysports\.yahoo\.com$/.test(location.hostname);
  },
  describe(location): DetectResult {
    const m = location.pathname.match(/\/f1\/(\d+)/);
    return { platform: "yahoo", supported: false, leagueId: m ? m[1] : null, reason: REASON, url: location.href };
  },
  async getLeagueSettings() {
    throw new AdapterError("YAHOO_UNSUPPORTED", REASON);
  },
  async getTeams() {
    throw new AdapterError("YAHOO_UNSUPPORTED", REASON);
  },
  async getAvailablePlayers() {
    return [];
  },
  async getCurrentUserTeam() {
    return { teamId: null, detection: "none" };
  },
};

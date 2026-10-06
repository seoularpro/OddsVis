import { describe, expect, it } from "vitest";
import type { League, Platform, Player } from "../src/domain/types";
import { tradeScreenLink } from "../src/shared/tradeLinks";

const player = (platformId: string | undefined, name: string): Player => ({
  id: `x:${name}`,
  platformId,
  name,
  position: "RB",
  projection: 10,
  projectionSource: "dataset",
  tradeValue: 10,
  tradeValueSource: "dataset",
});

const league = (platform: Platform, leagueId: string, userTeamId: string | null): League => ({
  settings: { platform, leagueId, leagueName: "L", season: 2026, week: 5, teamCount: 10, rosterSize: 16, scoring: { receptionPoints: 1, passTdPoints: 4 }, lineupSlots: [] },
  teams: [],
  userTeamId,
  availablePlayers: [],
});

describe("tradeScreenLink", () => {
  it("builds ESPN's propose-trade URL with the partner's players pre-selected", () => {
    const link = tradeScreenLink(league("espn", "48347143", "3"), { partnerTeamId: "7", userReceives: [player("4241389", "A"), player("15847", "B")] }, "Them");
    expect(link?.url).toBe("https://fantasy.espn.com/football/team/trade?leagueId=48347143&seasonId=2026&teamId=7&fromTeamId=3&step=1&players=4241389,15847");
    expect(link?.label).toBe("Open in ESPN");
  });

  it("drops non-numeric ESPN player ids and needs the user's team", () => {
    const trade = { partnerTeamId: "7", userReceives: [player(undefined, "A"), player("12&x=1", "B")] };
    expect(tradeScreenLink(league("espn", "1", "3"), trade, "Them")?.url).toBe("https://fantasy.espn.com/football/team/trade?leagueId=1&seasonId=2026&teamId=7&fromTeamId=3&step=1");
    expect(tradeScreenLink(league("espn", "1", null), trade, "Them")).toBeNull();
  });

  it("sends Sleeper users to the league's trade center and names the partner", () => {
    const link = tradeScreenLink(league("sleeper", "1312563056986824704", "4"), { partnerTeamId: "9", userReceives: [player("4034", "A")] }, "Edison FC");
    expect(link?.url).toBe("https://sleeper.com/leagues/1312563056986824704/trades");
    expect(link?.hint).toContain("Edison FC");
  });

  it("has no link for the demo league or Yahoo", () => {
    const trade = { partnerTeamId: "b", userReceives: [player("rb-a", "A")] };
    expect(tradeScreenLink(league("fixture", "demo", "a"), trade, "Them")).toBeNull();
    expect(tradeScreenLink(league("yahoo", "123", "1"), trade, "Them")).toBeNull();
  });
});

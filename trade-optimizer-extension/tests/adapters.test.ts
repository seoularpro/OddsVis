import { describe, expect, it } from "vitest";
import { espnLineupSlots, espnScoring, espnTeamForSwid, normalizeEspnLeague, normalizeEspnPlayerPool, type EspnLeaguePayload } from "../src/content/adapters/espn/espnAdapter";
import { findSleeperUserId, normalizeSleeperLeague, sleeperLineupSlots, trimSleeperPlayers } from "../src/content/adapters/sleeper/sleeperAdapter";
import { describePage } from "../src/content/detectPlatform";

const loc = (href: string) => new URL(href) as unknown as Location;

describe("platform detection", () => {
  it("recognizes ESPN, Sleeper and Yahoo league pages", () => {
    const espn = describePage(loc("https://fantasy.espn.com/football/team?leagueId=48347143&teamId=3&seasonId=2026"));
    expect(espn).toMatchObject({ platform: "espn", supported: true, leagueId: "48347143" });
    const espnNoLeague = describePage(loc("https://fantasy.espn.com/football/"));
    expect(espnNoLeague.supported).toBe(false);
    const sleeper = describePage(loc("https://sleeper.com/leagues/1312563056986824704/team"));
    expect(sleeper).toMatchObject({ platform: "sleeper", supported: true, leagueId: "1312563056986824704" });
    const yahoo = describePage(loc("https://football.fantasysports.yahoo.com/f1/12345/1"));
    expect(yahoo).toMatchObject({ platform: "yahoo", supported: false, leagueId: "12345" });
    expect(describePage(loc("https://example.com/")).platform).toBeNull();
  });
});

describe("ESPN normalization", () => {
  const payload: EspnLeaguePayload = {
    id: 1,
    seasonId: 2026,
    scoringPeriodId: 3,
    settings: {
      name: "Test League",
      size: 2,
      rosterSettings: { lineupSlotCounts: { "0": 1, "2": 2, "4": 2, "6": 1, "23": 1, "16": 1, "17": 1, "20": 6, "21": 1, "7": 0 } },
      scoringSettings: { scoringItems: [{ statId: 53, points: 0.5 }, { statId: 4, points: 6 }] },
    },
    members: [{ id: "{ABC}", displayName: "alice" }, { id: "{DEF}", firstName: "Bob", lastName: "B" }],
    teams: [
      {
        id: 1, name: "Alice's Team", owners: ["{ABC}"], primaryOwner: "{ABC}",
        roster: { entries: [
          { playerId: 100, lineupSlotId: 0, playerPoolEntry: { player: { id: 100, fullName: "Josh Allen", defaultPositionId: 1, proTeamId: 2 } } },
          { playerId: 101, lineupSlotId: 20, playerPoolEntry: { player: { id: 101, fullName: "Bills D/ST", defaultPositionId: 16, proTeamId: 2 } } },
          { playerId: 102, lineupSlotId: 21, playerPoolEntry: { player: { id: 102, fullName: "Injured Guy", defaultPositionId: 2, proTeamId: 3 } } },
          { playerId: 103, lineupSlotId: 20, playerPoolEntry: { player: { id: 103, fullName: "Some LB", defaultPositionId: 11, proTeamId: 3 } } },
        ] },
      },
      { id: 2, location: "Bob", nickname: "Builders", owners: ["{DEF}"], primaryOwner: "{DEF}", roster: { entries: [] } },
    ],
  };

  it("maps slots, roster size, scoring, teams and players", () => {
    const { settings, teams, warnings } = normalizeEspnLeague(payload, "1");
    expect(settings.lineupSlots.map((s) => `${s.id}x${s.count}`)).toEqual(["QBx1", "RBx2", "WRx2", "TEx1", "FLEXx1", "Kx1", "DSTx1"]);
    expect(settings.rosterSize).toBe(15); // 9 starters + 6 bench, IR excluded
    expect(settings.scoring).toEqual({ receptionPoints: 0.5, passTdPoints: 6 });
    expect(settings.week).toBe(3);
    expect(settings.teamCount).toBe(2);
    expect(teams[0].players.map((p) => p.name)).toEqual(["Josh Allen", "Bills D/ST"]); // IR and IDP skipped
    expect(teams[0].players[0]).toMatchObject({ platformId: "100", position: "QB", nflTeam: "BUF" });
    expect(teams[0].ownerName).toBe("alice");
    expect(teams[1].name).toBe("Bob Builders");
    expect(teams[1].ownerName).toBe("Bob B");
    expect(warnings).toEqual([]);
  });

  it("identifies the user's team by SWID and parses the free-agent pool", () => {
    expect(espnTeamForSwid(payload, "{abc}")).toBe("1");
    expect(espnTeamForSwid(payload, "{nope}")).toBeNull();
    const pool = normalizeEspnPlayerPool({ players: [
      { id: 200, onTeamId: 0, player: { id: 200, fullName: "FA RB", defaultPositionId: 2, proTeamId: 9 } },
      { id: 201, onTeamId: 4, player: { id: 201, fullName: "Rostered", defaultPositionId: 2 } },
      { id: 202, onTeamId: 0, player: { id: 202, fullName: "FA K", defaultPositionId: 5 } },
    ] });
    expect(pool.map((p) => p.name)).toEqual(["FA RB"]);
  });

  it("handles superflex slots and missing scoring items", () => {
    const { slots, skipped } = espnLineupSlots({ "0": 1, "7": 1, "2": 2, "4": 3, "6": 1, "20": 8, "10": 2 });
    expect(slots.find((s) => s.id === "SUPERFLEX")?.eligible).toEqual(["QB", "RB", "WR", "TE"]);
    expect(skipped).toEqual(["slot 10"]);
    expect(espnScoring(undefined)).toEqual({ receptionPoints: 0, passTdPoints: 4 });
  });
});

describe("Sleeper normalization", () => {
  it("maps roster positions and rosters, excluding IR/taxi players", () => {
    const players = trimSleeperPlayers({
      "1": { full_name: "Jalen Hurts", position: "QB", team: "PHI" },
      "2": { first_name: "Bijan", last_name: "Robinson", position: "RB", team: "ATL" },
      "3": { full_name: "Injured WR", position: "WR", team: "DAL" },
      "4": { full_name: "Some LB", position: "LB", team: "DAL" },
      "BUF": { full_name: "Buffalo Bills", position: "DEF", team: "BUF" },
      "x": { position: null },
    });
    const { settings, teams } = normalizeSleeperLeague({
      leagueId: "9",
      league: { name: "Sleeper Test", season: "2026", total_rosters: 2, roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "SUPER_FLEX", "K", "DEF", "BN", "BN", "IR", "TAXI"], scoring_settings: { rec: 1, pass_td: 4 } },
      rosters: [
        { roster_id: 1, owner_id: "u1", players: ["1", "2", "3", "4", "BUF"], reserve: ["3"], taxi: [] },
        { roster_id: 2, owner_id: null, players: [] },
      ],
      users: [{ user_id: "u1", display_name: "alice", metadata: { team_name: "Alice Rules" } }],
      players,
      state: { week: 5, leg: 4, season: "2026" },
    });
    expect(settings.lineupSlots.map((s) => `${s.id}x${s.count}`)).toEqual(["QBx1", "RBx2", "WRx2", "TEx1", "FLEXx1", "SUPERFLEXx1", "Kx1", "DSTx1"]);
    expect(settings.rosterSize).toBe(12);
    expect(settings.scoring).toEqual({ receptionPoints: 1, passTdPoints: 4 });
    expect(settings.week).toBe(4);
    expect(teams[0].name).toBe("Alice Rules");
    expect(teams[0].players.map((p) => `${p.name}:${p.position}`)).toEqual(["Jalen Hurts:QB", "Bijan Robinson:RB", "Buffalo Bills:DST"]);
    expect(teams[1].name).toBe("Team 2");
  });

  it("skips unsupported IDP positions and finds the user id in storage", () => {
    const { slots, skipped } = sleeperLineupSlots(["QB", "IDP_FLEX", "DL", "BN"]);
    expect(slots.map((s) => s.id)).toEqual(["QB"]);
    expect(skipped).toEqual(["IDP_FLEX", "DL"]);
    const fake = { length: 2, key: (i: number) => ["a", "b"][i], getItem: (k: string) => (k === "b" ? JSON.stringify({ user: { user_id: "123456789" } }) : "nope") };
    expect(findSleeperUserId(fake)).toBe("123456789");
  });
});

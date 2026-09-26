import { describe, expect, it } from "vitest";
import { PlayerIndex, normalizeDstName, normalizeName } from "../src/data/playerMapping";
import { enrichLeague, estimateTradeValue } from "../src/data/enrichLeague";
import type { RawLeague } from "../src/domain/types";
import { standardLineup } from "../src/domain/positions";

describe("name normalization", () => {
  it("strips suffixes, punctuation and diacritics", () => {
    expect(normalizeName("Kenneth Walker III")).toBe("kenneth walker");
    expect(normalizeName("Odell Beckham Jr.")).toBe("odell beckham");
    expect(normalizeName("Ja'Marr Chase")).toBe("jamarr chase");
    expect(normalizeName("Amon-Ra St. Brown")).toBe("amonra st brown");
    expect(normalizeName("José Ramírez")).toBe("jose ramirez");
  });

  it("maps D/ST naming variants to the same team", () => {
    expect(normalizeDstName("Bills D/ST")).toBe("BUF");
    expect(normalizeDstName("Buffalo Bills")).toBe("BUF");
    expect(normalizeDstName("BUF DST")).toBe("BUF");
    expect(normalizeDstName("49ers D/ST")).toBe("SF");
  });
});

describe("player index", () => {
  const entries = [
    { playerId: "1", name: "Marquise Brown", position: "WR" as const, tradeValue: 10 },
    { playerId: "2", name: "D.J. Moore", position: "WR" as const, tradeValue: 30 },
    { playerId: "3", name: "Josh Allen", position: "QB" as const, tradeValue: 40 },
    { playerId: "4", name: "Josh Allen", position: "WR" as const, tradeValue: 2 },
    { playerId: "5", name: "Kenneth Walker III", position: "RB" as const, tradeValue: 28 },
    { playerId: "6", name: "Bills D/ST", position: "DST" as const, tradeValue: 1 },
  ];
  const index = new PlayerIndex(entries);

  it("matches by id, exact, normalized, alias and fuzzy with the right confidence", () => {
    expect(index.find({ platformId: "5", name: "K. Walker", position: "RB" }).confidence).toBe("id");
    expect(index.find({ name: "josh allen", position: "QB" })).toMatchObject({ confidence: "exact", entry: entries[2] });
    expect(index.find({ name: "Kenneth Walker", position: "RB" })).toMatchObject({ confidence: "normalized", entry: entries[4] });
    expect(index.find({ name: "Hollywood Brown", position: "WR" })).toMatchObject({ confidence: "normalized", entry: entries[0] });
    expect(index.find({ name: "DJ Moore", position: "WR" })).toMatchObject({ confidence: "normalized", entry: entries[1] });
    expect(index.find({ name: "K. Walker", position: "RB" })).toMatchObject({ confidence: "fuzzy", entry: entries[4] });
    expect(index.find({ name: "Buffalo Bills", position: "DST" })).toMatchObject({ confidence: "normalized", entry: entries[5] });
  });

  it("uses position to separate duplicate names and never guesses across positions", () => {
    expect(index.find({ name: "Josh Allen", position: "WR" }).entry).toBe(entries[3]);
    expect(index.find({ name: "Josh Allen", position: "TE" }).confidence).toBe("unmatched");
  });
});

describe("enrichLeague", () => {
  const raw: RawLeague = {
    settings: { platform: "espn", leagueId: "1", leagueName: "L", season: 2026, week: 1, teamCount: 2, rosterSize: 4, scoring: { receptionPoints: 0.5, passTdPoints: 4 }, lineupSlots: standardLineup() },
    teams: [
      { id: "a", name: "A", players: [{ platformId: "10", name: "Star RB", position: "RB" }, { platformId: "11", name: "Deep Cut", position: "WR" }, { platformId: "12", name: "Nobody", position: "TE" }] },
      { id: "b", name: "B", players: [{ platformId: "20", name: "Other RB", position: "RB" }] },
    ],
    userTeamId: "a",
    userTeamDetection: "owner",
    availablePlayers: [{ platformId: "30", name: "FA RB", position: "RB" }],
  };
  const projections = { entries: [
    { name: "Star RB", position: "RB" as const, medianProjection: 20 },
    { name: "Deep Cut", position: "WR" as const, medianProjection: 12 },
    { name: "Other RB", position: "RB" as const, medianProjection: 14 },
    { name: "FA RB", position: "RB" as const, medianProjection: 8 },
    { name: "Unrostered WR", position: "WR" as const, medianProjection: 9 },
  ], source: "test", label: "test" };
  const tradeValues = { entries: [{ name: "Star RB", position: "RB" as const, tradeValue: 50 }, { name: "Other RB", position: "RB" as const, tradeValue: 20 }, { name: "Cheap WR", position: "WR" as const, tradeValue: 6 }], source: "test", label: "test" };

  it("attaches datasets, derives the waiver pool and estimates unlisted values", () => {
    const { league, report } = enrichLeague(raw, projections, tradeValues);
    const star = league.teams[0].players[0];
    expect(star.projection).toBe(20);
    expect(star.tradeValue).toBe(50);
    expect(star.tradeValueSource).toBe("dataset");
    const deep = league.teams[0].players[1];
    expect(deep.tradeValueSource).toBe("estimated");
    expect(deep.tradeValue).toBeGreaterThan(0);
    expect(deep.tradeValue).toBeLessThanOrEqual(3); // no listed WR curve -> small slope fallback
    const nobody = league.teams[0].players[2];
    expect(nobody.projection).toBe(0);
    expect(report.unmatchedProjection.map((u) => u.name)).toEqual(["Nobody"]);
    const availableNames = league.availablePlayers.map((p) => p.name);
    expect(availableNames).toEqual(expect.arrayContaining(["FA RB", "Unrostered WR"]));
    expect(availableNames).not.toContain("Star RB");
    expect(league.availablePlayers.every((p) => p.tradeValue === 0)).toBe(true);
    expect(report.availableFromDataset).toBe(1);
  });

  it("estimateTradeValue interpolates the listed curve, discounts it and caps at the lower quartile", () => {
    const curve = [
      { projection: 18, value: 40 }, { projection: 16, value: 30 }, { projection: 14, value: 20 }, { projection: 12, value: 10 }, { projection: 10, value: 4 },
    ];
    // 13 projected -> interpolated 15 -> x0.6 = 9, capped at lower quartile (10) -> 9
    expect(estimateTradeValue(13, "WR", 8, curve)).toBe(9);
    // 17 projected -> interpolated 35 -> 21, capped at the lower quartile 10
    expect(estimateTradeValue(17, "WR", 8, curve)).toBe(10);
    // at or below replacement -> 0; below the listed curve -> clamped to its bottom value (4 x 0.6 = 2)
    expect(estimateTradeValue(8, "WR", 8, curve)).toBe(0);
    expect(estimateTradeValue(9, "WR", 8, curve)).toBe(2);
    expect(estimateTradeValue(0, "WR", 8, curve)).toBe(0);
    // no curve: slope fallback capped at 3
    expect(estimateTradeValue(12, "WR", 9, [])).toBe(3);
  });
});

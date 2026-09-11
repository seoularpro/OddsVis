import {
  parseEspnWeekStats,
  receptionMultiplierFor,
  scoreEspnStats,
} from "./espnActuals";

describe("scoreEspnStats", () => {
  // Josh Allen, 2025 week 10 per ESPN: 306 pass yds, 2 pass TD, 1 INT,
  // 31 rush yds, 1 fumble lost -> ESPN default scoring showed 19.34.
  const allen = { 3: 306, 4: 2, 20: 1, 24: 31, 72: 1 };

  it("reproduces ESPN's default score for a QB line", () => {
    expect(scoreEspnStats(allen, { receptionMultiplier: 1, passTdPoints: 4 })).toBeCloseTo(19.34, 6);
  });

  it("applies the selected pass TD value", () => {
    expect(scoreEspnStats(allen, { passTdPoints: 6 })).toBeCloseTo(23.34, 6);
  });

  it("applies the selected reception value", () => {
    // Puka Nacua: 5 rec, 74 yds -> 7.4 + receptions
    const puka = { 42: 74, 53: 5 };
    expect(scoreEspnStats(puka, { receptionMultiplier: 1 })).toBeCloseTo(12.4, 6);
    expect(scoreEspnStats(puka, { receptionMultiplier: 0.5 })).toBeCloseTo(9.9, 6);
    expect(scoreEspnStats(puka, { receptionMultiplier: 0 })).toBeCloseTo(7.4, 6);
  });

  it("scores TDs, 2pt conversions and fumbles", () => {
    const line = { 24: 50, 25: 1, 26: 1, 42: 10, 43: 1, 53: 1, 72: 1 };
    // 5 + 6 + 2 + 1 + 6 + 0.5 - 2
    expect(scoreEspnStats(line, { receptionMultiplier: 0.5 })).toBeCloseTo(18.5, 6);
  });

  it("returns 0 for a missing stat line", () => {
    expect(scoreEspnStats(undefined)).toBe(0);
  });
});

describe("receptionMultiplierFor", () => {
  it("maps the app's scoring modes", () => {
    expect(receptionMultiplierFor(0)).toBe(0.5);
    expect(receptionMultiplierFor(1)).toBe(0);
    expect(receptionMultiplierFor(2)).toBe(1);
  });
});

describe("parseEspnWeekStats", () => {
  const body = {
    players: [
      {
        player: {
          id: 1,
          fullName: "A.J. Brown",
          stats: [
            { scoringPeriodId: 1, seasonId: 2026, statSourceId: 1, stats: { 42: 80, 53: 6 } },
            { scoringPeriodId: 1, seasonId: 2026, statSourceId: 0, stats: { 42: 26, 53: 3 } },
            { scoringPeriodId: 2, seasonId: 2026, statSourceId: 0, stats: { 42: 999 } },
          ],
        },
      },
      {
        player: {
          id: 2,
          fullName: "Jahmyr Gibbs",
          stats: [{ scoringPeriodId: 1, seasonId: 2026, statSourceId: 1, stats: { 24: 90 } }],
        },
      },
      { player: { id: 3, fullName: "No Stats", stats: [] } },
      { notAPlayer: true },
    ],
  };
  const opts = { week: 1, season: 2026, receptionMultiplier: 0.5, passTdPoints: 4 };

  it("keys by the projections' normalized name and scores each source", () => {
    const m = parseEspnWeekStats(body, opts);
    expect(m.get("AJ Brown")).toEqual({ act: 4.1, proj: 11, espnId: 1, name: "A.J. Brown" });
  });

  it("leaves act null until ESPN has an actual line for the week", () => {
    const m = parseEspnWeekStats(body, opts);
    expect(m.get("Jahmyr Gibbs")).toEqual({ act: null, proj: 9, espnId: 2, name: "Jahmyr Gibbs" });
  });

  it("skips players with nothing for the week and malformed entries", () => {
    const m = parseEspnWeekStats(body, opts);
    expect(m.size).toBe(2);
    expect(parseEspnWeekStats(null, opts).size).toBe(0);
  });
});

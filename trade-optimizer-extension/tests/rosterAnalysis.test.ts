import { describe, expect, it } from "vitest";
import { makeLeague, makePlayer } from "../src/data/fixtures/syntheticLeague";
import { standardLineup } from "../src/domain/positions";
import { computeMarginalValues, lineupEntryGain } from "../src/optimization/marginalValue";
import { computeReplacementLevels } from "../src/optimization/replacementLevel";
import { analyzeLeague } from "../src/optimization/teamAnalyzer";
import { rankPartners } from "../src/optimization/tradeGenerator";

const P = makePlayer;

function baseRoster() {
  return [P("QB", "QB", 20, 20), P("K", "K", 0, 0), P("DST", "DST", 0, 0), P("TE", "TE", 13, 15)];
}

describe("marginal lineup value", () => {
  it("is zero for a strong player trapped behind better players at his position", () => {
    const wr5 = P("WR5", "WR", 16, 24);
    const roster = [...baseRoster(), P("RB1", "RB", 18, 30), P("RB2", "RB", 17, 28), P("RB3", "RB", 17, 26),
      P("WR1", "WR", 19, 40), P("WR2", "WR", 18, 35), P("WR3", "WR", 17.5, 30), P("WR4", "WR", 17, 28), wr5];
    const marginal = computeMarginalValues(roster, standardLineup());
    expect(marginal[wr5.id]).toBe(0);
  });

  it("is large for a team's only viable TE", () => {
    const te = P("Lone TE", "TE", 13, 15);
    const roster = [P("QB", "QB", 20, 20), te, P("TE2", "TE", 6.5, 1), P("RB1", "RB", 18, 30), P("RB2", "RB", 15, 20),
      P("WR1", "WR", 17, 30), P("WR2", "WR", 15, 20), P("WR3", "WR", 12, 10)];
    const marginal = computeMarginalValues(roster, standardLineup());
    expect(marginal[te.id]).toBeCloseTo(6.5, 5);
  });

  it("lineupEntryGain reflects only points that enter the starting lineup", () => {
    const roster = [P("QB", "QB", 20, 20), P("RB1", "RB", 18, 30), P("RB2", "RB", 7, 3), P("WR1", "WR", 17, 30), P("WR2", "WR", 15, 20), P("TE", "TE", 10, 8), P("FLEXWR", "WR", 12, 10)];
    const rb = P("New RB", "RB", 15, 22);
    // RB2 7 -> 15 (+8); the 7-pt RB is not better than the 12-pt flex, so the gain is exactly 8.
    expect(lineupEntryGain(rb, roster, standardLineup())).toBeCloseTo(8, 5);
  });
});

describe("replacement level", () => {
  it("uses the best available waiver projection per position", () => {
    const league = makeLeague({
      teams: [{ id: "a", name: "A", players: [P("RB", "RB", 10, 5)] }, { id: "b", name: "B", players: [P("RB", "RB", 9, 5)] }],
      userTeamId: "a",
      availablePlayers: [P("W1", "RB", 7.9, 0), P("W2", "RB", 6, 0), P("W3", "WR", 8.5, 0)],
    });
    const { levels, source } = computeReplacementLevels(league);
    expect(levels.RB).toBe(7.9);
    expect(levels.WR).toBe(8.5);
    expect(source.RB).toBe("waivers");
    expect(source.TE).toBe("none");
  });

  it("estimates from the rostered pool when no waiver list exists", () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({
      id: `t${i}`,
      name: `T${i}`,
      players: Array.from({ length: 4 }, (_, k) => P(`RB${i}-${k}`, "RB", 20 - i * 4 - k, 1)),
    }));
    const league = makeLeague({ teams, userTeamId: "t0", availablePlayers: [] });
    const { levels, source } = computeReplacementLevels(league);
    expect(source.RB).toBe("estimated");
    // demand = 2 dedicated + 1/3 flex; rank = ceil(4 * 3.33) = 14th best of 16.
    const all = teams.flatMap((t) => t.players).map((p) => p.projection).sort((a, b) => b - a);
    expect(levels.RB).toBe(all[13]);
  });
});

describe("weakness, holes and surplus", () => {
  it("flags a starter near replacement level as a hole and ranks the 7->15 slot above the 17->20 slot", () => {
    const user = [P("QB", "QB", 20, 20), P("RB1", "RB", 18, 35), P("RB2", "RB", 7.8, 2), P("WR1", "WR", 17, 30), P("WR2", "WR", 15, 20), P("WR3", "WR", 14, 15), P("TE", "TE", 10, 8), P("K", "K", 0, 0), P("DST", "DST", 0, 0)];
    const opp = [P("QB", "QB", 19, 18), P("RB1", "RB", 20, 40), P("RB2", "RB", 18, 30), P("RB3", "RB", 15, 22), P("RB4", "RB", 14, 18), P("WR1", "WR", 20, 45), P("WR2", "WR", 13, 12), P("TE", "TE", 9, 6), P("K", "K", 0, 0), P("DST", "DST", 0, 0)];
    const league = makeLeague({
      teams: [{ id: "u", name: "U", players: user }, { id: "o", name: "O", players: opp }],
      userTeamId: "u",
      availablePlayers: [P("WRB", "RB", 7.1, 0), P("WWR", "WR", 9, 0), P("WTE", "TE", 5, 0), P("WQB", "QB", 12, 0)],
    });
    const analysis = analyzeLeague(league);
    const me = analysis.user!;
    const rb2 = me.weaknesses.find((w) => w.key === "RB2")!;
    const wr1 = me.weaknesses.find((w) => w.key === "WR1")!;
    expect(rb2.isHole).toBe(true);
    expect(wr1.isHole).toBe(false);
    expect(rb2.upgradeRange.high).toBeGreaterThan(wr1.upgradeRange.high);
    expect(me.weaknesses[0].key).toBe("RB2");
    expect(me.holes.map((h) => h.key)).toEqual(["RB2"]);

    const oppAnalysis = analysis.teams.find((t) => t.teamId === "o")!;
    const rbSurplus = oppAnalysis.positionalSurplus.find((s) => s.position === "RB")!;
    expect(["high", "very high"]).toContain(rbSurplus.level);
    expect(rbSurplus.expendable.map((e) => e.player.name)).toContain("RB4");
    const wrSurplus = oppAnalysis.positionalSurplus.find((s) => s.position === "WR")!;
    expect(wrSurplus.level).toBe("very low");
  });

  it("ranks the complementary team as the best partner", () => {
    const user = [P("QB", "QB", 20, 20), P("RB1", "RB", 20, 40), P("RB2", "RB", 18, 30), P("RB3", "RB", 16, 24), P("RB4", "RB", 15, 20), P("WR1", "WR", 17, 30), P("WR2", "WR", 8, 2), P("TE", "TE", 10, 8)];
    const wrDeep = [P("QB", "QB", 19, 18), P("RB1", "RB", 17, 26), P("RB2", "RB", 8, 2), P("WR1", "WR", 21, 50), P("WR2", "WR", 18, 32), P("WR3", "WR", 17, 28), P("WR4", "WR", 16, 24), P("TE", "TE", 9, 6)];
    const balanced = [P("QB", "QB", 19, 18), P("RB1", "RB", 16, 24), P("RB2", "RB", 15, 20), P("WR1", "WR", 16, 24), P("WR2", "WR", 15, 20), P("WR3", "WR", 10, 5), P("TE", "TE", 9, 6)];
    const league = makeLeague({
      teams: [{ id: "u", name: "U", players: user }, { id: "wr", name: "WR Deep", players: wrDeep }, { id: "bal", name: "Balanced", players: balanced }],
      userTeamId: "u",
      availablePlayers: [P("WRB", "RB", 8, 0), P("WWR", "WR", 8.5, 0), P("WTE", "TE", 5, 0), P("WQB", "QB", 12, 0)],
    });
    const analysis = analyzeLeague(league);
    const partners = rankPartners(analysis, analysis.user!);
    expect(partners[0].teamId).toBe("wr");
    expect(partners[0].userGets).toContain("WR");
    expect(partners[0].partnerGets).toContain("RB");
  });
});

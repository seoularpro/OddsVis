import { describe, expect, it } from "vitest";
import { makeLeague, makePlayer, syntheticLeague } from "../src/data/fixtures/syntheticLeague";
import { runTradeOptimizer } from "../src/optimization/tradeOptimizer";
import { TIER_RANK } from "../src/optimization/tradeScorer";
import { DEFAULT_CONFIG, secondaryBand } from "../src/optimization/config";

// Hand-built scenario: classic shapes only, no baseline moves.
const CLASSIC = { baselineWaiverMoves: 0, shapes: [{ send: 1, receive: 1 }, { send: 2, receive: 1 }, { send: 1, receive: 2 }, { send: 2, receive: 2 }] };

const P = makePlayer;
const kd = () => [P("K", "K", 0, 0), P("DST", "DST", 0, 0)];
const waivers = () => [P("W RB", "RB", 7.5, 0), P("W WR", "WR", 8, 0), P("W TE", "TE", 5, 0), P("W QB", "QB", 12, 0)];

/**
 * User has an RB2 hole and two spare WRs.
 *  - Partner A has a WR2 hole and spare RBs: swapping spare WR for spare RB
 *    fixes both holes (user +4, A +3) -> win/win.
 *  - Partner B has a deep RB bench: the user's big-value spare WR buys B's
 *    16-pt RB4 (user +9) while B's lineup is unchanged and B only gains value
 *    -> fair but one-sided.
 */
function league() {
  const user = [P("U QB", "QB", 20, 20), P("U RB1", "RB", 18, 35), P("U RB2", "RB", 7, 3), P("U WR1", "WR", 17, 30), P("U WR2", "WR", 15, 20), P("U WR3", "WR", 14, 15), P("U WR4", "WR", 12, 46), P("U WR5", "WR", 11.5, 15), P("U TE", "TE", 10, 8), ...kd()];
  const a = [P("A QB", "QB", 19, 18), P("A RB1", "RB", 18, 34), P("A RB2", "RB", 16, 26), P("A RB3", "RB", 11, 15), P("A RB4", "RB", 10.5, 12), P("A WR1", "WR", 16, 26), P("A WR2", "WR", 8, 3), P("A WR3", "WR", 7.5, 2), P("A TE", "TE", 9, 6), ...kd()];
  const b = [P("B QB", "QB", 19, 10), P("B RB1", "RB", 20, 50), P("B RB2", "RB", 18, 44), P("B RB3", "RB", 17, 42), P("B RB4", "RB", 16, 40), P("B WR1", "WR", 16, 30), P("B WR2", "WR", 15, 26), P("B WR3", "WR", 14, 22), P("B WR4", "WR", 13, 18), P("B TE", "TE", 9, 5), ...kd()];
  return makeLeague({
    teams: [{ id: "u", name: "U", players: user }, { id: "a", name: "A", players: a }, { id: "b", name: "B", players: b }],
    userTeamId: "u",
    availablePlayers: waivers(),
    rosterSize: 11,
  });
}

describe("win/win ranking", () => {
  it("ranks a win/win trade above a larger one-sided gain, and the reverse in userGain mode", () => {
    const win = runTradeOptimizer(league(), { ...CLASSIC, topN: 500, maxTradesPerPartner: 500 });
    expect(win.trades.length).toBeGreaterThan(1);
    const top = win.trades[0];
    expect(top.score.tier).toBe("win-win");
    expect(top.simulation.candidate.partnerTeamId).toBe("a");
    expect(top.simulation.user.solvedWeaknesses).toContain("RB2");
    expect(top.simulation.opponent.solvedWeaknesses).toContain("WR2");
    expect(top.simulation.opponent.projectionGain).toBeGreaterThanOrEqual(DEFAULT_CONFIG.winWinMinOpponentGain);
    const isWr4ForRb4 = (t: (typeof win.trades)[number]) =>
      t.simulation.candidate.partnerTeamId === "b" &&
      t.simulation.candidate.userSends.map((p) => p.name).join() === "U WR4" &&
      t.simulation.candidate.userReceives.map((p) => p.name).join() === "B RB4";
    const oneSided = win.trades.find(isWr4ForRb4);
    expect(oneSided).toBeTruthy();
    expect(oneSided!.score.tier).toBe("one-sided");
    expect(oneSided!.simulation.user.projectionGain).toBeCloseTo(9, 5);
    expect(oneSided!.simulation.user.projectionGain).toBeGreaterThan(top.simulation.user.projectionGain);
    expect(oneSided!.rank).toBeGreaterThan(top.rank);
    // Nothing ranked above it is from a lower tier.
    for (const t of win.trades.slice(0, oneSided!.rank - 1)) expect(TIER_RANK[t.score.tier]).toBeLessThanOrEqual(TIER_RANK["one-sided"]);
    // At the boundary between tiers the rank reason names the tier.
    const boundary = win.trades.find((t, i) => t.score.tier === "win-win" && win.trades[i + 1] && win.trades[i + 1].score.tier !== "win-win");
    expect(boundary).toBeTruthy();
    expect(boundary!.rankedAboveNextBecause).toMatch(/win\/win/);
    expect(top.explanation.overall.join(" ")).toMatch(/Weaknesses solved: your RB2 and their WR2/);

    const plain = runTradeOptimizer(league(), { ...CLASSIC, topN: 500, maxTradesPerPartner: 500, rankingMode: "userGain" });
    // Score-only ranking puts a one-sided +9 above the +8 win/win.
    expect(plain.trades[0].simulation.user.projectionGain).toBeGreaterThanOrEqual(9);
    expect(plain.trades[0].score.tier).toBe("one-sided");
    expect(plain.trades.find(isWr4ForRb4)!.rank).toBeLessThan(plain.trades.find((t) => t.score.tier === "win-win")!.rank);
  });

  it("orders results by tier, then by score within a tier, on the synthetic league", () => {
    const result = runTradeOptimizer(syntheticLeague(), { topN: 10, maxTradesPerPartner: 10 });
    const band = secondaryBand(DEFAULT_CONFIG);
    for (let i = 1; i < result.trades.length; i++) {
      const hi = result.trades[i - 1];
      const lo = result.trades[i];
      expect(TIER_RANK[hi.score.tier]).toBeLessThanOrEqual(TIER_RANK[lo.score.tier]);
      if (hi.score.tier === lo.score.tier) {
        expect(hi.score.total).toBeGreaterThanOrEqual(lo.score.total - 1e-9);
        expect(lo.score.userGain).toBeLessThanOrEqual(hi.score.userGain + band + 1e-9);
      }
    }
    // Every win/win trade really has both sides gaining and both solving something.
    for (const t of result.trades.filter((t) => t.score.tier === "win-win")) {
      expect(t.simulation.opponent.projectionGain).toBeGreaterThanOrEqual(DEFAULT_CONFIG.winWinMinOpponentGain);
      expect(t.simulation.user.solvedWeaknesses.length > 0 || t.simulation.user.holesAfter < t.simulation.user.holesBefore).toBe(true);
      expect(t.simulation.opponent.solvedWeaknesses.length > 0 || t.simulation.opponent.holesAfter < t.simulation.opponent.holesBefore).toBe(true);
    }
  });
});

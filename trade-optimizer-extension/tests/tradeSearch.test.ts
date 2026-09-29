import { describe, expect, it } from "vitest";
import { makeLeague, makePlayer, syntheticLeague } from "../src/data/fixtures/syntheticLeague";
import { analyzeLeague } from "../src/optimization/teamAnalyzer";
import { generateCandidates, valueWithinTolerance } from "../src/optimization/tradeGenerator";
import { fitRosterToSize, simulateTrade } from "../src/optimization/tradeSimulator";
import { runTradeOptimizer } from "../src/optimization/tradeOptimizer";
import { DEFAULT_CONFIG, mergeConfig, secondaryBand } from "../src/optimization/config";
import { evaluateAcceptance } from "../src/optimization/tradeScorer";
import { optimizeLineup } from "../src/optimization/lineupOptimizer";
import type { Player } from "../src/domain/types";

const P = makePlayer;
const waivers = () => [P("W RB", "RB", 7.5, 0), P("W RB2", "RB", 7, 0), P("W WR", "WR", 8, 0), P("W WR2", "WR", 7.5, 0), P("W TE", "TE", 5, 0), P("W QB", "QB", 12, 0)];
const kd = () => [P("K", "K", 0, 0), P("DST", "DST", 0, 0)];
// The hand-computed scenarios below assume the rosters exactly as written (no free waiver moves first).
const RAW = { baselineWaiverMoves: 0 };

describe("trade generation", () => {
  it("enumerates 1-for-1, 2-for-1, 1-for-2 and 2-for-2 packages within the value tolerance", () => {
    const league = syntheticLeague();
    const analysis = analyzeLeague(league, RAW);
    const { candidates, stats } = generateCandidates(analysis, DEFAULT_CONFIG);
    const shapes = new Set(candidates.map((c) => `${c.shape.send}-${c.shape.receive}`));
    expect(shapes).toEqual(new Set(["1-1", "2-1", "1-2", "2-2"]));
    expect(stats.prunedByValue).toBeGreaterThan(0);
    expect(stats.prunedByLineup).toBeGreaterThan(0);
    for (const c of candidates) {
      const sent = c.userSends.reduce((n, p) => n + p.tradeValue, 0);
      const recv = c.userReceives.reduce((n, p) => n + p.tradeValue, 0);
      expect(valueWithinTolerance(sent, recv, DEFAULT_CONFIG)).toBe(true);
    }
  });

  it("valueWithinTolerance allows 15% or $4, whichever is larger", () => {
    expect(valueWithinTolerance(43, 44, DEFAULT_CONFIG)).toBe(true);
    expect(valueWithinTolerance(50, 60, DEFAULT_CONFIG)).toBe(false);
    expect(valueWithinTolerance(60, 51, DEFAULT_CONFIG)).toBe(true);
    expect(valueWithinTolerance(5, 9, DEFAULT_CONFIG)).toBe(true);
    expect(valueWithinTolerance(5, 10, DEFAULT_CONFIG)).toBe(false);
  });
});

describe("trade simulation", () => {
  it("recalculates both optimal lineups and fills the open roster spot from waivers in a 2-for-1", () => {
    const user = [P("QB", "QB", 20, 20), P("RB1", "RB", 18, 35), P("RB2", "RB", 16, 26), P("RB3", "RB", 15, 22), P("WR1", "WR", 17, 30), P("WR2", "WR", 9, 4), P("TE", "TE", 10, 8), ...kd()];
    const opp = [P("QB", "QB", 19, 18), P("RB1", "RB", 14, 18), P("RB2", "RB", 8, 3), P("WR1", "WR", 20, 48), P("WR2", "WR", 18, 34), P("WR3", "WR", 12, 12), P("TE", "TE", 9, 6), ...kd()];
    const league = makeLeague({ teams: [{ id: "u", name: "U", players: user }, { id: "o", name: "O", players: opp }], userTeamId: "u", availablePlayers: waivers(), rosterSize: 9 });
    const analysis = analyzeLeague(league, RAW);
    const sends = [user[2], user[3]]; // RB2 + RB3 ($48)
    const receives = [opp[3]]; // WR1 ($48)
    const sim = simulateTrade({ partnerTeamId: "o", userSends: sends, userReceives: receives, shape: { send: 2, receive: 1 }, partnerScore: 1 }, analysis);

    // User before: 20+18+16+17+9+10+15(flex RB3) = 105. After: RB1 18, RB2 = waiver 7.5, WR1 20, WR2 17, FLEX 9 (WR2), TE 10, QB 20 = 101.5
    expect(sim.user.projectionBefore).toBeCloseTo(105, 5);
    expect(sim.user.waiverAdds).toHaveLength(1);
    expect(sim.user.projectionAfter).toBeCloseTo(20 + 18 + 7.5 + 20 + 17 + 10 + 9, 5);
    // Opponent must drop one player (9-man limit): before 19+14+8+20+18+9+12 = 100; after RB 16/15, WR 18/12, flex 14 -> 19+16+15+18+12+9+14 = 103
    expect(sim.opponent.drops).toHaveLength(1);
    expect(sim.opponent.projectionAfter).toBeCloseTo(103, 5);
    expect(sim.opponent.incomingStarters.map((p) => p.name).sort()).toEqual(["RB2", "RB3"]);
    expect(sim.user.tradeValueSent).toBe(48);
    expect(sim.user.tradeValueReceived).toBe(48);
  });

  it("fitRosterToSize drops the least useful non-starter and never a starter", () => {
    const roster = [P("QB", "QB", 20, 20), P("RB1", "RB", 18, 35), P("RB2", "RB", 16, 26), P("WR1", "WR", 17, 30), P("WR2", "WR", 15, 20), P("TE", "TE", 10, 8), P("FLEX", "WR", 12, 10), P("Bench low", "RB", 4, 1), P("Bench mid", "WR", 9, 3), ...kd()];
    const league = makeLeague({ teams: [{ id: "u", name: "U", players: roster }], userTeamId: "u", rosterSize: 10 });
    const { roster: fitted, drops } = fitRosterToSize(roster, league, new Set());
    expect(fitted).toHaveLength(10);
    expect(drops.map((p) => p.name)).toEqual(["Bench low"]);
  });
});

describe("critical scenarios", () => {
  function starsAndDepthLeague() {
    // Team A (user): a $70 superstar RB (season-long value; this week he
    // projects 21) and several near-replacement starters.
    const star = P("Superstar RB", "RB", 21, 70);
    const teamA: Player[] = [P("A QB", "QB", 18, 12), star, P("A RB2", "RB", 8, 3), P("A WR1", "WR", 14, 14), P("A WR2", "WR", 8.5, 3), P("A WR3", "WR", 8, 2), P("A TE", "TE", 9, 6), P("A bench RB", "RB", 5, 1), P("A bench WR", "WR", 5, 1), ...kd()];
    // Team B: several good players and excess depth; two $35 players.
    const good1 = P("B RB good", "RB", 17, 35);
    const good2 = P("B WR good", "WR", 17.5, 35);
    const teamB: Player[] = [P("B QB", "QB", 19, 14), P("B RB1", "RB", 17.5, 36), good1, P("B RB3", "RB", 15, 22), P("B WR1", "WR", 17, 33), good2, P("B WR3", "WR", 16, 30), P("B WR4", "WR", 15, 24), P("B TE", "TE", 10, 8), ...kd()];
    const filler = (id: string) => [P(`${id} QB`, "QB", 17, 10), P(`${id} RB1`, "RB", 13, 12), P(`${id} RB2`, "RB", 11, 8), P(`${id} WR1`, "WR", 13, 12), P(`${id} WR2`, "WR", 11, 8), P(`${id} WR3`, "WR", 10, 5), P(`${id} TE`, "TE", 8, 4), P(`${id} b1`, "RB", 6, 1), P(`${id} b2`, "WR", 6, 1), ...kd()];
    return {
      star, good1, good2,
      league: makeLeague({
        teams: [
          { id: "a", name: "Team A", players: teamA },
          { id: "b", name: "Team B", players: teamB },
          { id: "c", name: "Team C", players: filler("C") },
          { id: "d", name: "Team D", players: filler("D") },
        ],
        userTeamId: "a",
        availablePlayers: waivers(),
        rosterSize: 11,
      }),
    };
  }

  it("recognizes that a $70 star for $35 + $35 raises Team A's lineup and benefits Team B through consolidation", () => {
    const { league, star, good1, good2 } = starsAndDepthLeague();
    const analysis = analyzeLeague(league, RAW);
    const sim = simulateTrade({ partnerTeamId: "b", userSends: [star], userReceives: [good1, good2], shape: { send: 1, receive: 2 }, partnerScore: 1 }, analysis);
    // A: RB 21/8, WR 14/8.5, FLEX 8 -> RB 17/8, WR 17.5/14, FLEX 8.5 = +5.5
    expect(sim.user.projectionGain).toBeCloseTo(5.5, 5);
    expect(sim.user.incomingStarters).toHaveLength(2);
    // B: RB 17.5/17, WR 17/17.5, FLEX 16 -> RB 21/17.5, WR 17/16, FLEX 15 = +1.5
    expect(sim.opponent.projectionGain).toBeCloseTo(1.5, 5);
    expect(sim.opponent.waiverAdds).toHaveLength(1);
    expect(sim.user.tradeValueSent).toBe(70);
    expect(sim.user.tradeValueReceived).toBe(70);

    const result = runTradeOptimizer(league, RAW);
    expect(result.trades.length).toBeGreaterThan(0);
    const top = result.trades[0];
    expect(top.simulation.candidate.userSends.map((p) => p.id)).toContain(star.id);
    expect(top.simulation.candidate.userReceives).toHaveLength(2);
    expect(top.simulation.user.projectionGain).toBeGreaterThanOrEqual(5.5);
    expect(top.simulation.opponent.projectionGain).toBeGreaterThan(0);
    expect(top.acceptance.opponentReasons.length).toBeGreaterThan(0);
    expect(top.explanation.overall.join(" ")).toContain("Trade value");
  });

  it("recognizes the reverse: a deep team consolidating two starters into one elite player", () => {
    const { league, star, good1, good2 } = starsAndDepthLeague();
    const flipped = { ...league, userTeamId: "b" };
    const analysis = analyzeLeague(flipped, RAW);
    const sim = simulateTrade({ partnerTeamId: "a", userSends: [good1, good2], userReceives: [star], shape: { send: 2, receive: 1 }, partnerScore: 1 }, analysis);
    expect(sim.user.projectionGain).toBeCloseTo(1.5, 5);
    expect(sim.user.waiverAdds).toHaveLength(1);
    expect(sim.opponent.projectionGain).toBeCloseTo(5.5, 5);
    const result = runTradeOptimizer(flipped, RAW);
    const consolidation = result.trades.find((t) => t.simulation.candidate.userReceives.some((p) => p.id === star.id));
    expect(consolidation).toBeTruthy();
    expect(consolidation!.simulation.candidate.userSends.length).toBe(2);
  });

  it("prefers fixing a 7-point starter to 15 over improving an 18-point starter to 21", () => {
    // Same expendable asset X ($24, bench) buys either a 15-pt RB for the 7-pt
    // RB2 slot (+8), or, packaged with WR1 (18), a 21-pt WR (+3).
    const weakRb = P("U RB2", "RB", 7, 3);
    const wr1 = P("U WR1", "WR", 18, 30);
    const asset = P("U asset", "WR", 12, 24);
    const user = [P("U QB", "QB", 20, 20), P("U RB1", "RB", 17, 28), weakRb, wr1, P("U WR2", "WR", 15, 20), P("U WR3", "WR", 13, 12), P("U TE", "TE", 10, 8), P("U bench RB", "RB", 6, 1), asset, P("U bench TE", "TE", 5, 1), ...kd()];
    const rb15 = P("O RB3", "RB", 15, 24);
    const wr21 = P("O WR1", "WR", 21, 54);
    const opp = [P("O QB", "QB", 19, 18), P("O RB1", "RB", 18, 32), P("O RB2", "RB", 16, 26), rb15, P("O RB4", "RB", 14, 20), wr21, P("O WR2", "WR", 9, 4), P("O WR3", "WR", 8, 3), P("O TE", "TE", 9, 6), P("O bench TE", "TE", 5, 1), ...kd()];
    const league = makeLeague({ teams: [{ id: "u", name: "U", players: user }, { id: "o", name: "O", players: opp }], userTeamId: "u", availablePlayers: waivers(), rosterSize: 12 });
    const analysis = analyzeLeague(league, RAW);
    const simRb = simulateTrade({ partnerTeamId: "o", userSends: [asset], userReceives: [rb15], shape: { send: 1, receive: 1 }, partnerScore: 1 }, analysis);
    const simWr = simulateTrade({ partnerTeamId: "o", userSends: [wr1, asset], userReceives: [wr21], shape: { send: 2, receive: 1 }, partnerScore: 1 }, analysis);
    expect(simRb.user.projectionGain).toBeCloseTo(8, 5);
    // +3 from WR1 18 -> 21, plus 0.5 because the opened roster spot is filled by the 7.5-pt waiver RB over the 7-pt RB2.
    expect(simWr.user.projectionGain).toBeCloseTo(3.5, 5);
    // Both are acceptable to the opponent (lineup gain, or filling a WR hole).
    expect(evaluateAcceptance(simRb, DEFAULT_CONFIG).accepted).toBe(true);
    expect(evaluateAcceptance(simWr, DEFAULT_CONFIG).accepted).toBe(true);

    // Widen the result list so both specific trades are visible for the rank comparison.
    const result = runTradeOptimizer(league, { ...RAW, topN: 30, maxTradesPerPartner: 30 });
    // Whatever tops the list must be at least as good as the RB fix (+8);
    // the WR1-for-21 upgrade (+3.5) can never rank above it.
    expect(result.trades[0].simulation.user.projectionGain).toBeGreaterThanOrEqual(8);
    const rbTrade = result.trades.find((t) => t.simulation.candidate.userSends.length === 1 && t.simulation.candidate.userSends[0].id === asset.id && t.simulation.candidate.userReceives.length === 1 && t.simulation.candidate.userReceives[0].id === rb15.id);
    const wrTrade = result.trades.find((t) => t.simulation.candidate.userReceives.length === 1 && t.simulation.candidate.userReceives[0].id === wr21.id);
    expect(rbTrade).toBeTruthy();
    if (wrTrade) expect(rbTrade!.rank).toBeLessThan(wrTrade.rank);
    expect(rbTrade!.simulation.user.holesBefore).toBe(1);
    expect(rbTrade!.simulation.user.holesAfter).toBe(0);
  });

  it("rejects trades that help the user but catastrophically hurt the opponent, and lopsided values", () => {
    const user = [P("U QB", "QB", 20, 20), P("U RB1", "RB", 17, 28), P("U RB2", "RB", 7, 3), P("U WR1", "WR", 18, 30), P("U WR2", "WR", 15, 20), P("U TE", "TE", 10, 8), P("U WR3", "WR", 12, 10), ...kd()];
    const oppStar = P("O RB1", "RB", 22, 60);
    const opp = [P("O QB", "QB", 19, 18), oppStar, P("O RB2", "RB", 9, 4), P("O WR1", "WR", 16, 26), P("O WR2", "WR", 14, 18), P("O TE", "TE", 9, 6), P("O WR3", "WR", 10, 6), ...kd()];
    const league = makeLeague({ teams: [{ id: "u", name: "U", players: user }, { id: "o", name: "O", players: opp }], userTeamId: "u", availablePlayers: waivers(), rosterSize: 9 });
    const result = runTradeOptimizer(league, RAW);
    for (const t of result.trades) {
      expect(t.simulation.opponent.projectionGain).toBeGreaterThanOrEqual(-DEFAULT_CONFIG.maxOpponentLoss);
      expect(t.acceptance.accepted).toBe(true);
      expect(valueWithinTolerance(t.simulation.user.tradeValueSent, t.simulation.user.tradeValueReceived, DEFAULT_CONFIG)).toBe(true);
    }
    // The star for the user's $3 RB2 would be +15 for the user but is never offered.
    expect(result.trades.some((t) => t.simulation.candidate.userReceives.some((p) => p.id === oppStar.id) && t.simulation.user.tradeValueSent < 40)).toBe(false);
  });
});

describe("ranking", () => {
  it("orders trades by score with user lineup gain dominating secondary factors", () => {
    const result = runTradeOptimizer(syntheticLeague());
    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.trades.length).toBeLessThanOrEqual(10);
    const band = secondaryBand(DEFAULT_CONFIG);
    expect(band).toBeLessThan(1);
    for (let i = 1; i < result.trades.length; i++) {
      const hi = result.trades[i - 1];
      const lo = result.trades[i];
      expect(hi.rankedAboveNextBecause).toBeTruthy();
      if (hi.score.tier !== lo.score.tier) continue; // tiers are checked in winWin.test.ts
      expect(hi.score.total).toBeGreaterThanOrEqual(lo.score.total - 1e-9);
      // Within a tier, a lower-ranked trade can never have a user gain more than the band above a higher-ranked one.
      expect(lo.score.userGain).toBeLessThanOrEqual(hi.score.userGain + band + 1e-9);
    }
    for (const t of result.trades) {
      expect(t.simulation.user.projectionGain).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minUserGain);
      expect(t.explanation.headline).toContain("your lineup");
      expect(t.simulation.user.projectionAfter).toBeCloseTo(optimizeLineup(t.simulation.user.rosterAfter, result.analysis.league.settings.lineupSlots).total, 6);
    }
    const partners = new Map<string, number>();
    for (const t of result.trades) partners.set(t.simulation.candidate.partnerTeamId, (partners.get(t.simulation.candidate.partnerTeamId) ?? 0) + 1);
    for (const n of partners.values()) expect(n).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTradesPerPartner);
  });

  it("never puts a $0 (waiver-level) player in a package", () => {
    const result = runTradeOptimizer(syntheticLeague(), { topN: 50, maxTradesPerPartner: 50 });
    expect(result.trades.length).toBeGreaterThan(0);
    for (const t of result.trades) {
      for (const p of [...t.simulation.candidate.userSends, ...t.simulation.candidate.userReceives]) expect(p.tradeValue).toBeGreaterThan(0);
    }
  });

  it("synthetic league: the user's RB surplus and weak WR2/FLEX are detected and the top trade exploits them", () => {
    const league = syntheticLeague();
    const result = runTradeOptimizer(league);
    const me = result.analysis.user!;
    const rb = me.positionalSurplus.find((s) => s.position === "RB")!;
    expect(["high", "very high"]).toContain(rb.level);
    expect(me.weaknesses.slice(0, 3).map((w) => w.key)).toEqual(expect.arrayContaining(["WR2"]));
    expect(result.analysis.insight[0]).toMatch(/trade value/);
    expect(result.stats.elapsedMs).toBeLessThan(5000);
    const top = result.trades[0];
    expect(top.simulation.user.projectionGain).toBeGreaterThan(2);
  });

  it("config merging keeps the hierarchy caps", () => {
    const cfg = mergeConfig({ topN: 3, weights: { weaknessCap: 0.2 } as any });
    expect(cfg.topN).toBe(3);
    expect(cfg.weights.mutualCap).toBe(DEFAULT_CONFIG.weights.mutualCap);
  });
});

describe("waiver baseline", () => {
  it("applies free waiver upgrades first so a 2-for-1 is not credited with a pickup available anyway", () => {
    const scrub = P("U scrub", "RB", 3, 1);
    const user = [P("U QB", "QB", 20, 20), P("U RB1", "RB", 17, 28), P("U RB2", "RB", 8, 3), P("U WR1", "WR", 18, 30), P("U WR2", "WR", 15, 20), P("U WR3", "WR", 13, 12), P("U TE", "TE", 10, 8), scrub, P("U unknown", "RB", 0, 30, undefined), ...kd()];
    user[8].projectionSource = "none";
    const opp = [P("O QB", "QB", 19, 18), P("O RB1", "RB", 18, 32), P("O RB2", "RB", 16, 26), P("O RB3", "RB", 15, 24), P("O WR1", "WR", 17, 30), P("O WR2", "WR", 14, 18), P("O TE", "TE", 9, 6), P("O b", "WR", 6, 1), P("O c", "TE", 5, 1), ...kd()];
    const bigFa = P("FA RB 15", "RB", 15, 0);
    const league = makeLeague({ teams: [{ id: "u", name: "U", players: user }, { id: "o", name: "O", players: opp }], userTeamId: "u", availablePlayers: [bigFa, ...waivers()], rosterSize: 11 });
    const analysis = analyzeLeague(league);
    const me = analysis.user!;
    // The scrub (not the unprojected player) is dropped for the 15-pt free agent: RB2 8 -> 15.
    expect(me.waiverMoves).toHaveLength(1);
    expect(me.waiverMoves[0].add.id).toBe(bigFa.id);
    expect(me.waiverMoves[0].drop?.id).toBe(scrub.id);
    expect(me.waiverMoves[0].gain).toBeCloseTo(7, 5);
    expect(me.roster.some((p) => p.id === bigFa.id)).toBe(true);
    expect(me.roster.some((p) => p.name === "U unknown")).toBe(true);
    expect(analysis.league.availablePlayers.some((p) => p.id === bigFa.id)).toBe(false);
    expect(analysis.originalLeague.teams[0].players.some((p) => p.id === bigFa.id)).toBe(false);
    // With the pickup already in the baseline, no trade can be credited with it,
    // and a waiver player is never offered or requested in a package.
    const result = runTradeOptimizer(league);
    for (const t of result.trades) {
      expect(t.simulation.user.waiverAdds.some((p) => p.id === bigFa.id)).toBe(false);
      expect(t.simulation.candidate.userSends.some((p) => p.id === bigFa.id)).toBe(false);
      expect(t.simulation.candidate.userReceives.some((p) => p.id === bigFa.id)).toBe(false);
    }
    // Open roster spots are filled in the baseline, so a 2-for-2 never shows waiver adds.
    const short = [P("S QB", "QB", 20, 20), P("S RB1", "RB", 17, 28), P("S RB2", "RB", 8, 3), P("S WR1", "WR", 18, 30), P("S WR2", "WR", 15, 20), P("S WR3", "WR", 13, 12), P("S TE", "TE", 10, 8), ...kd()];
    const league3 = makeLeague({ teams: [{ id: "s", name: "S", players: short }, { id: "o", name: "O", players: opp }], userTeamId: "s", availablePlayers: [P("FA RB 15b", "RB", 15, 0), ...waivers()], rosterSize: 11 });
    const a3 = analyzeLeague(league3);
    expect(a3.user!.roster).toHaveLength(11);
    expect(a3.user!.waiverMoves.filter((m) => m.drop === null)).toHaveLength(2);
    expect(a3.user!.waiverMoves[0].add.name).toBe("FA RB 15b");
    const r3 = runTradeOptimizer(league3);
    for (const t of r3.trades) {
      if (t.simulation.candidate.userSends.length === t.simulation.candidate.userReceives.length) expect(t.simulation.user.waiverAdds).toHaveLength(0);
    }
    // A swap below the minimum gain is not recommended.
    const noisy = makeLeague({ teams: [{ id: "n", name: "N", players: [...user.filter((p) => p !== scrub), P("N scrub", "RB", 7.2, 1)] }, { id: "o", name: "O", players: opp }], userTeamId: "n", availablePlayers: [P("FA RB 7.6", "RB", 7.6, 0), ...waivers()], rosterSize: 11 });
    expect(analyzeLeague(noisy).user!.waiverMoves).toHaveLength(0);
    // Disabled baseline keeps the raw roster.
    expect(analyzeLeague(league, { baselineWaiverMoves: 0 }).user!.waiverMoves).toHaveLength(0);
    // Real depth is never cut for a marginal gain: a 15-pt bench RB stays even if a 15.4 WR would start.
    const deep = [P("D QB", "QB", 20, 20), P("D RB1", "RB", 20, 40), P("D RB2", "RB", 18, 30), P("D RB3", "RB", 16, 24), P("D RB4", "RB", 15, 20), P("D WR1", "WR", 17, 30), P("D WR2", "WR", 8, 2), P("D TE", "TE", 10, 8), ...kd()];
    const league2 = makeLeague({ teams: [{ id: "d", name: "D", players: deep }, { id: "o", name: "O", players: opp }], userTeamId: "d", availablePlayers: [P("FA WR", "WR", 15.4, 0), ...waivers()], rosterSize: 10 });
    expect(analyzeLeague(league2).user!.waiverMoves).toHaveLength(0);
  });
});

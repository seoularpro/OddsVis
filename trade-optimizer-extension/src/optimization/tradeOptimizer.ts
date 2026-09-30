// The end-to-end pipeline: analyze league -> generate candidates -> simulate
// -> accept/score -> rank -> explain -> top N.

import type { League } from "../domain/types";
import { analyzeLeague, type LeagueAnalysis } from "./teamAnalyzer";
import { generateCandidates, type GenerationStats, type PartnerRanking } from "./tradeGenerator";
import { simulateTrade, type TradeSimulation } from "./tradeSimulator";
import { evaluateAcceptance, scoreTrade, compareReason, compareRanked, type Acceptance, type ScoreBreakdown } from "./tradeScorer";
import { explainTrade, type TradeExplanation } from "./tradeExplainer";
import type { OptimizerConfig } from "./config";
import { findUnfairTrades, type UnfairStats, type UnfairTrade } from "./unfairTrades";

export interface RankedTrade {
  rank: number;
  simulation: TradeSimulation;
  score: ScoreBreakdown;
  acceptance: Acceptance;
  explanation: TradeExplanation;
  /** Why this trade ranks above the next one (null for the last). */
  rankedAboveNextBecause: string | null;
}

export interface OptimizerStats extends GenerationStats {
  simulated: number;
  accepted: number;
  elapsedMs: number;
}

export interface OptimizerResult {
  analysis: LeagueAnalysis;
  trades: RankedTrade[];
  /** Value grabs that also help this week (see unfairTrades.ts). */
  unfairTrades: UnfairTrade[];
  unfairStats: UnfairStats;
  partners: PartnerRanking[];
  stats: OptimizerStats;
  /** Rejected simulations kept for debugging / "why not" questions (capped). */
  rejectedSamples: { simulation: TradeSimulation; acceptance: Acceptance }[];
}

function tradeKey(sim: TradeSimulation): string {
  const s = sim.candidate.userSends.map((p) => p.id).sort().join(",");
  const r = sim.candidate.userReceives.map((p) => p.id).sort().join(",");
  return `${sim.candidate.partnerTeamId}|${s}|${r}`;
}

/**
 * Two trades with the same partner, the same incoming players and the same
 * resulting starting lineups for both teams only differ by a throw-in; the
 * higher-scored one is kept so the top list shows distinct ideas.
 */
function outcomeKey(sim: TradeSimulation): string {
  const r = sim.candidate.userReceives.map((p) => p.id).sort().join(",");
  const u = sim.user.after.starters.map((p) => p.id).sort().join(",");
  const o = sim.opponent.after.starters.map((p) => p.id).sort().join(",");
  return `${sim.candidate.partnerTeamId}|${r}|${u}|${o}`;
}

export function runTradeOptimizer(league: League, overrides?: Partial<OptimizerConfig>): OptimizerResult {
  const start = Date.now();
  const analysis = analyzeLeague(league, overrides);
  const config = analysis.config;
  const { candidates, partners, stats } = generateCandidates(analysis, config);

  const scored: { sim: TradeSimulation; score: ScoreBreakdown; acceptance: Acceptance }[] = [];
  const rejectedSamples: OptimizerResult["rejectedSamples"] = [];
  const seen = new Set<string>();
  let simulated = 0;
  for (const candidate of candidates) {
    const sim = simulateTrade(candidate, analysis);
    simulated++;
    const key = tradeKey(sim);
    if (seen.has(key)) continue;
    seen.add(key);
    const acceptance = evaluateAcceptance(sim, config);
    if (!acceptance.accepted) {
      if (rejectedSamples.length < 50 && sim.user.projectionGain >= config.minUserGain) rejectedSamples.push({ simulation: sim, acceptance });
      continue;
    }
    scored.push({ sim, score: scoreTrade(sim, config), acceptance });
  }

  scored.sort((a, b) => compareRanked(a.score, b.score, config));

  // Diversity: collapse throw-in variants of the same outcome, then at most
  // maxTradesPerPartner results with the same partner.
  const perPartner = new Map<string, number>();
  const seenOutcome = new Set<string>();
  const chosen: typeof scored = [];
  for (const entry of scored) {
    const ok = outcomeKey(entry.sim);
    if (seenOutcome.has(ok)) continue;
    seenOutcome.add(ok);
    const id = entry.sim.candidate.partnerTeamId;
    const n = perPartner.get(id) ?? 0;
    if (n >= config.maxTradesPerPartner) continue;
    perPartner.set(id, n + 1);
    chosen.push(entry);
    if (chosen.length >= config.topN) break;
  }

  const trades: RankedTrade[] = chosen.map((entry, i) => ({
    rank: i + 1,
    simulation: entry.sim,
    score: entry.score,
    acceptance: entry.acceptance,
    explanation: explainTrade(entry.sim, analysis, entry.acceptance),
    rankedAboveNextBecause: i + 1 < chosen.length ? compareReason(entry.score, chosen[i + 1].score, config).replace("#next", `#${i + 2}`) : null,
  }));

  const unfair = findUnfairTrades(analysis, config);

  return {
    analysis,
    trades,
    unfairTrades: unfair.trades,
    unfairStats: unfair.stats,
    partners,
    stats: { ...stats, simulated, accepted: scored.length, elapsedMs: Date.now() - start },
    rejectedSamples,
  };
}

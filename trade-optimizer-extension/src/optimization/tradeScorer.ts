// Trade acceptance and ranking.
//
// Ranking is a bounded composite: score = userGain + Σ bonuses, where every
// bonus is clamped to a small cap and the caps sum to less than one
// projected point (see config.weights). A trade that gains the user one
// more starting-lineup point than another therefore ALWAYS ranks higher, no
// matter how the secondary factors compare; the secondaries only reorder
// trades whose user gains are within the band. That is the lexicographic
// hierarchy the design asks for, without weights that could be mis-tuned
// into inverting it.

import type { OptimizerConfig } from "./config";
import { secondaryBand } from "./config";
import type { TradeSimulation } from "./tradeSimulator";
import { valueWithinTolerance } from "./tradeGenerator";

export type TradeTier = "win-win" | "mutual" | "one-sided";

export const TIER_RANK: Record<TradeTier, number> = { "win-win": 0, mutual: 1, "one-sided": 2 };

export const TIER_LABEL: Record<TradeTier, string> = {
  "win-win": "Win/win",
  mutual: "Mutual gain",
  "one-sided": "Fair, one-sided",
};

export interface ScoreBreakdown {
  tier: TradeTier;
  userGain: number;
  weaknessBonus: number;
  opponentWeaknessBonus: number;
  mutualBonus: number;
  fairnessBonus: number;
  depthBonus: number;
  total: number;
  band: number;
}

/**
 * Tier of a trade:
 *  - win-win: both lineups improve (user >= minUserGain, opponent >=
 *    winWinMinOpponentGain) and BOTH sides solve a real weakness (a hole, or
 *    one of their top weaknesses, improved by >= weaknessSolveMinGain).
 *  - mutual: both lineups improve.
 *  - one-sided: the user improves; the opponent is neutral but has another
 *    rational reason (value, hole, depth, consolidation).
 */
export function classifyTier(sim: TradeSimulation, config: OptimizerConfig): TradeTier {
  const u = sim.user;
  const o = sim.opponent;
  const userSolves = u.solvedWeaknesses.length > 0 || u.holesAfter < u.holesBefore;
  const oppSolves = o.solvedWeaknesses.length > 0 || o.holesAfter < o.holesBefore;
  if (u.projectionGain >= config.minUserGain && o.projectionGain >= config.winWinMinOpponentGain && userSolves && oppSolves) return "win-win";
  if (u.projectionGain >= config.minUserGain && o.projectionGain >= config.clearOpponentGain) return "mutual";
  return "one-sided";
}

export interface Acceptance {
  accepted: boolean;
  /** Why the opponent would rationally accept (empty when rejected). */
  opponentReasons: string[];
  /** Why the trade was rejected (empty when accepted). */
  rejections: string[];
  fairnessRatio: number;
  tradeValueDifference: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function evaluateAcceptance(sim: TradeSimulation, config: OptimizerConfig): Acceptance {
  const sent = sim.user.tradeValueSent;
  const received = sim.user.tradeValueReceived;
  const diff = Math.abs(sent - received);
  const ratio = Math.max(sent, received) > 0 ? Math.min(sent, received) / Math.max(sent, received) : 1;
  const rejections: string[] = [];
  const reasons: string[] = [];
  const opp = sim.opponent;

  if (sim.user.projectionGain < config.minUserGain) {
    rejections.push(`user lineup gain ${sim.user.projectionGain.toFixed(1)} is below the ${config.minUserGain} minimum`);
  }
  if (config.enforceValueTolerance && !valueWithinTolerance(sent, received, config)) {
    rejections.push(`trade value gap $${diff.toFixed(0)} exceeds the tolerance`);
  }
  if (opp.projectionGain < -config.maxOpponentLoss) {
    rejections.push(`opponent lineup would lose ${(-opp.projectionGain).toFixed(1)} points`);
  }

  const nearNeutral = opp.projectionGain >= -config.maxOpponentLossForSecondaryReasons;
  const nonNegative = opp.projectionGain > -1e-9;
  if (opp.projectionGain >= config.clearOpponentGain) {
    reasons.push(`their optimal lineup gains +${opp.projectionGain.toFixed(1)} projected points`);
  }
  const valueNeeded = Math.max(config.opponentValueGainThreshold, (config.opponentValueGainPercent / 100) * opp.tradeValueSent);
  if (nearNeutral && opp.tradeValueGain >= valueNeeded) {
    reasons.push(`they gain $${opp.tradeValueGain.toFixed(0)} in trade value${nonNegative ? "" : " for a negligible lineup cost"}`);
  }
  if (nearNeutral && opp.holesAfter < opp.holesBefore) {
    reasons.push(`it fills ${opp.holesBefore - opp.holesAfter} near-replacement starting slot${opp.holesBefore - opp.holesAfter > 1 ? "s" : ""}`);
  }
  if (nonNegative && opp.depthAfter > opp.depthBefore + 1) {
    reasons.push(`their useful bench depth rises by ${(opp.depthAfter - opp.depthBefore).toFixed(1)} points above replacement`);
  }
  if (nonNegative && sim.candidate.userSends.length < sim.candidate.userReceives.length && opp.tradeValueGain >= 0) {
    reasons.push("they consolidate two roster spots into one without losing lineup points");
  }
  if (reasons.length === 0) {
    rejections.push("no rational benefit for the opponent");
  }
  return { accepted: rejections.length === 0, opponentReasons: reasons, rejections, fairnessRatio: ratio, tradeValueDifference: diff };
}

export function scoreTrade(sim: TradeSimulation, config: OptimizerConfig): ScoreBreakdown {
  const w = config.weights;
  const userGain = sim.user.projectionGain;
  const weaknessBonus = clamp01(sim.user.holePointsRecovered / config.weaknessScalePoints) * w.weaknessCap;
  const opponentWeaknessBonus = clamp01(sim.opponent.holePointsRecovered / config.weaknessScalePoints) * w.opponentWeaknessCap;
  const mutualBonus = clamp01(sim.opponent.projectionGain / config.mutualScalePoints) * w.mutualCap;
  const sent = sim.user.tradeValueSent;
  const received = sim.user.tradeValueReceived;
  const slack = Math.max(config.tradeValueAbsoluteSlack, (config.maxTradeValueDifferencePercent / 100) * Math.max(sent, received, 1));
  const fairnessBonus = clamp01(1 - Math.abs(sent - received) / slack) * w.fairnessCap;
  const depthDelta = sim.user.depthAfter - sim.user.depthBefore;
  const depthBonus = clamp01(0.5 + depthDelta / (2 * config.depthScalePoints)) * w.depthCap;
  const total = userGain + weaknessBonus + opponentWeaknessBonus + mutualBonus + fairnessBonus + depthBonus;
  return { tier: classifyTier(sim, config), userGain, weaknessBonus, opponentWeaknessBonus, mutualBonus, fairnessBonus, depthBonus, total, band: secondaryBand(config) };
}

/** Sort comparator: tiers first in winWin mode, then the composite score. */
export function compareRanked(a: ScoreBreakdown, b: ScoreBreakdown, config: OptimizerConfig): number {
  if (config.rankingMode === "winWin" && a.tier !== b.tier) return TIER_RANK[a.tier] - TIER_RANK[b.tier];
  return b.total - a.total || b.userGain - a.userGain;
}

/** Deterministic reason one trade ranks above the next. */
export function compareReason(higher: ScoreBreakdown, lower: ScoreBreakdown, config?: OptimizerConfig): string {
  if ((config?.rankingMode ?? "winWin") === "winWin" && higher.tier !== lower.tier) {
    const why: Record<TradeTier, string> = {
      "win-win": "both lineups improve and both sides fix a starting weakness",
      mutual: "both lineups improve",
      "one-sided": "only your lineup improves",
    };
    return `is a ${TIER_LABEL[higher.tier].toLowerCase()} trade (${why[higher.tier]}) while #next is ${TIER_LABEL[lower.tier].toLowerCase()} (${why[lower.tier]})${higher.userGain < lower.userGain - 0.05 ? `, even though it gains you ${(lower.userGain - higher.userGain).toFixed(1)} fewer points` : ""}`;
  }
  const gainDiff = higher.userGain - lower.userGain;
  if (gainDiff >= higher.band) {
    return `gains you ${gainDiff.toFixed(1)} more starting-lineup points, which outweighs every secondary factor`;
  }
  const parts: [string, number][] = [
    ["weakness fix", higher.weaknessBonus - lower.weaknessBonus],
    ["their weakness fix", higher.opponentWeaknessBonus - lower.opponentWeaknessBonus],
    ["mutual benefit", higher.mutualBonus - lower.mutualBonus],
    ["trade-value fairness", higher.fairnessBonus - lower.fairnessBonus],
    ["remaining depth", higher.depthBonus - lower.depthBonus],
  ];
  parts.sort((a, b) => b[1] - a[1]);
  if (gainDiff > 0.05 && gainDiff >= parts[0][1]) {
    return `gains you ${gainDiff.toFixed(1)} more starting-lineup points`;
  }
  if (parts[0][1] > 0) {
    return `scores higher on ${parts[0][0]} (your gains are within ${higher.band.toFixed(2)} points of each other${gainDiff < -0.05 ? `, despite ${(-gainDiff).toFixed(1)} fewer lineup points` : ""})`;
  }
  return "is effectively tied with it";
}

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

export interface ScoreBreakdown {
  userGain: number;
  weaknessBonus: number;
  mutualBonus: number;
  fairnessBonus: number;
  depthBonus: number;
  total: number;
  band: number;
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
  if (!valueWithinTolerance(sent, received, config)) {
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
  const mutualBonus = clamp01(sim.opponent.projectionGain / config.mutualScalePoints) * w.mutualCap;
  const sent = sim.user.tradeValueSent;
  const received = sim.user.tradeValueReceived;
  const slack = Math.max(config.tradeValueAbsoluteSlack, (config.maxTradeValueDifferencePercent / 100) * Math.max(sent, received, 1));
  const fairnessBonus = clamp01(1 - Math.abs(sent - received) / slack) * w.fairnessCap;
  const depthDelta = sim.user.depthAfter - sim.user.depthBefore;
  const depthBonus = clamp01(0.5 + depthDelta / (2 * config.depthScalePoints)) * w.depthCap;
  const total = userGain + weaknessBonus + mutualBonus + fairnessBonus + depthBonus;
  return { userGain, weaknessBonus, mutualBonus, fairnessBonus, depthBonus, total, band: secondaryBand(config) };
}

/** Deterministic reason one trade ranks above the next. */
export function compareReason(higher: ScoreBreakdown, lower: ScoreBreakdown): string {
  const gainDiff = higher.userGain - lower.userGain;
  if (gainDiff >= higher.band) {
    return `gains you ${gainDiff.toFixed(1)} more starting-lineup points, which outweighs every secondary factor`;
  }
  const parts: [string, number][] = [
    ["weakness fix", higher.weaknessBonus - lower.weaknessBonus],
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

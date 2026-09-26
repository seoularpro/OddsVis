// Positional surplus: value a team holds at a position beyond what its
// starting lineup uses. Measured in projection points above replacement that
// sit on the bench, plus the trade value of expendable bench players, so
// "RB surplus: very high" means real, tradeable depth rather than just many
// bodies.

import type { Player, Position } from "../domain/types";
import { ALL_POSITIONS } from "../domain/types";
import type { OptimalLineup } from "./lineupOptimizer";
import type { ReplacementLevels } from "./replacementLevel";
import type { OptimizerConfig } from "./config";

export type SurplusLevel = "very low" | "low" | "medium" | "high" | "very high";

export interface PositionSurplus {
  position: Position;
  starters: Player[];
  bench: Player[];
  /** Σ max(0, projection - replacement) over bench players at the position. */
  trappedProjection: number;
  /** Σ trade value of bench players whose marginal lineup value is ~0. */
  trappedTradeValue: number;
  bestBenchProjection: number;
  /** Expendable players at the position (marginal value <= threshold), best first. */
  expendable: { player: Player; marginal: number }[];
  level: SurplusLevel;
  /** Numeric surplus used for partner matching (trapped projection). */
  score: number;
}

export function surplusLevel(trapped: number): SurplusLevel {
  if (trapped <= 0.5) return "very low";
  if (trapped < 2.5) return "low";
  if (trapped < 5) return "medium";
  if (trapped < 9) return "high";
  return "very high";
}

export function analyzeSurplus(
  roster: Player[],
  lineup: OptimalLineup,
  marginal: Record<string, number>,
  replacement: ReplacementLevels,
  config: OptimizerConfig
): PositionSurplus[] {
  const starterIds = new Set(lineup.starters.map((p) => p.id));
  return ALL_POSITIONS.map((position) => {
    const atPos = roster.filter((p) => p.position === position);
    const starters = atPos.filter((p) => starterIds.has(p.id)).sort((a, b) => b.projection - a.projection);
    const bench = atPos.filter((p) => !starterIds.has(p.id)).sort((a, b) => b.projection - a.projection);
    const repl = replacement[position] ?? 0;
    const trappedProjection = bench.reduce((n, p) => n + Math.max(0, p.projection - repl), 0);
    const expendable = atPos
      .map((p) => ({ player: p, marginal: marginal[p.id] ?? 0 }))
      .filter((e) => e.marginal <= config.expendableMarginalValue && e.player.projection > 0)
      .sort((a, b) => b.player.tradeValue - a.player.tradeValue || b.player.projection - a.player.projection);
    const trappedTradeValue = expendable.reduce((n, e) => n + e.player.tradeValue, 0);
    return {
      position,
      starters,
      bench,
      trappedProjection,
      trappedTradeValue,
      bestBenchProjection: bench[0]?.projection ?? 0,
      expendable,
      level: surplusLevel(trappedProjection),
      score: trappedProjection,
    };
  });
}

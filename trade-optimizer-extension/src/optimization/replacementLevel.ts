// Replacement level: the best projection freely available at each position.
// Trade values treat waiver players as $0, but their projections define what
// a "roster hole" is: a starter projecting about the same as the best free
// agent contributes no scarcity-adjusted advantage.

import type { League, Position } from "../domain/types";
import { ALL_POSITIONS, OFFENSE_POSITIONS } from "../domain/types";
import { dedicatedSlotCount, sharedSlotDemand } from "../domain/positions";

export type ReplacementLevels = Record<Position, number>;

export interface ReplacementInfo {
  levels: ReplacementLevels;
  /** "waivers" when computed from the available-player list, else estimated. */
  source: Record<Position, "waivers" | "estimated" | "none">;
}

/**
 * Best available projection per position. When the adapter could not supply
 * an available-player list for a position, the level is estimated from the
 * league's rostered pool: the projection of the player ranked just past the
 * league-wide demand for that position (starters + one bench player per
 * team), which is roughly where the waiver wire begins.
 */
export function computeReplacementLevels(league: League): ReplacementInfo {
  const levels = {} as ReplacementLevels;
  const source = {} as ReplacementInfo["source"];
  const { teamCount, lineupSlots } = league.settings;

  for (const pos of ALL_POSITIONS) {
    const available = league.availablePlayers.filter((p) => p.position === pos && p.projection > 0);
    if (available.length > 0) {
      levels[pos] = Math.max(...available.map((p) => p.projection));
      source[pos] = "waivers";
      continue;
    }
    if (!OFFENSE_POSITIONS.includes(pos)) {
      levels[pos] = 0;
      source[pos] = "none";
      continue;
    }
    const rostered = league.teams
      .flatMap((t) => t.players)
      .filter((p) => p.position === pos)
      .map((p) => p.projection)
      .sort((a, b) => b - a);
    const demand = dedicatedSlotCount(lineupSlots, pos) + sharedSlotDemand(lineupSlots, pos);
    const rank = Math.ceil(teamCount * (demand + 1));
    const value = rostered.length === 0 ? 0 : rostered[Math.min(rank, rostered.length) - 1] ?? 0;
    levels[pos] = Math.max(0, value);
    source[pos] = rostered.length ? "estimated" : "none";
  }
  return { levels, source };
}

/** Replacement level for a slot = best over its eligible positions. */
export function replacementForSlot(levels: ReplacementLevels, eligible: Position[]): number {
  return Math.max(0, ...eligible.map((p) => levels[p] ?? 0));
}

// Marginal lineup value: how many optimal starting-lineup points a roster
// loses if a player disappears. A 16-point WR5 has a marginal value of 0; a
// 13-point lone TE may have 6.5. This is the roster-relative number the trade
// generator uses to find expendable depth, and it is deliberately kept apart
// from trade value and raw projection.

import type { LineupSlot, Player } from "../domain/types";
import { optimalTotal } from "./lineupOptimizer";

export function marginalLineupValue(player: Player, roster: Player[], slots: LineupSlot[], baseTotal?: number): number {
  const base = baseTotal ?? optimalTotal(roster, slots);
  const without = roster.filter((p) => p.id !== player.id);
  return Math.max(0, base - optimalTotal(without, slots));
}

/** Marginal value of every player on a roster, keyed by player id. */
export function computeMarginalValues(roster: Player[], slots: LineupSlot[]): Record<string, number> {
  const base = optimalTotal(roster, slots);
  const out: Record<string, number> = {};
  for (const p of roster) {
    if (p.projection <= 0) {
      out[p.id] = 0;
      continue;
    }
    out[p.id] = marginalLineupValue(p, roster, slots, base);
  }
  return out;
}

/** How much adding `player` to `roster` would raise its optimal lineup. */
export function lineupEntryGain(player: Player, roster: Player[], slots: LineupSlot[], baseTotal?: number): number {
  const base = baseTotal ?? optimalTotal(roster, slots);
  return Math.max(0, optimalTotal([...roster, player], slots) - base);
}

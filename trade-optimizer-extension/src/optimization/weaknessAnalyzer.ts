// Per-slot weakness model for a team's optimal lineup.
//
// The strongest weakness signal is "points this slot is leaving on the table
// relative to realistically acquirable players", not the prestige of the
// starter. A 7-point RB2 when other teams have spare 15-point RBs is a bigger
// problem than a 17-point WR1 when the best WR projects 20.

import type { LineupSlot, Player, Position } from "../domain/types";
import type { OptimalLineup } from "./lineupOptimizer";
import { replacementForSlot, type ReplacementLevels } from "./replacementLevel";
import type { OptimizerConfig } from "./config";
import type { SlotInstance } from "../domain/positions";

export interface SlotWeakness {
  slot: SlotInstance;
  /** Display key such as "RB2" or "FLEX". */
  key: string;
  eligible: Position[];
  starter: Player | null;
  projection: number;
  replacementProjection: number;
  /** projection - replacement (the scarcity-adjusted contribution). */
  surplusOverReplacement: number;
  /** Within holeMarginPoints of replacement level (or empty). */
  isHole: boolean;
  /** Median projection other teams get from the same slot instance. */
  leagueMedian: number;
  /** 1 = best in league for this slot. */
  leagueRank: number;
  /** Projection gap to the league median, floored at 0. */
  pointsBelowMedian: number;
  /** Gain range from realistically acquirable upgrades (other teams' expendable players). */
  upgradeRange: { low: number; high: number };
  /** Primary severity: upgradeRange.high, boosted when the slot is a hole. */
  severity: number;
  /** Best acquirable upgrade candidates, most valuable first. */
  upgradeTargets: { player: Player; teamId: string; gain: number }[];
}

export interface SlotBenchmark {
  key: string;
  values: number[]; // one per team, descending
  median: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * League benchmark per slot key. Slots of the same type within a team are
 * compared by rank (each team's best RB slot vs. other teams' best RB slot).
 */
export function computeSlotBenchmarks(lineups: OptimalLineup[]): Map<string, SlotBenchmark> {
  const byKey = new Map<string, number[]>();
  for (const lineup of lineups) {
    // Sort each team's instances of a slot type descending so RB1 is always
    // the better RB regardless of assignment order.
    const grouped = new Map<string, number[]>();
    for (const a of lineup.assignments) {
      const list = grouped.get(a.slot.slotId) ?? [];
      list.push(a.projection);
      grouped.set(a.slot.slotId, list);
    }
    for (const a of lineup.assignments) {
      const list = grouped.get(a.slot.slotId)!.sort((x, y) => y - x);
      const value = list[a.slot.index - 1] ?? 0;
      const arr = byKey.get(a.slot.key) ?? [];
      arr.push(value);
      byKey.set(a.slot.key, arr);
    }
  }
  const out = new Map<string, SlotBenchmark>();
  for (const [key, values] of byKey) {
    const sorted = [...values].sort((a, b) => b - a);
    out.set(key, { key, values: sorted, median: median(sorted) });
  }
  return out;
}

export interface WeaknessContext {
  slots: LineupSlot[];
  replacement: ReplacementLevels;
  benchmarks: Map<string, SlotBenchmark>;
  /** Other teams' players with their marginal value to their own team. */
  otherTeams: { teamId: string; players: Player[]; marginal: Record<string, number> }[];
  teamCount: number;
  config: OptimizerConfig;
}

/**
 * Weakness for every slot instance of a team's optimal lineup, sorted by
 * severity (largest first).
 */
export function analyzeWeaknesses(lineup: OptimalLineup, ctx: WeaknessContext): SlotWeakness[] {
  // Rank instances of a slot type within the team by projection so the key
  // "RB2" always means the weaker RB starter.
  const grouped = new Map<string, typeof lineup.assignments>();
  for (const a of lineup.assignments) {
    const list = grouped.get(a.slot.slotId) ?? [];
    list.push(a);
    grouped.set(a.slot.slotId, list);
  }
  const ordered = [...grouped.values()].flatMap((list) =>
    [...list].sort((x, y) => y.projection - x.projection).map((a, i) => ({ ...a, slot: { ...a.slot, index: i + 1, key: list.length > 1 ? `${a.slot.label}${i + 1}` : a.slot.label } }))
  );

  const results: SlotWeakness[] = ordered.map((a) => {
    const eligible = a.slot.eligible;
    const replacement = replacementForSlot(ctx.replacement, eligible);
    const surplus = a.projection - replacement;
    const isHole = a.player === null || surplus <= ctx.config.holeMarginPoints;
    const bench = ctx.benchmarks.get(a.slot.key);
    const leagueMedian = bench?.median ?? 0;
    const rank = bench ? bench.values.filter((v) => v > a.projection + 1e-9).length + 1 : 1;

    // Realistic upgrades: players on other rosters, eligible for this slot,
    // better than the current starter, whose own team can spare them.
    const targets: SlotWeakness["upgradeTargets"] = [];
    for (const other of ctx.otherTeams) {
      for (const p of other.players) {
        if (!eligible.includes(p.position)) continue;
        if (p.projection <= a.projection) continue;
        if ((other.marginal[p.id] ?? 0) > ctx.config.expendableMarginalValue + 2) continue;
        targets.push({ player: p, teamId: other.teamId, gain: p.projection - a.projection });
      }
    }
    targets.sort((x, y) => y.gain - x.gain);
    const top = targets.slice(0, Math.max(1, ctx.teamCount));
    const high = top.length ? top[0].gain : 0;
    const low = top.length ? top[Math.min(top.length - 1, Math.floor(top.length / 2))].gain : 0;
    const severity = high + (isHole ? Math.max(0, replacement - a.projection + ctx.config.holeMarginPoints) : 0);

    return {
      slot: a.slot,
      key: a.slot.key,
      eligible,
      starter: a.player,
      projection: a.projection,
      replacementProjection: replacement,
      surplusOverReplacement: surplus,
      isHole,
      leagueMedian,
      leagueRank: rank,
      pointsBelowMedian: Math.max(0, leagueMedian - a.projection),
      upgradeRange: { low: Math.max(0, low), high: Math.max(0, high) },
      severity,
      upgradeTargets: top,
    };
  });

  return results.sort((x, y) => y.severity - x.severity || x.projection - y.projection);
}

/** Positional need: severity of the slots a position can fill (flex shared). */
export function positionalNeed(weaknesses: SlotWeakness[]): Record<Position, number> {
  const need = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 } as Record<Position, number>;
  for (const w of weaknesses) {
    const share = w.severity / w.eligible.length;
    for (const pos of w.eligible) need[pos] += share;
  }
  return need;
}

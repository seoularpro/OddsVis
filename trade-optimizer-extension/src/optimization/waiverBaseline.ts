// Free waiver upgrades as the analysis baseline.
//
// If a free agent would start for a team today, that team can drop a bench
// player and add him without trading. Measuring trades against the raw
// roster would credit a 2-for-1 with that pickup (the opened spot gets
// filled by the best free agent), so every team's roster is first upgraded
// with the free moves a rational manager makes anyway. Those moves are
// reported so the UI can show "do this first".

import type { League, Player, Position, Team } from "../domain/types";
import { OFFENSE_POSITIONS } from "../domain/types";
import { optimizeLineup, optimalTotal } from "./lineupOptimizer";

export interface WaiverMove {
  add: Player;
  drop: Player;
  gain: number;
}

/** Bench players that may be dropped: projected offense players, lowest first.
 *  Unprojected players are never dropped (their value is unknown, not zero). */
export function dropCandidates(roster: Player[], starterIds: Set<string>): Player[] {
  return roster
    .filter((p) => !starterIds.has(p.id) && OFFENSE_POSITIONS.includes(p.position) && p.projectionSource === "dataset")
    .sort((a, b) => a.projection - b.projection || a.tradeValue - b.tradeValue);
}

/**
 * @param maxMovesPerTeam upper bound on free moves per roster (0 disables)
 * @param dropMargin a player may only be dropped when he projects within this
 *   many points of his position's replacement level, i.e. he is himself
 *   waiver-level; real depth is never cut for a marginal lineup gain.
 */
export function applyFreeWaiverMoves(league: League, maxMovesPerTeam: number, dropMargin = 1.5): { league: League; moves: Record<string, WaiverMove[]> } {
  const moves: Record<string, WaiverMove[]> = {};
  if (maxMovesPerTeam <= 0) return { league, moves };
  const slots = league.settings.lineupSlots;
  const pool = [...league.availablePlayers].filter((p) => p.projection > 0).sort((a, b) => b.projection - a.projection);
  const claimed = new Set<string>();
  const replacement = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 } as Record<Position, number>;
  for (const p of pool) replacement[p.position] = Math.max(replacement[p.position], p.projection);

  const teams: Team[] = league.teams.map((team) => {
    let roster = [...team.players];
    const teamMoves: WaiverMove[] = [];
    for (let i = 0; i < maxMovesPerTeam; i++) {
      const lineup = optimizeLineup(roster, slots);
      const starterIds = new Set(lineup.starters.map((p) => p.id));
      const drops = dropCandidates(roster, starterIds).filter((p) => p.projection <= replacement[p.position] + dropMargin);
      if (!drops.length) break;
      const drop = drops[0];
      const without = roster.filter((p) => p.id !== drop.id);
      const base = lineup.total;
      let best: WaiverMove | null = null;
      const seen = new Set<string>();
      for (const fa of pool) {
        if (claimed.has(fa.id) || seen.has(fa.position)) continue;
        seen.add(fa.position); // only the best free agent per position can win
        const gain = optimalTotal([...without, fa], slots) - base;
        if (gain > 0.05 && (!best || gain > best.gain)) best = { add: fa, drop, gain };
      }
      if (!best) break;
      claimed.add(best.add.id);
      roster = [...without, { ...best.add, tradeValue: 0, tradeValueSource: "none" }];
      teamMoves.push(best);
    }
    if (teamMoves.length) moves[team.id] = teamMoves;
    return { ...team, players: roster };
  });

  return {
    league: { ...league, teams, availablePlayers: league.availablePlayers.filter((p) => !claimed.has(p.id)) },
    moves,
  };
}

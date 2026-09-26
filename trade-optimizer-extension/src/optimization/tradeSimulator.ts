// Apply a candidate trade to both rosters, fit each roster back to the
// league's roster size (a 2-for-1 opens a spot that the best waiver player
// fills; a 1-for-2 forces a drop of the least useful player), then
// re-optimize both starting lineups and diff them.

import type { League, Player, Position } from "../domain/types";
import { OFFENSE_POSITIONS } from "../domain/types";
import { withPlayers } from "../domain/roster";
import { optimizeLineup, optimalTotal, type OptimalLineup } from "./lineupOptimizer";
import type { LeagueAnalysis, TeamAnalysis } from "./teamAnalyzer";
import type { TradeCandidate } from "./tradeGenerator";
import { replacementForSlot } from "./replacementLevel";
import type { OptimizerConfig } from "./config";
import { depthScoreFor } from "./teamAnalyzer";
import { dropCandidates } from "./waiverBaseline";

export interface SlotChange {
  key: string;
  before: Player | null;
  after: Player | null;
  beforeProjection: number;
  afterProjection: number;
  delta: number;
}

export interface TeamSimulation {
  teamId: string;
  teamName: string;
  before: OptimalLineup;
  after: OptimalLineup;
  projectionBefore: number;
  projectionAfter: number;
  projectionGain: number;
  tradeValueSent: number;
  tradeValueReceived: number;
  tradeValueGain: number;
  /** Incoming players that are in the new optimal lineup. */
  incomingStarters: Player[];
  /** Outgoing players that were in the old optimal lineup. */
  outgoingStarters: Player[];
  /** Outgoing players whose marginal value was ~0 (expendable). */
  outgoingExpendable: Player[];
  waiverAdds: Player[];
  drops: Player[];
  slotChanges: SlotChange[];
  holesBefore: number;
  holesAfter: number;
  /** Points recovered in slots that were holes before the trade. */
  holePointsRecovered: number;
  depthBefore: number;
  depthAfter: number;
  rosterAfter: Player[];
}

export interface TradeSimulation {
  candidate: TradeCandidate;
  user: TeamSimulation;
  opponent: TeamSimulation;
}

function countHoles(lineup: OptimalLineup, analysis: LeagueAnalysis): { holes: number; holeKeys: Set<string>; holeMap: Map<string, number> } {
  const cfg = analysis.config;
  let holes = 0;
  const holeKeys = new Set<string>();
  const holeMap = new Map<string, number>();
  for (const a of lineup.assignments) {
    if (!OFFENSE_POSITIONS.some((p) => a.slot.eligible.includes(p))) continue;
    const repl = replacementForSlot(analysis.replacement.levels, a.slot.eligible);
    const key = `${a.slot.slotId}#${a.slot.index}`;
    holeMap.set(key, a.projection);
    if (a.player === null || a.projection - repl <= cfg.holeMarginPoints) {
      holes++;
      holeKeys.add(key);
    }
  }
  return { holes, holeKeys, holeMap };
}

/**
 * Bring a roster back to the league's roster size after a trade.
 * Too many players: drop non-starters with the lowest projection (K/DST are
 * only dropped when nothing else is left). Too few: add the available player
 * that raises the optimal lineup the most (ties -> highest projection).
 */
export function fitRosterToSize(
  roster: Player[],
  league: League,
  excludeIds: Set<string>
): { roster: Player[]; adds: Player[]; drops: Player[] } {
  const size = league.settings.rosterSize;
  const slots = league.settings.lineupSlots;
  let current = [...roster];
  const adds: Player[] = [];
  const drops: Player[] = [];

  while (current.length > size) {
    const lineup = optimizeLineup(current, slots);
    const starterIds = new Set(lineup.starters.map((p) => p.id));
    const projected = dropCandidates(current, starterIds);
    const pool = current.filter((p) => !starterIds.has(p.id));
    const offense = pool.filter((p) => OFFENSE_POSITIONS.includes(p.position));
    const choices = projected.length ? projected : offense.length ? offense : pool.length ? pool : current;
    const drop = [...choices].sort((a, b) => a.projection - b.projection || a.tradeValue - b.tradeValue)[0];
    drops.push(drop);
    current = current.filter((p) => p.id !== drop.id);
  }

  if (current.length < size) {
    const taken = new Set([...current.map((p) => p.id), ...excludeIds]);
    const available = league.availablePlayers.filter((p) => !taken.has(p.id) && p.projection > 0);
    while (current.length < size && available.length) {
      const base = optimalTotal(current, slots);
      let best: { player: Player; gain: number } | null = null;
      // Only the best available player per position can be the best add.
      const seen = new Set<Position>();
      const byProj = [...available].sort((a, b) => b.projection - a.projection);
      for (const p of byProj) {
        if (seen.has(p.position)) continue;
        seen.add(p.position);
        const gain = optimalTotal([...current, p], slots) - base;
        if (!best || gain > best.gain + 1e-9 || (Math.abs(gain - best.gain) < 1e-9 && p.projection > best.player.projection)) {
          best = { player: p, gain };
        }
      }
      if (!best) break;
      adds.push(best.player);
      current.push(best.player);
      available.splice(available.indexOf(best.player), 1);
    }
  }
  return { roster: current, adds, drops };
}

function diffLineups(before: OptimalLineup, after: OptimalLineup): SlotChange[] {
  const changes: SlotChange[] = [];
  for (let i = 0; i < before.assignments.length; i++) {
    const b = before.assignments[i];
    const a = after.assignments[i];
    if ((b.player?.id ?? null) === (a.player?.id ?? null)) continue;
    changes.push({
      key: b.slot.key,
      before: b.player,
      after: a.player,
      beforeProjection: b.projection,
      afterProjection: a.projection,
      delta: a.projection - b.projection,
    });
  }
  return changes;
}

function simulateSide(
  team: TeamAnalysis,
  sends: Player[],
  receives: Player[],
  analysis: LeagueAnalysis,
  config: OptimizerConfig
): TeamSimulation {
  const league = analysis.league;
  const slots = league.settings.lineupSlots;
  const traded = new Set([...sends, ...receives].map((p) => p.id));
  const raw = withPlayers(team.roster, sends, receives);
  const fitted = fitRosterToSize(raw, league, traded);
  const after = optimizeLineup(fitted.roster, slots);
  const before = team.optimal;

  const beforeHoles = countHoles(before, analysis);
  const afterHoles = countHoles(after, analysis);
  let recovered = 0;
  for (const key of beforeHoles.holeKeys) {
    const b = beforeHoles.holeMap.get(key) ?? 0;
    const a = afterHoles.holeMap.get(key) ?? 0;
    recovered += Math.max(0, a - b);
  }

  const beforeStarterIds = new Set(before.starters.map((p) => p.id));
  const afterStarterIds = new Set(after.starters.map((p) => p.id));
  const sent = sends.reduce((n, p) => n + p.tradeValue, 0);
  const received = receives.reduce((n, p) => n + p.tradeValue, 0);

  return {
    teamId: team.teamId,
    teamName: team.teamName,
    before,
    after,
    projectionBefore: before.total,
    projectionAfter: after.total,
    projectionGain: after.total - before.total,
    tradeValueSent: sent,
    tradeValueReceived: received,
    tradeValueGain: received - sent,
    incomingStarters: receives.filter((p) => afterStarterIds.has(p.id)),
    outgoingStarters: sends.filter((p) => beforeStarterIds.has(p.id)),
    outgoingExpendable: sends.filter((p) => (team.playerMarginalValues[p.id] ?? 0) <= config.expendableMarginalValue),
    waiverAdds: fitted.adds,
    drops: fitted.drops,
    slotChanges: diffLineups(before, after),
    holesBefore: beforeHoles.holes,
    holesAfter: afterHoles.holes,
    holePointsRecovered: recovered,
    depthBefore: team.depthScore,
    depthAfter: depthScoreFor(after.bench, analysis.replacement.levels),
    rosterAfter: fitted.roster,
  };
}

export function simulateTrade(candidate: TradeCandidate, analysis: LeagueAnalysis): TradeSimulation {
  const user = analysis.user;
  if (!user) throw new Error("No user team in analysis");
  const opponent = analysis.teams.find((t) => t.teamId === candidate.partnerTeamId);
  if (!opponent) throw new Error(`Unknown partner ${candidate.partnerTeamId}`);
  return {
    candidate,
    user: simulateSide(user, candidate.userSends, candidate.userReceives, analysis, analysis.config),
    opponent: simulateSide(opponent, candidate.userReceives, candidate.userSends, analysis, analysis.config),
  };
}

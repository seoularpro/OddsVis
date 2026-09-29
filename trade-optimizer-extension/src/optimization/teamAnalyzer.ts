// League-wide roster analysis: optimal lineups, marginal values, weaknesses
// and positional surplus for every team, plus league ranks and the headline
// insight for the user's team.

import type { League, Player, Position, Team } from "../domain/types";
import { OFFENSE_POSITIONS } from "../domain/types";
import { totalTradeValue } from "../domain/roster";
import { optimizeLineup, type OptimalLineup } from "./lineupOptimizer";
import { computeMarginalValues } from "./marginalValue";
import { computeReplacementLevels, type ReplacementInfo } from "./replacementLevel";
import { analyzeWeaknesses, computeSlotBenchmarks, positionalNeed, type SlotBenchmark, type SlotWeakness } from "./weaknessAnalyzer";
import { analyzeSurplus, type PositionSurplus } from "./surplusAnalyzer";
import { mergeConfig, type OptimizerConfig } from "./config";
import { applyFreeWaiverMoves, type WaiverMove } from "./waiverBaseline";

export interface TeamAnalysis {
  teamId: string;
  teamName: string;
  isUser: boolean;
  roster: Player[];
  optimal: OptimalLineup;
  optimalStartingProjection: number;
  starters: Player[];
  bench: Player[];
  weaknesses: SlotWeakness[];
  holes: SlotWeakness[];
  positionalSurplus: PositionSurplus[];
  need: Record<Position, number>;
  playerMarginalValues: Record<string, number>;
  totalTradeValue: number;
  startersTradeValue: number;
  benchTradeValue: number;
  /** Bench points above replacement (useful depth). */
  depthScore: number;
  projectionRank: number;
  tradeValueRank: number;
  /** Free waiver upgrades assumed before analysis ("do this first"). */
  waiverMoves: WaiverMove[];
  /** Ids of players the baseline pulled from waivers: on the effective roster, never tradeable. */
  baselineAddedIds: string[];
}

export interface LeagueAnalysis {
  /** The league with free waiver moves applied (see waiverBaseline.ts). */
  league: League;
  /** The league exactly as extracted. */
  originalLeague: League;
  config: OptimizerConfig;
  teams: TeamAnalysis[];
  user: TeamAnalysis | null;
  replacement: ReplacementInfo;
  benchmarks: Map<string, SlotBenchmark>;
  insight: string[];
}

export function depthScoreFor(bench: Player[], replacement: Record<Position, number>): number {
  return bench.reduce((n, p) => n + Math.max(0, p.projection - (replacement[p.position] ?? 0)), 0);
}

function analyzeOne(
  team: Team,
  league: League,
  replacement: ReplacementInfo,
  benchmarks: Map<string, SlotBenchmark>,
  all: { team: Team; optimal: OptimalLineup; marginal: Record<string, number> }[],
  config: OptimizerConfig
): TeamAnalysis {
  const me = all.find((a) => a.team.id === team.id)!;
  const others = all
    .filter((a) => a.team.id !== team.id)
    .map((a) => ({ teamId: a.team.id, players: a.team.players, marginal: a.marginal }));
  const weaknesses = analyzeWeaknesses(me.optimal, {
    slots: league.settings.lineupSlots,
    replacement: replacement.levels,
    benchmarks,
    otherTeams: others,
    teamCount: league.settings.teamCount,
    config,
  });
  const surplus = analyzeSurplus(team.players, me.optimal, me.marginal, replacement.levels, config);
  const starters = me.optimal.starters;
  const bench = me.optimal.bench;
  return {
    teamId: team.id,
    teamName: team.name,
    isUser: team.id === league.userTeamId,
    roster: team.players,
    optimal: me.optimal,
    optimalStartingProjection: me.optimal.total,
    starters,
    bench,
    weaknesses,
    holes: weaknesses.filter((w) => w.isHole && OFFENSE_POSITIONS.some((p) => w.eligible.includes(p))),
    positionalSurplus: surplus,
    need: positionalNeed(weaknesses),
    playerMarginalValues: me.marginal,
    totalTradeValue: totalTradeValue(team.players),
    startersTradeValue: totalTradeValue(starters),
    benchTradeValue: totalTradeValue(bench),
    depthScore: depthScoreFor(bench, replacement.levels),
    projectionRank: 0,
    tradeValueRank: 0,
    waiverMoves: [],
    baselineAddedIds: [],
  };
}

export function analyzeLeague(originalLeague: League, overrides?: Partial<OptimizerConfig>): LeagueAnalysis {
  const config = mergeConfig(overrides);
  const { league, moves } = applyFreeWaiverMoves(originalLeague, config.baselineWaiverMoves, config.holeMarginPoints, config.minWaiverMoveGain);
  const slots = league.settings.lineupSlots;
  const replacement = computeReplacementLevels(league);
  const all = league.teams.map((team) => ({
    team,
    optimal: optimizeLineup(team.players, slots),
    marginal: computeMarginalValues(team.players, slots),
  }));
  const benchmarks = computeSlotBenchmarks(all.map((a) => a.optimal));
  const teams = league.teams.map((team) => ({
    ...analyzeOne(team, league, replacement, benchmarks, all, config),
    waiverMoves: moves[team.id] ?? [],
    baselineAddedIds: (moves[team.id] ?? []).map((m) => m.add.id),
  }));

  const byProj = [...teams].sort((a, b) => b.optimalStartingProjection - a.optimalStartingProjection);
  byProj.forEach((t, i) => (t.projectionRank = i + 1));
  const byValue = [...teams].sort((a, b) => b.totalTradeValue - a.totalTradeValue);
  byValue.forEach((t, i) => (t.tradeValueRank = i + 1));

  const user = teams.find((t) => t.isUser) ?? null;
  return {
    league,
    originalLeague,
    config,
    teams,
    user,
    replacement,
    benchmarks,
    insight: user ? buildInsight(user, teams.length, replacement) : [],
  };
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

/** Deterministic headline such as: "Your team has the league's 3rd-highest total
 *  trade value, but your starting lineup ranks 7th because $47 of value is
 *  trapped on your bench at RB while your WR2 and FLEX are near replacement level." */
export function buildInsight(user: TeamAnalysis, teamCount: number, replacement: ReplacementInfo): string[] {
  const lines: string[] = [];
  const trapped = user.positionalSurplus
    .filter((s) => OFFENSE_POSITIONS.includes(s.position) && s.trappedTradeValue > 0)
    .sort((a, b) => b.trappedTradeValue - a.trappedTradeValue);
  const holes = user.holes.map((h) => h.key);
  const valueRank = ordinal(user.tradeValueRank);
  const projRank = ordinal(user.projectionRank);

  let head = `Your team has the league's ${valueRank}-highest total trade value ($${Math.round(user.totalTradeValue)}) and your optimal starting lineup ranks ${projRank} of ${teamCount} (${user.optimalStartingProjection.toFixed(1)} projected points).`;
  if (user.tradeValueRank < user.projectionRank && trapped.length) {
    const t = trapped[0];
    head = `Your team has the league's ${valueRank}-highest total trade value, but your starting lineup ranks ${projRank} because $${Math.round(t.trappedTradeValue)} of value is trapped on your bench at ${t.position}`;
    head += holes.length ? ` while your ${joinKeys(holes)} ${holes.length > 1 ? "are" : "is"} near replacement level.` : ".";
  } else if (holes.length) {
    head += ` Your ${joinKeys(holes)} ${holes.length > 1 ? "are" : "is"} near replacement level.`;
  }
  lines.push(head);

  const bigSurplus = user.positionalSurplus.filter((s) => s.level === "high" || s.level === "very high");
  if (bigSurplus.length) {
    lines.push(
      `Surplus: ${bigSurplus
        .map((s) => `${s.position} (${s.level}, ${s.trappedProjection.toFixed(1)} bench points above replacement)`)
        .join(", ")}.`
    );
  }
  const worst = user.weaknesses.filter((w) => w.severity > 0 && OFFENSE_POSITIONS.some((p) => w.eligible.includes(p)))[0];
  if (worst) {
    lines.push(
      `Biggest opportunity: ${worst.key} (${worst.projection.toFixed(1)} projected, replacement ${worst.replacementProjection.toFixed(1)}) with realistic upgrades worth +${worst.upgradeRange.low.toFixed(1)} to +${worst.upgradeRange.high.toFixed(1)}.`
    );
  }
  const estimated = Object.entries(replacement.source).filter(([, s]) => s === "estimated").map(([p]) => p);
  if (estimated.length) lines.push(`Replacement level for ${estimated.join("/")} was estimated from the league's rostered pool (no waiver list available).`);
  return lines;
}

function joinKeys(keys: string[]): string {
  if (keys.length <= 1) return keys.join("");
  return `${keys.slice(0, -1).join(", ")} and ${keys[keys.length - 1]}`;
}

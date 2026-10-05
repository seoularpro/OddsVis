// Candidate trade generation with pruning.
//
// Pipeline: rank partners by complementary surplus/need -> pick expendable
// user assets and high-impact targets -> enumerate package shapes -> drop
// packages that cannot change either team's starting lineup (and, only when
// enforceValueTolerance is on, packages outside the value tolerance). Shapes are data, so 3-for-1 etc. only need a config
// change; draft picks / FAAB would be additional asset kinds on the package.

import type { Player, Position } from "../domain/types";
import { OFFENSE_POSITIONS } from "../domain/types";
import type { LeagueAnalysis, TeamAnalysis } from "./teamAnalyzer";
import type { OptimizerConfig, TradeShape } from "./config";
import { expandSlots } from "../domain/positions";

export interface TradeCandidate {
  partnerTeamId: string;
  userSends: Player[];
  userReceives: Player[];
  shape: TradeShape;
  /** Partner complementarity score (higher = more natural partner). */
  partnerScore: number;
}

export interface PartnerRanking {
  teamId: string;
  teamName: string;
  score: number;
  /** Positions where the partner's surplus meets the user's need, and vice versa. */
  userGets: Position[];
  partnerGets: Position[];
}

export interface GenerationStats {
  partners: number;
  enumerated: number;
  prunedByValue: number;
  prunedByLineup: number;
  candidates: number;
}

export function rankPartners(analysis: LeagueAnalysis, user: TeamAnalysis): PartnerRanking[] {
  const surplusOf = (t: TeamAnalysis, pos: Position) => t.positionalSurplus.find((s) => s.position === pos)?.score ?? 0;
  return analysis.teams
    .filter((t) => t.teamId !== user.teamId)
    .map((t) => {
      const userGets: Position[] = [];
      const partnerGets: Position[] = [];
      let score = 0;
      for (const pos of OFFENSE_POSITIONS) {
        const a = Math.min(user.need[pos], surplusOf(t, pos));
        const b = Math.min(t.need[pos], surplusOf(user, pos));
        if (a > 0.5) userGets.push(pos);
        if (b > 0.5) partnerGets.push(pos);
        score += a + b;
      }
      // Any team can still be a partner (consolidation deals do not need
      // positional complementarity), so add a small baseline.
      return { teamId: t.teamId, teamName: t.teamName, score: score + 0.01, userGets, partnerGets };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Players the search may move.
 *  - K/DST are never traded.
 *  - Players without a projection this week are excluded on both sides: with a
 *    0 projection they would look like free expendable assets (or worthless
 *    targets) when the truth is simply unknown.
 *  - Players whose latest odds no longer post every required prop are excluded
 *    too: their projection leans on last posted values, which usually means
 *    the books pulled a line (injury news, a role change).
 *  - Waiver-wire players are worthless by definition ($0), so anyone the
 *    baseline pulled from waivers, and any rostered player with no trade
 *    value, is never part of a package. They still count in lineups.
 *  - Quarterbacks are only packaged when worth more than minQbTradeValue.
 */
export function tradeable(players: Player[], excludeIds: ReadonlySet<string> = new Set(), minQbTradeValue = 0): Player[] {
  return players.filter(
    (p) =>
      OFFENSE_POSITIONS.includes(p.position) &&
      p.projectionSource === "dataset" &&
      !p.projectionStale &&
      p.projection > 0 &&
      p.tradeValue > 0 &&
      (p.position !== "QB" || p.tradeValue > minQbTradeValue) &&
      !excludeIds.has(p.id)
  );
}

function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      acc.push(items[i]);
      rec(i + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

export function valueWithinTolerance(sent: number, received: number, config: OptimizerConfig): boolean {
  const diff = Math.abs(sent - received);
  const slack = Math.max(
    config.tradeValueAbsoluteSlack,
    (config.maxTradeValueDifferencePercent / 100) * Math.max(sent, received)
  );
  return diff <= slack + 1e-9;
}

/** Weakest starter projection per position among slots that position can fill. */
function weakestStarterByPosition(team: TeamAnalysis): Record<Position, number> {
  const out = { QB: Infinity, RB: Infinity, WR: Infinity, TE: Infinity, K: Infinity, DST: Infinity } as Record<Position, number>;
  for (const a of team.optimal.assignments) {
    for (const pos of a.slot.eligible) out[pos] = Math.min(out[pos], a.projection);
  }
  return out;
}

/**
 * Enumerate plausible packages between the user and each partner.
 * `outgoing`: the user's most valuable tradeable players (stars included, so
 * depth-for-star deals are searchable) and `incoming`: the partner's.
 */
export function generateCandidates(analysis: LeagueAnalysis, config: OptimizerConfig): { candidates: TradeCandidate[]; partners: PartnerRanking[]; stats: GenerationStats } {
  const user = analysis.user;
  const stats: GenerationStats = { partners: 0, enumerated: 0, prunedByValue: 0, prunedByLineup: 0, candidates: 0 };
  if (!user) return { candidates: [], partners: [], stats };

  const partners = rankPartners(analysis, user).slice(0, config.maxPartners);
  stats.partners = partners.length;
  const userWeakest = weakestStarterByPosition(user);
  const slotCount = expandSlots(analysis.league.settings.lineupSlots).length;

  const outgoingPool = tradeable(user.roster, new Set(user.baselineAddedIds), config.minQbTradeValue)
    .sort((a, b) => b.tradeValue - a.tradeValue || b.projection - a.projection)
    .slice(0, config.maxOutgoingCandidates);

  const candidates: TradeCandidate[] = [];
  for (const partner of partners) {
    const team = analysis.teams.find((t) => t.teamId === partner.teamId)!;
    const partnerWeakest = weakestStarterByPosition(team);
    const incomingPool = tradeable(team.roster, new Set(team.baselineAddedIds), config.minQbTradeValue)
      .sort((a, b) => b.tradeValue - a.tradeValue || b.projection - a.projection)
      .slice(0, config.maxIncomingCandidates);

    // Sides of three or more players draw from a smaller pool (the most
    // valuable maxTripleCandidates) to keep the combination count in check.
    const poolFor = (pool: Player[], size: number) => (size >= 3 ? pool.slice(0, config.maxTripleCandidates) : pool);
    const sendSets = new Map<number, Player[][]>();
    const recvSets = new Map<number, Player[][]>();
    for (const shape of config.shapes) {
      if (!sendSets.has(shape.send)) sendSets.set(shape.send, combinations(poolFor(outgoingPool, shape.send), shape.send));
      if (!recvSets.has(shape.receive)) recvSets.set(shape.receive, combinations(poolFor(incomingPool, shape.receive), shape.receive));
    }

    for (const shape of config.shapes) {
      for (const sends of sendSets.get(shape.send)!) {
        const sentValue = sends.reduce((n, p) => n + p.tradeValue, 0);
        // The partner can only benefit if something they receive can start
        // for them, or they gain trade value.
        const sendsCanStart = sends.some((p) => p.projection > partnerWeakest[p.position] + 1e-9);
        for (const recvs of recvSets.get(shape.receive)!) {
          stats.enumerated++;
          const recvValue = recvs.reduce((n, p) => n + p.tradeValue, 0);
          if (config.enforceValueTolerance && !valueWithinTolerance(sentValue, recvValue, config)) {
            stats.prunedByValue++;
            continue;
          }
          // The user can only gain if something they receive can start.
          const recvCanStart = recvs.some((p) => p.projection > userWeakest[p.position] + 1e-9);
          if (!recvCanStart) {
            stats.prunedByLineup++;
            continue;
          }
          if (!sendsCanStart && sentValue <= recvValue) {
            stats.prunedByLineup++;
            continue;
          }
          candidates.push({ partnerTeamId: partner.teamId, userSends: sends, userReceives: recvs, shape, partnerScore: partner.score });
        }
      }
    }
  }
  stats.candidates = candidates.length;
  void slotCount;
  return { candidates, partners, stats };
}

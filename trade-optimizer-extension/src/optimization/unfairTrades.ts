// "Unfair" trades: value grabs that also help this week.
//
// The user sends only players worth more than unfairMinOutgoingValue, and the
// deal must raise both the user's total trade value and the user's optimal
// lineup projection. No fairness tolerance and no opponent-benefit test: the
// other side's outcome is reported honestly but never filters the list.
// Ranked by projection gain plus value gain converted at
// unfairValuePointsPerProjectionPoint dollars per point.

import type { Player } from "../domain/types";
import type { OptimizerConfig } from "./config";
import type { LeagueAnalysis } from "./teamAnalyzer";
import { tradeable, type TradeCandidate } from "./tradeGenerator";
import { simulateTrade, type TradeSimulation } from "./tradeSimulator";
import { evaluateAcceptance, type Acceptance } from "./tradeScorer";
import { explainTrade, type TradeExplanation } from "./tradeExplainer";

export interface UnfairTrade {
  rank: number;
  simulation: TradeSimulation;
  /** user.tradeValueReceived - user.tradeValueSent */
  valueGain: number;
  /** projectionGain + valueGain / unfairValuePointsPerProjectionPoint */
  score: number;
  /** The normal acceptance verdict, for the "expect pushback" note. */
  acceptance: Acceptance;
  explanation: TradeExplanation;
}

export interface UnfairStats {
  enumerated: number;
  simulated: number;
  qualifying: number;
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

function outcomeKey(sim: TradeSimulation): string {
  const r = sim.candidate.userReceives.map((p) => p.id).sort().join(",");
  const u = sim.user.after.starters.map((p) => p.id).sort().join(",");
  return `${sim.candidate.partnerTeamId}|${r}|${u}`;
}

export function findUnfairTrades(analysis: LeagueAnalysis, config: OptimizerConfig): { trades: UnfairTrade[]; stats: UnfairStats } {
  const user = analysis.user;
  const stats: UnfairStats = { enumerated: 0, simulated: 0, qualifying: 0 };
  if (!user) return { trades: [], stats };

  const outgoingPool: Player[] = tradeable(user.roster, new Set(user.baselineAddedIds), config.minQbTradeValue)
    .filter((p) => p.tradeValue > config.unfairMinOutgoingValue)
    .sort((a, b) => b.tradeValue - a.tradeValue);
  if (!outgoingPool.length) return { trades: [], stats };

  const sendSets = new Map<number, Player[][]>();
  for (const shape of config.shapes) {
    if (!sendSets.has(shape.send)) sendSets.set(shape.send, combinations(outgoingPool, shape.send));
  }

  const scored: { sim: TradeSimulation; valueGain: number; score: number }[] = [];
  const seen = new Set<string>();
  for (const team of analysis.teams) {
    if (team.teamId === user.teamId) continue;
    const incomingPool = tradeable(team.roster, new Set(team.baselineAddedIds), config.minQbTradeValue)
      .sort((a, b) => b.tradeValue - a.tradeValue)
      .slice(0, config.maxIncomingCandidates);
    const recvSets = new Map<number, Player[][]>();
    for (const shape of config.shapes) {
      const pool = shape.receive >= 3 ? incomingPool.slice(0, config.maxTripleCandidates) : incomingPool;
      if (!recvSets.has(shape.receive)) recvSets.set(shape.receive, combinations(pool, shape.receive));
    }
    for (const shape of config.shapes) {
      for (const sends of sendSets.get(shape.send) ?? []) {
        const sentValue = sends.reduce((n, p) => n + p.tradeValue, 0);
        for (const recvs of recvSets.get(shape.receive) ?? []) {
          stats.enumerated++;
          const recvValue = recvs.reduce((n, p) => n + p.tradeValue, 0);
          if (recvValue <= sentValue) continue; // must raise total valuation
          const candidate: TradeCandidate = { partnerTeamId: team.teamId, userSends: sends, userReceives: recvs, shape, partnerScore: 0 };
          const sim = simulateTrade(candidate, analysis);
          stats.simulated++;
          if (sim.user.projectionGain <= 0) continue; // must raise this week's lineup
          const key = outcomeKey(sim);
          if (seen.has(key)) continue;
          seen.add(key);
          const valueGain = recvValue - sentValue;
          stats.qualifying++;
          scored.push({ sim, valueGain, score: sim.user.projectionGain + valueGain / config.unfairValuePointsPerProjectionPoint });
        }
      }
    }
  }

  scored.sort((a, b) => b.score - a.score || b.valueGain - a.valueGain);
  const perPartner = new Map<string, number>();
  const chosen: typeof scored = [];
  for (const entry of scored) {
    const id = entry.sim.candidate.partnerTeamId;
    const n = perPartner.get(id) ?? 0;
    if (n >= config.maxTradesPerPartner) continue;
    perPartner.set(id, n + 1);
    chosen.push(entry);
    if (chosen.length >= config.unfairTopN) break;
  }

  const trades: UnfairTrade[] = chosen.map((entry, i) => {
    const acceptance = evaluateAcceptance(entry.sim, config);
    return { rank: i + 1, simulation: entry.sim, valueGain: entry.valueGain, score: entry.score, acceptance, explanation: explainTrade(entry.sim, analysis, acceptance) };
  });
  return { trades, stats };
}

import React from "react";
import type { RankedTrade } from "../../optimization/tradeOptimizer";
import type { LeagueAnalysis } from "../../optimization/teamAnalyzer";
import { money, signed1 } from "../format";
import { TIER_LABEL } from "../../optimization/tradeScorer";

/**
 * Teaser for a trade behind the paywall: the partner and the outcome are
 * real, the players are not rendered at all (a blurred name is still a name
 * in the DOM).
 */
export function LockedTradeCard({ trade, analysis, onUpgrade, priceLabel }: { trade: RankedTrade; analysis: LeagueAnalysis; onUpgrade: () => void; priceLabel: string }) {
  const sim = trade.simulation;
  const opp = analysis.teams.find((t) => t.teamId === sim.candidate.partnerTeamId)!;
  const sends = sim.candidate.userSends.length;
  const receives = sim.candidate.userReceives.length;
  return (
    <article className="card trade locked">
      <header className="trade-head">
        <div className="trade-rank">#{trade.rank}</div>
        <div className="trade-summary">
          <div className="trade-title">
            Trade with <b>{opp.teamName}</b>
            <span className={`tag tier tier-${trade.score.tier}`}>{TIER_LABEL[trade.score.tier]}</span>
          </div>
          <div className="trade-gains">
            <span className="gain you">You {signed1(sim.user.projectionGain)}</span>
            <span className="gain them">They {signed1(sim.opponent.projectionGain)}</span>
            <span className="muted">{money(sim.user.tradeValueSent)} ↔ {money(sim.user.tradeValueReceived)}</span>
          </div>
        </div>
        <div className="lock" aria-label="Locked">🔒</div>
      </header>
      <div className="trade-sides">
        <div>
          <div className="side-label">You send ({sends})</div>
          <ul>{Array.from({ length: sends }).map((_, i) => <li key={i}><span className="redacted" /></li>)}</ul>
        </div>
        <div>
          <div className="side-label">You receive ({receives})</div>
          <ul>{Array.from({ length: receives }).map((_, i) => <li key={i}><span className="redacted" /></li>)}</ul>
        </div>
      </div>
      <div className="locked-cta">
        <span>
          {trade.rank === 1 ? "Your best trade: a" : "A"} {sends}-for-{receives} with {opp.teamName} that adds <b>{signed1(sim.user.projectionGain)}</b> to your starting lineup
          {sim.user.holesAfter < sim.user.holesBefore ? " and fills a roster hole" : ""}.
        </span>
        <button className="primary" onClick={onUpgrade}>
          Unlock all trades{priceLabel ? ` · ${priceLabel}` : ""}
        </button>
      </div>
    </article>
  );
}

import React, { useState } from "react";
import type { RankedTrade } from "../../optimization/tradeOptimizer";
import type { LeagueAnalysis } from "../../optimization/teamAnalyzer";
import { fmt1, money, signed1 } from "../format";
import { TIER_LABEL } from "../../optimization/tradeScorer";
import { PlayerChip } from "./PlayerChip";
import { LineupTable } from "./LineupTable";
import { ExpandToggle } from "./ExpandToggle";
import { TradeScreenLink } from "./TradeScreenLink";

export function TradeCard({ trade, analysis }: { trade: RankedTrade; analysis: LeagueAnalysis }) {
  const [open, setOpen] = useState(false);
  const [showLineups, setShowLineups] = useState(false);
  const sim = trade.simulation;
  const opp = analysis.teams.find((t) => t.teamId === sim.candidate.partnerTeamId)!;
  const user = analysis.user!;
  const incomingIds = new Set(sim.candidate.userReceives.map((p) => p.id));
  const outgoingIds = new Set(sim.candidate.userSends.map((p) => p.id));

  return (
    <article className="card trade">
      <header className="trade-head" onClick={() => setOpen((v) => !v)}>
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
          {sim.user.solvedWeaknesses.length || sim.opponent.solvedWeaknesses.length ? (
            <div className="muted small">
              Solves{sim.user.solvedWeaknesses.length ? ` your ${sim.user.solvedWeaknesses.join(", ")}` : ""}
              {sim.user.solvedWeaknesses.length && sim.opponent.solvedWeaknesses.length ? " and" : ""}
              {sim.opponent.solvedWeaknesses.length ? ` their ${sim.opponent.solvedWeaknesses.join(", ")}` : ""}
            </div>
          ) : null}
        </div>
        <ExpandToggle open={open} />
      </header>

      <div className="trade-sides">
        <div>
          <div className="side-label">You send</div>
          <ul>
            {sim.candidate.userSends.map((p) => (
              <li key={p.id}><PlayerChip player={p} marginal={user.playerMarginalValues[p.id] ?? 0} /></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="side-label">You receive</div>
          <ul>
            {sim.candidate.userReceives.map((p) => (
              <li key={p.id}><PlayerChip player={p} marginal={opp.playerMarginalValues[p.id] ?? 0} /></li>
            ))}
          </ul>
        </div>
      </div>

      <TradeScreenLink league={analysis.originalLeague} trade={sim.candidate} partnerName={opp.teamName} />

      {open ? (
        <div className="trade-detail">
          <div className="metrics">
            <div className="metric">
              <div className="metric-label">Your lineup</div>
              <div className="num">{fmt1(sim.user.projectionBefore)} → {fmt1(sim.user.projectionAfter)}</div>
              <div className={`num gain ${sim.user.projectionGain >= 0 ? "pos" : "neg"}`}>{signed1(sim.user.projectionGain)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">{opp.teamName}</div>
              <div className="num">{fmt1(sim.opponent.projectionBefore)} → {fmt1(sim.opponent.projectionAfter)}</div>
              <div className={`num gain ${sim.opponent.projectionGain >= 0 ? "pos" : "neg"}`}>{signed1(sim.opponent.projectionGain)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Trade value</div>
              <div className="num">send {money(sim.user.tradeValueSent)} · get {money(sim.user.tradeValueReceived)}</div>
              <div className="muted">fairness {(trade.acceptance.fairnessRatio * 100).toFixed(0)}%</div>
            </div>
            <div className="metric">
              <div className="metric-label">Holes (you)</div>
              <div className="num">{sim.user.holesBefore} → {sim.user.holesAfter}</div>
              <div className="muted">depth {signed1(sim.user.depthAfter - sim.user.depthBefore)}</div>
            </div>
          </div>

          <h4>Why it works</h4>
          <div className="why">
            <div className="why-col">
              <div className="why-title">Your side</div>
              <ul>{trade.explanation.userSide.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
            <div className="why-col">
              <div className="why-title">{opp.teamName}</div>
              <ul>{trade.explanation.opponentSide.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          </div>
          <div className="why-overall">
            {trade.explanation.overall.map((l, i) => <p key={i}>{l}</p>)}
          </div>

          <h4>Score breakdown</h4>
          <div className="score-row">
            <span>User gain <b className="num">{signed1(trade.score.userGain)}</b></span>
            <span>+ weakness fix <b className="num">{trade.score.weaknessBonus.toFixed(2)}</b></span>
            <span>+ their weakness fix <b className="num">{trade.score.opponentWeaknessBonus.toFixed(2)}</b></span>
            <span>+ mutual <b className="num">{trade.score.mutualBonus.toFixed(2)}</b></span>
            <span>+ fairness <b className="num">{trade.score.fairnessBonus.toFixed(2)}</b></span>
            <span>+ depth <b className="num">{trade.score.depthBonus.toFixed(2)}</b></span>
            <span>= <b className="num">{trade.score.total.toFixed(2)}</b></span>
          </div>
          <p className="muted small">
            Trades are grouped by tier first (win/win, then mutual gain, then fair one-sided). Inside a tier, secondary bonuses are capped at {trade.score.band.toFixed(2)} points combined, so a trade that gains you more than that in starting-lineup points always ranks higher.
          </p>
          {trade.rankedAboveNextBecause ? <p className="muted small">Ranked above #{trade.rank + 1} because it {trade.rankedAboveNextBecause}.</p> : null}

          <button className="link" onClick={() => setShowLineups((v) => !v)}>
            {showLineups ? "Hide" : "Show"} before/after lineups
          </button>
          {showLineups ? (
            <div className="lineups-grid">
              <LineupTable lineup={sim.user.before} title="You · before" highlight={outgoingIds} />
              <LineupTable lineup={sim.user.after} title="You · after" highlight={incomingIds} />
              <LineupTable lineup={sim.opponent.before} title={`${opp.teamName} · before`} highlight={incomingIds} />
              <LineupTable lineup={sim.opponent.after} title={`${opp.teamName} · after`} highlight={outgoingIds} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

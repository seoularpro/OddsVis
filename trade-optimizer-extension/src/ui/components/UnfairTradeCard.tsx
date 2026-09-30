import React, { useState } from "react";
import type { UnfairTrade } from "../../optimization/unfairTrades";
import type { LeagueAnalysis } from "../../optimization/teamAnalyzer";
import { fmt1, money, signed1 } from "../format";
import { PlayerChip } from "./PlayerChip";
import { LineupTable } from "./LineupTable";

export function UnfairTradeCard({ trade, analysis, defaultOpen }: { trade: UnfairTrade; analysis: LeagueAnalysis; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? trade.rank === 1);
  const [showLineups, setShowLineups] = useState(false);
  const sim = trade.simulation;
  const opp = analysis.teams.find((t) => t.teamId === sim.candidate.partnerTeamId)!;
  const user = analysis.user!;
  const incomingIds = new Set(sim.candidate.userReceives.map((p) => p.id));
  const outgoingIds = new Set(sim.candidate.userSends.map((p) => p.id));
  const pushback = trade.acceptance.accepted
    ? "They still come out fine by the normal rules, so this one may actually go through."
    : `Expect pushback: ${trade.acceptance.rejections.join("; ")}.`;

  return (
    <article className="card trade unfair">
      <header className="trade-head" onClick={() => setOpen((v) => !v)}>
        <div className="trade-rank">#{trade.rank}</div>
        <div className="trade-summary">
          <div className="trade-title">
            Trade with <b>{opp.teamName}</b>
            <span className="tag tier tier-unfair">Unfair</span>
          </div>
          <div className="trade-gains">
            <span className="gain you">You {signed1(sim.user.projectionGain)} pts</span>
            <span className="gain value">+{money(trade.valueGain)} value</span>
            <span className={`gain ${sim.opponent.projectionGain >= 0 ? "them" : "neg"}`}>They {signed1(sim.opponent.projectionGain)}</span>
            <span className="muted">{money(sim.user.tradeValueSent)} ↔ {money(sim.user.tradeValueReceived)}</span>
          </div>
        </div>
        <div className="caret">{open ? "▾" : "▸"}</div>
      </header>

      <div className="trade-sides">
        <div>
          <div className="side-label">You send</div>
          <ul>{sim.candidate.userSends.map((p) => <li key={p.id}><PlayerChip player={p} marginal={user.playerMarginalValues[p.id] ?? 0} /></li>)}</ul>
        </div>
        <div>
          <div className="side-label">You receive</div>
          <ul>{sim.candidate.userReceives.map((p) => <li key={p.id}><PlayerChip player={p} marginal={opp.playerMarginalValues[p.id] ?? 0} /></li>)}</ul>
        </div>
      </div>

      {open ? (
        <div className="trade-detail">
          <div className="metrics">
            <div className="metric">
              <div className="metric-label">Your lineup</div>
              <div className="num">{fmt1(sim.user.projectionBefore)} → {fmt1(sim.user.projectionAfter)}</div>
              <div className="num gain pos">{signed1(sim.user.projectionGain)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Your trade value</div>
              <div className="num">{money(user.totalTradeValue)} → {money(user.totalTradeValue + trade.valueGain)}</div>
              <div className="num gain pos">+{money(trade.valueGain)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">{opp.teamName}</div>
              <div className="num">{fmt1(sim.opponent.projectionBefore)} → {fmt1(sim.opponent.projectionAfter)}</div>
              <div className={`num gain ${sim.opponent.projectionGain >= 0 ? "pos" : "neg"}`}>{signed1(sim.opponent.projectionGain)} · {money(sim.opponent.tradeValueGain)} value</div>
            </div>
            <div className="metric">
              <div className="metric-label">Rank score</div>
              <div className="num">{trade.score.toFixed(2)}</div>
              <div className="muted small">pts + $ ÷ {analysis.config.unfairValuePointsPerProjectionPoint}</div>
            </div>
          </div>

          <h4>Why it helps you</h4>
          <ul>{trade.explanation.userSide.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <h4>Their side</h4>
          <ul>{trade.explanation.opponentSide.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <p className="muted small">{pushback}</p>

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

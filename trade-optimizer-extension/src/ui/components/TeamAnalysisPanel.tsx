import React, { useState } from "react";
import type { LeagueAnalysis, TeamAnalysis } from "../../optimization/teamAnalyzer";
import { OFFENSE_POSITIONS } from "../../domain/types";
import { fmt1, money, ordinal, signed1 } from "../format";
import { PlayerChip } from "./PlayerChip";
import { LineupTable } from "./LineupTable";
import { ExpandToggle } from "./ExpandToggle";

export function TeamAnalysisPanel({ analysis, team }: { analysis: LeagueAnalysis; team: TeamAnalysis }) {
  // Collapsed, the card shows only the largest weaknesses.
  const [open, setOpen] = useState(false);
  const [showLineup, setShowLineup] = useState(false);
  // Zero-gain roster-spot fills are applied to the baseline but are not advice worth showing.
  const adviceMoves = team.waiverMoves.filter((m) => m.gain >= 0.5);
  const weaknesses = team.weaknesses.filter((w) => OFFENSE_POSITIONS.some((p) => w.eligible.includes(p)));
  const surplusAssets = team.positionalSurplus
    .flatMap((s) => s.expendable.map((e) => ({ ...e, position: s.position, level: s.level })))
    .filter((e) => OFFENSE_POSITIONS.includes(e.position) && e.player.tradeValue > 0)
    .sort((a, b) => b.player.tradeValue - a.player.tradeValue)
    .slice(0, 8);

  return (
    <section className="panel">
      <div className="panel-head clickable" onClick={() => setOpen((v) => !v)}>
        <h2>Team analysis · {team.teamName}</h2>
        <ExpandToggle open={open} more="Full analysis" />
      </div>

      {open ? (
        <div className="chips">
          <span className="chip">Optimal lineup <b>{fmt1(team.optimalStartingProjection)}</b></span>
          <span className="chip">Lineup rank <b>{ordinal(team.projectionRank)}</b></span>
          <span className="chip">Trade value <b>{money(team.totalTradeValue)}</b> ({ordinal(team.tradeValueRank)})</span>
          <span className="chip">Bench value <b>{money(team.benchTradeValue)}</b></span>
        </div>
      ) : null}

      {open && analysis.insight.length ? (
        <div className="insight">
          {analysis.insight.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : null}

      {open && adviceMoves.length ? (
        <div className="note warn">
          <b>Do this first (free):</b>{" "}
          {adviceMoves.map((m, i) => (
            <span key={i}>
              {i > 0 ? "; " : ""}add {m.add.name} ({fmt1(m.add.projection)}){m.drop ? ` and drop ${m.drop.name} (${fmt1(m.drop.projection)})` : " to an open roster spot"} for +{fmt1(m.gain)}
            </span>
          ))}
          . Trades below are measured after these moves.
        </div>
      ) : null}

      {open ? (
        <button className="text-btn" onClick={() => setShowLineup((v) => !v)}>
          {showLineup ? "Hide" : "Show"} optimal lineup
        </button>
      ) : null}
      {open && showLineup ? <LineupTable lineup={team.optimal} /> : null}

      <h3>Largest weaknesses</h3>
      <ol className="weakness-list">
        {weaknesses.slice(0, 4).map((w) => (
          <li key={w.key}>
            <div className="weakness-head">
              <b>{w.key}</b>
              {w.isHole ? <span className="tag tag-warn">roster hole</span> : null}
              <span className="muted">league rank {ordinal(w.leagueRank)} of {analysis.teams.length}</span>
            </div>
            <div className="weakness-body">
              <div>
                Current: <span className="num">{w.starter ? `${w.starter.name} · ${fmt1(w.projection)}` : "empty"}</span>
              </div>
              <div>
                Replacement level: <span className="num">{fmt1(w.replacementProjection)}</span>
                <span className="sep">·</span>League median: <span className="num">{fmt1(w.leagueMedian)}</span>
              </div>
              <div>
                Potential upgrade range: <span className="num">{signed1(w.upgradeRange.low)} to {signed1(w.upgradeRange.high)}</span>
                {w.upgradeTargets[0] ? (
                  <span className="muted"> (best realistic target: {w.upgradeTargets[0].player.name}, {fmt1(w.upgradeTargets[0].player.projection)})</span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {open ? (
        <>
      <h3>Surplus / expendable assets</h3>
      {surplusAssets.length === 0 ? (
        <p className="muted">No expendable players with trade value: every valued player is in your optimal lineup.</p>
      ) : (
        <ul className="asset-list">
          {surplusAssets.map((a) => (
            <li key={a.player.id}>
              <PlayerChip player={a.player} marginal={a.marginal} />
              <span className="muted"> {a.position} surplus: {a.level}</span>
            </li>
          ))}
        </ul>
      )}

      <h3>Positional surplus</h3>
      <div className="surplus-grid">
        {team.positionalSurplus
          .filter((s) => OFFENSE_POSITIONS.includes(s.position))
          .map((s) => (
            <div key={s.position} className={`surplus-cell level-${s.level.replace(" ", "-")}`}>
              <div className="surplus-pos">{s.position}</div>
              <div className="surplus-level">{s.level}</div>
              <div className="muted small">{fmt1(s.trappedProjection)} bench pts &gt; repl</div>
            </div>
          ))}
      </div>
        </>
      ) : null}
    </section>
  );
}

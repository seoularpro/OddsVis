import React from "react";
import type { LeagueAnalysis } from "../../optimization/teamAnalyzer";
import { OFFENSE_POSITIONS } from "../../domain/types";
import { fmt1, money } from "../format";

/**
 * League standings by optimal lineup. With `picking` (no user team chosen yet)
 * the card turns into the team picker: loud heading, every row clickable, and
 * a real button per row so it is obvious what to do next.
 */
export function LeagueTable({ analysis, onPickTeam, picking = false }: { analysis: LeagueAnalysis; onPickTeam?: (teamId: string) => void; picking?: boolean }) {
  const rows = [...analysis.teams].sort((a, b) => a.projectionRank - b.projectionRank);
  const pickable = Boolean(onPickTeam) && picking;
  return (
    <section className={`panel${pickable ? " picking" : ""}`}>
      <div className="panel-head">
        <h2>{pickable ? "Pick your team to continue" : "League overview"}</h2>
        <span className="muted small">
          {pickable ? "Click your team, or its button, in the list below." : `Replacement level: ${OFFENSE_POSITIONS.map((p) => `${p} ${fmt1(analysis.replacement.levels[p])}`).join(" · ")}`}
        </span>
      </div>
      <div className="table-wrap">
        <table className="league">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th className="right">Lineup</th>
              <th className="right">Value</th>
              <th>Holes</th>
              <th>Surplus</th>
              {onPickTeam ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.teamId}
                className={t.isUser ? "me" : pickable ? "pickable" : undefined}
                onClick={pickable ? () => onPickTeam?.(t.teamId) : undefined}
              >
                <td className="num">{t.projectionRank}</td>
                <td>
                  {t.teamName}
                  {t.isUser ? <span className="tag">you</span> : null}
                </td>
                <td className="num right">{fmt1(t.optimalStartingProjection)}</td>
                <td className="num right">{money(t.totalTradeValue)}</td>
                <td className="small">{t.holes.map((h) => h.key).join(", ") || "—"}</td>
                <td className="small">
                  {t.positionalSurplus.filter((s) => OFFENSE_POSITIONS.includes(s.position) && (s.level === "high" || s.level === "very high")).map((s) => s.position).join(", ") || "—"}
                </td>
                {onPickTeam ? (
                  <td>
                    {!t.isUser ? (
                      <button
                        type="button"
                        className={pickable ? "primary pick-btn" : "pick-btn"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPickTeam(t.teamId);
                        }}
                      >
                        {pickable ? "This is my team" : "This is me"}
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

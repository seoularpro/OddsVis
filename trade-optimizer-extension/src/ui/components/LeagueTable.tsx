import React from "react";
import type { LeagueAnalysis } from "../../optimization/teamAnalyzer";
import { OFFENSE_POSITIONS } from "../../domain/types";
import { fmt1, money } from "../format";

export function LeagueTable({ analysis, onPickTeam }: { analysis: LeagueAnalysis; onPickTeam?: (teamId: string) => void }) {
  const rows = [...analysis.teams].sort((a, b) => a.projectionRank - b.projectionRank);
  return (
    <section className="card">
      <div className="card-head">
        <h2>League overview</h2>
        <span className="muted small">
          Replacement level: {OFFENSE_POSITIONS.map((p) => `${p} ${fmt1(analysis.replacement.levels[p])}`).join(" · ")}
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
              <tr key={t.teamId} className={t.isUser ? "me" : undefined}>
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
                      <button className="link small" onClick={() => onPickTeam(t.teamId)}>
                        this is me
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

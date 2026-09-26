import React from "react";
import type { OptimalLineup } from "../../optimization/lineupOptimizer";
import { fmt1, posClass } from "../format";

export function LineupTable({ lineup, highlight, title }: { lineup: OptimalLineup; highlight?: Set<string>; title?: string }) {
  return (
    <div className="table-wrap">
      {title ? <div className="table-title">{title}</div> : null}
      <table className="lineup">
        <tbody>
          {lineup.assignments.map((a, i) => (
            <tr key={i} className={a.player && highlight?.has(a.player.id) ? "hl" : undefined}>
              <td className="slot">{a.slot.key}</td>
              <td>
                {a.player ? (
                  <span className="player">
                    <span className={posClass(a.player.position)}>{a.player.position}</span>
                    <span className="player-name">{a.player.name}</span>
                  </span>
                ) : (
                  <span className="muted">empty</span>
                )}
              </td>
              <td className="num right">{fmt1(a.projection)}</td>
            </tr>
          ))}
          <tr className="total">
            <td colSpan={2}>Total</td>
            <td className="num right">{fmt1(lineup.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

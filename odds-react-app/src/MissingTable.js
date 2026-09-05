import "./styles.css";
import React from "react";

export default function MissingTable(props) {
  const isFlex =
    props.selectedPosition === 99 || props.selectedPosition === 98;
  const count = props.missingList.length;

  return (
    <div className="MissingTable vl-card" id="awaiting-props">
      <div className="vl-card-head">
        <div>
          <h2 className="vl-card-title">Awaiting complete props</h2>
          <div className="vl-card-sub">
            These players don't have every required prop posted yet. They move
            to the main table once their odds post, and may carry injury risk.
          </div>
        </div>
        {count > 0 ? (
          <div className="vl-card-head-aside">
            <span className="vl-card-sub">{count} players</span>
          </div>
        ) : null}
      </div>
      <div className="vl-table-wrap">
        <table className="vl-table">
          <thead>
            <tr>
              {!isFlex ? (
                <>
                  <th className="vl-th-player">Player</th>
                  <th className="vl-th-player">Missing props</th>
                  <th className="vl-th-num">Median w/o props</th>
                </>
              ) : (
                <th className="vl-th-player">Player</th>
              )}
            </tr>
          </thead>
          <tbody>
            {count === 0 ? (
              <tr>
                <td
                  colSpan={isFlex ? 1 : 3}
                  style={{ textAlign: "center" }}
                >
                  <div className="vl-empty">
                    <div className="vl-empty-title">Nothing missing</div>
                    <div>Every relevant player has complete props.</div>
                  </div>
                </td>
              </tr>
            ) : isFlex ? (
              props.missingList.map((player, i) => (
                <tr key={player[0] + i}>
                  <td className="vl-td-player">
                    <span className="vl-player-name">{player[0]}</span>
                  </td>
                </tr>
              ))
            ) : (
              props.missingList.map((player, i) => (
                <tr key={player[0] + i}>
                  <td className="vl-td-player">
                    <span className="vl-player-name">{player[0]}</span>
                  </td>
                  <td className="vl-td-player">
                    {String(player[1] ?? "")
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((prop) => (
                        <span className="vl-tag" key={prop}>
                          {prop}
                        </span>
                      ))}
                  </td>
                  <td className="vl-td-num">
                    <span className="vl-num vl-secondary">{player[2]}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

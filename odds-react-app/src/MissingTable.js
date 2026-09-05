import "./styles.css";
import React, { useState, useEffect } from "react";

export default function MissingTable(props) {
  const isFlex =
    props.selectedPosition === 99 || props.selectedPosition === 98;

  return (
    <div className="MissingTable vl-card">
      <div className="vl-table-wrap">
        <table className="vl-table">
          <thead>
            <tr>
              {!isFlex ? (
                <>
                  <th className="vl-th-player">Player</th>
                  <th className="vl-th-player">Missing prop(s)</th>
                  <th>MED w/o prop(s)</th>
                </>
              ) : (
                <th className="vl-th-player">Player</th>
              )}
            </tr>
          </thead>
          <tbody>
            {props.missingList.length === 0 ? (
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
                    <span className="vl-secondary">{player[1]}</span>
                  </td>
                  <td>
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

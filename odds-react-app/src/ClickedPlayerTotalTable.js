import "./styles.css";
import React, { useState, useEffect } from "react";

// Heatmap coloring for a data cell, matching SangTable's "Cell style" modes:
//   0 = filled color, 2 = colored outline, 1 = neutral
function cellStyle(theme, color) {
  if (theme === 0) return { backgroundColor: color, color: "#0b0b0f" };
  if (theme === 2) return { boxShadow: `inset 0 0 0 1.5px ${color}` };
  return {};
}

export default function ClickedPlayerTotalTable(props) {
  const [visList, setVisList] = useState([]);

  useEffect(() => {
    setVisList(props.clickedPlayers);
  }, [props.clickedPlayers]);

  return (
    <div className="ClickedPlayerTotalTable vl-card">
      <div className="vl-card-head">
        <div>
          <h2 className="vl-card-title">Compare players</h2>
          <div className="vl-card-sub">
            Click a player's name in the table above to add or remove them.
          </div>
        </div>
        {visList.length > 0 ? (
          <div className="vl-card-head-aside">
            <span className="vl-card-sub">
              {visList.length} selected
            </span>
          </div>
        ) : null}
      </div>
      <div className="vl-table-wrap">
        <table className="vl-table">
          <thead>
            <tr>
              <th className="vl-th-player">Player</th>
              <th className="vl-th-num">Median</th>
            </tr>
          </thead>
          <tbody>
            {visList.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: "center" }}>
                  <div className="vl-empty">
                    <div className="vl-empty-title">No players selected</div>
                    <div>Build a set to total up a lineup or a trade.</div>
                  </div>
                </td>
              </tr>
            ) : (
              visList.map((player) => {
                const cs = cellStyle(props.selectedTheme, player.calculatedColor);
                return (
                  <tr key={player.playerName}>
                    <td className="vl-td-player" style={cs}>
                      <button
                        type="button"
                        className="vl-player-btn"
                        title="Remove from comparison"
                        onClick={() => props.handlePlayerClick(player)}
                      >
                        <span className="vl-player-name">{player.playerName}</span>
                        <span className="vl-check" aria-hidden="true">×</span>
                      </button>
                    </td>
                    <td className="vl-td-num" style={cs}>
                      <span className="vl-ev">{player.playerEV.toFixed(2)}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {visList.length > 0 ? (
            <tfoot>
              <tr>
                <td className="vl-td-player">Total</td>
                <td className="vl-td-num">
                  <span className="vl-ev">{props.playerTotal}</span>
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

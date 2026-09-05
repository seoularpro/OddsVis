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
      <div className="vl-table-wrap">
        <table className="vl-table">
          <thead>
            <tr>
              <th className="vl-th-player">Selected players</th>
              <th>Median</th>
            </tr>
          </thead>
          <tbody>
            {visList.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: "center" }}>
                  <div className="vl-empty">
                    <div className="vl-empty-title">No players selected</div>
                    <div>Click a player above to build a comparison set.</div>
                  </div>
                </td>
              </tr>
            ) : (
              visList.map((player) => {
                const cs = cellStyle(props.selectedTheme, player.calculatedColor);
                return (
                  <tr key={player.playerName}>
                    <td
                      className="vl-td-player"
                      style={cs}
                      onClick={() => props.handlePlayerClick(player)}
                    >
                      <span className="vl-player-name">{player.playerName}</span>
                    </td>
                    <td style={cs}>
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
                <td className="vl-td-player" style={{ fontWeight: 700 }}>
                  Total
                </td>
                <td>
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

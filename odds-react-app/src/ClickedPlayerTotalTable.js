import "./styles.css";
import React, { useState, useEffect } from "react";
import {} from "./util.js";

export default function ClickedPlayerTotalTable(props) {
  const [visList, setVisList] = useState([]);

  useEffect(() => {
    setVisList(props.clickedPlayers);
  }, [props.clickedPlayers]);
  return (
    <div className="ClickedPlayerTotalTable">
      <table style={{}}>
        <tr>
          <th
            style={{
              width: "200px",
            }}
          >
            Selected Players
          </th>
          <th
            style={{
              width: "46px",
            }}
          >
            EV
          </th>
        </tr>
        {visList.map((player) => (
          <tr>
            <td
              style={
                props.selectedTheme == 0
                  ? {
                      backgroundColor: player.calculatedColor,
                      color:
                        player.percentile > 77 && player.percentile < 82
                          ? "lightgrey"
                          : "white",
                      border: "1px solid " + player.calculatedColor,
                      borderRadius: "10px",
                      whiteSpace: "nowrap",
                      textAlign: "left",
                    }
                  : {
                      backgroundColor: "white",
                      color: "black",
                      border: "1px solid  silver", // + x.calculatedColor,
                      //   borderRadius: "10px",
                      whiteSpace: "nowrap",
                      textAlign: "left",
                    }
              }
            >
              <div
                style={{
                  marginLeft: "5px",
                }}
              >
                {player.playerName}
              </div>
            </td>
            <td
              style={
                props.selectedTheme == 0
                  ? {
                      backgroundColor: player.calculatedColor,
                      color:
                        player.percentile > 77 && player.percentile < 82
                          ? "lightgrey"
                          : "white",
                      border: "1px solid " + player.calculatedColor,
                      borderRadius: "10px",
                      width: "46px",
                    }
                  : {
                      backgroundColor: "white",
                      color: "black",
                      border: "1px solid silver", // + x.calculatedColor,
                      width: "46px",
                      //   borderRadius: "10px",
                    }
              }
            >
              {<div>{player.playerEV.toFixed(2)}</div>}
            </td>
          </tr>
        ))}
        <tr>
          <td>Total</td>
          <td>{props.playerTotal}</td>
        </tr>
      </table>
      {/* <div className="clicked-player-sum">150</div> */}
    </div>
  );
}

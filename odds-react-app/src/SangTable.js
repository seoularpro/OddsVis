import "./styles.css";
import React, { useState, useEffect } from "react";
import {
  calculateMeanAllGames,
  calculateMeanAndStdDev,
  calculateMeanRecentGames,
  calculatePercentile,
  getQueryStringValue,
  rainbow,
} from "./util.js";
import ClickedPlayerTotalTable from "./ClickedPlayerTotalTable";

window.mobileCheck = function () {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};

function calculateTotalEV(players) {
  const totalEV = players.reduce((accumulator, currentPlayer) => {
    return accumulator + currentPlayer.playerEV;
  }, 0);

  return totalEV;
}

// Position badge metadata (used when a single position is selected).
const POS_META = {
  0: { label: "QB", cls: "vl-pos-qb" },
  1: { label: "RB", cls: "vl-pos-rb" },
  2: { label: "WR", cls: "vl-pos-wr" },
  3: { label: "TE", cls: "vl-pos-te" },
};

// Heatmap coloring for a data cell, driven by the selected "Cell style" mode:
//   0 = filled color, 2 = colored outline, 1 = neutral (silver/default)
function cellStyle(theme, color) {
  if (theme === 0) return { backgroundColor: color, color: "#0b0b0f" };
  if (theme === 2) return { boxShadow: `inset 0 0 0 1.5px ${color}` };
  return {};
}

export default function SangTable(props) {
  const [visList, setVisList] = useState([]);
  const [clickedList, setClickedList] = useState([]);

  const handleBovadaClick = () => {
    window.open("https://record.revenuenetwork.com/_Z5boJsEUQbn97H-d5Ks7MGNd7ZgqdRLk/1/", "_blank", "noopener,noreferrer");
  }

  const handleLicenseFrameClick = () => {
    window.open("https://amzn.to/3NMJPV2");

  }

  const handlePlayerClick = (player) => {
    let newList = clickedList.slice();
    if (!clickedList.find((c) => c.playerName == player.playerName)) {
      newList.push(player);
    } else {
      let index = -1;
      for (let i = 0; i < newList.length; i++) {
        if (newList[i].playerName === player.playerName) {
          index = i; // Return the index if the property value matches
        }
      }
      newList.splice(index, 1);
    }
    setClickedList(newList);
  };

  const mapNewVisList = (list, espnPlayerMap, recentMap, allMap) => {
    let meanAndStdDev;
    meanAndStdDev = calculateMeanAndStdDev(list);

    let mean = meanAndStdDev.meanValue;
    let stdDev = meanAndStdDev.stddevValue;


    setVisList(
      list.map((d) => {

        let percentile = calculatePercentile(mean, stdDev, d[1].ev) * 100;
        return {
          playerName: d[0],
          playerEV: d[1].ev,
          playerChange: d[1].change,
          calculatedColor: rainbow(100 - percentile),
          recentProjections: calculateMeanRecentGames(allMap, d[0], d[1]),
          allProjections: calculateMeanAllGames(allMap, d[0], d[1]),
          espnValues: espnPlayerMap.get(d[0]),
          percentile: percentile,
        };
      })
    );
  };
  useEffect(() => {
    mapNewVisList(props.evList, props.espnPlayerMap, props.recentMap, props.allMap);
  }, [props.evList, props.allMap]);

  const showSeasonMean = props.selectedProvider == 0;
  const showEspn = props.selectedProvider == 0 && props.mode == 0;
  let colCount = 4; // rank, player, median, delta
  if (showSeasonMean) colCount += 1;
  if (showEspn) colCount += 2;

  const posMeta = POS_META[props.selectedPosition];

  return (
    <div className="SangTable">
      <div className="vl-card">
        <div className="vl-table-wrap">
          <table className="vl-table">
            <thead>
              <tr>
                <th className="vl-th-rank">#</th>
                <th className="vl-th-player">Player</th>
                <th>Median</th>
                <th className="invis-mobile-header">Δ</th>
                {showSeasonMean ? <th>Season Mean</th> : null}
                {showEspn ? (
                  <>
                    <th className="invis-mobile-header">ESPN Act</th>
                    <th className="invis-mobile-header">ESPN Proj</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visList.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{ textAlign: "center" }}>
                    <div className="vl-empty">
                      <div className="vl-empty-title">Loading projections…</div>
                      <div>
                        Pulling the latest player props for Week{" "}
                        {props.selectedWeek}.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                visList.map((x, ix) => {
                  const cs = cellStyle(props.selectedTheme, x.calculatedColor);
                  const pctChange =
                    x.playerChange && x.playerEV
                      ? (x.playerChange / x.playerEV) * 100
                      : 0;
                  return (
                    <tr key={x.playerName}>
                      <td className="vl-td-rank">
                        <span
                          className="vl-rank"
                          style={{ backgroundColor: x.calculatedColor }}
                        >
                          {ix + 1}
                        </span>
                      </td>
                      <td
                        className="vl-td-player"
                        style={cs}
                        onClick={() => handlePlayerClick(x)}
                      >
                        <div className="vl-player">
                          {posMeta ? (
                            <span className={`vl-pos ${posMeta.cls}`}>
                              {posMeta.label}
                            </span>
                          ) : null}
                          <span className="vl-player-name">{x.playerName}</span>
                        </div>
                      </td>
                      <td style={cs}>
                        <span className="vl-ev">{x.playerEV.toFixed(2)}</span>
                      </td>
                      <td className="invis-mobile">
                        {x.playerChange ? (
                          <span
                            className={`vl-delta ${
                              x.playerChange > 0
                                ? "vl-delta-up"
                                : "vl-delta-down"
                            }`}
                          >
                            {x.playerChange > 0 ? "▲" : "▼"}{" "}
                            {Math.abs(pctChange).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="vl-delta vl-delta-flat">—</span>
                        )}
                      </td>
                      {showSeasonMean ? (
                        <td style={cs}>
                          <span className="vl-num vl-secondary">
                            {x.allProjections
                              ? Math.round(x.allProjections * 100) / 100
                              : "—"}
                          </span>
                        </td>
                      ) : null}
                      {showEspn ? (
                        <>
                          <td className="invis-mobile" style={cs}>
                            <span className="vl-num vl-secondary">
                              {x.espnValues?.act ?? "—"}
                            </span>
                          </td>
                          <td className="invis-mobile" style={cs}>
                            <span className="vl-num vl-secondary">
                              {x.espnValues?.proj ?? "—"}
                            </span>
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="vl-meta">
          <div>
            <div className="vl-meta-title">Update schedule (ET)</div>
            <div className="vl-meta-grid">
              <span>Sun — 8am, 12pm, 12am</span>
              <span>Mon — 12pm, 6pm, 12am</span>
              <span>Tue — 12pm, 12am</span>
              <span>Wed — 12pm, 12am</span>
              <span>Thu — 12pm, 6pm, 12am</span>
              <span>Fri — 12pm, 12am</span>
              <span>Sat — 12pm, 12am</span>
            </div>
          </div>
        </div>
      </div>

      <div className="vl-note" style={{ marginTop: "16px" }}>
        <span className="vl-note-icon">↗</span>
        <span>
          Disagree with a projection? Place a wager at the crypto sportsbook that
          provides this data through my affiliate link.
          <button
            className="vl-btn vl-btn-ghost"
            style={{ marginLeft: "12px", height: "30px", padding: "0 12px" }}
            onClick={handleBovadaClick}
          >
            Sportsbook
          </button>
        </span>
      </div>

      <div className="vl-section-label">Player selector</div>
      <div className="vl-card-sub" style={{ marginBottom: "8px" }}>
        Click a player's name in the table above to add or remove them here.
      </div>

      <ClickedPlayerTotalTable
        clickedPlayers={clickedList}
        selectedTheme={props.selectedTheme}
        playerTotal={calculateTotalEV(clickedList).toFixed(2)}
        handlePlayerClick={handlePlayerClick}
      />
    </div>
  );
}

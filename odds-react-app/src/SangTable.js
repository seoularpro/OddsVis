import "./styles.css";
import React, { useState, useEffect } from "react";
import {
  calculateMeanAllGames,
  calculateMeanAndStdDev,
  calculateMeanRecentGames,
  calculatePercentile,
  getQueryStringValue,
  rainbow,
  withAlpha,
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
//   0 = filled color, 3 = translucent fill, 4 = glass, 5 = glossy full color,
//   2 = colored outline, 1 = neutral (silver/default)
function cellStyle(theme, color) {
  if (theme === 0)
    return {
      backgroundColor: color,
      color: "var(--cell-fg, #0b0b0f)",
      borderRadius: "8px",
    };
  if (theme === 3)
    return {
      backgroundColor: withAlpha(color, 0.4),
      color: "var(--cell-fg)",
      borderRadius: "8px",
    };
  if (theme === 4)
    return {
      backgroundColor: withAlpha(color, 0.2),
      color: "var(--cell-fg)",
      borderRadius: "8px",
      // No backdrop-filter: a per-cell blur costs one compositing layer per
      // cell and made scrolling lag. Fill + tinted border + highlight is enough.
      boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.5)}, inset 0 1px 0 rgba(255,255,255,0.22)`,
    };
  if (theme === 5)
    return {
      backgroundColor: color,
      // glossy sheen over the opaque heatmap color: bright top, faint dark base
      backgroundImage:
        "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.06) 55%, rgba(0,0,0,0.14) 100%)",
      color: "var(--cell-fg, #0b0b0f)",
      borderRadius: "8px",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.16)",
    };
  if (theme === 2) return { boxShadow: `inset 0 0 0 1.5px ${color}` };
  return {};
}

// Table-level class per cell style. 3 and 4 reuse the filled-pill layout
// and pick up their text color from the table (see styles.css).
function tableClassFor(theme) {
  if (theme === 0) return " vl-table-filled";
  if (theme === 3) return " vl-table-filled vl-table-soft";
  if (theme === 4) return " vl-table-filled vl-table-glass";
  if (theme === 5) return " vl-table-filled vl-table-glass vl-table-glass-solid";
  return "";
}

// Readable text color for a filled heatmap cell. Dark text across the bright
// middle of the ramp (amber -> yellow -> green -> cyan -> light blue, i.e. a
// high green channel); white on the saturated red/orange top and the deep
// blue/purple bottom. The g>=186 cutoff puts Matthew Stafford (255,195,0) and
// Daniel Jones (0,186,255) on the dark side.
function textColorFor(rgb) {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(rgb || "");
  if (!m) return "#ffffff";
  const g = +m[2];
  const inBand = g >= 186;
  return inBand ? "#0b0b0f" : "#ffffff";
}

export default function SangTable(props) {
  const [visList, setVisList] = useState([]);
  const [clickedList, setClickedList] = useState([]);

  const handleBovadaClick = () => {
    window.open("https://sportsbook.draftkings.com/r/sb/seoular/US-VA-SB", "_blank", "noopener,noreferrer");
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
          playerPos: d[1].pos,
          adjustedProps: d[1].adjustedProps || [],
          stale: !!d[1].stale,
          missingLatest: d[1].missingLatest || [],
          lastSeen: d[1].lastSeen || {},
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

  // Season Mean, ESPN Act, and ESPN Proj are temporarily disabled. To
  // restore them, swap the flags back to their original conditions:
  //   showSeasonMean = props.selectedProvider == 0
  //   showEspn = props.selectedProvider == 0 && props.mode == 0
  // Δ is the change in projection between the first and latest odds file of
  // the week.
  const showDelta = true;
  const showSeasonMean = false;
  const showEspn = false;
  let colCount = 3; // rank, player, median
  if (showDelta) colCount += 1;
  if (showSeasonMean) colCount += 1;
  if (showEspn) colCount += 2;

  // Single-position views (QB/RB/WR/TE) label from the filter; FLEX/SUPERFLEX
  // fall back to each player's own position.
  const filterPosMeta = POS_META[props.selectedPosition];

  // Relative-magnitude bar: full width for the top projection, anchored at
  // half the lowest projection so tightly clustered position groups (e.g. QB)
  // still show separation without the bottom of the list collapsing to zero.
  const maxEV = visList.reduce((m, x) => Math.max(m, x.playerEV), 0);
  const minEV = visList.reduce((m, x) => Math.min(m, x.playerEV), Infinity);
  const barFloor = minEV === Infinity ? 0 : minEV * 0.5;
  const barWidth = (ev) =>
    maxEV > barFloor
      ? Math.max(3, ((ev - barFloor) / (maxEV - barFloor)) * 100)
      : 0;
  const isSelected = (name) =>
    clickedList.some((c) => c.playerName === name);
  // "Recs (last posted in snapshot 9 of 14)" for each prop a stale player is
  // missing from the latest odds; the count is omitted when unknown.
  const staleTitle = (x) => {
    const total =
      Number.isInteger(props.lastIndex) && props.lastIndex >= 0
        ? props.lastIndex + 1
        : null;
    const parts = x.missingLatest.map((label) => {
      const idx = x.lastSeen[label];
      if (idx === undefined) return label;
      return `${label} (last posted in snapshot ${idx + 1}${
        total ? ` of ${total}` : ""
      })`;
    });
    return `Missing from the latest odds: ${parts.join(", ")}`;
  };
  const ctx = props.context || {};

  return (
    <div className="SangTable">
      <div className="vl-card">
        <div className="vl-card-head">
          <div>
            <h2 className="vl-card-title">
              {ctx.position ? `${ctx.position} · ` : ""}Week {props.selectedWeek}
            </h2>
            <div className="vl-card-sub">
              {ctx.year ? <>{ctx.year} season<span className="vl-sep">·</span></> : null}
              {ctx.scoring ? <>{ctx.scoring}<span className="vl-sep">·</span></> : null}
              {ctx.provider ? <>{ctx.provider} odds<span className="vl-sep">·</span></> : null}
              {visList.length > 0 ? `${visList.length} players` : "Loading"}
            </div>
          </div>
          {props.missingCount > 0 ? (
            <div className="vl-card-head-aside">
              <a className="vl-link" href="#awaiting-props">
                {props.missingCount} awaiting props ↓
              </a>
            </div>
          ) : null}
        </div>
        <div className="vl-table-wrap">
          <table
            className={
              "vl-table" +
              tableClassFor(props.selectedTheme) +
              (props.selectedTheme !== 1 ? " vl-cells-styled" : "")
            }
          >
            <thead>
              <tr>
                <th className="vl-th-rank">#</th>
                <th className="vl-th-player">Player</th>
                <th className="vl-th-num">Median</th>
                {showDelta ? (
                  <th
                    className="invis-mobile-header"
                    title="Change since the first odds of the week"
                  >
                    Δ
                  </th>
                ) : null}
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
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skel-${i}`} aria-hidden="true">
                    <td className="vl-td-rank">
                      <span className="vl-skel vl-skel-rank" />
                    </td>
                    <td className="vl-td-player">
                      <span
                        className="vl-skel"
                        style={{ width: `${120 + ((i * 37) % 90)}px` }}
                      />
                    </td>
                    <td className="vl-td-num" colSpan={colCount - 2}>
                      <span className="vl-skel vl-skel-num" />
                    </td>
                  </tr>
                ))
              ) : (
                visList.map((x, ix) => {
                  const cs = cellStyle(props.selectedTheme, x.calculatedColor);
                  const posMeta = filterPosMeta || POS_META[x.playerPos];
                  const fg = textColorFor(x.calculatedColor);
                  const selected = isSelected(x.playerName);
                  // Δ is in fantasy points; the % is relative to the
                  // week-opening projection the delta was measured from.
                  const firstEV = x.playerEV - (x.playerChange || 0);
                  const pctChange =
                    x.playerChange && firstEV > 0
                      ? (x.playerChange / firstEV) * 100
                      : 0;
                  const rowClass =
                    [selected ? "vl-row-selected" : "", x.stale ? "vl-row-stale" : ""]
                      .filter(Boolean)
                      .join(" ") || undefined;
                  return (
                    <tr
                      key={x.playerName}
                      className={rowClass}
                      style={
                        props.selectedTheme === 0 || props.selectedTheme === 5
                          ? { "--cell-fg": fg }
                          : undefined
                      }
                    >
                      <td className="vl-td-rank" style={cs}>
                        <span
                          className="vl-rank"
                          style={
                            props.selectedTheme === 1
                              ? { backgroundColor: x.calculatedColor, color: fg }
                              : {
                                  background: "transparent",
                                  color: "inherit",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "100%",
                                  height: "100%",
                                  minWidth: 0,
                                  padding: 0,
                                }
                          }
                        >
                          {ix + 1}
                        </span>
                      </td>
                      <td className="vl-td-player" style={cs}>
                        <button
                          type="button"
                          className="vl-player-btn"
                          aria-pressed={selected}
                          title={
                            selected
                              ? "Remove from comparison"
                              : "Add to comparison"
                          }
                          onClick={() => handlePlayerClick(x)}
                        >
                          {posMeta ? (
                            <span className={`vl-pos ${posMeta.cls}`}>
                              {posMeta.label}
                            </span>
                          ) : null}
                          <span className="vl-player-name">{x.playerName}</span>
                          {x.stale ? (
                            <span
                              className="vl-stale"
                              title={staleTitle(x)}
                              aria-label="Missing from the latest odds"
                            >
                              !
                            </span>
                          ) : null}
                          {x.adjustedProps && x.adjustedProps.length ? (
                            <span
                              className="vl-adj"
                              title={`Odds-weighted line: ${x.adjustedProps.join(
                                ", "
                              )}`}
                              aria-label="Odds-weighted yardage line"
                            >
                              †
                            </span>
                          ) : null}
                          {selected ? (
                            <span className="vl-check" aria-hidden="true">
                              ✓
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <td className="vl-td-num" style={cs}>
                        <span className="vl-proj">
                          <span className="vl-bar" aria-hidden="true">
                            <i
                              style={{ width: `${barWidth(x.playerEV)}%` }}
                            />
                          </span>
                          <span className="vl-ev">{x.playerEV.toFixed(2)}</span>
                        </span>
                      </td>
                      {showDelta ? (
                      <td className="invis-mobile" style={cs}>
                        {x.playerChange && Math.abs(x.playerChange) >= 0.005 ? (
                          <span
                            className={`vl-delta ${
                              x.playerChange > 0
                                ? "vl-delta-up"
                                : "vl-delta-down"
                            }`}
                            title={`${x.playerChange > 0 ? "+" : "−"}${Math.abs(
                              pctChange
                            ).toFixed(1)}% vs. first odds of the week`}
                          >
                            {x.playerChange > 0 ? "▲" : "▼"}{" "}
                            {Math.abs(x.playerChange).toFixed(2)}
                          </span>
                        ) : (
                          <span className="vl-delta vl-delta-flat">—</span>
                        )}
                      </td>
                      ) : null}
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
          <span className="vl-meta-title">Updates (ET)</span>
          <span className="vl-sched"><b>Sun</b>8a · 12p · 12a</span>
          <span className="vl-sched"><b>Mon</b>12p · 6p · 12a</span>
          <span className="vl-sched"><b>Tue</b>12p · 12a</span>
          <span className="vl-sched"><b>Wed</b>12p · 12a</span>
          <span className="vl-sched"><b>Thu</b>12p · 6p · 12a</span>
          <span className="vl-sched"><b>Fri</b>12p · 12a</span>
          <span className="vl-sched"><b>Sat</b>12p · 12a</span>
        </div>
        {visList.some((x) => x.stale) ? (
          <div className="vl-footnote">
            <span className="vl-stale" aria-hidden="true">
              !
            </span>
            <span>
              No longer has every required prop. This player had a complete
              set of props earlier in the week, but the latest odds are
              missing some of them; the projection uses the last posted value
              for those. Hover the marker to see which.
            </span>
          </div>
        ) : null}
        {visList.some((x) => x.adjustedProps && x.adjustedProps.length) ? (
          <div className="vl-footnote">
            <span className="vl-adj" aria-hidden="true">
              †
            </span>
            <span>
              Odds-weighted yardage line. The book priced this player's over
              well away from even money, so the posted line isn't his median;
              the projection uses the median implied by the odds instead.
              Hover the marker to see which prop.
            </span>
          </div>
        ) : null}
      </div>

      <div className="vl-note vl-section">
        <span className="vl-note-icon">↗</span>
        <span className="vl-note-body">
          Disagree with a projection? Back your read at a sportsbook using my
          referral link.
        </span>
        <button
          className="vl-btn vl-btn-ghost vl-btn-sm vl-note-action"
          onClick={handleBovadaClick}
        >
          Open sportsbook
        </button>
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

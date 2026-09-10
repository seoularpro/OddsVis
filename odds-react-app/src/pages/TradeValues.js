import "../styles.css";
import React, { useEffect, useState } from "react";
import ThemeToggleDropdown from "../ThemeToggleDropdown";
import {
  computeBPProjectionsByPosition,
  normalizePlayerName,
} from "../bpProjections";
import {
  calculateMeanAndStdDev,
  calculatePercentile,
  rainbow,
  textColorFor,
} from "../util";
import {
  fetchTradeValues,
  fetchTradeValueSet,
  LEAGUE_SIZES,
  PUBLISHED_SHEET_URL,
} from "../tradeValuesSheet";

// Same defaults as the Projections page, so the number beside each player is
// the one shown there on first load.
const WEEK = 1;
const SEASON = 2026;

// The toolbar's scoring and league size pick which published trade value set
// is shown (see tradeValueFileFor); the baseline sheet is Half PPR, 10-team.
// The same league size also sets the startable players per team at each
// position (QB, TE, and two RB / two WR, with a flex split between RB and
// WR), which sizes the pool a projection's color is ranked against.
const DEFAULT_LEAGUE_SIZE = 10;
const STARTERS_PER_TEAM = { 0: 1, 1: 2.5, 2: 2.5, 3: 1 };

const POS_CLASS = { 0: "vl-pos-qb", 1: "vl-pos-rb", 2: "vl-pos-wr", 3: "vl-pos-te" };
const SCORING_LABELS = { 0: "Half PPR", 1: "Standard", 2: "Full PPR" };

// 1 -> "1st", 22 -> "22nd", 43 -> "43rd", 11 -> "11th".
function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

// Percentile heat ramp, top of the position group on the left.
const HEAT_GRADIENT = `linear-gradient(90deg, ${[0, 20, 40, 60, 80, 100]
  .map((p) => rainbow(p))
  .join(", ")})`;

// Build normalized name -> { ev, color } for every position. Each player is
// colored by percentile within their position, the same mean/std-dev ramp
// the Projections page uses, but measured against the startable pool for the
// league size (e.g. the top 12 QBs or top 30 RBs in a 12-team league) so the
// colors reflect who actually matters in that league. Players outside the
// pool are ranked against the same pool stats and fall toward the bottom.
function projectionLookup(byPosition, leagueSize) {
  const lookup = new Map();
  byPosition.forEach(({ finalList }, pos) => {
    if (!finalList.length) return;
    const poolSize = Math.max(
      2,
      Math.round(leagueSize * (STARTERS_PER_TEAM[pos] || 1))
    );
    // finalList is sorted by projection, highest first.
    const pool = finalList.slice(0, poolSize);
    const { meanValue, stddevValue } = calculateMeanAndStdDev(pool);
    finalList.forEach(([name, { ev }]) => {
      const percentile = stddevValue
        ? calculatePercentile(meanValue, stddevValue, ev) * 100
        : 50;
      lookup.set(normalizePlayerName(name), {
        ev,
        percentile,
        poolSize,
        color: rainbow(100 - percentile),
      });
    });
  });
  return lookup;
}

export default function TradeValues() {
  const [sheet, setSheet] = useState({ rows: [], headerIdx: -1, columns: [] });
  const [sheetLoading, setSheetLoading] = useState(true);
  const [sheetError, setSheetError] = useState(null);
  // true when the published set for the dropdowns could not be loaded and the
  // page fell back to the baseline Google Sheet
  const [showingBaseline, setShowingBaseline] = useState(false);

  const [projections, setProjections] = useState(new Map());
  const [projectionsLoading, setProjectionsLoading] = useState(true);

  const [scoringMode, setScoringMode] = useState(0);
  const [leagueSize, setLeagueSize] = useState(DEFAULT_LEAGUE_SIZE);
  const week = WEEK;

  useEffect(() => {
    document.title = "Trade Values";
  }, []);

  // Load the published set for the selected scoring and league size; if it
  // is unavailable, fall back to the baseline Google Sheet so the page still
  // shows something.
  useEffect(() => {
    let cancelled = false;
    setSheetLoading(true);
    fetchTradeValueSet(scoringMode, leagueSize)
      .then((parsed) => {
        if (cancelled) return;
        setSheet(parsed);
        setSheetError(null);
        setShowingBaseline(false);
      })
      .catch(async (err) => {
        console.error("Failed to load the published trade value set", err);
        try {
          const parsed = await fetchTradeValues();
          if (cancelled) return;
          setSheet(parsed);
          setSheetError(null);
          setShowingBaseline(true);
        } catch (err2) {
          console.error("Failed to load trade values sheet", err2);
          if (!cancelled) setSheetError("Couldn't load the trade values.");
        }
      })
      .finally(() => {
        if (!cancelled) setSheetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scoringMode, leagueSize]);

  useEffect(() => {
    let cancelled = false;
    setProjectionsLoading(true);
    computeBPProjectionsByPosition({ mode: scoringMode, week, year: SEASON })
      .then(({ byPosition }) => {
        if (!cancelled) setProjections(projectionLookup(byPosition, leagueSize));
      })
      .catch((err) => {
        console.error("Failed to load projections", err);
        if (!cancelled) setProjections(new Map());
      })
      .finally(() => {
        if (!cancelled) setProjectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scoringMode, leagueSize]);

  const { rows, headerIdx, columns } = sheet;
  const colCount = Math.max(columns.length, 1);
  const dataRows = rows.slice(headerIdx + 1);
  const playerCount = dataRows.reduce(
    (n, row) => n + columns.filter((c, i) => c.kind === "name" && row[i]).length,
    0
  );

  // The small heat chip beside a player name.
  const chipFor = (name, posLabel) => {
    if (projectionsLoading) {
      return <span className="vl-skel vl-tv-chip-skel" aria-label="Loading" />;
    }
    const proj = projections.get(normalizePlayerName(name));
    if (!proj) {
      return (
        <span
          className="vl-tv-chip vl-tv-chip-none"
          title="No projection this week (props not posted yet)"
        >
          —
        </span>
      );
    }
    return (
      <span
        className="vl-tv-chip"
        style={{ backgroundColor: proj.color, color: textColorFor(proj.color) }}
        title={`Week ${week} median ${proj.ev.toFixed(2)} · ${ordinal(
          Math.round(proj.percentile)
        )} percentile vs. the top ${proj.poolSize} ${posLabel || ""}s for a ${leagueSize}-team league`}
      >
        {proj.ev.toFixed(1)}
      </span>
    );
  };

  // The header row shows each position's badge (from the sheet's label row
  // above it) in place of the repeated "Player Name" cells.
  const renderHeaderRow = (row) => (
    <tr key="header" className="vl-tv-row-header">
      {row.map((cell, c) => {
        const col = columns[c] || {};
        return (
          <th key={c} scope="col" className={`vl-tv-col-${col.kind || "other"}`}>
            {col.kind === "name" && col.posLabel ? (
              <span className={`vl-pos ${POS_CLASS[col.pos] || ""}`}>{col.posLabel}</span>
            ) : col.kind === "name" ? null : (
              cell
            )}
          </th>
        );
      })}
    </tr>
  );

  const renderDataRow = (row, r) => {
    const blank = row.every((cell) => cell === "");
    return (
      <tr key={`row-${r}`} className={blank ? "vl-tv-row-blank" : undefined}>
        {row.map((cell, c) => {
          const col = columns[c] || {};
          if (col.kind === "value") {
            return (
              <td key={c} className="vl-tv-col-value">
                <span className="vl-num vl-tv-value">{cell}</span>
              </td>
            );
          }
          if (col.kind === "name") {
            return (
              <td key={c} className="vl-tv-col-name">
                {cell ? (
                  <span className="vl-tv-player">
                    <span className="vl-tv-name" title={cell}>{cell}</span>
                    {chipFor(cell, col.posLabel)}
                  </span>
                ) : null}
              </td>
            );
          }
          return (
            <td key={c} className={`vl-tv-col-${col.kind || "other"}`}>
              {cell ? <span className="vl-num vl-secondary">{cell}</span> : null}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div>
      <div className="vl-page">
        <div className="vl-page-head">
          <div>
            <h1 className="vl-title">Trade Values</h1>
            <p className="vl-subtitle">
              Rest-of-season trade values with this week's median projection
              beside each player.
            </p>
          </div>
        </div>

        <div className="vl-panel-grid vl-tv-intro">
          <div className="vl-panel">
            <div className="vl-panel-title">$200 auction budget</div>
            <p className="vl-panel-msg">
              Values are based on a $200 auction draft budget, so every player's
              value is a proportional share of the same budget.
            </p>
          </div>
          <div className="vl-panel">
            <div className="vl-panel-title">Combining values</div>
            <p className="vl-panel-msg">
              You can combine values to find a fair trade, assuming your waiver
              wire is worthless. For example, Jahmyr Gibbs at $70 would be worth two
              $35 players.
            </p>
          </div>
          <div className="vl-panel">
            <div className="vl-panel-title">
              Projection color
              <span
                className="vl-tv-intro-swatch"
                style={{ background: HEAT_GRADIENT }}
                aria-hidden="true"
              />
            </div>
            <p className="vl-panel-msg">
              The colored box beside each player represents their median projection for
              the week. Its color shows how that score ranks relative to the
              startable players at the same position for your league size: red
              is the top of the position, purple the bottom.
            </p>
          </div>
        </div>

        <div className="vl-toolbar" role="group" aria-label="Projection settings">
          <div className="vl-toolbar-group">
            <div className="vl-field">
              <label className="vl-label" htmlFor="tvScoring">Scoring</label>
              <select
                id="tvScoring"
                className="vl-select"
                value={scoringMode}
                onChange={(e) => setScoringMode(parseInt(e.target.value, 10))}
              >
                <option value="0">Half PPR</option>
                <option value="1">Standard</option>
                <option value="2">Full PPR</option>
              </select>
            </div>
            <div className="vl-field">
              <label className="vl-label" htmlFor="tvLeagueSize">League size</label>
              <select
                id="tvLeagueSize"
                className="vl-select"
                value={leagueSize}
                onChange={(e) => setLeagueSize(parseInt(e.target.value, 10))}
              >
                {LEAGUE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} teams
                  </option>
                ))}
              </select>
            </div>
            <div className="vl-field">
              <label className="vl-label" htmlFor="tvTheme">Theme</label>
              <ThemeToggleDropdown id="tvTheme" />
            </div>
          </div>
        </div>

        {sheetError ? (
          <div className="vl-note vl-note-error" role="alert">
            <span className="vl-note-icon" aria-hidden="true">!</span>
            <div className="vl-note-body">
              <b>{sheetError}</b> Refresh to try again, or{" "}
              <a className="vl-link" href={PUBLISHED_SHEET_URL} target="_blank" rel="noreferrer">
                open the sheet directly
              </a>
              .
            </div>
          </div>
        ) : null}

        <div className="vl-card">
          <div className="vl-card-head">
            <div>
              {/* <h2 className="vl-card-title">Trade Values</h2> */}
              <div className="vl-card-sub">
                {SEASON} season<span className="vl-sep">·</span>
                {SCORING_LABELS[scoringMode]}<span className="vl-sep">·</span>
                {leagueSize}-team<span className="vl-sep">·</span>
                {sheetLoading ? "Loading" : `${playerCount} players`}
                {showingBaseline ? (
                  <>
                    <span className="vl-sep">·</span>
                    <span title="The published set for this scoring and league size could not be loaded">
                      showing the Half PPR 10-team baseline
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="vl-card-head-aside">
              <a className="vl-link" href={PUBLISHED_SHEET_URL} target="_blank" rel="noreferrer">
                Open baseline sheet ↗
              </a>
            </div>
          </div>

          <div className="vl-table-wrap vl-table-wrap--scroll">
            <table className="vl-tv-grid">
              <tbody>
                {sheetLoading ? (
                  Array.from({ length: 14 }).map((_, i) => (
                    <tr key={`skel-${i}`} aria-hidden="true">
                      <td className="vl-tv-col-value">
                        <span className="vl-skel vl-skel-rank" />
                      </td>
                      <td colSpan={7}>
                        <span
                          className="vl-skel"
                          style={{ width: `${140 + ((i * 53) % 160)}px` }}
                        />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={colCount}>
                      <div className="vl-empty">
                        <div className="vl-empty-title">Nothing to show</div>
                        The sheet came back empty.
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, r) =>
                    r < headerIdx
                      ? null // the sheet's label row is folded into the header
                      : r === headerIdx
                        ? renderHeaderRow(row)
                        : renderDataRow(row, r)
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="vl-tv-legend" aria-hidden="true">
            <span className="vl-tv-legend-label">Top of position</span>
            <span className="vl-tv-legend-bar" style={{ background: HEAT_GRADIENT }} />
            <span className="vl-tv-legend-label">Bottom</span>
          </div>
        </div>

        <p className="vl-footnote">
          Projections are the same weekly medians as the Projections page, and
          a box's color is that player's percentile rank within their position,
          so a red RB is a top RB regardless of trade value. A dash means no
          props were posted for that player yet this week.
        </p>
      </div>
    </div>
  );
}

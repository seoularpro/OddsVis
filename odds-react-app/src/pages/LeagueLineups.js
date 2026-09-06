import "../styles.css";
import React, { useEffect, useState } from "react";
import ThemeToggleDropdown from "../ThemeToggleDropdown";
import { CURRENT_SEASON } from "../constants";
import { EspnApiError, fetchEspnLeagueLineups } from "../espn/espnClient";
import { fetchSleeperLeagueLineups } from "../sleeper/sleeperClient";
import { computeBPProjections, normalizePlayerName } from "../bpProjections";

// CSS class for the existing position badge palette (QB/RB/WR/TE/K/D/ST).
const positionBadgeClass = (position) =>
  position ? `vl-pos vl-pos-${position.toLowerCase().replace(/[^a-z]/g, "")}` : "vl-pos";

// Only the positions this app projects are shown; kickers, defenses, and any
// IDP slots are left out of the lineup view.
const SHOWN_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);
const isShownStarter = (s) => s.position === undefined || SHOWN_POSITIONS.has(s.position);

// Supported providers and the single identifier each one needs. Yahoo is not
// listed: its API is OAuth-only (see sleeper/espn clients for the others).
const PROVIDERS = {
  espn: {
    label: "ESPN",
    idLabel: "ESPN League ID",
    placeholder: "e.g. 48347143",
    cta: "Import ESPN Lineups",
    fetch: ({ leagueId, credentials }) =>
      fetchEspnLeagueLineups({ leagueId, season: CURRENT_SEASON, credentials }),
  },
  sleeper: {
    label: "Sleeper",
    idLabel: "Sleeper League ID",
    placeholder: "e.g. 1312563056986824704",
    cta: "Import Sleeper Lineups",
    fetch: ({ leagueId }) => fetchSleeperLeagueLineups({ leagueId }),
  },
};

const SCORING_LABELS = { 0: "Half PPR", 1: "Standard", 2: "Full PPR" };
// SUPERFLEX position mode returns every projected QB/RB/WR/TE.
const ALL_POSITIONS = 99;

export default function LeagueLineups() {
  const [provider, setProvider] = useState("espn");
  const [leagueId, setLeagueId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [needsCredentials, setNeedsCredentials] = useState(false);
  // ESPN cookies stay in component memory only; never persisted or logged.
  const [swid, setSwid] = useState("");
  const [espnS2, setEspnS2] = useState("");

  const [scoringMode, setScoringMode] = useState(0);
  // Fantasy points per passing TD: 4 (default) or 6.
  const [passTdPoints, setPassTdPoints] = useState(4);
  // normalized player name -> { ev, change, pos } for the imported week
  const [projections, setProjections] = useState(new Map());
  const [projectionsLoading, setProjectionsLoading] = useState(false);

  useEffect(() => {
    document.title = "Lineup Import";
  }, []);

  // Pull this app's median projections for the imported week whenever the
  // league result or scoring format changes.
  useEffect(() => {
    if (!result) return undefined;
    let cancelled = false;
    setProjectionsLoading(true);
    computeBPProjections({
      pos: ALL_POSITIONS,
      mode: scoringMode,
      week: result.week,
      year: result.season,
      passTdPoints,
    })
      .then(({ finalList }) => {
        if (!cancelled) setProjections(new Map(finalList));
      })
      .catch(() => {
        if (!cancelled) setProjections(new Map());
      })
      .finally(() => {
        if (!cancelled) setProjectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result, scoringMode, passTdPoints]);

  const runImport = async (credentials) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProjections(new Map());
    try {
      const lineups = await PROVIDERS[provider].fetch({ leagueId, credentials });
      setResult(lineups);
      setNeedsCredentials(false);
    } catch (e) {
      // Provider clients throw errors with a code and a human-readable message.
      const err =
        e && typeof e.code === "string"
          ? e
          : new EspnApiError(
              "ESPN_API_ERROR",
              `Something went wrong importing this ${PROVIDERS[provider].label} league.`
            );
      setError(err);
      if (err.code === "ESPN_PRIVATE_LEAGUE" || err.code === "ESPN_AUTH_FAILED") {
        setNeedsCredentials(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (e) => {
    e.preventDefault();
    setNeedsCredentials(false);
    runImport(undefined);
  };

  const handleImportWithCredentials = (e) => {
    e.preventDefault();
    runImport({ swid: swid.trim(), espnS2: espnS2.trim() });
  };

  const projectionFor = (starter) => projections.get(normalizePlayerName(starter.name))?.ev;

  const handleProviderChange = (e) => {
    setProvider(e.target.value);
    setLeagueId("");
    setResult(null);
    setError(null);
    setNeedsCredentials(false);
  };

  const providerMeta = PROVIDERS[provider];

  return (
    <div className="vl-page">
      <div className="vl-page-head">
        <div>
          <h1 className="vl-title">Fantasy Lineup Import</h1>
          <p className="vl-subtitle">
            Current starting lineups for every team in an ESPN or Sleeper fantasy football
            league, with this week's median projections.
          </p>
        </div>
      </div>

      <form className="vl-toolbar" onSubmit={handleImport}>
        <div className="vl-field">
          <label className="vl-label" htmlFor="providerSelect">Provider</label>
          <select
            id="providerSelect"
            className="vl-select"
            value={provider}
            onChange={handleProviderChange}
          >
            {Object.entries(PROVIDERS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
        <div className="vl-field">
          <label className="vl-label" htmlFor="leagueId">{providerMeta.idLabel}</label>
          <input
            id="leagueId"
            className="vl-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder={providerMeta.placeholder}
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
          />
        </div>
        <div className="vl-field">
          <label className="vl-label" htmlFor="espnScoringSelect">Scoring</label>
          <select
            id="espnScoringSelect"
            className="vl-select"
            value={scoringMode}
            onChange={(e) => setScoringMode(parseInt(e.target.value))}
          >
            <option value="0">Half PPR</option>
            <option value="1">Standard</option>
            <option value="2">Full PPR</option>
          </select>
        </div>
        <div className="vl-field">
          <label className="vl-label" htmlFor="espnPassTdSelect">Pass TD Pts</label>
          <select
            id="espnPassTdSelect"
            className="vl-select"
            value={passTdPoints}
            onChange={(e) => setPassTdPoints(parseInt(e.target.value))}
          >
            <option value="4">4 pts</option>
            <option value="6">6 pts</option>
          </select>
        </div>
        <div className="vl-field">
          <label className="vl-label" htmlFor="espnThemeSelect">Theme</label>
          <ThemeToggleDropdown id="espnThemeSelect" />
        </div>
        <div className="vl-toolbar-actions">
          <button
            type="button"
            className="vl-btn vl-btn-ghost"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Back to Projections
          </button>
          <button
            type="submit"
            className="vl-btn vl-btn-primary"
            disabled={loading || leagueId.trim() === ""}
          >
            {loading ? "Importing…" : providerMeta.cta}
          </button>
        </div>
      </form>

      {error ? (
        <div className="vl-note vl-note-error" role="alert">
          <span className="vl-note-icon">!</span>
          <span className="vl-note-body">{error.message}</span>
        </div>
      ) : null}

      {needsCredentials && provider === "espn" ? (
        <form className="vl-toolbar" onSubmit={handleImportWithCredentials} autoComplete="off">
          <div className="vl-note" style={{ flexBasis: "100%", marginBottom: 0 }}>
            <span className="vl-note-icon">i</span>
            <span className="vl-note-body">
              Private league. In a browser where you're signed in to ESPN, copy the
              <b> SWID</b> and <b>espn_s2</b> cookie values for espn.com and paste them
              here. They're sent once to this site's server to read the league and are
              not stored.
            </span>
          </div>
          <div className="vl-field">
            <label className="vl-label" htmlFor="espnSwid">SWID</label>
            <input
              id="espnSwid"
              className="vl-input"
              type="password"
              autoComplete="off"
              placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
              value={swid}
              onChange={(e) => setSwid(e.target.value)}
            />
          </div>
          <div className="vl-field" style={{ flex: 1, minWidth: 220 }}>
            <label className="vl-label" htmlFor="espnS2">espn_s2</label>
            <input
              id="espnS2"
              className="vl-input"
              type="password"
              autoComplete="off"
              value={espnS2}
              onChange={(e) => setEspnS2(e.target.value)}
            />
          </div>
          <div className="vl-toolbar-actions">
            <button
              type="submit"
              className="vl-btn vl-btn-primary"
              disabled={loading || swid.trim() === "" || espnS2.trim() === ""}
            >
              {loading ? "Importing…" : "Import with ESPN cookies"}
            </button>
          </div>
        </form>
      ) : null}

      {result ? (
        <>
          <div className="vl-chips">
            <span className="vl-chip">{PROVIDERS[result.provider]?.label ?? result.provider}</span>
            {result.leagueName ? <span className="vl-chip">{result.leagueName}</span> : null}
            <span className="vl-chip">{result.season}</span>
            <span className="vl-chip">Week&nbsp;<b>{result.week}</b></span>
            <span className="vl-chip">{SCORING_LABELS[scoringMode]}</span>
            {passTdPoints !== 4 ? (
              <span className="vl-chip">{passTdPoints}pt Pass TD</span>
            ) : null}
            <span className="vl-chip">{result.teams.length} teams</span>
            {projectionsLoading ? <span className="vl-chip">Loading projections…</span> : null}
          </div>

          <div className="vl-lineups">
            {result.teams.map((team) => {
              const starters = team.starters.filter(isShownStarter);
              const projected = starters
                .map(projectionFor)
                .filter((ev) => typeof ev === "number");
              const total = projected.reduce((sum, ev) => sum + ev, 0);
              return (
                <div className="vl-card" key={team.teamId}>
                  <div className="vl-card-head">
                    <h3 className="vl-card-title">{team.teamName}</h3>
                    <span className="vl-card-sub">{starters.length} starters</span>
                  </div>
                  {starters.length === 0 ? (
                    <div className="vl-empty">
                      <div className="vl-empty-title">No starters set</div>
                      <div>This team has no QB, RB, WR, or TE in active lineup slots.</div>
                    </div>
                  ) : (
                    <div className="vl-table-wrap">
                      <table className="vl-table">
                        <thead>
                          <tr>
                            <th className="vl-th-player">Player</th>
                            <th>Slot</th>
                            <th className="vl-th-num">Median</th>
                          </tr>
                        </thead>
                        <tbody>
                          {starters.map((s) => {
                            const ev = projectionFor(s);
                            return (
                              <tr key={`${team.teamId}-${s.playerId}-${s.lineupSlotId}`}>
                                <td className="vl-td-player">
                                  <div className="vl-player">
                                    <span className={positionBadgeClass(s.position)}>
                                      {s.position ?? s.lineupSlot}
                                    </span>
                                    <span className="vl-player-name">{s.name}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="vl-secondary">{s.lineupSlot}</span>
                                </td>
                                <td className="vl-td-num">
                                  {typeof ev === "number" ? (
                                    <span className="vl-num vl-ev">{ev.toFixed(2)}</span>
                                  ) : (
                                    <span className="vl-num vl-secondary">
                                      {projectionsLoading ? "…" : "—"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td className="vl-td-player" style={{ textAlign: "left" }}>
                              Total
                              {projected.length < starters.length ? (
                                <span className="vl-secondary" style={{ fontWeight: 400 }}>
                                  {" "}
                                  ({projected.length} of {starters.length} projected)
                                </span>
                              ) : null}
                            </td>
                            <td />
                            <td>
                              <span className="vl-num vl-ev">
                                {projected.length > 0 ? total.toFixed(2) : "—"}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

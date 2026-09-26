import "../styles.css";
import "../tradeOptimizer/engine.css";
import React, { useCallback, useEffect, useState } from "react";
import ThemeToggleDropdown from "../ThemeToggleDropdown";
import { CURRENT_SEASON } from "../constants";
import { EspnApiError, fetchEspnLeagueRaw } from "../espn/espnClient";
import { fetchSleeperLeagueRaw } from "../sleeper/sleeperClient";
import {
  BettingProsProjectionSource,
  DEFAULT_SETTINGS,
  EMPTY_LICENSE,
  PAYWALL_CONFIG,
  PublishedTradeValueSource,
  TradeReport,
  activateLicense,
  enrichLeague,
  isEntitled,
  loadLicense,
  loadSettings,
  normalizeEspnLeague,
  normalizeEspnPlayerPool,
  normalizeSleeperLeague,
  refreshLicense,
  runTradeOptimizer,
  saveLicense,
  saveSettings,
  validatorFor,
} from "../tradeOptimizer/engine";

// The same engine and result view as the Chrome extension, fed by the site's
// league importers so it works anywhere the site does (phones included).

const PROVIDERS = {
  espn: { label: "ESPN", idLabel: "ESPN League ID", placeholder: "e.g. 48347143" },
  sleeper: { label: "Sleeper", idLabel: "Sleeper League ID", placeholder: "e.g. 1312563056986824704" },
};

// Fetch through the site's clients and normalize with the extension's adapters.
async function loadRawLeague(provider, leagueId, credentials) {
  if (provider === "espn") {
    const { league, freeAgents } = await fetchEspnLeagueRaw({ leagueId, season: CURRENT_SEASON, credentials });
    const n = normalizeEspnLeague(league, String(leagueId).trim());
    return {
      raw: { settings: n.settings, teams: n.teams, availablePlayers: freeAgents ? normalizeEspnPlayerPool(freeAgents) : [], userTeamId: null, userTeamDetection: "none" },
      warnings: n.warnings,
    };
  }
  const payloads = await fetchSleeperLeagueRaw({ leagueId });
  const n = normalizeSleeperLeague(payloads);
  return { raw: { settings: n.settings, teams: n.teams, availablePlayers: [], userTeamId: null, userTeamDetection: "none" }, warnings: n.warnings };
}

export default function Trades() {
  const [provider, setProvider] = useState("espn");
  const [leagueId, setLeagueId] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState(null);
  const [needsCredentials, setNeedsCredentials] = useState(false);
  // ESPN cookies stay in memory only (same as the lineup importer).
  const [swid, setSwid] = useState("");
  const [espnS2, setEspnS2] = useState("");

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [output, setOutput] = useState(null);

  const [license, setLicense] = useState(EMPTY_LICENSE);
  const [licenseBusy, setLicenseBusy] = useState(false);
  const entitled = isEntitled(license, PAYWALL_CONFIG);

  useEffect(() => {
    document.title = "Trade Optimizer";
    loadSettings().then(setSettings).catch(() => undefined);
    loadLicense()
      .then(async (stored) => {
        setLicense(stored);
        const fresh = await refreshLicense(stored, validatorFor(PAYWALL_CONFIG), PAYWALL_CONFIG);
        if (fresh !== stored) {
          setLicense(fresh);
          await saveLicense(fresh);
        }
      })
      .catch(() => undefined);
  }, []);

  const run = useCallback(
    async (credentials) => {
      setLoading(true);
      setError(null);
      setOutput(null);
      try {
        setStage(`Reading ${PROVIDERS[provider].label} league…`);
        const { raw, warnings } = await loadRawLeague(provider, leagueId, credentials);
        setNeedsCredentials(false);
        const key = `${raw.settings.platform}:${raw.settings.leagueId}`;
        const manual = settings.manualTeamIds[key];
        const scoring = { ...raw.settings.scoring, ...(settings.scoringOverride || {}) };
        const request = { season: raw.settings.season, week: raw.settings.week, teamCount: raw.settings.teamCount, scoring };
        setStage("Loading projections and trade values…");
        const [projections, tradeValues] = await Promise.all([
          new BettingProsProjectionSource().load(request),
          new PublishedTradeValueSource().load(request),
        ]);
        setStage("Matching players and searching trades…");
        const rawWithScoring = { ...raw, settings: { ...raw.settings, scoring }, userTeamId: manual || null, userTeamDetection: manual ? "manual" : "none" };
        const { league, report } = enrichLeague(rawWithScoring, projections, tradeValues, { unlistedTradeValue: settings.config.unlistedTradeValue });
        if (manual && !league.teams.some((t) => t.id === manual)) league.userTeamId = null;
        const result = runTradeOptimizer(league, settings.config);
        const allWarnings = [...warnings];
        if (report.unmatchedProjection.length) {
          allWarnings.push(
            `${report.unmatchedProjection.length} rostered QB/RB/WR/TE have no projection this week (props not posted yet); they count 0 in lineups and are excluded from trades.`
          );
        }
        setOutput({ result, league, report, warnings: allWarnings, datasetLabels: { projections: projections.label, tradeValues: tradeValues.label } });
      } catch (e) {
        const err = e && typeof e.code === "string" ? e : new EspnApiError("ESPN_API_ERROR", e?.message || `Something went wrong reading this ${PROVIDERS[provider].label} league.`);
        setError(err);
        if (err.code === "ESPN_PRIVATE_LEAGUE" || err.code === "ESPN_AUTH_FAILED") setNeedsCredentials(true);
      } finally {
        setLoading(false);
        setStage("");
      }
    },
    [provider, leagueId, settings]
  );

  const pickTeam = useCallback(
    (teamId) => {
      if (!output) return;
      const key = `${output.league.settings.platform}:${output.league.settings.leagueId}`;
      const next = { ...settings, manualTeamIds: { ...settings.manualTeamIds, [key]: teamId } };
      setSettings(next);
      saveSettings(next).catch(() => undefined);
      const league = { ...output.league, userTeamId: teamId, userTeamDetection: "manual" };
      setOutput({ ...output, league, result: runTradeOptimizer(league, next.config) });
    },
    [output, settings]
  );

  const activate = useCallback(async (key) => {
    setLicenseBusy(true);
    try {
      const next = await activateLicense(key, validatorFor(PAYWALL_CONFIG), "OddsVis website");
      setLicense(next);
      await saveLicense(next);
    } finally {
      setLicenseBusy(false);
    }
  }, []);

  const removeLicense = useCallback(async () => {
    setLicense(EMPTY_LICENSE);
    await saveLicense(EMPTY_LICENSE);
  }, []);

  const openCheckout = useCallback((plan) => {
    const url = (plan && plan.checkoutUrl) || PAYWALL_CONFIG.checkoutUrl;
    if (url) window.open(url, "_blank", "noopener");
  }, []);

  const providerMeta = PROVIDERS[provider];

  return (
    <div className="vl-page">
      <div className="vl-page-head">
        <div>
          <h1 className="vl-title">Trade Optimizer</h1>
          <p className="vl-subtitle">
            The trades that most raise your optimal starting lineup's median projection, and stay realistic for the other manager.
          </p>
        </div>
      </div>

      <form
        className="vl-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setNeedsCredentials(false);
          run(undefined);
        }}
      >
        <div className="vl-field">
          <label className="vl-label" htmlFor="toProvider">Provider</label>
          <select
            id="toProvider"
            className="vl-select"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setLeagueId("");
              setOutput(null);
              setError(null);
              setNeedsCredentials(false);
            }}
          >
            {Object.entries(PROVIDERS).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        </div>
        <div className="vl-field">
          <label className="vl-label" htmlFor="toLeagueId">{providerMeta.idLabel}</label>
          <input
            id="toLeagueId"
            className="vl-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder={providerMeta.placeholder}
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
          />
        </div>
        <div className="vl-field">
          <label className="vl-label" htmlFor="toTheme">Theme</label>
          <ThemeToggleDropdown id="toTheme" />
        </div>
        <div className="vl-toolbar-actions">
          <button type="button" className="vl-btn vl-btn-ghost" onClick={() => { window.location.href = "/tools"; }}>
            Back to Tools
          </button>
          <button type="submit" className="vl-btn vl-btn-primary" disabled={loading || leagueId.trim() === ""}>
            {loading ? stage || "Working…" : "Find trades"}
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
        <form
          className="vl-toolbar"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            run({ swid: swid.trim(), espnS2: espnS2.trim() });
          }}
        >
          <div className="vl-note" style={{ flexBasis: "100%", marginBottom: 0 }}>
            <span className="vl-note-icon">i</span>
            <span className="vl-note-body">
              Private league. In a browser where you're signed in to ESPN, copy the <b>SWID</b> and <b>espn_s2</b> cookie values for espn.com and paste them here. They're sent once to this site's server to read the league and are not stored.
            </span>
          </div>
          <div className="vl-field">
            <label className="vl-label" htmlFor="toSwid">SWID</label>
            <input id="toSwid" className="vl-input" type="password" autoComplete="off" value={swid} onChange={(e) => setSwid(e.target.value)} />
          </div>
          <div className="vl-field" style={{ flex: 1, minWidth: 220 }}>
            <label className="vl-label" htmlFor="toS2">espn_s2</label>
            <input id="toS2" className="vl-input" type="password" autoComplete="off" value={espnS2} onChange={(e) => setEspnS2(e.target.value)} />
          </div>
          <div className="vl-toolbar-actions">
            <button type="submit" className="vl-btn vl-btn-primary" disabled={loading || swid.trim() === "" || espnS2.trim() === ""}>
              {loading ? "Working…" : "Find trades with ESPN cookies"}
            </button>
          </div>
        </form>
      ) : null}

      {!output && !loading && !error ? (
        <div className="vl-note">
          <span className="vl-note-icon">i</span>
          <span className="vl-note-body">
            Enter your league id and pick your team once; it's remembered on this device. Free: full team analysis and your #2 trade in full. Pro: every ranked trade, including #1.
          </span>
        </div>
      ) : null}

      {output ? (
        <div className="oto">
          <TradeReport
            result={output.result}
            league={output.league}
            report={output.report}
            datasetLabels={output.datasetLabels}
            warnings={output.warnings}
            onPickTeam={pickTeam}
            license={license}
            paywall={PAYWALL_CONFIG}
            entitled={entitled}
            licenseBusy={licenseBusy}
            onActivate={activate}
            onRemoveLicense={removeLicense}
            onUpgrade={openCheckout}
          />
        </div>
      ) : null}
    </div>
  );
}

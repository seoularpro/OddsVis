import React, { useCallback, useEffect, useState } from "react";
import { analyzeActiveTab, analyzeDemo, analyzePublicLeague, type AnalysisOutput } from "../app/runAnalysis";
import { runTradeOptimizer } from "../optimization/tradeOptimizer";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ExtensionSettings } from "../shared/storage";
import { TeamAnalysisPanel } from "./components/TeamAnalysisPanel";
import { TradeCard } from "./components/TradeCard";
import { LeagueTable } from "./components/LeagueTable";
import { SettingsPanel } from "./components/SettingsPanel";
import { LockedTradeCard } from "./components/LockedTradeCard";
import { LicensePanel } from "./components/LicensePanel";
import { PAYWALL_CONFIG } from "../shared/paywallConfig";
import { EMPTY_LICENSE, activateLicense, instanceName, isEntitled, loadLicense, refreshLicense, saveLicense, validatorFor, type LicenseState } from "../shared/license";

type Status = { kind: "idle" } | { kind: "working"; stage: string } | { kind: "done" } | { kind: "error"; message: string };

const inExtension = typeof chrome !== "undefined" && !!chrome.tabs?.query;

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [output, setOutput] = useState<AnalysisOutput | null>(null);
  const [manualPlatform, setManualPlatform] = useState<"espn" | "sleeper">("espn");
  const [manualLeagueId, setManualLeagueId] = useState("");
  const [license, setLicense] = useState<LicenseState>(EMPTY_LICENSE);
  const [licenseBusy, setLicenseBusy] = useState(false);
  const entitled = isEntitled(license, PAYWALL_CONFIG);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => undefined);
    // Load the stored license and re-check it with the provider when stale.
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

  const activate = useCallback(async (key: string) => {
    setLicenseBusy(true);
    try {
      const next = await activateLicense(key, validatorFor(PAYWALL_CONFIG), instanceName());
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

  const openCheckout = useCallback(() => {
    if (!PAYWALL_CONFIG.checkoutUrl) return;
    window.open(PAYWALL_CONFIG.checkoutUrl, "_blank", "noopener");
  }, []);

  const updateSettings = useCallback((next: ExtensionSettings) => {
    setSettings(next);
    saveSettings(next).catch(() => undefined);
  }, []);

  const runLive = useCallback(
    async (override?: ExtensionSettings) => {
      const s = override ?? settings;
      setStatus({ kind: "working", stage: "Starting…" });
      try {
        const out = await analyzeActiveTab(s, (stage) => setStatus({ kind: "working", stage }));
        setOutput(out);
        setStatus({ kind: "done" });
      } catch (e) {
        setStatus({ kind: "error", message: (e as Error).message });
      }
    },
    [settings]
  );

  const runPublic = useCallback(
    async (override?: ExtensionSettings) => {
      const s = override ?? settings;
      setStatus({ kind: "working", stage: "Starting…" });
      try {
        const out = await analyzePublicLeague(manualPlatform, manualLeagueId, s, (stage) => setStatus({ kind: "working", stage }));
        setOutput(out);
        setStatus({ kind: "done" });
      } catch (e) {
        setStatus({ kind: "error", message: (e as Error).message });
      }
    },
    [settings, manualPlatform, manualLeagueId]
  );

  const runDemo = useCallback(
    (override?: ExtensionSettings) => {
      setStatus({ kind: "working", stage: "Analyzing demo league…" });
      try {
        setOutput(analyzeDemo(override ?? settings));
        setStatus({ kind: "done" });
      } catch (e) {
        setStatus({ kind: "error", message: (e as Error).message });
      }
    },
    [settings]
  );

  const pickTeam = useCallback(
    (teamId: string) => {
      if (!output) return;
      const key = `${output.league.settings.platform}:${output.league.settings.leagueId}`;
      const next = { ...settings, manualTeamIds: { ...settings.manualTeamIds, [key]: teamId } };
      updateSettings(next);
      if (output.mode === "demo" || output.mode === "public") {
        // Re-run with the picked team as the user (no re-fetch needed).
        const league = { ...output.league, userTeamId: teamId, userTeamDetection: "manual" as const };
        setOutput({ ...output, league, result: runTradeOptimizer(league, next.config) });
      } else {
        runLive(next);
      }
    },
    [output, settings, updateSettings, runLive]
  );

  const analysis = output?.result.analysis ?? null;
  const user = analysis?.user ?? null;
  const settingsChanged = (next: ExtensionSettings) => updateSettings(next);

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>OddsVis Trade Optimizer</h1>
          <p className="muted small">Top trades that raise your optimal starting lineup's median projection.</p>
        </div>
        <div className="actions">
          {inExtension ? (
            <button className="primary" disabled={status.kind === "working"} onClick={() => runLive()}>
              {status.kind === "working" ? "Working…" : output?.mode === "live" ? "Re-analyze this league" : "Analyze this league"}
            </button>
          ) : null}
          <button className="ghost" disabled={status.kind === "working"} onClick={() => runDemo()}>
            Demo league
          </button>
        </div>
      </header>

      {status.kind === "working" ? <div className="note">{status.stage}</div> : null}
      {status.kind === "error" ? (
        <div className="note error">
          <b>Couldn't analyze.</b> {status.message}
          {!inExtension ? " (Open this panel from the extension on a league page.)" : ""}
        </div>
      ) : null}
      {status.kind === "idle" && !output ? (
        <div className="note">
          Open your ESPN or Sleeper league in the active tab and click <b>Analyze this league</b>. Not on a league page? Load a public league by id below, or try the demo league.
        </div>
      ) : null}

      <form
        className="manual-league"
        onSubmit={(e) => {
          e.preventDefault();
          runPublic();
        }}
      >
        <select value={manualPlatform} onChange={(e) => setManualPlatform(e.target.value as "espn" | "sleeper")}>
          <option value="espn">ESPN (public)</option>
          <option value="sleeper">Sleeper</option>
        </select>
        <input value={manualLeagueId} onChange={(e) => setManualLeagueId(e.target.value)} placeholder="league id" inputMode="numeric" />
        <button type="submit" disabled={status.kind === "working" || !manualLeagueId.trim()}>
          Load by id
        </button>
      </form>

      {output ? (
        <>
          <div className="chips">
            <span className="chip">{output.league.settings.platform}</span>
            <span className="chip">{output.league.settings.leagueName}</span>
            <span className="chip">{output.league.settings.season} · week {output.league.settings.week}</span>
            <span className="chip">{output.league.settings.teamCount} teams</span>
            <span className="chip">{describeScoring(output.league.settings.scoring)}</span>
            <span className="chip">{output.league.settings.lineupSlots.map((s) => (s.count > 1 ? `${s.count}${s.label}` : s.label)).join(" ")}</span>
            <span className="chip muted">{output.result.stats.simulated} trades simulated in {output.result.stats.elapsedMs} ms</span>
          </div>
          <div className="muted small datasets">
            Projections: {output.datasetLabels.projections}. Trade values: {output.datasetLabels.tradeValues}.
            {output.report ? ` Matched ${output.report.projectionMatched}/${output.report.rosteredPlayers} rostered players to projections, ${output.report.tradeValueMatched} to trade values (${output.report.tradeValueEstimated} estimated).` : ""}
          </div>
          {output.warnings.map((w, i) => (
            <div key={i} className="note warn">{w}</div>
          ))}

          {!user && analysis ? (
            <div className="note warn">Which team is yours? Pick it in the league table below.</div>
          ) : null}

          {analysis && user ? <TeamAnalysisPanel analysis={analysis} team={user} /> : null}

          {analysis && user ? (
            <section>
              <div className="section-head">
                <h2>Suggested trades</h2>
                <span className="muted small">
                  {output.result.stats.candidates} candidates after pruning · {output.result.stats.accepted} acceptable
                </span>
              </div>
              {output.result.trades.length === 0 ? (
                <div className="note">
                  No trade cleared the bar (gain ≥ {output.result.analysis.config.minUserGain} pts for you, within the value tolerance, and rational for the other manager). Loosen the tolerances in Settings or check the dataset match warnings.
                </div>
              ) : (
                output.result.trades.map((t, i) =>
                  entitled || i < PAYWALL_CONFIG.freeTrades ? (
                    <TradeCard key={t.rank} trade={t} analysis={analysis} />
                  ) : (
                    <LockedTradeCard key={t.rank} trade={t} analysis={analysis} onUpgrade={openCheckout} priceLabel={PAYWALL_CONFIG.priceLabel} />
                  )
                )
              )}
            </section>
          ) : null}

          <LicensePanel license={license} config={PAYWALL_CONFIG} entitled={entitled} busy={licenseBusy} onActivate={activate} onRemove={removeLicense} onUpgrade={openCheckout} />

          {analysis ? <LeagueTable analysis={analysis} onPickTeam={pickTeam} /> : null}
        </>
      ) : null}

      <SettingsPanel settings={settings} onChange={settingsChanged} />
      <footer className="muted small">
        K and D/ST carry no projection and are never traded. Waiver players are $0; replacement level is the best free agent projection per position.
      </footer>
    </div>
  );
}

function describeScoring(s: { receptionPoints: number; passTdPoints: number }): string {
  const rec = s.receptionPoints >= 0.75 ? "Full PPR" : s.receptionPoints >= 0.25 ? "Half PPR" : "Standard";
  return s.passTdPoints === 4 ? rec : `${rec} · ${s.passTdPoints}pt pass TD`;
}

import React, { useCallback, useEffect, useState } from "react";
import { analyzeActiveTab, analyzeDemo, analyzePublicLeague, type AnalysisOutput } from "../app/runAnalysis";
import { runTradeOptimizer } from "../optimization/tradeOptimizer";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ExtensionSettings } from "../shared/storage";
import { SettingsPanel } from "./components/SettingsPanel";
import { TradeReport } from "./TradeReport";
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
    <div className="oto">
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
      ) : null}

      <SettingsPanel settings={settings} onChange={settingsChanged} />
      <footer className="muted small">
        K and D/ST carry no projection and are never traded. Waiver players are $0; replacement level is the best free agent projection per position.
      </footer>
    </div>
    </div>
  );
}

import React, { useState } from "react";
import type { ExtensionSettings } from "../../shared/storage";
import { DEFAULT_CONFIG } from "../../optimization/config";

export function SettingsPanel({ settings, onChange }: { settings: ExtensionSettings; onChange: (s: ExtensionSettings) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = settings.config;
  const set = (patch: Partial<ExtensionSettings>) => onChange({ ...settings, ...patch });
  const setCfg = (patch: Partial<ExtensionSettings["config"]>) => onChange({ ...settings, config: { ...cfg, ...patch } });

  return (
    <section className="card">
      <div className="card-head clickable" onClick={() => setOpen((v) => !v)}>
        <h2>Settings</h2>
        <span className="caret">{open ? "▾" : "▸"}</span>
      </div>
      {open ? (
        <div className="settings">
          <div className="field-row">
            <label>
              Trade value
              <select value={String(cfg.enforceValueTolerance ?? DEFAULT_CONFIG.enforceValueTolerance)} onChange={(e) => setCfg({ enforceValueTolerance: e.target.value === "true" })}>
                <option value="true">require fair values (gap limit below)</option>
                <option value="false">scores fairness only</option>
              </select>
            </label>
            <label>
              Max trade value gap (%)
              <input type="number" min={0} max={60} value={cfg.maxTradeValueDifferencePercent ?? DEFAULT_CONFIG.maxTradeValueDifferencePercent} onChange={(e) => setCfg({ maxTradeValueDifferencePercent: Number(e.target.value) })} />
            </label>
            <label>
              Min gain for you (pts)
              <input type="number" step={0.5} min={0} value={cfg.minUserGain ?? DEFAULT_CONFIG.minUserGain} onChange={(e) => setCfg({ minUserGain: Number(e.target.value) })} />
            </label>
            <label>
              Max opponent loss (pts)
              <input type="number" step={0.5} min={0} value={cfg.maxOpponentLoss ?? DEFAULT_CONFIG.maxOpponentLoss} onChange={(e) => setCfg({ maxOpponentLoss: Number(e.target.value) })} />
            </label>
            <label>
              Trades to show
              <input type="number" min={1} max={20} value={cfg.topN ?? DEFAULT_CONFIG.topN} onChange={(e) => setCfg({ topN: Number(e.target.value) })} />
            </label>
            <label>
              Max per partner
              <input type="number" min={1} max={20} value={cfg.maxTradesPerPartner ?? DEFAULT_CONFIG.maxTradesPerPartner} onChange={(e) => setCfg({ maxTradesPerPartner: Number(e.target.value) })} />
            </label>
            <label>
              Ranking
              <select value={cfg.rankingMode ?? DEFAULT_CONFIG.rankingMode} onChange={(e) => setCfg({ rankingMode: e.target.value as "winWin" | "userGain" })}>
                <option value="winWin">win/win first, then your gain</option>
                <option value="userGain">your lineup gain only</option>
              </select>
            </label>
            <label>
              Unlisted trade value
              <select value={cfg.unlistedTradeValue ?? DEFAULT_CONFIG.unlistedTradeValue} onChange={(e) => setCfg({ unlistedTradeValue: e.target.value as "estimate" | "zero" })}>
                <option value="estimate">estimate from projection</option>
                <option value="zero">treat as $0</option>
              </select>
            </label>
          </div>

          <div className="field-row">
            <label>
              Scoring override: receptions
              <select
                value={settings.scoringOverride?.receptionPoints ?? ""}
                onChange={(e) => set({ scoringOverride: e.target.value === "" ? (settings.scoringOverride?.passTdPoints != null ? { passTdPoints: settings.scoringOverride.passTdPoints } : null) : { ...(settings.scoringOverride ?? {}), receptionPoints: Number(e.target.value) } })}
              >
                <option value="">use league setting</option>
                <option value="0">Standard (0)</option>
                <option value="0.5">Half PPR (0.5)</option>
                <option value="1">Full PPR (1)</option>
              </select>
            </label>
            <label>
              Scoring override: pass TD
              <select
                value={settings.scoringOverride?.passTdPoints ?? ""}
                onChange={(e) => set({ scoringOverride: e.target.value === "" ? (settings.scoringOverride?.receptionPoints != null ? { receptionPoints: settings.scoringOverride.receptionPoints } : null) : { ...(settings.scoringOverride ?? {}), passTdPoints: Number(e.target.value) } })}
              >
                <option value="">use league setting</option>
                <option value="4">4</option>
                <option value="6">6</option>
              </select>
            </label>
          </div>

          <details>
            <summary>Custom datasets (optional)</summary>
            <p className="muted small">
              Leave empty to use VegasLytics weekly medians and the published trade values. Otherwise supply JSON arrays of{" "}
              <code>{"{ name, position, medianProjection }"}</code> and <code>{"{ name, position, tradeValue }"}</code> (a combined list with both fields works for either).
            </p>
            <label>
              Projection JSON URL
              <input type="url" value={settings.projectionUrl} onChange={(e) => set({ projectionUrl: e.target.value })} placeholder="https://…/projections.json" />
            </label>
            <label>
              Trade value JSON URL
              <input type="url" value={settings.tradeValueUrl} onChange={(e) => set({ tradeValueUrl: e.target.value })} placeholder="https://…/trade-values.json" />
            </label>
            <label>
              Paste projection JSON
              <textarea rows={3} value={settings.projectionJson} onChange={(e) => set({ projectionJson: e.target.value })} />
            </label>
            <label>
              Paste trade value JSON
              <textarea rows={3} value={settings.tradeValueJson} onChange={(e) => set({ tradeValueJson: e.target.value })} />
            </label>
          </details>
        </div>
      ) : null}
    </section>
  );
}

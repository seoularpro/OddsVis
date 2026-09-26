// The results block shared by the extension panel and the website: league
// chips, dataset notes, team analysis, gated trade list, license panel and
// league table. Data fetching and settings live in the host.

import React from "react";
import type { League } from "../domain/types";
import type { OptimizerResult } from "../optimization/tradeOptimizer";
import type { EnrichReport } from "../data/enrichLeague";
import type { LicenseState } from "../shared/license";
import type { PaywallConfig, PaywallPlan } from "../shared/paywallConfig";
import { TeamAnalysisPanel } from "./components/TeamAnalysisPanel";
import { TradeCard } from "./components/TradeCard";
import { LockedTradeCard } from "./components/LockedTradeCard";
import { LeagueTable } from "./components/LeagueTable";
import { LicensePanel } from "./components/LicensePanel";

export interface TradeReportProps {
  result: OptimizerResult;
  league: League;
  report?: EnrichReport | null;
  datasetLabels: { projections: string; tradeValues: string };
  warnings: string[];
  onPickTeam: (teamId: string) => void;
  license: LicenseState;
  paywall: PaywallConfig;
  entitled: boolean;
  licenseBusy: boolean;
  onActivate: (key: string) => void;
  onRemoveLicense: () => void;
  onUpgrade: (plan?: PaywallPlan) => void;
}

export function describeScoring(s: { receptionPoints: number; passTdPoints: number }): string {
  const rec = s.receptionPoints >= 0.75 ? "Full PPR" : s.receptionPoints >= 0.25 ? "Half PPR" : "Standard";
  return s.passTdPoints === 4 ? rec : `${rec} · ${s.passTdPoints}pt pass TD`;
}

export function TradeReport(props: TradeReportProps) {
  const { result, league, report, datasetLabels, warnings, onPickTeam, license, paywall, entitled, licenseBusy, onActivate, onRemoveLicense, onUpgrade } = props;
  const analysis = result.analysis;
  const user = analysis.user;
  return (
    <>
      <div className="chips">
        <span className="chip">{league.settings.platform}</span>
        <span className="chip">{league.settings.leagueName}</span>
        <span className="chip">{league.settings.season} · week {league.settings.week}</span>
        <span className="chip">{league.settings.teamCount} teams</span>
        <span className="chip">{describeScoring(league.settings.scoring)}</span>
        <span className="chip">{league.settings.lineupSlots.map((s) => (s.count > 1 ? `${s.count}${s.label}` : s.label)).join(" ")}</span>
        <span className="chip muted">{result.stats.simulated} trades simulated in {result.stats.elapsedMs} ms</span>
      </div>
      <div className="muted small datasets">
        Projections: {datasetLabels.projections}. Trade values: {datasetLabels.tradeValues}.
        {report ? ` Matched ${report.projectionMatched}/${report.rosteredPlayers} rostered players to projections, ${report.tradeValueMatched} to trade values (${report.tradeValueEstimated} estimated).` : ""}
      </div>
      {warnings.map((w, i) => (
        <div key={i} className="note warn">{w}</div>
      ))}

      {!user ? <div className="note warn">Which team is yours? Pick it in the league table below.</div> : null}

      {user ? <TeamAnalysisPanel analysis={analysis} team={user} /> : null}

      {user ? (
        <section>
          <div className="section-head">
            <h2>Suggested trades</h2>
            <span className="muted small">
              {result.stats.candidates} candidates after pruning · {result.stats.accepted} acceptable
            </span>
          </div>
          {result.trades.length === 0 ? (
            <div className="note">
              No trade cleared the bar (gain ≥ {analysis.config.minUserGain} pts for you, within the value tolerance, and rational for the other manager). Loosen the tolerances in Settings or check the dataset match warnings.
            </div>
          ) : (
            result.trades.map((t) =>
              entitled || paywall.freeRanks.includes(t.rank) ? (
                <TradeCard key={t.rank} trade={t} analysis={analysis} />
              ) : (
                <LockedTradeCard key={t.rank} trade={t} analysis={analysis} onUpgrade={() => onUpgrade()} priceLabel={paywall.priceLabel} />
              )
            )
          )}
        </section>
      ) : null}

      <LicensePanel license={license} config={paywall} entitled={entitled} busy={licenseBusy} onActivate={onActivate} onRemove={onRemoveLicense} onUpgrade={onUpgrade} />

      <LeagueTable analysis={analysis} onPickTeam={onPickTeam} />
    </>
  );
}

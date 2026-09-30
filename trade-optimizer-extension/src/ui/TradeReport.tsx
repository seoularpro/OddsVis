// The results block shared by the extension panel and the website: league
// chips, dataset notes, team analysis, gated trade list, license panel and
// league table. Data fetching and settings live in the host.

import React, { useState } from "react";
import type { League } from "../domain/types";
import { OFFENSE_POSITIONS } from "../domain/types";
import type { OptimizerResult } from "../optimization/tradeOptimizer";
import type { EnrichReport } from "../data/enrichLeague";
import type { LicenseState } from "../shared/license";
import type { PaywallConfig, PaywallPlan } from "../shared/paywallConfig";
import { TeamAnalysisPanel } from "./components/TeamAnalysisPanel";
import { TradeCard } from "./components/TradeCard";
import { LockedTradeCard } from "./components/LockedTradeCard";
import { LeagueTable } from "./components/LeagueTable";
import { LicensePanel } from "./components/LicensePanel";
import { UnfairTradeCard } from "./components/UnfairTradeCard";

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
  /** Render only one block (deep links / screenshots). */
  only?: "analysis" | "trades" | "league" | null;
}

export function describeScoring(s: { receptionPoints: number; passTdPoints: number }): string {
  const rec = s.receptionPoints >= 0.75 ? "Full PPR" : s.receptionPoints >= 0.25 ? "Half PPR" : "Standard";
  return s.passTdPoints === 4 ? rec : `${rec} · ${s.passTdPoints}pt pass TD`;
}

export function TradeReport(props: TradeReportProps) {
  const { result, league, report, datasetLabels, warnings, onPickTeam, license, paywall, entitled, licenseBusy, onActivate, onRemoveLicense, onUpgrade, only } = props;
  const show = (block: "analysis" | "trades" | "league" | "license" | "meta") => !only || only === block || (block === "meta" && false);
  const analysis = result.analysis;
  const user = analysis.user;
  const [list, setList] = useState<"fair" | "unfair">("fair");
  const firstVisibleRank = result.trades.find((t) => entitled || paywall.freeRanks.includes(t.rank))?.rank ?? 1;
  const firstVisibleUnfair = result.unfairTrades.find((t) => entitled || paywall.freeRanks.includes(t.rank))?.rank ?? 1;

  // Props coverage: only players with a posted line can be traded on, so a
  // thin week (typically Tuesday/Wednesday) yields far fewer suggestions.
  const offense = league.teams.flatMap((t) => t.players).filter((p) => OFFENSE_POSITIONS.includes(p.position));
  const withProps = offense.filter((p) => p.projectionSource === "dataset").length;
  const coverage = offense.length ? withProps / offense.length : 1;
  const thinProps = coverage < 0.85;
  const userOffense = user ? user.roster.filter((p) => OFFENSE_POSITIONS.includes(p.position)) : [];
  const userWithProps = userOffense.filter((p) => p.projectionSource === "dataset").length;
  return (
    <>
      {show("meta") ? <div className="chips">
        <span className="chip">{league.settings.platform}</span>
        <span className="chip">{league.settings.leagueName}</span>
        <span className="chip">{league.settings.season} · week {league.settings.week}</span>
        <span className="chip">{league.settings.teamCount} teams</span>
        <span className="chip">{describeScoring(league.settings.scoring)}</span>
        <span className="chip">{league.settings.lineupSlots.map((s) => (s.count > 1 ? `${s.count}${s.label}` : s.label)).join(" ")}</span>
        <span className="chip muted">{result.stats.simulated} trades simulated in {result.stats.elapsedMs} ms</span>
      </div> : null}
      {show("meta") ? <div className="muted small datasets">
        Projections: {datasetLabels.projections}. Trade values: {datasetLabels.tradeValues}.
        {report ? ` Matched ${report.projectionMatched}/${report.rosteredPlayers} rostered players to projections, ${report.tradeValueMatched} to trade values (${report.tradeValueEstimated} estimated).` : ""}
      </div> : null}
      {show("meta") ? warnings.map((w, i) => (
        <div key={i} className="note warn">{w}</div>
      )) : null}

      {!user && show("meta") ? <div className="note warn">Which team is yours? Pick it in the league table below.</div> : null}

      {user && show("analysis") ? (
        <div id="analysis">
          <TeamAnalysisPanel analysis={analysis} team={user} />
        </div>
      ) : null}

      {user && show("trades") ? (
        <section id="trades">
          <div className="section-head">
            <h2>Suggested trades</h2>
            <div className="list-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={list === "fair"} className={`list-tab${list === "fair" ? " active" : ""}`} onClick={() => setList("fair")}>
                Fair ({result.trades.length})
              </button>
              <button type="button" role="tab" aria-selected={list === "unfair"} className={`list-tab${list === "unfair" ? " active" : ""}`} onClick={() => setList("unfair")}>
                Unfair ({result.unfairTrades.length})
              </button>
            </div>
          </div>
          <div className="muted small list-note">
            {list === "fair"
              ? `Realistic for both managers: ${result.stats.candidates} candidates after pruning, ${result.stats.accepted} acceptable.`
              : `Lopsided in your favor but still takeable: you send only players worth more than $${analysis.config.unfairMinOutgoingValue}, the deal raises both your total trade value and this week's lineup, they get at most ${analysis.config.unfairMaxValueGainPercent}% less value, lose at most ${analysis.config.unfairMaxOpponentLoss} points, and have an angle to say yes. ${result.unfairStats.plausible} of ${result.unfairStats.qualifying} value grabs made the cut.`}
          </div>
          {thinProps ? (
            <div className="note warn">
              <b>Limited suggestions this week so far.</b> Props are posted for only {withProps} of {offense.length} rostered QB/RB/WR/TE ({Math.round(coverage * 100)}%)
              {user ? `, including ${userWithProps} of ${userOffense.length} on your team` : ""}. Players without a line are never offered or requested, so fewer trades qualify
              {result.trades.length < 5 ? ` (${result.trades.length} shown)` : ""}. Lines usually fill in by Wednesday or Thursday; re-run then for the full list.
            </div>
          ) : null}
          {list === "fair" ? (
            result.trades.length === 0 ? (
              <div className="note">
                No trade cleared the bar (gain ≥ {analysis.config.minUserGain} pts for you, within the value tolerance, and rational for the other manager). Loosen the tolerances in Settings or check the dataset match warnings.
              </div>
            ) : (
              result.trades.map((t) =>
                entitled || paywall.freeRanks.includes(t.rank) ? (
                  <TradeCard key={t.rank} trade={t} analysis={analysis} defaultOpen={t.rank === firstVisibleRank} />
                ) : (
                  <LockedTradeCard key={t.rank} trade={t} analysis={analysis} onUpgrade={() => onUpgrade()} priceLabel={paywall.priceLabel} />
                )
              )
            )
          ) : result.unfairTrades.length === 0 ? (
            <div className="note">
              No unfair trade qualified: nothing that sends only players worth more than ${analysis.config.unfairMinOutgoingValue} raises both your total trade value and this week's lineup.
            </div>
          ) : (
            result.unfairTrades.map((t) =>
              entitled || paywall.freeRanks.includes(t.rank) ? (
                <UnfairTradeCard key={t.rank} trade={t} analysis={analysis} defaultOpen={t.rank === firstVisibleUnfair} />
              ) : (
                <LockedTradeCard key={t.rank} trade={{ rank: t.rank, simulation: t.simulation, valueGain: t.valueGain }} analysis={analysis} onUpgrade={() => onUpgrade()} priceLabel={paywall.priceLabel} />
              )
            )
          )}
        </section>
      ) : null}

      {show("license") ? <LicensePanel license={license} config={paywall} entitled={entitled} busy={licenseBusy} onActivate={onActivate} onRemove={onRemoveLicense} onUpgrade={onUpgrade} /> : null}

      {show("league") ? (
        <div id="league">
          <LeagueTable analysis={analysis} onPickTeam={onPickTeam} />
        </div>
      ) : null}
    </>
  );
}

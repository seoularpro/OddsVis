// The results block shared by the extension panel and the website: license
// panel, league chips, dataset notes, team analysis, gated trade list and
// league table. Data fetching and settings live in the host.

import React, { useEffect, useRef, useState } from "react";
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

/** Show the "limited suggestions" note only when fewer than this share of rostered QB/RB/WR/TE have posted props. */
const THIN_PROPS_COVERAGE = 0.5;

export function TradeReport(props: TradeReportProps) {
  const { result, league, report, datasetLabels, warnings, onPickTeam, license, paywall, entitled, licenseBusy, onActivate, onRemoveLicense, onUpgrade, only } = props;
  const show = (block: "analysis" | "trades" | "league" | "license" | "meta") => !only || only === block || (block === "meta" && false);
  const analysis = result.analysis;
  const user = analysis.user;
  const [list, setList] = useState<"fair" | "unfair">("fair");
  // Pagination: the engine ranks every acceptable trade in pages of topN.
  const fairAll = result.allTrades ?? result.trades;
  const unfairAll = result.allUnfairTrades ?? result.unfairTrades;
  const [pages, setPages] = useState({ fair: 1, unfair: 1 });
  useEffect(() => setPages({ fair: 1, unfair: 1 }), [result]);
  const pageCount = Math.max(1, list === "fair" ? result.tradePageCount ?? 1 : result.unfairPageCount ?? 1);
  const page = Math.min(pages[list], pageCount);
  const tradesRef = useRef<HTMLElement>(null);
  const goToPage = (next: number) => {
    setPages((p) => ({ ...p, [list]: Math.max(1, Math.min(pageCount, next)) }));
    tradesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const fairPage = fairAll.filter((t) => (t.page ?? 1) === page);
  const unfairPage = unfairAll.filter((t) => (t.page ?? 1) === page);
  const shown = list === "fair" ? fairPage : unfairPage;
  const total = list === "fair" ? fairAll.length : unfairAll.length;
  const pager =
    pageCount > 1 ? (
      <nav className="pager" aria-label="Trade pages">
        <button type="button" className="pager-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          ‹ Previous
        </button>
        <span className="pager-status">
          Page <b>{page}</b> of {pageCount}
          {shown.length ? <span className="muted"> · #{shown[0].rank}–#{shown[shown.length - 1].rank} of {total}</span> : null}
        </span>
        <button type="button" className="pager-btn" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
          Next ›
        </button>
      </nav>
    ) : null;
  // Locked cards send the user to the plans rather than straight to one plan's checkout.
  const licenseRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const showPlans = () => {
    if (!licenseRef.current) return onUpgrade();
    licenseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlash(true);
  };

  // Props coverage: only players with a posted line can be traded on, so a
  // thin week (typically Tuesday/Wednesday) yields far fewer suggestions.
  const offense = league.teams.flatMap((t) => t.players).filter((p) => OFFENSE_POSITIONS.includes(p.position));
  const withProps = offense.filter((p) => p.projectionSource === "dataset").length;
  const coverage = offense.length ? withProps / offense.length : 1;
  const thinProps = coverage < THIN_PROPS_COVERAGE;
  const userOffense = user ? user.roster.filter((p) => OFFENSE_POSITIONS.includes(p.position)) : [];
  const userWithProps = userOffense.filter((p) => p.projectionSource === "dataset").length;
  // Complete earlier in the week, but the latest odds dropped a required prop: never offered or requested.
  const staleNames = offense.filter((p) => p.projectionStale).map((p) => p.name);
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

      {user && show("trades") ? (
        <section id="trades" ref={tradesRef}>
          <div className="section-head">
            <h2>Suggested trades</h2>
          </div>
          <div className="list-tabs" role="tablist" aria-label="Trade type">
            <button type="button" role="tab" aria-selected={list === "fair"} className={`list-tab${list === "fair" ? " active" : ""}`} onClick={() => setList("fair")}>
              <span className="list-tab-label">Fair trades ({fairAll.length})</span>
              <span className="list-tab-sub">Both managers have a reason to say yes</span>
            </button>
            <button type="button" role="tab" aria-selected={list === "unfair"} className={`list-tab${list === "unfair" ? " active" : ""}`} onClick={() => setList("unfair")}>
              <span className="list-tab-label">Unfair trades ({unfairAll.length})</span>
              <span className="list-tab-sub">Lopsided in your favor</span>
            </button>
          </div>
          <div className="muted small list-note">
            {list === "fair"
              ? `Realistic for both managers: ${result.stats.candidates} candidates after pruning, ${result.stats.accepted} acceptable.`
              : `Lopsided in your favor but still takeable: you send only players worth more than $${analysis.config.unfairMinOutgoingValue}, you never get back a player worth more than the best one you send or within ${analysis.config.unfairMinValueGapPercent}% of any player you send, the deal raises both your total trade value and this week's lineup, they get at most ${analysis.config.unfairMaxValueGainPercent}% less value, lose at most ${analysis.config.unfairMaxOpponentLoss} points, and have an angle to say yes. ${result.unfairStats.plausible} of ${result.unfairStats.qualifying} value grabs made the cut.`}
          </div>
          {thinProps ? (
            <div className="note warn">
              <b>Limited suggestions this week so far.</b> Props are posted for only {withProps} of {offense.length} rostered QB/RB/WR/TE ({Math.round(coverage * 100)}%)
              {user ? `, including ${userWithProps} of ${userOffense.length} on your team` : ""}. Players without a line are never offered or requested, so fewer trades qualify
              {fairAll.length < 5 ? ` (${fairAll.length} shown)` : ""}. Lines usually fill in by Wednesday or Thursday; re-run then for the full list.
            </div>
          ) : null}
          {staleNames.length ? (
            <div className="note">
              <b>Left out of trades:</b> {staleNames.slice(0, 8).join(", ")}
              {staleNames.length > 8 ? ` and ${staleNames.length - 8} more` : ""}. The latest odds no longer post every prop needed for {staleNames.length === 1 ? "this player's" : "these players'"} projection, so {staleNames.length === 1 ? "it relies" : "they rely"} on older lines.
            </div>
          ) : null}
          {pager}
          {list === "fair" ? (
            fairAll.length === 0 ? (
              <div className="note">
                No trade cleared the bar (gain ≥ {analysis.config.minUserGain} pts for you, within the value tolerance, and rational for the other manager). Loosen the tolerances in Settings or check the dataset match warnings.
              </div>
            ) : (
              fairPage.map((t) =>
                entitled || paywall.freeRanks.includes(t.rank) ? (
                  <TradeCard key={t.rank} trade={t} analysis={analysis} />
                ) : (
                  <LockedTradeCard key={t.rank} trade={t} analysis={analysis} onUpgrade={showPlans} priceLabel={paywall.priceLabel} />
                )
              )
            )
          ) : unfairAll.length === 0 ? (
            <div className="note">
              No unfair trade qualified: nothing that sends only players worth more than ${analysis.config.unfairMinOutgoingValue} raises both your total trade value and this week's lineup.
            </div>
          ) : (
            unfairPage.map((t) =>
              entitled || paywall.freeRanks.includes(t.rank) ? (
                <UnfairTradeCard key={t.rank} trade={t} analysis={analysis} />
              ) : (
                <LockedTradeCard key={t.rank} trade={{ rank: t.rank, simulation: t.simulation, valueGain: t.valueGain }} analysis={analysis} onUpgrade={showPlans} priceLabel={paywall.priceLabel} />
              )
            )
          )}
          {pager}
        </section>
      ) : null}

      {user && show("analysis") ? (
        <div id="analysis">
          <TeamAnalysisPanel analysis={analysis} team={user} />
        </div>
      ) : null}

      {show("license") ? (
        <div id="license" ref={licenseRef} className={flash ? "license-flash" : undefined} onAnimationEnd={() => setFlash(false)}>
          <LicensePanel license={license} config={paywall} entitled={entitled} busy={licenseBusy} onActivate={onActivate} onRemove={onRemoveLicense} onUpgrade={onUpgrade} />
        </div>
      ) : null}

      {show("league") ? (
        <div id="league">
          <LeagueTable analysis={analysis} onPickTeam={onPickTeam} />
        </div>
      ) : null}
    </>
  );
}

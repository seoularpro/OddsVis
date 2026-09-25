// Glue between the extension surfaces and the engine: get the league from
// the active tab (or the fixture), load the datasets, enrich, optimize.

import type { League, RawLeague } from "../domain/types";
import type { ContentRequest, ContentResponse, DetectResult } from "../shared/messages";
import type { ExtensionSettings } from "../shared/storage";
import { enrichLeague, type EnrichReport } from "../data/enrichLeague";
import { BettingProsProjectionSource, StaticProjectionSource, UrlProjectionSource, parseProjectionJson } from "../data/projections";
import { PublishedTradeValueSource, StaticTradeValueSource, UrlTradeValueSource, parseTradeValueJson } from "../data/tradeValues";
import type { DatasetRequest, ProjectionSource, TradeValueSource } from "../data/types";
import { runTradeOptimizer, type OptimizerResult } from "../optimization/tradeOptimizer";
import { syntheticLeague } from "../data/fixtures/syntheticLeague";
import type { OptimizerConfig } from "../optimization/config";

export interface AnalysisOutput {
  result: OptimizerResult;
  league: League;
  report: EnrichReport | null;
  datasetLabels: { projections: string; tradeValues: string };
  warnings: string[];
  detect: DetectResult | null;
  mode: "live" | "demo";
}

export type Progress = (stage: string) => void;

async function activeTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error("No active tab.");
  return tab.id;
}

async function sendToContent<T extends ContentResponse>(tabId: number, msg: ContentRequest): Promise<T> {
  try {
    return (await chrome.tabs.sendMessage(tabId, msg)) as T;
  } catch {
    // Content script not injected yet (extension installed after the page
    // loaded): inject it and retry once.
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return (await chrome.tabs.sendMessage(tabId, msg)) as T;
  }
}

export async function detectActiveTab(): Promise<DetectResult> {
  const tabId = await activeTabId();
  const res = await sendToContent<ContentResponse>(tabId, { type: "DETECT" });
  if (!res.ok) throw new Error(res.error);
  if (res.type !== "DETECT") throw new Error("Unexpected response");
  return res.result;
}

export async function extractFromActiveTab(teamIdHint?: string | null): Promise<{ league: RawLeague; warnings: string[] }> {
  const tabId = await activeTabId();
  const res = await sendToContent<ContentResponse>(tabId, { type: "EXTRACT_LEAGUE", options: { teamIdHint } });
  if (!res.ok) throw new Error(res.error);
  if (res.type !== "EXTRACT_LEAGUE") throw new Error("Unexpected response");
  return { league: res.league, warnings: res.warnings };
}

export function projectionSourceFor(settings: ExtensionSettings): ProjectionSource {
  if (settings.projectionJson.trim()) return new StaticProjectionSource(parseProjectionJson(settings.projectionJson), "Pasted projections");
  if (settings.projectionUrl.trim()) return new UrlProjectionSource(settings.projectionUrl.trim());
  return new BettingProsProjectionSource();
}

export function tradeValueSourceFor(settings: ExtensionSettings): TradeValueSource {
  if (settings.tradeValueJson.trim()) return new StaticTradeValueSource(parseTradeValueJson(settings.tradeValueJson), "Pasted trade values");
  if (settings.tradeValueUrl.trim()) return new UrlTradeValueSource(settings.tradeValueUrl.trim());
  return new PublishedTradeValueSource();
}

export function configFromSettings(settings: ExtensionSettings): Partial<OptimizerConfig> {
  return { ...settings.config };
}

export async function analyzeRawLeague(raw: RawLeague, settings: ExtensionSettings, progress: Progress, extra: { warnings: string[]; detect: DetectResult | null }): Promise<AnalysisOutput> {
  const scoring = { ...raw.settings.scoring, ...(settings.scoringOverride ?? {}) };
  const request: DatasetRequest = { season: raw.settings.season, week: raw.settings.week, teamCount: raw.settings.teamCount, scoring };
  progress("Loading projections and trade values…");
  const [projections, tradeValues] = await Promise.all([projectionSourceFor(settings).load(request), tradeValueSourceFor(settings).load(request)]);
  progress("Matching players…");
  const manual = settings.manualTeamIds[`${raw.settings.platform}:${raw.settings.leagueId}`];
  const rawWithScoring: RawLeague = { ...raw, settings: { ...raw.settings, scoring } };
  const { league, report } = enrichLeague(rawWithScoring, projections, tradeValues, { unlistedTradeValue: settings.config.unlistedTradeValue });
  if (manual && league.teams.some((t) => t.id === manual)) {
    league.userTeamId = manual;
    league.userTeamDetection = "manual";
  }
  progress("Searching trades…");
  const result = runTradeOptimizer(league, configFromSettings(settings));
  const warnings = [...extra.warnings];
  if (report.unmatchedProjection.length) {
    const mine = league.userTeamId ? report.unmatchedProjection.filter((u) => league.teams.find((t) => t.id === league.userTeamId)?.name === u.teamName) : [];
    warnings.push(
      `${report.unmatchedProjection.length} rostered QB/RB/WR/TE have no projection this week (props not posted yet); they count 0 in lineups and are excluded from trades${mine.length ? ` — on your team: ${mine.map((u) => u.name).join(", ")}` : ""}.`
    );
  }
  return {
    result,
    league,
    report,
    datasetLabels: { projections: projections.label, tradeValues: tradeValues.label },
    warnings,
    detect: extra.detect,
    mode: "live",
  };
}

export async function analyzeActiveTab(settings: ExtensionSettings, progress: Progress): Promise<AnalysisOutput> {
  progress("Detecting fantasy site…");
  const detect = await detectActiveTab();
  if (!detect.supported) throw new Error(detect.reason ?? "This page is not a supported league page.");
  progress(`Reading ${detect.platform} league ${detect.leagueId}…`);
  const manual = settings.manualTeamIds[`${detect.platform}:${detect.leagueId}`];
  const { league, warnings } = await extractFromActiveTab(manual ?? null);
  return analyzeRawLeague(league, settings, progress, { warnings, detect });
}

export function analyzeDemo(settings: ExtensionSettings): AnalysisOutput {
  const league = syntheticLeague();
  const result = runTradeOptimizer(league, configFromSettings(settings));
  return {
    result,
    league,
    report: null,
    datasetLabels: { projections: "Synthetic fixture projections", tradeValues: "Synthetic fixture trade values" },
    warnings: ["Demo mode: this is a synthetic 10-team league, not the page you are viewing."],
    detect: null,
    mode: "demo",
  };
}

// Attach projections and trade values to a raw league from the adapters.
// Also derives the available-player pool: anything projected that is not on
// a roster is, by definition, on waivers (union with whatever the platform
// adapter reported).

import type { League, Player, Position, RawLeague, RawPlayer } from "../domain/types";
import { OFFENSE_POSITIONS } from "../domain/types";
import { PlayerIndex } from "./playerMapping";
import type { ProjectionDataset, ProjectionEntry, TradeValueDataset, TradeValueEntry } from "./types";
import type { OptimizerConfig } from "../optimization/config";

export interface EnrichReport {
  rosteredPlayers: number;
  projectionMatched: number;
  /** Rostered players with no props yet whose projection was inferred from trade value. */
  projectionEstimated: number;
  tradeValueMatched: number;
  tradeValueEstimated: number;
  unmatchedProjection: { name: string; position: Position; teamName: string }[];
  unmatchedTradeValue: { name: string; position: Position; teamName: string }[];
  availableFromDataset: number;
}

export interface EnrichOptions {
  unlistedTradeValue?: OptimizerConfig["unlistedTradeValue"];
  /** Projection-to-value slope used for unlisted players (repo default 2.5). */
  valuePointsPerProjectionPoint?: number;
  idNamespace?: string;
}

const DEFAULT_SLOPE = 2.5;

function enginePlayerId(platform: string, raw: RawPlayer): string {
  return `${platform}:${raw.platformId}`;
}

export interface ListedPoint {
  projection: number;
  value: number;
}

/**
 * Trade value estimate for a player the dataset does not list.
 *
 * The listed players at the same position give a projection -> value curve;
 * the estimate is the value interpolated at the player's projection, then
 * discounted (being unlisted means the dataset author saw less season-long
 * value than any listed player with a similar week) and capped at the lower
 * quartile of listed values at the position. Players at or below replacement
 * level are worth $0. With no listed curve, a small slope-based fallback is
 * used.
 */
export function estimateTradeValue(
  projection: number,
  position: Position,
  replacement: number,
  listed: ListedPoint[],
  slope = DEFAULT_SLOPE,
  discount = 0.6
): number {
  if (projection <= 0 || projection <= replacement) return 0;
  const points = listed.filter((l) => l.projection > 0 && l.value > 0).sort((a, b) => a.projection - b.projection);
  if (points.length < 2) {
    return Math.max(1, Math.min(3, Math.round(slope * (projection - replacement))));
  }
  let interpolated: number;
  if (projection <= points[0].projection) interpolated = points[0].value;
  else if (projection >= points[points.length - 1].projection) interpolated = points[points.length - 1].value;
  else {
    let i = 0;
    while (points[i + 1].projection < projection) i++;
    const a = points[i];
    const b = points[i + 1];
    const t = b.projection === a.projection ? 0 : (projection - a.projection) / (b.projection - a.projection);
    interpolated = a.value + t * (b.value - a.value);
  }
  const values = points.map((l) => l.value).sort((a, b) => a - b);
  const lowerQuartile = values[Math.floor((values.length - 1) * 0.25)];
  return Math.max(1, Math.min(Math.round(interpolated * discount), lowerQuartile));
}

/**
 * Projection estimate for a rostered player with a dataset trade value but no
 * props posted yet (typical early in the week): interpolate the position's
 * value -> projection curve from players that have both, clamped to the
 * curve's range. Returns null when the position has too few points.
 */
export function estimateProjectionFromValue(tradeValue: number, curve: ListedPoint[]): number | null {
  const pts = curve.filter((c) => c.value > 0 && c.projection > 0).sort((a, b) => a.value - b.value);
  if (pts.length < 3 || tradeValue <= 0) return null;
  if (tradeValue <= pts[0].value) return pts[0].projection;
  if (tradeValue >= pts[pts.length - 1].value) return pts[pts.length - 1].projection;
  let i = 0;
  while (pts[i + 1].value < tradeValue) i++;
  const a = pts[i];
  const b = pts[i + 1];
  const t = b.value === a.value ? 0 : (tradeValue - a.value) / (b.value - a.value);
  return Math.round((a.projection + t * (b.projection - a.projection)) * 10) / 10;
}

export function enrichLeague(
  raw: RawLeague,
  projections: ProjectionDataset,
  tradeValues: TradeValueDataset,
  options: EnrichOptions = {}
): { league: League; report: EnrichReport } {
  const platform = raw.settings.platform;
  const projIndex = new PlayerIndex<ProjectionEntry>(projections.entries, options.idNamespace);
  const valueIndex = new PlayerIndex<TradeValueEntry>(tradeValues.entries, options.idNamespace);
  const slope = options.valuePointsPerProjectionPoint ?? DEFAULT_SLOPE;
  const unlisted = options.unlistedTradeValue ?? "estimate";

  const report: EnrichReport = {
    rosteredPlayers: 0,
    projectionMatched: 0,
    projectionEstimated: 0,
    tradeValueMatched: 0,
    tradeValueEstimated: 0,
    unmatchedProjection: [],
    unmatchedTradeValue: [],
    availableFromDataset: 0,
  };


  // Pass 1: identity + projection, and remember which dataset entries are rostered.
  const usedProjectionEntries = new Set<ProjectionEntry>();
  const convert = (rp: RawPlayer, teamName: string, rostered: boolean): Player => {
    const proj = projIndex.find({ platformId: rp.platformId, name: rp.name, position: rp.position });
    const val = valueIndex.find({ platformId: rp.platformId, name: rp.name, position: rp.position });
    if (rostered) {
      report.rosteredPlayers++;
      if (proj.entry) report.projectionMatched++;
      else if (OFFENSE_POSITIONS.includes(rp.position)) report.unmatchedProjection.push({ name: rp.name, position: rp.position, teamName });
      if (val.entry) report.tradeValueMatched++;
      else if (OFFENSE_POSITIONS.includes(rp.position)) report.unmatchedTradeValue.push({ name: rp.name, position: rp.position, teamName });
    }
    if (proj.entry) usedProjectionEntries.add(proj.entry);
    return {
      id: enginePlayerId(platform, rp),
      platformId: rp.platformId,
      name: rp.name,
      position: rp.position,
      nflTeam: rp.nflTeam ?? proj.entry?.nflTeam,
      injuryStatus: rp.injuryStatus,
      projection: proj.entry ? proj.entry.medianProjection : 0,
      projectionSource: proj.entry ? "dataset" : "none",
      tradeValue: val.entry ? val.entry.tradeValue : 0,
      tradeValueSource: val.entry ? "dataset" : "none",
      matchConfidence: proj.entry ? proj.confidence : val.entry ? val.confidence : "unmatched",
    };
  };

  const teams = raw.teams.map((t) => ({ id: t.id, name: t.name, ownerName: t.ownerName, players: t.players.map((p) => convert(p, t.name, true)) }));
  const rosteredIds = new Set(teams.flatMap((t) => t.players.map((p) => p.id)));

  // Available pool: adapter-reported free agents + projected players not on any roster.
  const available: Player[] = raw.availablePlayers
    .map((p) => convert(p, "waivers", false))
    .filter((p) => !rosteredIds.has(p.id));
  const availableNames = new Set(available.map((p) => `${p.name.toLowerCase()}|${p.position}`));
  for (const e of projections.entries) {
    if (usedProjectionEntries.has(e)) continue;
    const key = `${e.name.toLowerCase()}|${e.position}`;
    if (availableNames.has(key)) continue;
    availableNames.add(key);
    report.availableFromDataset++;
    available.push({
      id: `dataset:${e.playerId ?? key}`,
      platformId: e.playerId,
      name: e.name,
      position: e.position,
      nflTeam: e.nflTeam,
      projection: e.medianProjection,
      projectionSource: "dataset",
      tradeValue: 0,
      tradeValueSource: "none",
      matchConfidence: "id",
    });
  }
  // Waiver players are $0 by definition.
  for (const p of available) {
    p.tradeValue = 0;
    p.tradeValueSource = "none";
  }

  // Curves of players with both a projection and a listed value, per position.
  const curves: Record<Position, ListedPoint[]> = { QB: [], RB: [], WR: [], TE: [], K: [], DST: [] };
  for (const t of teams) {
    for (const p of t.players) {
      if (p.tradeValueSource === "dataset" && p.projectionSource === "dataset") curves[p.position].push({ projection: p.projection, value: p.tradeValue });
    }
  }

  // Pass 2a: projections for valued players with no props posted yet. A $55
  // back without a line on Tuesday is not a 0-point player; he is benched and
  // his slot flagged as a hole if left at 0. Estimates never enter trades.
  for (const t of teams) {
    for (const p of t.players) {
      if (p.projectionSource !== "none" || p.tradeValueSource !== "dataset" || !OFFENSE_POSITIONS.includes(p.position)) continue;
      const est = estimateProjectionFromValue(p.tradeValue, curves[p.position]);
      if (est !== null && est > 0) {
        p.projection = est;
        p.projectionSource = "estimated";
        report.projectionEstimated++;
      }
    }
  }

  // Pass 2b: estimated trade values for rostered players the dataset omits,
  // using the listed players' projection -> value curve at each position.
  if (unlisted === "estimate") {
    const replacement: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
    for (const p of available) replacement[p.position] = Math.max(replacement[p.position], p.projection);
    for (const t of teams) {
      for (const p of t.players) {
        if (p.tradeValueSource === "dataset" || !OFFENSE_POSITIONS.includes(p.position) || p.projection <= 0) continue;
        const est = estimateTradeValue(p.projection, p.position, replacement[p.position], curves[p.position], slope);
        if (est > 0) {
          p.tradeValue = est;
          p.tradeValueSource = "estimated";
          report.tradeValueEstimated++;
        }
      }
    }
  }

  const league: League = {
    settings: raw.settings,
    teams,
    userTeamId: raw.userTeamId,
    userTeamDetection: raw.userTeamDetection,
    availablePlayers: available.sort((a, b) => b.projection - a.projection),
  };
  return { league, report };
}

// Projection sources.
//   * BettingProsProjectionSource – the OddsVis weekly medians, computed by the
//     React site's own module from the committed BettingPros snapshots.
//   * StaticProjectionSource – a JSON list the user supplies (URL or paste),
//     in the {name, position, medianProjection} shape.

import type { Position } from "../domain/types";
import { parsePosition } from "./playerMapping";
import type { CombinedEntry, DatasetRequest, ProjectionDataset, ProjectionEntry, ProjectionSource } from "./types";
// @ts-ignore – plain JS module from the React site (typed loosely on purpose).
import { computeBPProjections, BP_BASE } from "@oddsvis/bpProjections";

const POSITION_BY_CODE: Record<number, Position> = { 0: "QB", 1: "RB", 2: "WR", 3: "TE" };
const ALL_POSITIONS_CODE = 99;

/** Half PPR -> 0, Standard -> 1, Full PPR -> 2 (the site's scoring codes). */
export function scoringModeFor(receptionPoints: number): 0 | 1 | 2 {
  if (receptionPoints >= 0.75) return 2;
  if (receptionPoints >= 0.25) return 0;
  return 1;
}

export class BettingProsProjectionSource implements ProjectionSource {
  id = "bettingpros";
  async load(request: DatasetRequest): Promise<ProjectionDataset> {
    const mode = scoringModeFor(request.scoring.receptionPoints);
    const passTdPoints = request.scoring.passTdPoints >= 5 ? 6 : 4;
    const result = await computeBPProjections({
      pos: ALL_POSITIONS_CODE,
      mode,
      week: request.week,
      year: request.season,
      passTdPoints,
    });
    const entries: ProjectionEntry[] = [];
    for (const [name, info] of result.finalList as [string, { ev: number; pos: number; stale?: boolean }][]) {
      const position = POSITION_BY_CODE[info.pos];
      if (!position) continue;
      entries.push({ name, position, medianProjection: Math.round(info.ev * 100) / 100, stale: info.stale === true });
    }
    if (entries.length === 0) {
      throw new Error(`No VegasLytics projections found for ${request.season} week ${request.week} (${BP_BASE}).`);
    }
    return {
      entries,
      source: this.id,
      label: `VegasLytics medians · ${request.season} wk ${request.week} · ${["Half PPR", "Standard", "Full PPR"][mode]}${passTdPoints === 6 ? " · 6pt pass TD" : ""}`,
      fetchedAt: result.lastFetched ?? undefined,
    };
  }
}

/** Accepts [{name, position, medianProjection}] or the combined record shape. */
export function parseProjectionJson(text: string): ProjectionEntry[] {
  const data = JSON.parse(text);
  const rows: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.players) ? data.players : Array.isArray(data?.entries) ? data.entries : [];
  const out: ProjectionEntry[] = [];
  for (const row of rows as CombinedEntry[]) {
    const position = parsePosition(row.position);
    const value = Number(row.medianProjection ?? (row as any).projection ?? (row as any).ev);
    if (!row?.name || !position || !Number.isFinite(value)) continue;
    out.push({ playerId: row.playerId ? String(row.playerId) : undefined, name: row.name, position, nflTeam: row.nflTeam, medianProjection: value });
  }
  return out;
}

export class StaticProjectionSource implements ProjectionSource {
  id = "static";
  constructor(private entries: ProjectionEntry[], private label = "Custom projections") {}
  async load(): Promise<ProjectionDataset> {
    return { entries: this.entries, source: this.id, label: this.label };
  }
}

export class UrlProjectionSource implements ProjectionSource {
  id = "url";
  constructor(private url: string) {}
  async load(): Promise<ProjectionDataset> {
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`Projection URL returned ${res.status}`);
    const entries = parseProjectionJson(await res.text());
    if (!entries.length) throw new Error("Projection JSON had no usable rows");
    return { entries, source: this.id, label: `Custom projections (${this.url})` };
  }
}

// Trade value sources.
//   * PublishedTradeValueSource – the repo's committed
//     TradeValueSheets/json/TradeValues_<Scoring>_<N>team.json, picked by the
//     league's scoring and size.
//   * StaticTradeValueSource / UrlTradeValueSource – user supplied.

import type { Position } from "../domain/types";
import { parsePosition } from "./playerMapping";
import type { CombinedEntry, DatasetRequest, TradeValueDataset, TradeValueEntry, TradeValueSource } from "./types";

export const TRADE_VALUES_BASE = "https://raw.githubusercontent.com/seoularpro/OddsVis/main/TradeValueSheets/json/";

export function scoringKeyFor(receptionPoints: number): "Standard" | "HalfPPR" | "FullPPR" {
  if (receptionPoints >= 0.75) return "FullPPR";
  if (receptionPoints >= 0.25) return "HalfPPR";
  return "Standard";
}

export function leagueSizeKeyFor(teamCount: number): 8 | 10 | 12 {
  if (teamCount <= 9) return 8;
  if (teamCount <= 11) return 10;
  return 12;
}

export function publishedTradeValueUrl(request: DatasetRequest, base = TRADE_VALUES_BASE): string {
  return `${base}TradeValues_${scoringKeyFor(request.scoring.receptionPoints)}_${leagueSizeKeyFor(request.teamCount)}team.json`;
}

interface PublishedFile {
  generatedAt?: string;
  scoringLabel?: string;
  leagueSize?: number;
  players?: { name: string; pos: string; value: number }[];
}

export class PublishedTradeValueSource implements TradeValueSource {
  id = "published";
  constructor(private base = TRADE_VALUES_BASE) {}
  async load(request: DatasetRequest): Promise<TradeValueDataset> {
    const url = publishedTradeValueUrl(request, this.base);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Trade value file returned ${res.status} (${url})`);
    const data = (await res.json()) as PublishedFile;
    const entries: TradeValueEntry[] = [];
    for (const p of data.players ?? []) {
      const position = parsePosition(p.pos);
      if (!position || !p.name) continue;
      entries.push({ name: p.name, position, tradeValue: Number(p.value) || 0 });
    }
    if (!entries.length) throw new Error("Trade value file had no players");
    return {
      entries,
      source: this.id,
      label: `VegasLytics trade values · ${data.scoringLabel ?? scoringKeyFor(request.scoring.receptionPoints)} · ${data.leagueSize ?? leagueSizeKeyFor(request.teamCount)}-team`,
      generatedAt: data.generatedAt,
    };
  }
}

export function parseTradeValueJson(text: string): TradeValueEntry[] {
  const data = JSON.parse(text);
  const rows: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.players) ? data.players : Array.isArray(data?.entries) ? data.entries : [];
  const out: TradeValueEntry[] = [];
  for (const row of rows as (CombinedEntry & { pos?: string; value?: number })[]) {
    const position = parsePosition(row.position ?? row.pos);
    const value = Number(row.tradeValue ?? row.value);
    if (!row?.name || !position || !Number.isFinite(value)) continue;
    out.push({ playerId: row.playerId ? String(row.playerId) : undefined, name: row.name, position, nflTeam: row.nflTeam, tradeValue: value });
  }
  return out;
}

export class StaticTradeValueSource implements TradeValueSource {
  id = "static";
  constructor(private entries: TradeValueEntry[], private label = "Custom trade values") {}
  async load(): Promise<TradeValueDataset> {
    return { entries: this.entries, source: this.id, label: this.label };
  }
}

export class UrlTradeValueSource implements TradeValueSource {
  id = "url";
  constructor(private url: string) {}
  async load(): Promise<TradeValueDataset> {
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`Trade value URL returned ${res.status}`);
    const entries = parseTradeValueJson(await res.text());
    if (!entries.length) throw new Error("Trade value JSON had no usable rows");
    return { entries, source: this.id, label: `Custom trade values (${this.url})` };
  }
}

/** Positions covered by a dataset, for UI diagnostics. */
export function positionsIn(entries: { position: Position }[]): Position[] {
  return [...new Set(entries.map((e) => e.position))];
}

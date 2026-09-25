// Dataset contracts. Both datasets are replaceable: anything that yields these
// records (a committed JSON file, a pasted list, the OddsVis projection
// pipeline) plugs into enrichLeague unchanged.

import type { Position, ScoringSettings } from "../domain/types";

export interface ProjectionEntry {
  /** Optional stable id in the dataset's own namespace. */
  playerId?: string;
  name: string;
  position: Position;
  nflTeam?: string;
  medianProjection: number;
}

export interface TradeValueEntry {
  playerId?: string;
  name: string;
  position: Position;
  nflTeam?: string;
  tradeValue: number;
}

/** The combined record the user can supply directly. */
export interface CombinedEntry {
  playerId?: string;
  name: string;
  position: Position;
  nflTeam?: string;
  medianProjection?: number;
  tradeValue?: number;
}

export interface DatasetRequest {
  season: number;
  week: number;
  teamCount: number;
  scoring: ScoringSettings;
}

export interface ProjectionDataset {
  entries: ProjectionEntry[];
  source: string;
  label: string;
  fetchedAt?: string;
}

export interface TradeValueDataset {
  entries: TradeValueEntry[];
  source: string;
  label: string;
  generatedAt?: string;
}

export interface ProjectionSource {
  id: string;
  load(request: DatasetRequest): Promise<ProjectionDataset>;
}

export interface TradeValueSource {
  id: string;
  load(request: DatasetRequest): Promise<TradeValueDataset>;
}

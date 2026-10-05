// Domain model shared by the platform adapters, the data layer, the
// optimization engine and the UI. Nothing in here knows about ESPN, Sleeper,
// BettingPros or Google Sheets.

export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export const ALL_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

// Positions the projection dataset covers and the trade search operates on.
// K and D/ST are kept in rosters so lineups are complete, but they carry no
// projection (they are treated as 0-point constants) and are never traded.
export const OFFENSE_POSITIONS: Position[] = ["QB", "RB", "WR", "TE"];

export type Platform = "espn" | "sleeper" | "yahoo" | "fixture";

export type TradeValueSource = "dataset" | "estimated" | "none";
/** "estimated": no props posted yet; projection inferred from trade value (never traded on). */
export type ProjectionSource = "dataset" | "estimated" | "none";

export interface Player {
  /** Engine-wide unique id, e.g. "espn:4241389" or "fixture:rb-a". */
  id: string;
  /** Platform-native id when the player came from a fantasy site. */
  platformId?: string;
  name: string;
  position: Position;
  nflTeam?: string;
  injuryStatus?: string;
  /** Median projected fantasy points for the current week (0 when unknown). */
  projection: number;
  projectionSource: ProjectionSource;
  /** The latest odds no longer post every required prop, so the projection leans on last posted values (never traded on). */
  projectionStale?: boolean;
  /** Trade value on a $200 auction scale (0 when unknown / waiver level). */
  tradeValue: number;
  tradeValueSource: TradeValueSource;
  /** How the datasets were matched to this player (see data/playerMapping). */
  matchConfidence?: "id" | "exact" | "normalized" | "fuzzy" | "unmatched";
}

/** One kind of starting slot, e.g. { id: "FLEX", eligible: ["RB","WR","TE"], count: 1 }. */
export interface LineupSlot {
  id: string;
  label: string;
  eligible: Position[];
  count: number;
}

export interface ScoringSettings {
  /** Points per reception: 0 (standard), 0.5 (half PPR), 1 (full PPR). */
  receptionPoints: number;
  /** Points per passing touchdown: usually 4 or 6. */
  passTdPoints: number;
}

export interface LeagueSettings {
  platform: Platform;
  leagueId: string;
  leagueName: string;
  season: number;
  week: number;
  teamCount: number;
  /** Total roster spots per team excluding IR. */
  rosterSize: number;
  scoring: ScoringSettings;
  lineupSlots: LineupSlot[];
}

export interface Team {
  id: string;
  name: string;
  ownerName?: string;
  players: Player[];
}

export interface League {
  settings: LeagueSettings;
  teams: Team[];
  /** Null when the adapter could not tell which team belongs to the user. */
  userTeamId: string | null;
  /** Best players currently on waivers / free agency (may be empty). */
  availablePlayers: Player[];
  /** How the user's team was identified, for the UI. */
  userTeamDetection?: "url" | "owner" | "storage" | "manual" | "none";
}

// ---------------------------------------------------------------------------
// Raw (pre-dataset) league as produced by platform adapters. Players only
// carry identity; projections and trade values are attached by
// data/enrichLeague.
// ---------------------------------------------------------------------------

export interface RawPlayer {
  platformId: string;
  name: string;
  position: Position;
  nflTeam?: string;
  injuryStatus?: string;
}

export interface RawTeam {
  id: string;
  name: string;
  ownerName?: string;
  players: RawPlayer[];
}

export interface RawLeague {
  settings: LeagueSettings;
  teams: RawTeam[];
  userTeamId: string | null;
  userTeamDetection: League["userTeamDetection"];
  availablePlayers: RawPlayer[];
}

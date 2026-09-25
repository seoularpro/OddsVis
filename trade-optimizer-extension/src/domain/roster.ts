import type { League, Player, Team } from "./types";

export function findTeam(league: League, teamId: string): Team {
  const team = league.teams.find((t) => t.id === teamId);
  if (!team) throw new Error(`Unknown team id ${teamId}`);
  return team;
}

export function playersById(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]));
}

export function totalTradeValue(players: Player[]): number {
  return players.reduce((n, p) => n + p.tradeValue, 0);
}

export function totalProjection(players: Player[]): number {
  return players.reduce((n, p) => n + p.projection, 0);
}

/** New roster with `remove` taken out and `add` put in (no size fitting). */
export function withPlayers(roster: Player[], remove: Player[], add: Player[]): Player[] {
  const removeIds = new Set(remove.map((p) => p.id));
  return [...roster.filter((p) => !removeIds.has(p.id)), ...add];
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

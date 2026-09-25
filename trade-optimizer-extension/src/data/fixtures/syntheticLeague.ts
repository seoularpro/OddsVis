// Synthetic league data: small hand-built rosters for unit tests and a
// realistic 10-team league for the demo mode / end-to-end tests. Everything
// here is deterministic.

import type { League, LineupSlot, Player, Position, Team } from "../../domain/types";
import { standardLineup } from "../../domain/positions";

let counter = 0;

export function makePlayer(
  name: string,
  position: Position,
  projection: number,
  tradeValue: number,
  id?: string
): Player {
  counter++;
  return {
    id: id ?? `fixture:${position.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${counter}`,
    name,
    position,
    projection,
    projectionSource: projection > 0 ? "dataset" : "none",
    tradeValue,
    tradeValueSource: tradeValue > 0 ? "dataset" : "none",
    matchConfidence: "id",
  };
}

export interface MakeLeagueOptions {
  teams: { id: string; name: string; players: Player[] }[];
  userTeamId: string;
  slots?: LineupSlot[];
  rosterSize?: number;
  availablePlayers?: Player[];
  teamCount?: number;
  receptionPoints?: number;
}

export function makeLeague(opts: MakeLeagueOptions): League {
  const slots = opts.slots ?? standardLineup();
  const maxRoster = Math.max(...opts.teams.map((t) => t.players.length));
  return {
    settings: {
      platform: "fixture",
      leagueId: "fixture",
      leagueName: "Fixture League",
      season: 2026,
      week: 1,
      teamCount: opts.teamCount ?? opts.teams.length,
      rosterSize: opts.rosterSize ?? maxRoster,
      scoring: { receptionPoints: opts.receptionPoints ?? 0.5, passTdPoints: 4 },
      lineupSlots: slots,
    },
    teams: opts.teams.map((t) => ({ id: t.id, name: t.name, players: t.players })),
    userTeamId: opts.userTeamId,
    userTeamDetection: "manual",
    availablePlayers: opts.availablePlayers ?? [],
  };
}

// ---------------------------------------------------------------------------
// Realistic 10-team league
// ---------------------------------------------------------------------------

// Projection and trade-value curves by positional rank (1 = best). Shapes
// follow the real datasets: RB/WR values fall steeply at the top, QBs and
// TEs are flat after the elite tier.
function curve(position: Position, rank: number): { projection: number; tradeValue: number } {
  switch (position) {
    case "QB": {
      const projection = Math.max(8, 24.5 - 0.75 * rank - (rank > 12 ? 1.5 : 0));
      const tradeValue = rank <= 3 ? 40 - 5 * (rank - 1) : rank <= 12 ? Math.max(4, 24 - 2 * rank) : 1;
      return { projection: r1(projection), tradeValue };
    }
    case "RB": {
      const projection = Math.max(3, 21.5 - 0.42 * rank - (rank > 24 ? 2 : 0));
      const tradeValue = rank <= 2 ? 70 - 4 * (rank - 1) : rank <= 12 ? Math.max(20, 62 - 3.6 * rank) : rank <= 30 ? Math.max(3, 26 - 0.9 * rank) : 1;
      return { projection: r1(projection), tradeValue: Math.round(tradeValue) };
    }
    case "WR": {
      const projection = Math.max(3, 19.5 - 0.33 * rank - (rank > 30 ? 2 : 0));
      const tradeValue = rank <= 3 ? 62 - 4 * (rank - 1) : rank <= 15 ? Math.max(18, 56 - 2.8 * rank) : rank <= 36 ? Math.max(3, 24 - 0.7 * rank) : 1;
      return { projection: r1(projection), tradeValue: Math.round(tradeValue) };
    }
    case "TE": {
      const projection = Math.max(3, 14.5 - 0.7 * rank - (rank > 12 ? 1 : 0));
      const tradeValue = rank <= 2 ? 30 - 6 * (rank - 1) : rank <= 8 ? Math.max(6, 20 - 2 * rank) : 1;
      return { projection: r1(projection), tradeValue };
    }
    default:
      return { projection: 0, tradeValue: 0 };
  }
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

const FIRST = ["Jalen", "Marcus", "Devin", "Tyler", "Aaron", "Chris", "Jordan", "Kyle", "Trey", "Brandon", "Elijah", "Cam", "Derek", "Amari", "Nico", "Zay", "Rome", "Malik", "Isaiah", "Josh"];
const LAST = ["Carter", "Reed", "Bell", "Hayes", "Price", "Ford", "Wells", "Grant", "Cole", "Hunt", "Diaz", "Lane", "Moss", "Pace", "Quinn", "Ross", "Stone", "Tate", "Vance", "Wade"];

function pool(position: Position, count: number, prefix: string): Player[] {
  const out: Player[] = [];
  for (let rank = 1; rank <= count; rank++) {
    const { projection, tradeValue } = curve(position, rank);
    const name = `${FIRST[(rank * 7 + position.length) % FIRST.length]} ${LAST[(rank * 3 + position.charCodeAt(0)) % LAST.length]} (${position}${rank})`;
    out.push(makePlayer(name, position, projection, tradeValue, `fixture:${prefix}${rank}`));
  }
  return out;
}

/**
 * Ten teams, 15-man rosters (1 QB... plus K and D/ST), deliberately varied
 * roster construction:
 *   - team u (the user) is RB-deep with a near-replacement WR2/FLEX;
 *   - "Team Rocket" is WR-deep with a near-replacement RB2;
 *   - "Stars & Scrubs" holds the RB1 and QB1 with weak WR/TE starters;
 *   - "Balanced Depth" has many mid-tier starters and spare depth;
 *   - the rest are snake-drafted from what remains.
 */
export function syntheticLeague(): League {
  counter = 0;
  // Pools are larger than the league's demand so a realistic waiver wire remains.
  const qbs = pool("QB", 22, "qb");
  const rbs = pool("RB", 54, "rb");
  const wrs = pool("WR", 58, "wr");
  const tes = pool("TE", 22, "te");
  const ks = Array.from({ length: 10 }, (_, i) => makePlayer(`Kicker ${i + 1}`, "K", 0, 0, `fixture:k${i + 1}`));
  const dsts = Array.from({ length: 10 }, (_, i) => makePlayer(`Defense ${i + 1}`, "DST", 0, 0, `fixture:dst${i + 1}`));

  const take = (list: Player[], ranks: number[]) => ranks.map((r) => list[r - 1]);
  const used = new Set<string>();
  const claim = (players: Player[]) => {
    players.forEach((p) => used.add(p.id));
    return players;
  };

  const teamsSpec: { id: string; name: string; players: Player[] }[] = [
    {
      id: "u",
      name: "My Team",
      players: claim([...take(qbs, [6]), ...take(rbs, [2, 5, 9, 13, 20]), ...take(wrs, [12, 24, 31, 38]), ...take(tes, [7, 13]), ks[0], dsts[0]]),
    },
    {
      id: "rocket",
      name: "Team Rocket",
      players: claim([...take(qbs, [4]), ...take(rbs, [16, 27, 35]), ...take(wrs, [1, 4, 8, 11, 18, 27]), ...take(tes, [3, 12]), ks[1], dsts[1]]),
    },
    {
      id: "stars",
      name: "Stars & Scrubs",
      players: claim([...take(qbs, [1, 14]), ...take(rbs, [1, 29, 34, 40]), ...take(wrs, [3, 33, 36, 42]), ...take(tes, [10]), ks[2], dsts[2]]),
    },
    {
      id: "depth",
      name: "Balanced Depth",
      players: claim([...take(qbs, [7, 9]), ...take(rbs, [6, 8, 11, 15]), ...take(wrs, [6, 9, 13, 16, 21]), ...take(tes, [4]), ks[3], dsts[3]]),
    },
  ];

  const remaining = (list: Player[]) => list.filter((p) => !used.has(p.id));
  const others = ["Gridiron Gang", "Waiver Warriors", "Flex Appeal", "The Replacements", "End Zone Elite", "Bench Mob"];
  // Snake draft the remaining pool: each team needs 2 QB, 5 RB, 5 WR, 2 TE.
  const needs: Record<string, number> = { QB: 2, RB: 5, WR: 5, TE: 2 };
  const draft: Record<string, Player[]> = {};
  others.forEach((n) => (draft[n] = []));
  const lists: Record<string, Player[]> = { QB: remaining(qbs), RB: remaining(rbs), WR: remaining(wrs), TE: remaining(tes) };
  for (const pos of ["QB", "RB", "WR", "TE"] as Position[]) {
    let order = [...others];
    for (let round = 0; round < needs[pos]; round++) {
      for (const teamName of order) {
        const next = lists[pos].shift();
        if (next) draft[teamName].push(next);
      }
      order = order.reverse();
    }
  }
  others.forEach((name, i) => {
    teamsSpec.push({ id: `t${i + 5}`, name, players: claim([...draft[name], ks[4 + i], dsts[4 + i]]) });
  });

  // Bench Mob keeps one fewer bench player than everyone else so the 15-man
  // roster limit is the same for all teams (an open slot is a waiver add).
  const teams: Team[] = teamsSpec.map((t) => ({ id: t.id, name: t.name, players: t.players.slice(0, 15) }));
  const availablePlayers = [...remaining(qbs), ...remaining(rbs), ...remaining(wrs), ...remaining(tes)]
    .filter((p) => !teams.some((t) => t.players.some((q) => q.id === p.id)))
    .map((p) => ({ ...p, tradeValue: 0, tradeValueSource: "none" as const }));

  return makeLeague({ teams, userTeamId: "u", rosterSize: 15, availablePlayers, teamCount: 10 });
}

// Optimal starting lineup for a roster: the assignment of players to slot
// instances that maximizes total median projection.
//
// Two solvers share one interface:
//   * greedy   – exact when the slot eligibility sets form a laminar family
//                (every pair is disjoint or nested), which covers QB/RB/WR/TE/
//                FLEX/SUPERFLEX/K/DST leagues. Slots are filled narrowest set
//                first, each taking the best remaining eligible player.
//   * hungarian – exact maximum-weight assignment for any eligibility layout
//                (e.g. Sleeper leagues with both RB/WR and WR/TE flexes).
// The solver is chosen once per slot configuration and cached.

import type { LineupSlot, Player } from "../domain/types";
import { expandSlots, type SlotInstance } from "../domain/positions";

export interface LineupAssignment {
  slot: SlotInstance;
  player: Player | null;
  projection: number;
}

export interface OptimalLineup {
  total: number;
  assignments: LineupAssignment[];
  starters: Player[];
  bench: Player[];
}

interface SlotPlan {
  instances: SlotInstance[];
  /** Instance indexes in greedy fill order (narrowest eligibility first). */
  greedyOrder: number[];
  laminar: boolean;
}

const planCache = new WeakMap<LineupSlot[], SlotPlan>();

function isLaminar(instances: SlotInstance[]): boolean {
  const sets = instances.map((i) => new Set(i.eligible));
  for (let a = 0; a < sets.length; a++) {
    for (let b = a + 1; b < sets.length; b++) {
      const A = sets[a];
      const B = sets[b];
      let inter = 0;
      for (const p of A) if (B.has(p)) inter++;
      if (inter === 0) continue;
      const nested = inter === A.size || inter === B.size;
      if (!nested) return false;
    }
  }
  return true;
}

function planFor(slots: LineupSlot[]): SlotPlan {
  let plan = planCache.get(slots);
  if (plan) return plan;
  const instances = expandSlots(slots);
  const greedyOrder = instances
    .map((inst, i) => i)
    .sort((a, b) => instances[a].eligible.length - instances[b].eligible.length || a - b);
  plan = { instances, greedyOrder, laminar: isLaminar(instances) };
  planCache.set(slots, plan);
  return plan;
}

function projectionOf(p: Player): number {
  return p.projection > 0 ? p.projection : 0;
}

function greedy(players: Player[], plan: SlotPlan): (Player | null)[] {
  // Sorted descending once; each slot scans for the first unused eligible.
  const sorted = players
    .map((p, i) => ({ p, i, v: projectionOf(p) }))
    .sort((a, b) => b.v - a.v || a.i - b.i);
  const used = new Array<boolean>(sorted.length).fill(false);
  const chosen = new Array<Player | null>(plan.instances.length).fill(null);
  for (const idx of plan.greedyOrder) {
    const eligible = plan.instances[idx].eligible;
    for (let k = 0; k < sorted.length; k++) {
      if (used[k]) continue;
      if (eligible.includes(sorted[k].p.position)) {
        used[k] = true;
        chosen[idx] = sorted[k].p;
        break;
      }
    }
  }
  return chosen;
}

// Maximum-weight assignment via the Hungarian algorithm (O(n^2 m)). Rows are
// slot instances, columns are players (padded with dummies so cols >= rows).
function hungarian(players: Player[], plan: SlotPlan): (Player | null)[] {
  const n = plan.instances.length;
  const m = Math.max(n, players.length);
  const NEG = -1e9;
  // cost = -weight, so minimizing cost maximizes projection.
  const cost: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row = new Array<number>(m);
    const eligible = plan.instances[r].eligible;
    for (let c = 0; c < m; c++) {
      if (c >= players.length) row[c] = 0; // dummy player = empty slot
      else if (eligible.includes(players[c].position)) row[c] = -projectionOf(players[c]);
      else row[c] = -NEG; // forbidden: huge cost
    }
    cost.push(row);
  }
  // Standard 1-indexed implementation (e-maxx).
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Infinity);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const chosen = new Array<Player | null>(n).fill(null);
  for (let j = 1; j <= m; j++) {
    const r = p[j];
    if (r === 0) continue;
    const c = j - 1;
    if (c < players.length && cost[r - 1][c] !== -NEG) chosen[r - 1] = players[c];
  }
  return chosen;
}

/**
 * Compute the lineup that maximizes total median projection.
 * Players with no projection count as 0 but can still fill a slot (a rostered
 * K, for example) so lineups are complete.
 */
export function optimizeLineup(players: Player[], slots: LineupSlot[]): OptimalLineup {
  const plan = planFor(slots);
  const chosen = plan.laminar ? greedy(players, plan) : hungarian(players, plan);
  const starterIds = new Set<string>();
  const assignments: LineupAssignment[] = plan.instances.map((slot, i) => {
    const player = chosen[i];
    if (player) starterIds.add(player.id);
    return { slot, player, projection: player ? projectionOf(player) : 0 };
  });
  const total = assignments.reduce((n, a) => n + a.projection, 0);
  return {
    total,
    assignments,
    starters: assignments.map((a) => a.player).filter((p): p is Player => p !== null),
    bench: players.filter((p) => !starterIds.has(p.id)),
  };
}

/** Total only (same result as optimizeLineup(...).total, marginally cheaper). */
export function optimalTotal(players: Player[], slots: LineupSlot[]): number {
  const plan = planFor(slots);
  const chosen = plan.laminar ? greedy(players, plan) : hungarian(players, plan);
  let total = 0;
  for (const p of chosen) if (p) total += projectionOf(p);
  return total;
}

/** Exposed for tests: which solver a slot configuration uses. */
export function solverFor(slots: LineupSlot[]): "greedy" | "hungarian" {
  return planFor(slots).laminar ? "greedy" : "hungarian";
}

/** Brute-force reference used only by tests to validate both solvers. */
export function bruteForceOptimalTotal(players: Player[], slots: LineupSlot[]): number {
  const instances = expandSlots(slots);
  const used = new Array<boolean>(players.length).fill(false);
  let best = 0;
  const rec = (i: number, acc: number) => {
    if (i === instances.length) {
      if (acc > best) best = acc;
      return;
    }
    // leave empty
    rec(i + 1, acc);
    for (let k = 0; k < players.length; k++) {
      if (used[k] || !instances[i].eligible.includes(players[k].position)) continue;
      used[k] = true;
      rec(i + 1, acc + projectionOf(players[k]));
      used[k] = false;
    }
  };
  rec(0, 0);
  return best;
}

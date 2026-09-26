import { describe, expect, it } from "vitest";
import { makePlayer } from "../src/data/fixtures/syntheticLeague";
import { slot, standardLineup } from "../src/domain/positions";
import type { LineupSlot, Player, Position } from "../src/domain/types";
import { bruteForceOptimalTotal, optimizeLineup, solverFor } from "../src/optimization/lineupOptimizer";

const P = (name: string, pos: Position, proj: number) => makePlayer(name, pos, proj, 10);

describe("lineup optimizer", () => {
  it("fills dedicated slots with the best players and FLEX with the best remaining RB/WR/TE", () => {
    const roster = [
      P("QB1", "QB", 20), P("QB2", "QB", 18),
      P("RB1", "RB", 18), P("RB2", "RB", 17), P("RB3", "RB", 16),
      P("WR1", "WR", 18), P("WR2", "WR", 17), P("WR3", "WR", 12),
      P("TE1", "TE", 12), P("TE2", "TE", 11),
      P("K", "K", 0), P("DST", "DST", 0),
    ];
    const lineup = optimizeLineup(roster, standardLineup());
    const flex = lineup.assignments.find((a) => a.slot.slotId === "FLEX")!;
    expect(flex.player!.name).toBe("RB3");
    expect(lineup.total).toBeCloseTo(20 + 18 + 17 + 18 + 17 + 12 + 16, 5);
    expect(lineup.starters).toHaveLength(9);
    expect(lineup.bench.map((p) => p.name).sort()).toEqual(["QB2", "TE2", "WR3"]);
  });

  it("puts the second QB into SUPERFLEX when he beats the flex-eligible skill players", () => {
    const slots: LineupSlot[] = [slot("QB"), slot("RB", 2), slot("WR", 2), slot("TE"), slot("FLEX"), slot("SUPERFLEX")];
    const roster = [
      P("QB1", "QB", 22), P("QB2", "QB", 19),
      P("RB1", "RB", 15), P("RB2", "RB", 14), P("RB3", "RB", 13),
      P("WR1", "WR", 15), P("WR2", "WR", 14), P("WR3", "WR", 11),
      P("TE1", "TE", 9),
    ];
    const lineup = optimizeLineup(roster, slots);
    const sf = lineup.assignments.find((a) => a.slot.slotId === "SUPERFLEX")!;
    const flex = lineup.assignments.find((a) => a.slot.slotId === "FLEX")!;
    expect(sf.player!.name).toBe("QB2");
    expect(flex.player!.name).toBe("RB3");
    expect(lineup.total).toBe(22 + 19 + 15 + 14 + 13 + 15 + 14 + 9);
  });

  it("does not put a QB in FLEX and leaves a slot empty when nobody is eligible", () => {
    const roster = [P("QB1", "QB", 25), P("QB2", "QB", 24), P("RB1", "RB", 10)];
    const lineup = optimizeLineup(roster, standardLineup());
    const flex = lineup.assignments.find((a) => a.slot.slotId === "FLEX")!;
    expect(flex.player).toBeNull();
    expect(lineup.total).toBe(35);
  });

  it("uses greedy for laminar slot families and Hungarian for overlapping flexes", () => {
    expect(solverFor(standardLineup())).toBe("greedy");
    const overlapping: LineupSlot[] = [slot("RB"), slot("WR"), slot("RB/WR"), slot("WR/TE")];
    expect(solverFor(overlapping)).toBe("hungarian");
  });

  it("matches brute force on random rosters for both solvers", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const positions: Position[] = ["QB", "RB", "WR", "TE"];
    const configs: LineupSlot[][] = [
      [slot("QB"), slot("RB", 2), slot("WR", 2), slot("TE"), slot("FLEX")],
      [slot("QB"), slot("RB"), slot("WR"), slot("RB/WR"), slot("WR/TE"), slot("FLEX")],
      [slot("QB"), slot("RB"), slot("WR", 2), slot("TE"), slot("SUPERFLEX"), slot("FLEX")],
    ];
    for (let trial = 0; trial < 40; trial++) {
      const roster: Player[] = [];
      const n = 7 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) roster.push(P(`p${i}`, positions[Math.floor(rand() * 4)], Math.round(rand() * 250) / 10));
      for (const cfg of configs) {
        expect(optimizeLineup(roster, cfg).total).toBeCloseTo(bruteForceOptimalTotal(roster, cfg), 6);
      }
    }
  });

  it("Hungarian handles overlapping flexes where greedy would fail", () => {
    // RB/WR and WR/TE: the only WR must go to WR/TE so the RB can take RB/WR.
    const slots: LineupSlot[] = [slot("RB/WR"), slot("WR/TE")];
    const roster = [P("WR", "WR", 10), P("RB", "RB", 9)];
    const lineup = optimizeLineup(roster, slots);
    expect(lineup.total).toBe(19);
  });
});

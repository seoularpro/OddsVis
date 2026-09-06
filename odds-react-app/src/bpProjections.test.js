import { computeBPProjections, BP_BASE } from "./bpProjections";

// Build a /props-shaped entry for one market.
const prop = (market_id, name, position, line, odds, proj = 0) => ({
  market_id,
  participant: { name, player: { position } },
  over: { consensus_line: line, consensus_odds: odds },
  projection: { value: proj },
});
const wr = (name, recYds, recs, tdOdds = -150) => [
  prop(78, name, "WR", 0.5, tdOdds),
  prop(105, name, "WR", recYds, -114),
  prop(104, name, "WR", recs, -114),
];

const FIRST = {
  props: [
    ...wr("Steady Guy", 60.5, 4.5),
    ...wr("Rising Guy", 50.5, 3.5),
    // complete in the first file; loses his receptions line later
    ...wr("Dropped Recs", 70.5, 5.5),
    // never complete: no receptions line all week
    prop(78, "Never Complete", "WR", 0.5, -150),
    prop(105, "Never Complete", "WR", 80.5, -114),
  ],
};
const LAST = {
  props: [
    ...wr("Steady Guy", 60.5, 4.5),
    ...wr("Rising Guy", 70.5, 5.5),
    prop(78, "Dropped Recs", "WR", 0.5, -150),
    prop(105, "Dropped Recs", "WR", 70.5, -114),
    prop(78, "Never Complete", "WR", 0.5, -150),
    prop(105, "Never Complete", "WR", 80.5, -114),
    // only appears in the last file
    ...wr("Late Add", 65.5, 4.5),
  ],
};

function mockFiles(files) {
  const calls = [];
  global.fetch = jest.fn(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || "GET" });
    const body = files[url];
    if (body === undefined) {
      return { ok: false, status: 404, headers: { get: () => "" } };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => body,
      text: async () => String(body),
    };
  });
  return calls;
}

// Carry file: union of the week's props at their last posted value, as
// written by scripts/merge-bp-carry.sh. "Midweek Guy" was only ever complete
// in snapshots that are neither first nor last.
const withIndex = (entries, carry_index) => entries.map((p) => ({ ...p, carry_index }));
const CARRY = {
  last_index: 3,
  props: [
    ...withIndex(wr("Steady Guy", 60.5, 4.5), 3),
    ...withIndex(wr("Rising Guy", 70.5, 5.5), 3),
    ...withIndex(
      [prop(78, "Dropped Recs", "WR", 0.5, -150), prop(105, "Dropped Recs", "WR", 70.5, -114)],
      3
    ),
    ...withIndex([prop(104, "Dropped Recs", "WR", 5.5, -114)], 1),
    ...withIndex(
      [prop(78, "Never Complete", "WR", 0.5, -150), prop(105, "Never Complete", "WR", 80.5, -114)],
      3
    ),
    ...withIndex(wr("Late Add", 65.5, 4.5), 3),
    ...withIndex(wr("Midweek Guy", 55.5, 4.5), 2),
  ],
  offers: [],
};

const week = 5;
const year = 2026;
const url = (i) => `${BP_BASE}${year}week${week}${i}`;
const idxUrl = `${BP_BASE}${year}lastIndex${week}.txt`;
const carryUrl = `${BP_BASE}${year}carry${week}.json`;

afterEach(() => {
  delete global.fetch;
});

describe("computeBPProjections (first + last file only)", () => {
  it("loads just the first and last file when the lastIndex hint exists", async () => {
    const calls = mockFiles({
      [url(0)]: FIRST,
      [url(1)]: { props: [] },
      [url(2)]: { props: [] },
      [url(3)]: LAST,
      [idxUrl]: "3",
    });
    const { finalList, lastIndex } = await computeBPProjections({
      pos: 2,
      mode: 0,
      week,
      year,
    });
    expect(lastIndex).toBe(3);
    const fetched = calls.map((c) => c.url).sort();
    expect(fetched).toEqual([url(0), url(3), idxUrl, carryUrl].sort());
    expect(finalList.length).toBeGreaterThan(0);
  });

  it("falls back to HEAD probing when there is no lastIndex hint", async () => {
    const calls = mockFiles({
      [url(0)]: FIRST,
      [url(1)]: { props: [] },
      [url(2)]: LAST,
    });
    const { lastIndex } = await computeBPProjections({ pos: 2, mode: 0, week, year });
    expect(lastIndex).toBe(2);
    const gets = calls.filter((c) => c.method === "GET").map((c) => c.url).sort();
    expect(gets).toEqual([url(0), url(2), idxUrl, carryUrl].sort());
    // the middle file is only probed, never downloaded
    expect(calls.find((c) => c.url === url(1)).method).toBe("HEAD");
  });

  it("computes Δ between the first and last file and flags stale players", async () => {
    mockFiles({ [url(0)]: FIRST, [url(3)]: LAST, [idxUrl]: "3" });
    const { finalList, missingList } = await computeBPProjections({
      pos: 2,
      mode: 0,
      week,
      year,
    });
    const byName = new Map(finalList);

    const steady = byName.get("Steady Guy");
    expect(steady.change).toBeCloseTo(0, 6);
    expect(steady.stale).toBe(false);

    const rising = byName.get("Rising Guy");
    // +20 rec yds (2.0 pts) and +2 receptions at half PPR (1.0 pt)
    expect(rising.change).toBeCloseTo(3.0, 1);
    expect(rising.stale).toBe(false);

    // Kept in the table using his earlier receptions value, and flagged.
    const dropped = byName.get("Dropped Recs");
    expect(dropped).toBeDefined();
    expect(dropped.stale).toBe(true);
    expect(dropped.missingLatest).toEqual(["Recs"]);
    expect(dropped.ev).toBeCloseTo(steady.ev + 1.0 + 0.5, 1);
    expect(dropped.change).toBeCloseTo(0, 6);

    const late = byName.get("Late Add");
    expect(late.stale).toBe(false);
    expect(late.change).toBe(0);

    // Never complete this week -> awaiting-props list, not the table.
    expect(byName.has("Never Complete")).toBe(false);
    expect(missingList.map((m) => m[0])).toEqual(["Never Complete"]);
    expect(missingList[0][1]).toContain("Recs");

    // Sorted by projection, descending.
    const evs = finalList.map(([, v]) => v.ev);
    expect(evs).toEqual([...evs].sort((a, b) => b - a));
  });

  it("keeps a player who was only complete mid-week when a carry file exists", async () => {
    mockFiles({ [url(0)]: FIRST, [url(3)]: LAST, [idxUrl]: "3", [carryUrl]: CARRY });
    const { finalList, missingList } = await computeBPProjections({
      pos: 2,
      mode: 0,
      week,
      year,
    });
    const byName = new Map(finalList);

    // Absent from both the first and last file, present only in the carry.
    const midweek = byName.get("Midweek Guy");
    expect(midweek).toBeDefined();
    expect(midweek.stale).toBe(true);
    expect(midweek.missingLatest).toEqual(["AnyTD", "RecYds", "Recs"]);
    expect(midweek.lastSeen).toEqual({ AnyTD: 2, RecYds: 2, Recs: 2 });
    expect(midweek.change).toBe(0);

    // The carried receptions value comes with the snapshot it was seen in.
    const dropped = byName.get("Dropped Recs");
    expect(dropped.stale).toBe(true);
    expect(dropped.lastSeen).toEqual({ Recs: 1 });
    expect(dropped.ev).toBeCloseTo(byName.get("Steady Guy").ev + 1.5, 1);

    // Δ is still first vs. last, unaffected by the carry.
    expect(byName.get("Rising Guy").change).toBeCloseTo(3.0, 1);
    expect(byName.get("Rising Guy").stale).toBe(false);
    expect(missingList.map((m) => m[0])).toEqual(["Never Complete"]);
  });

  it("keeps stale players but hides the markers for seasons before 2026", async () => {
    // Heavily shaded over so the yardage line earns an odds-weighted marker.
    const shaded = [
      prop(78, "Shaded Guy", "WR", 0.5, -150),
      prop(105, "Shaded Guy", "WR", 39.5, 285),
      prop(104, "Shaded Guy", "WR", 3.5, -114),
    ];
    const files = (y) => ({
      [`${BP_BASE}${y}week${week}0`]: { props: [...FIRST.props, ...shaded] },
      [`${BP_BASE}${y}week${week}3`]: { props: [...LAST.props, ...shaded] },
      [`${BP_BASE}${y}lastIndex${week}.txt`]: "3",
      [`${BP_BASE}${y}carry${week}.json`]: CARRY,
    });

    mockFiles(files(2025));
    const old = new Map(
      (await computeBPProjections({ pos: 2, mode: 0, week, year: 2025 })).finalList
    );
    // Same rows as 2026, same values, just no markers.
    expect(old.has("Midweek Guy")).toBe(true);
    expect(old.has("Dropped Recs")).toBe(true);
    old.forEach((v) => {
      expect(v.stale).toBe(false);
      expect(v.missingLatest).toEqual([]);
      expect(v.adjustedProps).toEqual([]);
    });

    mockFiles(files(2026));
    const current = new Map(
      (await computeBPProjections({ pos: 2, mode: 0, week, year: 2026 })).finalList
    );
    expect(current.get("Midweek Guy").stale).toBe(true);
    expect(current.get("Shaded Guy").adjustedProps).toEqual(["RecYds"]);
    expect(old.get("Shaded Guy").ev).toBeCloseTo(current.get("Shaded Guy").ev, 6);
  });

  it("reports no Δ and no stale players when the week has a single file", async () => {
    mockFiles({ [url(0)]: FIRST });
    const { finalList, lastIndex } = await computeBPProjections({
      pos: 2,
      mode: 0,
      week,
      year,
    });
    expect(lastIndex).toBe(0);
    expect(finalList.length).toBe(3);
    finalList.forEach(([, v]) => {
      expect(v.change).toBe(0);
      expect(v.stale).toBe(false);
    });
  });
});

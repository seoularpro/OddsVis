import { computeBPProjections, projectionsFromFiles, BP_BASE } from "./bpProjections";

// Build a /props-shaped entry for one market.
const prop = (market_id, name, position, line, odds) => ({
  market_id,
  participant: { name, player: { position } },
  over: { consensus_line: line, consensus_odds: odds },
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
  fetched_at: "2026-10-08T16:50:04Z",
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

  it("reports when the loaded snapshot was fetched, from the carry file", async () => {
    mockFiles({ [url(0)]: FIRST, [url(3)]: LAST, [idxUrl]: "3", [carryUrl]: CARRY });
    const { lastFetched } = await computeBPProjections({ pos: 2, mode: 0, week, year });
    expect(lastFetched).toBe("2026-10-08T16:50:04Z");
  });

  it("omits the fetch time when the carry is out of step with the loaded file", async () => {
    // The hint points at a newer file than the CDN serves, so the loader
    // falls back to snapshot 2 while the carry describes snapshot 3.
    mockFiles({ [url(0)]: FIRST, [url(2)]: LAST, [idxUrl]: "3", [carryUrl]: CARRY });
    const { lastIndex, lastFetched } = await computeBPProjections({ pos: 2, mode: 0, week, year });
    expect(lastIndex).toBe(2);
    expect(lastFetched).toBeNull();
  });

  it("omits the fetch time for weeks without a carry file", async () => {
    mockFiles({ [url(0)]: FIRST, [url(3)]: LAST, [idxUrl]: "3" });
    const { lastFetched } = await computeBPProjections({ pos: 2, mode: 0, week, year });
    expect(lastFetched).toBeNull();
  });

  it("keeps stale players but hides the markers for seasons before 2026", async () => {
    // Heavily shaded over so the yardage line earns an odds-weighted marker.
    const shaded = [
      prop(78, "Shaded Guy", "WR", 0.5, -150),
      prop(105, "Shaded Guy", "WR", 39.5, 200),
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

describe("garbled prices", () => {
  const qb = (name, passTD, passTdOdds, book) => [
    prop(78, name, "QB", 0.5, 400),
    prop(107, name, "QB", 10.5, -114),
    { ...prop(102, name, "QB", passTD, passTdOdds), ...(book && { over: { consensus_line: passTD, consensus_odds: passTdOdds, ...book } }) },
    prop(103, name, "QB", 240.5, -114),
    prop(101, name, "QB", 0.5, 120),
  ];
  const run = (files, pos) =>
    new Map(projectionsFromFiles(files, { pos, mode: 0, year: 2026 }).finalList);

  it("drops a consensus price that disagrees with the book on the same line", () => {
    const first = { props: qb("Goff", 1.5, -185) };
    // the 1.5 line's price posted on the 2.5 line; the book prices 2.5 at +169
    const last = { props: qb("Goff", 2.5, -185, { line: 2.5, odds: 169 }) };
    const goff = run({ first, last, carry: last, lastIndex: 7 }, 0).get("Goff");
    const clean = run({ first, last: null, carry: null, lastIndex: 0 }, 0).get("Goff");
    expect(goff.ev).toBeCloseTo(clean.ev, 6);
    // not flagged like a prop that's missing from the latest odds
    expect(goff.stale).toBe(false);
    expect(goff.missingLatest).toEqual([]);
  });

  it("keeps a consensus price that roughly matches the book", () => {
    const last = { props: qb("Goff", 1.5, -185, { line: 1.5, odds: -150 }) };
    const goff = run({ first: last, last, carry: null, lastIndex: 1 }, 0).get("Goff");
    expect(goff.stale).toBe(false);
  });

  it("drops alt-line prices on yardage props, including /offers-only ones", () => {
    const first = { props: wr("Flowers", 71.5, 5.5) };
    const last = {
      props: [prop(78, "Flowers", "WR", 0.5, -150), prop(104, "Flowers", "WR", 5.5, -114)],
      offers: [{ market_id: 105, name: "Flowers", position: "WR", odds: -300, line: 71 }],
    };
    const flowers = run({ first, last, carry: null, lastIndex: 7 }, 2).get("Flowers");
    const clean = run({ first, last: null, carry: null, lastIndex: 0 }, 2).get("Flowers");
    expect(flowers.ev).toBeCloseTo(clean.ev, 6);
    expect(flowers.stale).toBe(false);
  });
});

describe("count props and anytime TD", () => {
  const VIG = 1.0623;
  const dec = (a) => (a > 0 ? a / 100 + 1 : 100 / Math.abs(a) + 1);
  const pOver = (a) => Number(dec(a).toFixed(2)) ** -1 / VIG;
  const qb = (name, { passTD = [1.5, -110], ints = [0.5, -110], anyTD = 400 } = {}) => [
    prop(78, name, "QB", 0.5, anyTD),
    prop(107, name, "QB", 10.5, -114),
    prop(102, name, "QB", passTD[0], passTD[1]),
    prop(103, name, "QB", 240.5, -114),
    prop(101, name, "QB", ints[0], ints[1]),
  ];
  const evOf = (props) => {
    const file = { props };
    return new Map(
      projectionsFromFiles({ first: file, last: null, carry: null, lastIndex: 0 }, { pos: 0, mode: 0, year: 2026 }).finalList
    );
  };
  // Everything but the prop under test, so differences isolate one market.
  const base = evOf(qb("Base")).get("Base").ev;

  it("reads a count line as the Poisson rate behind the over price", () => {
    // 1.5 pass TDs at -110: ~1.66 TDs, not 1.49.
    const even = evOf(qb("Even", { passTD: [1.5, -110] })).get("Even").ev;
    expect(even - base).toBeCloseTo(0, 6);
    expect(base).toBeGreaterThan(0);
    // The same price on the 2.5 line is a full TD more, +150 on 2.5 is not.
    const high = evOf(qb("High", { passTD: [2.5, -110] })).get("High").ev;
    const plus = evOf(qb("Plus", { passTD: [2.5, 150] })).get("Plus").ev;
    expect(high - even).toBeCloseTo(4 * 1.0, 1);
    expect(plus - even).toBeCloseTo(4 * (2.2 - 1.66), 1);
    // A heavily favored over on 1.5 (-200) is worth ~2.13 TDs.
    const fav = evOf(qb("Fav", { passTD: [1.5, -200] })).get("Fav").ev;
    expect(fav - even).toBeCloseTo(4 * (2.13 - 1.66), 1);
  });

  it("scores interceptions the same way, as a negative", () => {
    const fewer = evOf(qb("Fewer", { ints: [0.5, 150] })).get("Fewer").ev;
    const more = evOf(qb("More", { ints: [0.5, -200] })).get("More").ev;
    // -ln(1 - p) picks per game: ~0.47 at +150 vs ~0.99 at -200
    expect(fewer - base).toBeCloseTo(-2 * (-Math.log(1 - pOver(150)) - -Math.log(1 - pOver(-110))), 2);
    expect(more).toBeLessThan(fewer);
  });

  it("counts the multi-TD games behind an anytime-TD price", () => {
    const coin = evOf(qb("Coin", { anyTD: 100 })).get("Coin").ev;
    const long = evOf(qb("Long", { anyTD: 400 })).get("Long").ev;
    // +100 -> p ~0.47 -> ~0.64 expected TDs (3.8 pts), not 0.47 (2.8 pts)
    expect(coin - long).toBeCloseTo(6 * (-Math.log(1 - pOver(100)) - -Math.log(1 - pOver(400))), 2);
  });

  it("caps the anytime-TD probability where consensus prices stop being real", () => {
    const heavy = evOf(qb("Heavy", { anyTD: -400 })).get("Heavy").ev; // p = 0.75
    const absurd = evOf(qb("Absurd", { anyTD: -2000 })).get("Absurd").ev; // p = 0.90 -> 0.8
    expect(absurd - heavy).toBeCloseTo(6 * (-Math.log(1 - 0.8) - -Math.log(1 - pOver(-400))), 2);
  });
});

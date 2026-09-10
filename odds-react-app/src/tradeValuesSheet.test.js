import { parseTradeValueGrid } from "./tradeValuesSheet";

// Mirrors the published sheet: a position label row, a header row, then one
// row per trade value with a player per position column.
const GRID = [
  ["", "RB", "", "WR", "", "TE", "", "QB", ""],
  ["Trade Value", "Player Name", "Trend", "Player Name", "Trend", "Player Name", "Trend", "Player Name", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["70", "Bijan Robinson", "", "", "", "", "", "", ""],
  ["25", "", "", "Tee Higgins", "", "Trey McBride", "", "Josh Allen", ""],
  ["", "", "", "", "", "", "", "", ""],
];

test("keeps the sheet grid and labels each column", () => {
  const { rows, headerIdx, columns } = parseTradeValueGrid(GRID);
  expect(headerIdx).toBe(1);
  // trailing empty column and trailing blank row are dropped, blank row inside kept
  expect(rows).toEqual(GRID.slice(0, 5).map((r) => r.slice(0, 8)));
  expect(columns).toEqual([
    { kind: "value" },
    { kind: "name", pos: 1, posLabel: "RB" },
    { kind: "trend" },
    { kind: "name", pos: 2, posLabel: "WR" },
    { kind: "trend" },
    { kind: "name", pos: 3, posLabel: "TE" },
    { kind: "trend" },
    { kind: "name", pos: 0, posLabel: "QB" },
  ]);
});

test("returns nothing without a Trade Value header", () => {
  expect(parseTradeValueGrid([["a", "b"], ["1", "2"]])).toEqual({
    rows: [],
    headerIdx: -1,
    columns: [],
  });
});

// The published per-combination JSON (built by scripts/trade-values) must render
// through the same grid parser as the Google Sheet.
const fs = require("fs");
const path = require("path");
const { fetchTradeValueSet, tradeValueFileFor } = require("./tradeValuesSheet");

test("dropdown values map to the hosted JSON files", () => {
  expect(tradeValueFileFor(0, 10)).toMatch(/TradeValues_HalfPPR_10team\.json$/);
  expect(tradeValueFileFor(1, 8)).toMatch(/TradeValues_Standard_8team\.json$/);
  expect(tradeValueFileFor(2, 12)).toMatch(/TradeValues_FullPPR_12team\.json$/);
});

test("a published set parses into the sheet layout", async () => {
  const file = path.join(__dirname, "../../TradeValueSheets/json/TradeValues_FullPPR_12team.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => data }));
  const { rows, headerIdx, columns } = await fetchTradeValueSet(2, 12);
  expect(global.fetch).toHaveBeenCalledWith(tradeValueFileFor(2, 12));
  expect(headerIdx).toBe(1);
  expect(columns.map((c) => c.kind)).toEqual(["value", "name", "trend", "name", "trend", "name", "trend", "name"]);
  expect(columns[1]).toMatchObject({ kind: "name", pos: 1, posLabel: "RB" });
  expect(rows.length).toBe(2 + data.rows.length);
  expect(rows[2][0]).toBe(String(data.rows[0][0]));
  expect(rows[2][1]).toBe("Bijan Robinson");
});

// Trade values come from a published (File > Share > Publish to web) Google
// Sheet laid out as one "Trade Value" column followed by a Player Name (and
// optional Trend) column per position:
//
//   |             | RB          |       | WR          |       | TE  ... | QB          |
//   | Trade Value | Player Name | Trend | Player Name | Trend | ...     | Player Name |
//   | 70          | Bijan ...   |       |             |       |         |             |
//
// The pubhtml page itself is a shell that loads the actual table from a
// nested "/pubhtml/sheet" endpoint, which returns plain HTML and sends CORS
// headers, so that is what gets fetched and parsed here. The grid is kept
// as-is so the page can render the sheet's own layout.

export const PUBLISHED_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQeoIhwXWGaj4O8NRSQZo-sBpVFHboSPYaqic8F60xALMLbKJ5Xq6p5SOd3gnH645cRHakYimmdzQoB/pubhtml?gid=1217119222&single=true";

export const SHEET_HTML_URL = PUBLISHED_SHEET_URL.replace(
  "/pubhtml?",
  "/pubhtml/sheet?headers=false&"
);

const POSITION_CODE = { QB: 0, RB: 1, WR: 2, TE: 3 };

// Cell text of every data row (the row-number <th> is skipped).
function gridFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("tbody tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td) =>
      (td.textContent || "").replace(/\s+/g, " ").trim()
    )
  );
}

const isBlankRow = (row) => row.every((cell) => cell === "");

/**
 * Describe the sheet grid without changing its shape.
 * @param {string[][]} grid
 * @returns {{
 *   rows: string[][],           // the grid, trailing empty rows/columns removed
 *   headerIdx: number,          // index of the "Trade Value | Player Name | ..." row
 *   columns: { kind: "value"|"name"|"trend"|"other", pos?: number, posLabel?: string }[]
 * }}
 */
export function parseTradeValueGrid(grid) {
  const headerIdx = grid.findIndex((row) =>
    row.some((cell) => /^trade value$/i.test(cell))
  );
  if (headerIdx < 0) return { rows: [], headerIdx: -1, columns: [] };

  const header = grid[headerIdx];
  const posRow = headerIdx > 0 ? grid[headerIdx - 1] : [];

  // Drop columns that are empty in every row, then trailing blank rows.
  let lastCol = -1;
  grid.forEach((row) =>
    row.forEach((cell, i) => {
      if (cell !== "" && i > lastCol) lastCol = i;
    })
  );
  let rows = grid.map((row) => {
    const out = row.slice(0, lastCol + 1);
    while (out.length < lastCol + 1) out.push("");
    return out;
  });
  while (rows.length && isBlankRow(rows[rows.length - 1])) rows.pop();

  // Each "Player Name" column belongs to the nearest position label at or
  // before it on the row above; a "Trend" column directly after it is that
  // position's trend column.
  const columns = header.slice(0, lastCol + 1).map((cell, col) => {
    if (/^trade value$/i.test(cell)) return { kind: "value" };
    if (/^player name$/i.test(cell)) {
      for (let c = col; c >= 0; c--) {
        const label = (posRow[c] || "").toUpperCase();
        if (POSITION_CODE[label] !== undefined) {
          return { kind: "name", pos: POSITION_CODE[label], posLabel: label };
        }
      }
      return { kind: "name" };
    }
    if (/^trend$/i.test(cell)) return { kind: "trend" };
    return { kind: "other" };
  });

  return { rows, headerIdx, columns };
}

// ---------------------------------------------------------------------------
// Published Scoring x League-size sets. scripts/trade-values/build_trade_values.py
// derives them from the sheet above and the GitHub Action commits one JSON file
// per combination to TradeValueSheets/json/; the toolbar dropdowns map onto
// those files. Override the base (e.g. "/TradeValueSheets/json/" served from
// public/) with REACT_APP_TRADE_VALUES_BASE to test locally generated files.
export const TRADE_VALUES_BASE =
  process.env.REACT_APP_TRADE_VALUES_BASE ||
  "https://raw.githubusercontent.com/seoularpro/OddsVis/main/TradeValueSheets/json/";

// Scoring select value (same codes as the Projections page) -> file key.
export const SCORING_KEYS = { 0: "HalfPPR", 1: "Standard", 2: "FullPPR" };
export const LEAGUE_SIZES = [8, 10, 12];

export function tradeValueFileFor(scoringMode, leagueSize) {
  return `${TRADE_VALUES_BASE}TradeValues_${SCORING_KEYS[scoringMode]}_${leagueSize}team.json`;
}

/**
 * Load one published set and return it in the same shape as fetchTradeValues(),
 * so the page renders it with the sheet's own layout.
 */
export async function fetchTradeValueSet(scoringMode, leagueSize) {
  const response = await fetch(tradeValueFileFor(scoringMode, leagueSize));
  if (!response.ok) {
    throw new Error(`Trade value set request failed (${response.status})`);
  }
  const data = await response.json();
  if (!Array.isArray(data.rows) || !Array.isArray(data.header)) {
    throw new Error("Trade value set has an unexpected shape");
  }
  const grid = [
    (data.positionRow || []).map(String),
    data.header.map(String),
    ...data.rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)))),
  ];
  return { ...parseTradeValueGrid(grid), generatedAt: data.generatedAt || null };
}

export async function fetchTradeValues() {
  const response = await fetch(SHEET_HTML_URL);
  if (!response.ok) {
    throw new Error(`Trade value sheet request failed (${response.status})`);
  }
  return parseTradeValueGrid(gridFromHtml(await response.text()));
}

// Weekly median projections from BettingPros consensus props.
//
// Extracted from TotalContainer so other views (e.g. the ESPN lineup import)
// can compute the exact same numbers. It takes the season as a parameter and
// returns results instead of setting state.
//
// Only the FIRST and LAST data file of the week are loaded (a week can have
// well over a hundred snapshots, and loading every one made the page crawl),
// plus the week's CARRY file, which the fetch workflow maintains as the union
// of every prop seen so far this week at its last posted value (see
// scripts/merge-bp-carry.sh):
//   - the last file supplies the current projection,
//   - the first file supplies the baseline for the Δ column,
//   - the carry file supplies the last posted value for any prop missing
//     from the last file; a player who is complete in the carry but not in
//     the last file is kept and flagged `stale` so the table can highlight
//     him. Weeks without a carry file fall back to the first file for this.

import { UNIVERSAL_VIG } from "./constants";
import { americanToDecimal, impliedYards, isFetchable } from "./util";

// Base URL for the BettingPros data files. Defaults to the committed files on
// GitHub; override with REACT_APP_BP_BASE (e.g. "/BettingProsFiles/" served
// from public/) to test locally-generated files before committing them.
export const BP_BASE =
  process.env.REACT_APP_BP_BASE ||
  "https://raw.githubusercontent.com/seoularpro/OddsVis/main/BettingProsFiles/";

// The stale-player and odds-weighted-line markers only apply from this season
// on. Earlier seasons still use the same math and keep the same players, but
// are shown without the markers or their footnotes.
export const MARKERS_FROM_SEASON = 2026;

// Same name cleanup the projection parsers apply to BettingPros names; use it
// on names from other sources (ESPN) before looking up a projection.
export function normalizePlayerName(name) {
  return (name || "")
    .replace(/\./g, "")
    .replace(/ jr/i, "")
    .replace(/ sr/i, "")
    .replace(/ Jr/i, "");
}

const POSITION_CODE = { QB: 0, RB: 1, WR: 2, TE: 3 };

// Prop keys, their BettingPros market ids, and the label used in the
// "missing props" messages.
const PROPS = {
  anyTD: { market: 78, label: "AnyTD" },
  rushYds: { market: 107, label: "RushYds" },
  recYds: { market: 105, label: "RecYds" },
  recs: { market: 104, label: "Recs" },
  passTD: { market: 102, label: "PassTDs" },
  passYds: { market: 103, label: "PassYds" },
  ints: { market: 101, label: "Ints" },
};
const PROP_KEYS = Object.keys(PROPS);

// Props a player must have to appear in the main table, by position filter.
// A player is complete if ANY listed set is fully present.
const QB_SET = ["anyTD", "rushYds", "passTD", "passYds", "ints"];
const RB_SET = ["anyTD", "rushYds", "recYds", "recs"];
const WR_SET = ["anyTD", "recYds", "recs"];
function requiredSetsFor(pos) {
  if (pos == 0) return [QB_SET];
  if (pos == 1) return [RB_SET];
  if (pos == 2 || pos == 3) return [WR_SET];
  if (pos == 98) return [WR_SET]; // FLEX: the RB set is a superset of this
  return [WR_SET, QB_SET]; // SUPERFLEX
}

// Labels of the props `name` lacks in `maps` for the requirement closest to
// being met. Empty array => the player is complete.
function missingProps(name, maps, pos) {
  let best = null;
  for (const set of requiredSetsFor(pos)) {
    const missing = set.filter((k) => !maps[k].has(name));
    if (best === null || missing.length < best.length) best = missing;
    if (best.length === 0) break;
  }
  return best.map((k) => PROPS[k].label);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function fetchBPFile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data && Array.isArray(data.props) ? data : null;
  } catch (e) {
    return null;
  }
}

// The fetch workflow records the index of the newest file for the week in
// `<year>lastIndex<week>.txt` (committed together with the data file).
async function fetchLastIndexHint(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const n = parseInt((await response.text()).trim(), 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch (e) {
    return null;
  }
}

/**
 * Load the first and last BettingPros files of the week, plus its carry file.
 * @returns {Promise<{ first: object|null, last: object|null, carry: object|null,
 *   lastIndex: number }>}
 *   `last` is null when the week has a single file; `carry` is null for weeks
 *   the workflow never wrote a carry file for.
 */
export async function loadFirstAndLastFiles({ week, year }) {
  const yearPrefix = year != 2023 ? year : "";
  const fileUrl = (i) => BP_BASE + yearPrefix + "week" + week + "" + i;

  const [first, hint, carry] = await Promise.all([
    fetchBPFile(fileUrl(0)),
    fetchLastIndexHint(BP_BASE + yearPrefix + "lastIndex" + week + ".txt"),
    fetchBPFile(BP_BASE + yearPrefix + "carry" + week + ".json"),
  ]);
  if (!first) return { first: null, last: null, carry: null, lastIndex: -1 };

  // Fast path: the recorded index. Walk backwards in case the newest file is
  // not (yet) served, e.g. a CDN cache lag.
  if (hint !== null) {
    for (let i = hint; i >= 1; i--) {
      const last = await fetchBPFile(fileUrl(i));
      if (last) return { first, last, carry, lastIndex: i };
    }
    return { first, last: null, carry, lastIndex: 0 };
  }

  // No hint (older seasons): probe for existence with HEAD requests, which
  // don't transfer the file bodies, then load only the last one.
  let lastIndex = 0;
  while (await isFetchable(fileUrl(lastIndex + 1), "HEAD")) lastIndex++;
  if (lastIndex === 0) return { first, last: null, carry, lastIndex: 0 };
  const last = await fetchBPFile(fileUrl(lastIndex));
  return last
    ? { first, last, carry, lastIndex }
    : { first, last: null, carry, lastIndex: 0 };
}

// ---------------------------------------------------------------------------
// Parsing one file into a snapshot of per-prop fantasy-point values
// ---------------------------------------------------------------------------

// Players whose yardage line was materially corrected for lopsided odds
// (see impliedYards). Surfaced in the table as a footnote marker.
const YARDAGE_ADJUST_FLAG = 0.05; // relative shift that earns a marker

/**
 * @returns {{ anyTD: Map, rushYds: Map, recYds: Map, recs: Map, passTD: Map,
 *   passYds: Map, ints: Map, adjusted: Map<string, string[]>,
 *   seenIn: Object<string, Map<string, number>> }}
 *   Every prop map is player name -> fantasy points contributed by that prop.
 *   `seenIn[prop]` is player name -> index of the snapshot the value came
 *   from (only present for carry files, via `carry_index`).
 */
export function parseSnapshot(
  data,
  { receptionMultiplier, passTdPoints, playerToPosition }
) {
  const snap = { adjusted: new Map(), seenIn: {} };
  PROP_KEYS.forEach((k) => {
    snap[k] = new Map();
    snap.seenIn[k] = new Map();
  });
  if (!data || !Array.isArray(data.props)) return snap;

  const flagAdjusted = (playerName, label, line, implied) => {
    const l = Number(line);
    if (!(l > 0) || !Number.isFinite(implied)) return;
    if (Math.abs(implied - l) / l > YARDAGE_ADJUST_FLAG) {
      const list = snap.adjusted.get(playerName) || [];
      if (!list.includes(label)) list.push(label);
      snap.adjusted.set(playerName, list);
    }
  };

  let allMarkets = data.props.slice();

  // Fallback: /props is missing consensus lines for some players
  // (e.g. QB anytime-TD / interceptions), but /offers still has them.
  // For any (market, player) absent from /props, synthesize a
  // props-shaped entry from the distilled /offers data so the same
  // parsing loops below pick it up. See BettingProFetch.yml.
  if (Array.isArray(data.offers)) {
    const present = new Set(
      allMarkets.map(
        (m) => m.market_id + "|" + normalizePlayerName(m.participant?.name)
      )
    );
    for (const o of data.offers) {
      const key = o.market_id + "|" + normalizePlayerName(o.name);
      if (present.has(key)) continue;
      present.add(key);
      // /offers has no pass-TD projection, so derive it from the
      // over line + odds (the projection.value the passTD loop reads).
      let projValue = 0;
      if (o.market_id == 102) {
        projValue =
          o.line - 0.5 + 1 / americanToDecimal(o.odds) / UNIVERSAL_VIG;
      }
      allMarkets.push({
        market_id: o.market_id,
        participant: {
          name: o.name,
          player: { position: o.position || "" },
        },
        over: { consensus_odds: o.odds, consensus_line: o.line },
        projection: { value: projValue },
        carry_index: o.carry_index,
      });
    }
  }

  // The anytime-TD market is the authoritative position source (it always
  // overwrites); the other markets only fill in players it didn't cover.
  const recordPosition = (name, playerOdds, overwrite) => {
    const position = (playerOdds.participant.player.position || "").slice();
    const code = POSITION_CODE[position];
    if (code === undefined) return;
    if (overwrite || !playerToPosition.has(name)) {
      playerToPosition.set(name, code);
    }
  };

  // Line - 0.5 + implied over probability: the expected count for a
  // count-style prop (receptions, interceptions).
  const impliedCount = (playerOdds) =>
    playerOdds.over.consensus_line -
    0.5 +
    1 / americanToDecimal(playerOdds.over.consensus_odds) / UNIVERSAL_VIG;

  for (const key of PROP_KEYS) {
    const market = allMarkets.filter(
      (m) => m.market_id == PROPS[key].market
    );
    for (const playerOdds of market) {
      const name = normalizePlayerName(playerOdds.participant.name.slice());
      recordPosition(name, playerOdds, key === "anyTD");

      let value;
      if (key === "anyTD") {
        value =
          (1 /
            americanToDecimal(playerOdds.over.consensus_odds) /
            UNIVERSAL_VIG) *
          6;
      } else if (key === "rushYds" || key === "recYds" || key === "passYds") {
        const implied = impliedYards(
          playerOdds.over.consensus_line,
          playerOdds.over.consensus_odds
        );
        flagAdjusted(
          name,
          PROPS[key].label,
          playerOdds.over.consensus_line,
          implied
        );
        value = implied / (key === "passYds" ? 25 : 10);
      } else if (key === "recs") {
        value = impliedCount(playerOdds) * receptionMultiplier;
      } else if (key === "passTD") {
        // temporary hack: use BettingPros' own projection for pass TDs
        value = playerOdds.projection.value * passTdPoints;
      } else if (key === "ints") {
        value = impliedCount(playerOdds) * -2;
      }
      snap[key].set(name, value);
      if (Number.isInteger(playerOdds.carry_index)) {
        snap.seenIn[key].set(name, playerOdds.carry_index);
      }
    }
  }
  return snap;
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * @param {{ pos: number, mode: number, week: number, year: number, passTdPoints?: number }} opts
 *   pos: 0 QB, 1 RB, 2 WR, 3 TE, 98 FLEX, 99 SUPERFLEX (all positions)
 *   mode: 0 Half PPR, 1 Standard, 2 Full PPR
 *   passTdPoints: fantasy points per passing TD (4 default, or 6)
 * @returns {Promise<{
 *   finalList: [string, { ev: number, change: number, pos: number,
 *     adjustedProps: string[], stale: boolean, missingLatest: string[],
 *     lastSeen: Object<string, number> }][],
 *   missingList: [string, string, string][],
 *   lastIndex: number }>}
 *   `change` is the projection delta between the first and last file of the
 *   week. `stale` players were complete earlier in the week but lack
 *   `missingLatest` props in the last file; those props use their last
 *   posted value, and `lastSeen[label]` is the snapshot index it came from
 *   (when known). `stale`/`missingLatest`/`lastSeen`/`adjustedProps` are only
 *   populated for seasons from MARKERS_FROM_SEASON on.
 */
export async function computeBPProjections({
  pos,
  mode,
  week,
  year,
  passTdPoints = 4,
}) {
  let receptionMultiplier = 0.5;
  if (mode == 0) receptionMultiplier = 0.5;
  else if (mode == 1) receptionMultiplier = 0;
  else if (mode == 2) receptionMultiplier = 1;

  const { first, last, carry, lastIndex } = await loadFirstAndLastFiles({
    week,
    year,
  });

  const playerToPosition = new Map();
  const ctx = { receptionMultiplier, passTdPoints, playerToPosition };
  // Parse order matters for positions: the carry and first file seed them,
  // the last file (parsed last) gets the final say.
  const carrySnap = carry ? parseSnapshot(carry, ctx) : null;
  const firstSnap = parseSnapshot(first, ctx);
  const lastSnap = last ? parseSnapshot(last, ctx) : firstSnap;
  const singleFile = lastSnap === firstSnap;
  // Last posted value of every prop seen this week. The carry file is the
  // authoritative source; without one, the first file is all we have.
  const baseSnap = carrySnap || firstSnap;

  // Current value per prop: the last file, falling back to the base for
  // props that dropped out. Δ per prop: last - first when both exist.
  const current = {};
  const change = {};
  for (const key of PROP_KEYS) {
    current[key] = new Map(baseSnap[key]);
    change[key] = new Map();
    lastSnap[key].forEach((value, name) => {
      current[key].set(name, value);
      if (!singleFile && firstSnap[key].has(name)) {
        change[key].set(name, value - firstSnap[key].get(name));
      }
    });
  }

  const playerToEV = new Map();
  const playerToChange = new Map();
  for (const key of PROP_KEYS) {
    current[key].forEach((value, name) => {
      playerToEV.set(name, (playerToEV.get(name) || 0) + value);
    });
    change[key].forEach((value, name) => {
      playerToChange.set(name, (playerToChange.get(name) || 0) + value);
    });
  }

  // Odds-adjusted markers, taken from whichever file supplied the value.
  const YARD_PROP_BY_LABEL = { RushYds: "rushYds", RecYds: "recYds", PassYds: "passYds" };
  const adjustedFor = (name) => {
    const labels = (lastSnap.adjusted.get(name) || []).slice();
    for (const label of baseSnap.adjusted.get(name) || []) {
      const key = YARD_PROP_BY_LABEL[label];
      if (!lastSnap[key].has(name) && !labels.includes(label)) labels.push(label);
    }
    return labels;
  };
  const PROP_KEY_BY_LABEL = {};
  PROP_KEYS.forEach((k) => (PROP_KEY_BY_LABEL[PROPS[k].label] = k));

  const mapEntries = Array.from(playerToEV.entries());
  mapEntries.sort((a, b) => b[1] - a[1]);

  let finalList = mapEntries.filter(
    (x) =>
      playerToPosition.get(x[0]) == pos ||
      pos == 99 ||
      (pos == 98 && playerToPosition.get(x[0]) != 0 && x[1] > 1)
  );

  const missingList = [];
  const staleProps = new Map();
  finalList = finalList.filter((d) => {
    const name = d[0];
    const missingNow = missingProps(name, current, pos);
    if (missingNow.length > 0) {
      // Never had every required prop this week (only reported for the
      // single-position views, as before).
      if (pos == 0 || pos == 1 || pos == 2 || pos == 3) {
        missingList.push([
          name,
          missingNow.map((l) => " " + l + " ").join(""),
          d[1].toFixed(2),
        ]);
      }
      return false;
    }
    // Complete with carried values but not in the latest snapshot.
    const missingLatest = missingProps(name, lastSnap, pos);
    if (missingLatest.length > 0) staleProps.set(name, missingLatest);
    return true;
  });
  const lastSeenFor = (name) => {
    const seen = {};
    for (const label of staleProps.get(name) || []) {
      const idx = baseSnap.seenIn[PROP_KEY_BY_LABEL[label]].get(name);
      if (idx !== undefined) seen[label] = idx;
    }
    return seen;
  };

  const showMarkers = Number(year) >= MARKERS_FROM_SEASON;
  finalList = finalList
    .slice()
    .sort((a, b) => b[1] - a[1])
    .filter((elem) => elem[1] > 5)
    .map((elem) => [
      elem[0],
      {
        ev: elem[1],
        change: playerToChange.get(elem[0]) || 0,
        pos: playerToPosition.get(elem[0]),
        adjustedProps: showMarkers ? adjustedFor(elem[0]) : [],
        stale: showMarkers && staleProps.has(elem[0]),
        missingLatest: showMarkers ? staleProps.get(elem[0]) || [] : [],
        lastSeen: showMarkers ? lastSeenFor(elem[0]) : {},
      },
    ]);
  return { finalList, missingList, lastIndex };
}

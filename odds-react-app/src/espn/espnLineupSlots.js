// ESPN Fantasy Football lineup-slot interpretation.
//
// This is the single place that knows what ESPN's numeric lineup slot IDs and
// default position IDs mean. Components never compare slot numbers directly;
// they call the helpers exported here.
//
// Slot IDs verified against live ESPN v3 responses (settings.rosterSettings
// .lineupSlotCounts enumerates 0–24) plus ESPN's ffl constants.

export const ESPN_LINEUP_SLOTS = {
  0: "QB",
  1: "TQB",
  2: "RB",
  3: "RB/WR",
  4: "WR",
  5: "WR/TE",
  6: "TE",
  7: "OP", // Superflex / offensive player
  8: "DT",
  9: "DE",
  10: "LB",
  11: "DL",
  12: "CB",
  13: "S",
  14: "DB",
  15: "DP",
  16: "D/ST",
  17: "K",
  18: "P",
  19: "HC",
  20: "BE", // Bench
  21: "IR", // Injured reserve
  22: "?",
  23: "FLEX", // RB/WR/TE
  24: "ER",
  25: "Rookie",
};

// Slots that hold a rostered player who is NOT in the active lineup.
// Everything else (including IDP and custom slots a league enables) counts as
// a starting position.
const NON_STARTING_SLOT_IDS = new Set([20, 21]);

export function isStartingLineupSlot(lineupSlotId) {
  return (
    Number.isInteger(lineupSlotId) && !NON_STARTING_SLOT_IDS.has(lineupSlotId)
  );
}

export function lineupSlotLabel(lineupSlotId) {
  return ESPN_LINEUP_SLOTS[lineupSlotId] ?? `Slot ${lineupSlotId}`;
}

// player.defaultPositionId -> position abbreviation.
const ESPN_DEFAULT_POSITIONS = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  7: "P",
  9: "DT",
  10: "DE",
  11: "LB",
  12: "CB",
  13: "S",
  14: "HC",
  16: "D/ST",
};

export function defaultPositionLabel(defaultPositionId) {
  return ESPN_DEFAULT_POSITIONS[defaultPositionId];
}

// Display order for starters within a team (QB first, K and D/ST last, any
// other slots such as IDP after that in numeric order).
const SLOT_DISPLAY_ORDER = [0, 1, 2, 4, 6, 3, 5, 23, 7, 17, 16];

export function compareLineupSlots(a, b) {
  const ia = SLOT_DISPLAY_ORDER.indexOf(a);
  const ib = SLOT_DISPLAY_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  return a - b;
}

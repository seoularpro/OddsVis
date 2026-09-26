// ESPN Fantasy Football numeric ids. Slot ids verified against live v3
// responses (see odds-react-app/src/espn/espnLineupSlots.js).

import type { LineupSlot, Position } from "../../../domain/types";
import { SLOT_PRESETS } from "../../../domain/positions";

export const ESPN_BENCH_SLOT = 20;
export const ESPN_IR_SLOT = 21;

/** Lineup slot id -> engine slot definition (null = not modelled, e.g. IDP). */
export const ESPN_SLOT_TO_LINEUP: Record<number, Omit<LineupSlot, "count"> | null> = {
  0: SLOT_PRESETS.QB,
  1: null, // TQB
  2: SLOT_PRESETS.RB,
  3: SLOT_PRESETS["RB/WR"],
  4: SLOT_PRESETS.WR,
  5: SLOT_PRESETS["WR/TE"],
  6: SLOT_PRESETS.TE,
  7: SLOT_PRESETS.SUPERFLEX, // OP
  16: SLOT_PRESETS.DST,
  17: SLOT_PRESETS.K,
  23: SLOT_PRESETS.FLEX,
};

export const ESPN_POSITION_BY_DEFAULT_ID: Record<number, Position> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DST",
};

export const ESPN_PRO_TEAMS: Record<number, string> = {
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET", 9: "GB", 10: "TEN",
  11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ",
  21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS", 29: "CAR", 30: "JAX",
  33: "BAL", 34: "HOU",
};

/** Scoring stat ids. */
export const ESPN_STAT_RECEPTIONS = 53;
export const ESPN_STAT_PASS_TD = 4;

export const ESPN_API_BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

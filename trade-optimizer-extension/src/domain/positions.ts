import type { LineupSlot, Position } from "./types";
import { OFFENSE_POSITIONS } from "./types";

/** Normalize the many spellings of a position into the engine's six. */
export function normalizePosition(raw: string | undefined | null): Position | null {
  if (!raw) return null;
  const p = raw.toUpperCase().replace(/[^A-Z]/g, "");
  switch (p) {
    case "QB":
      return "QB";
    case "RB":
    case "HB":
    case "FB":
      return "RB";
    case "WR":
      return "WR";
    case "TE":
      return "TE";
    case "K":
    case "PK":
      return "K";
    case "DST":
    case "DEF":
    case "D":
    case "DS":
      return "DST";
    default:
      return null;
  }
}

export function isOffensePosition(position: Position): boolean {
  return OFFENSE_POSITIONS.includes(position);
}

/** Standard slot definitions used by adapters and fixtures. */
export const SLOT_PRESETS: Record<string, Omit<LineupSlot, "count">> = {
  QB: { id: "QB", label: "QB", eligible: ["QB"] },
  RB: { id: "RB", label: "RB", eligible: ["RB"] },
  WR: { id: "WR", label: "WR", eligible: ["WR"] },
  TE: { id: "TE", label: "TE", eligible: ["TE"] },
  FLEX: { id: "FLEX", label: "FLEX", eligible: ["RB", "WR", "TE"] },
  SUPERFLEX: { id: "SUPERFLEX", label: "SFLEX", eligible: ["QB", "RB", "WR", "TE"] },
  "RB/WR": { id: "RB/WR", label: "RB/WR", eligible: ["RB", "WR"] },
  "WR/TE": { id: "WR/TE", label: "WR/TE", eligible: ["WR", "TE"] },
  K: { id: "K", label: "K", eligible: ["K"] },
  DST: { id: "DST", label: "D/ST", eligible: ["DST"] },
};

export function slot(id: keyof typeof SLOT_PRESETS, count = 1): LineupSlot {
  return { ...SLOT_PRESETS[id], count };
}

/** Standard 1QB/2RB/2WR/1TE/1FLEX/1K/1DST lineup. */
export function standardLineup(): LineupSlot[] {
  return [
    slot("QB"),
    slot("RB", 2),
    slot("WR", 2),
    slot("TE"),
    slot("FLEX"),
    slot("K"),
    slot("DST"),
  ];
}

/** Sum of slot counts (number of starters). */
export function starterCount(slots: LineupSlot[]): number {
  return slots.reduce((n, s) => n + s.count, 0);
}

/** Slot instances in lineup order: QB, RB1, RB2, WR1, ... */
export interface SlotInstance {
  slotId: string;
  label: string;
  /** 1-based index within the slot type, e.g. RB2 -> 2. */
  index: number;
  /** Display key such as "RB2" or "FLEX". */
  key: string;
  eligible: Position[];
}

export function expandSlots(slots: LineupSlot[]): SlotInstance[] {
  const out: SlotInstance[] = [];
  for (const s of slots) {
    for (let i = 1; i <= s.count; i++) {
      out.push({
        slotId: s.id,
        label: s.label,
        index: i,
        key: s.count > 1 ? `${s.label}${i}` : s.label,
        eligible: s.eligible,
      });
    }
  }
  return out;
}

/** Number of starters a position can occupy exclusively (dedicated slots). */
export function dedicatedSlotCount(slots: LineupSlot[], position: Position): number {
  return slots
    .filter((s) => s.eligible.length === 1 && s.eligible[0] === position)
    .reduce((n, s) => n + s.count, 0);
}

/** Flex demand a position shares with others: Σ count / |eligible| over flex slots. */
export function sharedSlotDemand(slots: LineupSlot[], position: Position): number {
  return slots
    .filter((s) => s.eligible.length > 1 && s.eligible.includes(position))
    .reduce((n, s) => n + s.count / s.eligible.length, 0);
}

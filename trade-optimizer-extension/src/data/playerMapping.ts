// Player identity resolution between the fantasy platform and the datasets.
//
// Strategy, in confidence order:
//   1. id        – dataset carries the platform id (e.g. an ESPN id column).
//   2. exact     – identical name (case-insensitive) and position.
//   3. normalized– punctuation/suffix/diacritic-insensitive name + position,
//                  with known alias spellings and D/ST naming variants.
//   4. fuzzy     – first initial + full surname + position. DISABLED by default
//                  (PlayerIndex option `allowFuzzy`): no current platform or
//                  dataset abbreviates first names, and the two mismatches it
//                  produced in practice (Brian/Bijan Robinson, A.J. Brown /
//                  Amon-Ra St. Brown) cost more than the matches it found.
//                  Turn it on only for a dataset that really uses initials.
// Position is required for every name-based match so "Josh Allen (QB)" never
// matches a same-named player at another position.

import type { Position } from "../domain/types";
import { normalizePosition } from "../domain/positions";

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/** Canonical key for a name: lowercase ASCII letters, no suffixes/punctuation. */
export function normalizeName(name: string): string {
  const ascii = (name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.`-]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = ascii.split(" ").filter((p) => p && !SUFFIXES.has(p));
  return parts.join(" ");
}

// Nicknames and alternate spellings that appear across sources.
const ALIASES: Record<string, string> = {
  "hollywood brown": "marquise brown",
  "chig okonkwo": "chigoziem okonkwo",
  "josh palmer": "joshua palmer",
  "gabe davis": "gabriel davis",
  "dj moore": "d j moore",
  "ken walker": "kenneth walker",
  "mitch trubisky": "mitchell trubisky",
  "scotty miller": "scott miller",
  "cam ward": "cameron ward",
  "bucky irving": "bucky irving",
  "tank bigsby": "tank bigsby",
  "chris brooks": "christopher brooks",
  "pat freiermuth": "patrick freiermuth",
  "dk metcalf": "d k metcalf",
  "aj brown": "a j brown",
  "tj hockenson": "t j hockenson",
  "cj stroud": "c j stroud",
  "jk dobbins": "j k dobbins",
  "dj chark": "d j chark",
};

function aliasKey(key: string): string {
  return ALIASES[key] ?? key;
}

/** "D J Moore" and "DJ Moore" both become "dj moore". */
function collapseInitials(key: string): string {
  return key.replace(/\b([a-z]) ([a-z])\b(?= )/g, "$1$2");
}

const NFL_TEAM_NAMES: Record<string, string> = {
  ARI: "arizona cardinals", ATL: "atlanta falcons", BAL: "baltimore ravens", BUF: "buffalo bills",
  CAR: "carolina panthers", CHI: "chicago bears", CIN: "cincinnati bengals", CLE: "cleveland browns",
  DAL: "dallas cowboys", DEN: "denver broncos", DET: "detroit lions", GB: "green bay packers",
  HOU: "houston texans", IND: "indianapolis colts", JAX: "jacksonville jaguars", KC: "kansas city chiefs",
  LAC: "los angeles chargers", LAR: "los angeles rams", LV: "las vegas raiders", MIA: "miami dolphins",
  MIN: "minnesota vikings", NE: "new england patriots", NO: "new orleans saints", NYG: "new york giants",
  NYJ: "new york jets", PHI: "philadelphia eagles", PIT: "pittsburgh steelers", SEA: "seattle seahawks",
  SF: "san francisco 49ers", TB: "tampa bay buccaneers", TEN: "tennessee titans", WAS: "washington commanders",
};
const TEAM_BY_NICKNAME = new Map<string, string>();
const TEAM_BY_CITY = new Map<string, string>();
for (const [abbr, full] of Object.entries(NFL_TEAM_NAMES)) {
  const words = full.split(" ");
  TEAM_BY_NICKNAME.set(words[words.length - 1], abbr);
  TEAM_BY_CITY.set(words.slice(0, -1).join(" "), abbr);
}

/** "Bills D/ST", "Buffalo Bills", "BUF DST", "Buffalo" -> "BUF". */
export function normalizeDstName(name: string): string {
  const key = normalizeName(name.replace(/d\/st|dst|defense|def\b|special teams/gi, " "));
  if (!key) return key;
  const upper = key.toUpperCase().replace(/ /g, "");
  if (NFL_TEAM_NAMES[upper]) return upper;
  const words = key.split(" ");
  for (const w of words) {
    const abbr = TEAM_BY_NICKNAME.get(w);
    if (abbr) return abbr;
  }
  const city = TEAM_BY_CITY.get(key);
  if (city) return city;
  return key;
}

export interface Identity {
  platformId?: string;
  name: string;
  position: Position;
}

export interface MatchResult<T> {
  entry: T | null;
  confidence: "id" | "exact" | "normalized" | "fuzzy" | "unmatched";
}

/** Index of dataset entries supporting the lookup strategies above. */
export class PlayerIndex<T extends { playerId?: string; name: string; position: Position }> {
  private byId = new Map<string, T>();
  private byExact = new Map<string, T>();
  private byNormalized = new Map<string, T[]>();
  private byFuzzy = new Map<string, T[]>();
  readonly size: number;

  constructor(entries: T[], private idNamespace?: string, private allowFuzzy = false) {
    for (const e of entries) {
      if (e.playerId) this.byId.set(e.playerId, e);
      const pos = e.position;
      this.byExact.set(`${e.name.toLowerCase()}|${pos}`, e);
      for (const key of normalizedKeys(e.name, pos)) push(this.byNormalized, `${key}|${pos}`, e);
      const fz = fuzzyKey(e.name, pos);
      if (fz) push(this.byFuzzy, fz, e);
    }
    this.size = entries.length;
  }

  find(identity: Identity): MatchResult<T> {
    if (identity.platformId) {
      const hit = this.byId.get(identity.platformId) ?? (this.idNamespace ? this.byId.get(`${this.idNamespace}:${identity.platformId}`) : undefined);
      if (hit) return { entry: hit, confidence: "id" };
    }
    const pos = identity.position;
    const exact = this.byExact.get(`${identity.name.toLowerCase()}|${pos}`);
    if (exact) return { entry: exact, confidence: "exact" };
    for (const key of normalizedKeys(identity.name, pos)) {
      const list = this.byNormalized.get(`${key}|${pos}`);
      if (list && list.length === 1) return { entry: list[0], confidence: "normalized" };
    }
    if (this.allowFuzzy) {
      const fz = fuzzyKey(identity.name, pos);
      if (fz) {
        const list = this.byFuzzy.get(fz);
        if (list && list.length === 1 && initialsCompatible(identity.name, list[0].name)) return { entry: list[0], confidence: "fuzzy" };
      }
    }
    return { entry: null, confidence: "unmatched" };
  }
}

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) {
    if (!list.includes(value)) list.push(value);
  } else map.set(key, [value]);
}

function normalizedKeys(name: string, position: Position): string[] {
  if (position === "DST") return [normalizeDstName(name)];
  const base = normalizeName(name);
  const keys = new Set<string>([base, aliasKey(base), collapseInitials(base), aliasKey(collapseInitials(base))]);
  return [...keys].filter(Boolean);
}

/** First token of the canonical name, after aliases and initial collapsing. */
function firstToken(name: string): string {
  return collapseInitials(aliasKey(normalizeName(name))).split(" ")[0] ?? "";
}

/**
 * A fuzzy (initial + surname) match is only allowed when at least one side's
 * first name is a single-letter initial, or the first names agree. Two-letter
 * first names (AJ, DJ, CJ, TJ) are real names, not initials.
 */
export function initialsCompatible(a: string, b: string): boolean {
  const fa = firstToken(a);
  const fb = firstToken(b);
  if (fa.length === 1 || fb.length === 1) return true;
  return fa === fb;
}

function fuzzyKey(name: string, position: Position): string | null {
  if (position === "DST") return null;
  const key = collapseInitials(aliasKey(normalizeName(name)));
  const parts = key.split(" ");
  if (parts.length < 2) return null;
  // First initial + the whole surname (so "st brown" and "brown" stay apart).
  return `${parts[0][0]} ${parts.slice(1).join(" ")}|${position}`;
}

/** Parse a position string from a dataset row, tolerant of "D/ST", "DEF", etc. */
export function parsePosition(raw: string | undefined): Position | null {
  return normalizePosition(raw);
}

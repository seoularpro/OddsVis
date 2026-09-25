# OddsVis Trade Optimizer (Chrome extension)

A Manifest V3 Chrome extension that reads the fantasy football league open in
the browser, matches every roster against OddsVis' weekly median projections
and trade values, and recommends the top 5 realistic trades that most raise
the **user's optimal starting-lineup median projection** while giving the
other manager a rational reason to accept.

## Install (developer mode)

```bash
cd trade-optimizer-extension
npm install
npm run build          # typecheck + three Vite builds -> dist/
```

Then in Chrome: `chrome://extensions` → *Developer mode* → *Load unpacked* →
pick `trade-optimizer-extension/dist`. Open an ESPN (`fantasy.espn.com/football/…?leagueId=…`)
or Sleeper (`sleeper.com/leagues/<id>/…`) league page and click the toolbar
icon; the side panel opens. *Analyze this league* runs the whole pipeline;
*Demo league* runs it on a synthetic 10-team league so the UI can be explored
anywhere.

```bash
npm test               # vitest: optimizer, mapping and adapter tests
npm run typecheck
```

## How it works

```
content script (page origin)          side panel (extension page)
┌──────────────────────────┐          ┌────────────────────────────────────┐
│ detectPlatform           │  DETECT  │ app/runAnalysis                    │
│ adapters/espn  (v3 API)  │ <──────> │  ├ data/projections  (OddsVis BP)  │
│ adapters/sleeper (v1 API)│ EXTRACT  │  ├ data/tradeValues  (published)   │
│ adapters/yahoo (stub)    │ ───────> │  ├ data/enrichLeague (identity)    │
└──────────────────────────┘ RawLeague│  └ optimization/*    (engine)      │
                                      └────────────────────────────────────┘
```

* **Adapters** (`src/content/adapters`) turn a platform into a `RawLeague`
  (settings, lineup slots, rosters, waiver pool, user team). ESPN uses the
  `lm-api-reads` v3 API from the page origin so the user's cookies apply
  (private leagues work). Sleeper uses its public v1 API. Yahoo is detected
  but unsupported (OAuth-only API). Nothing platform-specific leaks past
  `RawLeague`.
* **Data layer** (`src/data`) loads the two datasets and attaches them.
  Projections come from `odds-react-app/src/bpProjections.js` (imported via
  the `@oddsvis` alias, so the numbers are exactly the site's medians);
  trade values from `TradeValueSheets/json/TradeValues_<Scoring>_<N>team.json`,
  picked by the league's reception scoring and size. Both can be replaced by a
  URL or pasted JSON in Settings (`{name, position, medianProjection}` /
  `{name, position, tradeValue}`). `playerMapping.ts` resolves identity by
  id → exact → normalized (suffixes, punctuation, aliases, D/ST variants) →
  fuzzy, always requiring the position to match. Rostered players missing
  from the value sheet get a small *estimated* value (capped below the
  cheapest listed player at the position) unless the setting says $0.
  Anyone projected but unrostered is the waiver pool.
* **Engine** (`src/optimization`)
  * `lineupOptimizer` – exact optimal lineup: greedy narrowest-slot-first for
    laminar slot families (QB/RB/WR/TE/FLEX/SUPERFLEX/K/DST), Hungarian
    assignment when flex eligibilities overlap (e.g. RB/WR + WR/TE).
  * `replacementLevel` – best free-agent projection per position (estimated
    from the rostered pool when no waiver list exists).
  * `marginalValue` – `optimal(roster) − optimal(roster − player)`.
  * `weaknessAnalyzer` – per slot: starter, replacement, hole flag, league
    rank/median and a *realistic* upgrade range from other teams' expendable
    players. Severity is points available from acquirable upgrades, so
    7→15 outranks 17→20.
  * `surplusAnalyzer` – bench points above replacement per position →
    very low … very high, plus expendable assets.
  * `tradeGenerator` – partners ranked by complementary need/surplus;
    packages (1-1, 2-1, 1-2, 2-2 by default; shapes are config) pruned by
    value tolerance (15 % or $4) and by "nothing incoming could start".
    K/DST and players with no projection this week (props not posted) are
    never moved: a 0 projection would masquerade as free expendable depth.
  * `tradeSimulator` – applies the deal, refits both rosters to the roster
    size (2-for-1 fills the open spot with the best waiver player, 1-for-2
    drops the least useful non-starter), re-optimizes both lineups, diffs
    slots, counts holes.
  * `tradeScorer` – acceptance filters (min user gain, value tolerance,
    opponent loss cap of 1.0 pt, and the opponent must have a rational
    reason: a lineup gain ≥ 0.25, or, when their lineup is within 0.5 pt of
    neutral, a value gain ≥ max($5, 10 % of what they send), a hole filled,
    more useful depth, or a consolidation) and a **bounded composite** score: `userGain + weakness(≤0.40) + mutual(≤0.30) +
    fairness(≤0.15) + depth(≤0.10)`. The caps sum to 0.95 < 1 point, so a
    trade that gains the user one more projected point always ranks higher;
    secondaries only reorder trades within that band. Rank explanations are
    generated from the same numbers.
  * `tradeExplainer` – deterministic "why it works" text from the simulation
    facts (who enters the lineup, who was expendable, slot diffs, value).
  * `tradeOptimizer` – the pipeline; collapses throw-in variants that lead to
    the same lineups, returns the top N (max 2 per partner by default) with
    stats and a deterministic "ranked above the next one because…" line.

## Validated against

* Unit tests (`tests/`): optimizer solvers vs brute force, FLEX/SUPERFLEX,
  marginal value, replacement level, surplus/need partner ranking, all four
  package shapes, post-trade refits (waiver fill / drop), the $70 ↔ $35+$35
  consolidation in both directions, 7→15 beating 18→21, fairness and
  opponent-loss rejection, ranking invariants, identity matching, ESPN and
  Sleeper normalizers.
* Live data (2026-09-12): public ESPN league 48347143 and Sleeper league
  1312563056986824704 through the real adapters' normalizers and the real
  OddsVis datasets; ~4–8 k candidate trades simulated in ~100–150 ms.

## Known limits

* Week-1 OddsVis medians only cover players with posted props; unprojected
  rostered players count 0 in lineups and are flagged in the panel.
* The published value sheets list 108 players; other rostered players get a
  small estimated value (shown with a `~`) or $0 when the setting says so.
* Yahoo is detected but not extracted (OAuth-only API).
* The user's Sleeper team is found via the page's localStorage when possible;
  otherwise pick it in the league table (remembered per league).

## Extending

* New platform: implement `FantasyPlatformAdapter` in `src/content/adapters/<name>`
  and add it to `ADAPTERS` in `detectPlatform.ts`.
* New package shapes: add `{send, receive}` to `config.shapes`. Draft picks /
  FAAB would become additional asset kinds on `TradeCandidate` with their own
  value contribution in `tradeGenerator`/`tradeScorer`.
* New dataset: implement `ProjectionSource` / `TradeValueSource` in `src/data`.

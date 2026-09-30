# Trade value workbooks (Scoring x League size)

Regenerates the nine `TradeValueSheets/TradeValues_<Scoring>_<N>team.xlsx` workbooks (plus
`TradeValues_AllCombinations.xlsx`, one tab each) from the Half PPR 10-team baseline using the
exact adjustment math settled on 2026-09-09.

```bash
python3 -m pip install --user openpyxl        # once
node scripts/trade-values/dump_projections.mjs   # this week's medians -> TradeValueSheets/weekly-projections.json
python3 scripts/trade-values/build_trade_values.py
```

`dump_projections.mjs` runs the site's own projection code (`odds-react-app/src/bpProjections.js`)
against the odds files in `BettingProsFiles/` for the latest week that has data (`--week N` to
pick one). It needs Node 20+ and no npm install. Pass `--no-reseed` to the build to skip step 0.

By default the baseline is read from the live published Google Sheet (URL in `params.json`).
To build from a file you edited instead, pass any `.xlsx` or `.csv` in the sheet layout
(`Trade Value | Player Name | Trend | ...` under a row of position labels; shared or
one-per-player rows both work):

```bash
python3 scripts/trade-values/build_trade_values.py --baseline TradeValueSheets/TradeValues_HalfPPR_10team.xlsx
```

## Files

| File | Purpose |
|---|---|
| `dump_projections.mjs` | writes this week's Half PPR medians per position for the re-seed |
| `build_trade_values.py` | the whole process: read baseline, weekly re-seed, attach reception lines, scoring step, league step, write workbooks and JSON |
| `params.json` | every constant (reception deltas, league tops and exponents, magnitude 2.5, thresholds). Edit here to change the math |
| `receptions.json` | snapshot of each player's BettingPros receptions line. Refresh with `--refresh-receptions --week N` to use a later week's props; players without a line that week keep their previous line (tagged `carried`), and the file remembers the replacement levels so a thin week cannot zero them out (`replacement_min_lines`, `reception_min_fresh_lines` in params) |

## The math

0. **Weekly re-seed.** Each sheet value moves toward this week's Half PPR medians so the published
   order tracks the projections. Within each position the projected players are ranked by median;
   `implied` is the average of (A) the *projected group's* own sorted sheet value at the player's rank
   and (C) the player's share of the group's points above replacement (10-team: 10th QB, 25th RB,
   25th WR, 10th TE) on the group's sheet value budget. Both terms follow the projection order, so
   `implied` does too. Then `new = sheet + 0.8 x (implied - sheet)`, rescaled so each group keeps its
   sheet total; the sheet therefore only tempers the size of the gaps. Ranking within the projected
   group (not the whole position) keeps stars from funding cheap breakouts. Players with no line this
   week use last week's median (`previous` in `weekly-projections.json`); players with neither keep
   their sheet value, and a position with less than 60 % coverage is left at the sheet values.
   Because the seed is always the hand-maintained sheet, re-running each week does not compound.
1. **Scoring (zero-sum).** A player has a receiving role when their receptions line is at least
   0.5 above their position's replacement level (mean line of baseline players valued 5 or less at
   that position). Those players move by `2.5 x delta x (line - replacement)` where delta is +0.5 for
   Full PPR, -0.5 for Standard, 0 for Half PPR. The total of those moves is taken back in equal
   amounts from every other player, so the pool's total value is unchanged; nobody drops below 1.
   Players with no line posted use the mean line of position peers within 10 value points.
2. **League size.** `final = top x (scored / baseline top) ^ exponent`, rounded, floored at 1, with
   top / exponent = 65 / 0.87 (8 teams), 70 / 1.00 (10 teams), 75 / 1.15 (12 teams).

Half PPR 10-team output therefore equals the re-seeded baseline (rows one player per row); with `--no-reseed` it equals the sheet exactly.

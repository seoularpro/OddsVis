# Trade value workbooks (Scoring x League size)

Regenerates the nine `TradeValueSheets/TradeValues_<Scoring>_<N>team.xlsx` workbooks (plus
`TradeValues_AllCombinations.xlsx`, one tab each) from the Half PPR 10-team baseline using the
exact adjustment math settled on 2026-09-09.

```bash
python3 -m pip install --user openpyxl        # once
python3 scripts/trade-values/build_trade_values.py
```

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
| `build_trade_values.py` | the whole process: read baseline, attach reception lines, scoring step, league step, write workbooks |
| `params.json` | every constant (reception deltas, league tops and exponents, magnitude 2.5, thresholds). Edit here to change the math |
| `receptions.json` | snapshot of each player's BettingPros receptions line (2026 week 1). Refresh with `--refresh-receptions --week N` to use a later week's props |

## The math

1. **Scoring (zero-sum).** A player has a receiving role when their receptions line is at least
   0.5 above their position's replacement level (mean line of baseline players valued 5 or less at
   that position). Those players move by `2.5 x delta x (line - replacement)` where delta is +0.5 for
   Full PPR, -0.5 for Standard, 0 for Half PPR. The total of those moves is taken back in equal
   amounts from every other player, so the pool's total value is unchanged; nobody drops below 1.
   Players with no line posted use the mean line of position peers within 10 value points.
2. **League size.** `final = top x (scored / baseline top) ^ exponent`, rounded, floored at 1, with
   top / exponent = 65 / 0.87 (8 teams), 70 / 1.00 (10 teams), 75 / 1.15 (12 teams).

Half PPR 10-team output therefore equals the baseline values exactly (rows re-sorted one player per row).

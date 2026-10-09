#!/usr/bin/env python3
"""
Backtest the count-prop conversions in odds-react-app/src/bpProjections.js
against real box scores.

    python3 -I scripts/calibrate-counts.py [--seasons 2024,2025]

For each season and week it takes the LAST BettingPros snapshot committed
before Sunday 17:00 UTC (the pre-kickoff lines; earlier files can still hold
the previous slate, later ones can be mid-game), joins each count prop by
normalized player name to the ESPN league file
odds-react-app/public/<season>/week<N>hppr (statSourceId 0 actuals: 4 pass
TD, 20 INT, 53 receptions, 25 rush TD, 43 rec TD), and reports per market,
line and odds bucket:

    n, mean de-vigged over probability, empirical over rate, mean actual,
    and the mean of the linear read (line - 0.5 + p) vs. the Poisson rate.

The BettingPros `scoring.actual` field in the final weekly snapshot is NOT
used: in 2025 it is outcome-biased (nearly every scored INT prop shows the
over hitting), so it cannot calibrate anything.

Needs git (for the snapshot commit times); no third-party packages.
"""
import argparse
import collections
import datetime as dt
import glob
import json
import math
import os
import re
import statistics as st
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(ROOT, "BettingProsFiles")
PUBLIC = os.path.join(ROOT, "odds-react-app", "public")
VIG = 1.0623  # UNIVERSAL_VIG in constants.js
FIRST_SUNDAY = {2024: dt.date(2024, 9, 8), 2025: dt.date(2025, 9, 7), 2026: dt.date(2026, 9, 13)}
MARKETS = {102: ("PassTD", "4"), 101: ("Ints", "20"), 104: ("Recs", "53")}


def american_to_decimal(odds):
    # Same 2-decimal rounding as americanToDecimal in util.js.
    return round(odds / 100 + 1 if odds > 0 else 100 / abs(odds) + 1, 2)


def poisson_tail(lam, k):
    term, cdf = math.exp(-lam), 0.0
    for i in range(k):
        cdf += term
        term *= lam / (i + 1)
    return 1 - cdf


def poisson_rate(p, k):
    if k == 1:
        return -math.log(1 - p)
    lo, hi = 0.0, max(4 * k, 10)
    for _ in range(60):
        mid = (lo + hi) / 2
        if poisson_tail(mid, k) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def normalize(name):
    return re.sub(r" jr| sr", "", (name or "").replace(".", ""), flags=re.I).strip()


def snapshot_times():
    out = subprocess.run(
        ["git", "log", "--format=COMMIT %cI", "--name-only", "--diff-filter=A", "--", "BettingProsFiles/*week*"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout
    times, ts = {}, None
    for line in out.splitlines():
        if line.startswith("COMMIT "):
            ts = dt.datetime.fromisoformat(line[7:].replace("Z", "+00:00"))
        elif line.startswith("BettingProsFiles/") and ts:
            times[line.split("/", 1)[1]] = ts
    return times


def last_index(season, week):
    name = f"{season}lastIndex{week}.txt" if season != 2024 else f"lastIndex{week}.txt"
    try:
        return int(open(os.path.join(BP, name)).read().strip())
    except (OSError, ValueError):
        return None


def espn_actuals(season):
    out = {}
    for path in glob.glob(os.path.join(PUBLIC, str(season), "week*hppr")):
        week = int(re.search(r"week(\d+)hppr", path).group(1))
        try:
            data = json.load(open(path))
        except (OSError, ValueError):
            continue
        for matchup in data.get("schedule", []):
            if matchup.get("matchupPeriodId") != week:
                continue
            for side in ("away", "home"):
                for key in ("rosterForCurrentScoringPeriod", "rosterForMatchupPeriod"):
                    for entry in (matchup.get(side, {}).get(key) or {}).get("entries", []):
                        player = entry["playerPoolEntry"]["player"]
                        for s in player.get("stats", []):
                            if (
                                s.get("statSourceId") == 0
                                and s.get("scoringPeriodId") == week
                                and s.get("statSplitTypeId") == 1
                            ):
                                out[(week, normalize(player["fullName"]))] = s.get("stats", {})
    return out


def pre_kickoff_snapshot(season, week, times):
    li = last_index(season, week)
    if li is None or season not in FIRST_SUNDAY:
        return None
    sunday = FIRST_SUNDAY[season] + dt.timedelta(days=7 * (week - 1))
    kickoff = dt.datetime(sunday.year, sunday.month, sunday.day, 17, tzinfo=dt.timezone.utc)
    candidates = [
        (times[f"{season}week{week}{i}"], i)
        for i in range(li + 1)
        if f"{season}week{week}{i}" in times
    ]
    candidates = [c for c in candidates if c[0] < kickoff]
    if not candidates:
        return None
    _, i = max(candidates)
    try:
        data = json.load(open(os.path.join(BP, f"{season}week{week}{i}")))
    except (OSError, ValueError):
        return None
    return data if "props" in data else None


def collect(seasons):
    times = snapshot_times()
    rows = []
    for season in seasons:
        actuals = espn_actuals(season)
        if not actuals:
            print(f"{season}: no ESPN league files under public/{season}, skipped")
            continue
        for week in range(1, 19):
            snap = pre_kickoff_snapshot(season, week, times)
            if snap is None:
                continue
            for p in snap["props"]:
                mk = p["market_id"]
                if mk not in MARKETS and mk != 78:
                    continue
                stats = actuals.get((week, normalize(p["participant"]["name"])))
                if stats is None:
                    continue
                over = p["over"]
                line, odds = over.get("consensus_line"), over.get("consensus_odds")
                if line is None or odds in (None, 0):
                    continue
                prob = min(0.95, max(0.05, 1 / american_to_decimal(odds) / VIG))
                if mk == 78:
                    rows.append(dict(
                        season=season, market="AnyTD", line=0.5, p=prob,
                        position=p["participant"]["player"].get("position"),
                        actual=float(stats.get("25", 0)) + float(stats.get("43", 0)),
                        linear=prob, poisson=poisson_rate(min(prob, 0.8), 1),
                    ))
                    continue
                if abs(line - round(line)) != 0.5:
                    continue
                label, stat = MARKETS[mk]
                k = int(line + 0.5)
                rows.append(dict(
                    season=season, market=label, line=line, p=prob, position=None,
                    actual=float(stats.get(stat, 0)),
                    linear=line - 0.5 + prob, poisson=poisson_rate(prob, k),
                ))
    return rows


def report(rows, label):
    n = len(rows)
    if n == 0:
        return
    actual = st.mean(r["actual"] for r in rows)
    linear = st.mean(r["linear"] for r in rows)
    poisson = st.mean(r["poisson"] for r in rows)
    implied = st.mean(r["p"] for r in rows)
    over = st.mean(1 if r["actual"] > r["line"] else 0 for r in rows)
    mae_l = st.mean(abs(r["linear"] - r["actual"]) for r in rows)
    mae_p = st.mean(abs(r["poisson"] - r["actual"]) for r in rows)
    print(
        f"{label:36s} n={n:5d} implied={implied:.3f} over-rate={over:.3f} ({over - implied:+.3f}) "
        f"| actual={actual:5.2f} linear={linear:5.2f} ({linear - actual:+.2f}) "
        f"poisson={poisson:5.2f} ({poisson - actual:+.2f}) | MAE {mae_l:.2f} vs {mae_p:.2f}"
    )


BUCKETS = ((0, 0.4, "p < .40"), (0.4, 0.6, "p .40-.60"), (0.6, 1.01, "p > .60"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seasons", default="2024,2025")
    args = ap.parse_args()
    seasons = [int(s) for s in args.seasons.split(",")]
    rows = collect(seasons)
    print("rows:", dict(collections.Counter(r["market"] for r in rows)))
    for market in ("PassTD", "Ints", "Recs"):
        sub = [r for r in rows if r["market"] == market]
        if not sub:
            continue
        print(f"\n==== {market}: 'linear' = line - 0.5 + p (the old read), "
              f"'poisson' = rate with P(X >= line + 0.5) = p")
        for season in seasons:
            report([r for r in sub if r["season"] == season], f"  {season}")
        report(sub, "  all seasons")
        for line in sorted(set(r["line"] for r in sub)):
            by_line = [r for r in sub if r["line"] == line]
            if len(by_line) >= 10:
                report(by_line, f"    line {line}")
            for lo, hi, name in BUCKETS:
                bucket = [r for r in by_line if lo <= r["p"] < hi]
                if len(bucket) >= 12:
                    report(bucket, f"      line {line} {name}")
    sub = [r for r in rows if r["market"] == "AnyTD" and r["position"] != "QB"]
    if sub:
        print("\n==== AnyTD (non-QB): expected rush+rec TDs. "
              "'linear' = p (the old read), 'poisson' = -ln(1 - min(p, 0.8))")
        for lo, hi in ((0, 0.15), (0.15, 0.3), (0.3, 0.45), (0.45, 0.6), (0.6, 0.8), (0.8, 1)):
            bucket = [r for r in sub if lo <= r["p"] < hi]
            if len(bucket) >= 15:
                report(bucket, f"  p [{lo:.2f}, {hi:.2f})")


if __name__ == "__main__":
    main()

# Chrome Web Store listing (copy/paste)

**Name**: OddsVis Trade Optimizer

**Summary (132 chars max)**
Finds the top trades that raise your fantasy football starting lineup's projection, using OddsVis weekly medians and trade values.

**Description** (store limit 16,000 characters; this is ~1950)
```
OddsVis Trade Optimizer finds the trades in your fantasy football league that actually raise your starting lineup, and that the other manager has a real reason to accept.

Open your ESPN or Sleeper league, click the icon, and the side panel reads every roster in the league. No pasting cookies, no separate login: it uses the page you're already signed into.

WHAT IT DOES
• Builds every team's optimal lineup from OddsVis weekly median projections, which come from sportsbook player props rather than site defaults.
• Shows where you're actually weak: the starting slots near replacement level, how they rank across the league, and the realistic upgrades other rosters could spare.
• Finds your expendable depth: players with real trade value who add nothing to your starting lineup.
• Simulates thousands of 1-for-1, 2-for-1, 1-for-2 and 2-for-2 packages, refits both rosters (waiver fills and drops included), and re-optimizes both lineups after each one.
• Ranks win/win deals first: both lineups improve and both sides fix a weakness. Then mutual-gain trades, then fair one-sided ones.
• Explains every recommendation with numbers: lineup before and after for both teams, which slots change, trade value each way, and why the other manager says yes.

WHY INSTALL IT
Trade calculators compare the players in the deal. This compares the lineups. A $30 running back buried on someone's bench is worth nothing to them and a starter to you, and this is built to find exactly that gap. It also tells you the free waiver moves to make first, so you never trade for something you could have picked up.

FREE AND PRO
Free: full team analysis, league overview, and your #2 trade in full.
Pro: every ranked trade, including #1, with before/after lineups and explanations. Weekend, monthly, season and lifetime passes.

Supports ESPN and Sleeper. Also available on the web at vegaslytics.com/trades for your phone. Yahoo is recognized but not yet supported.
```

**Category**: Productivity (or Sports if offered)

**Single purpose**
Analyze the fantasy football league open in the browser and recommend trades that improve the user's starting lineup projection.

**Permission justifications**
- sidePanel: the analysis UI is a side panel.
- storage: remembers the user's team per league, optimizer settings and license status.
- activeTab: sends a request to the league page's content script when the user clicks Analyze.
- scripting: injects the content script if the league page was already open when the extension was installed.
- Host permissions: fantasy.espn.com / *.fantasy.espn.com and sleeper.com / api.sleeper.app to read league settings, rosters and free agents through the sites' own APIs; football.fantasysports.yahoo.com to recognize Yahoo pages and explain that they are unsupported; raw.githubusercontent.com to download the projection and trade-value datasets.

**Remote code**: No. All code is packaged; only JSON data is downloaded.

**Data use disclosure**
- Collects: no personally identifiable information, no health/financial/auth info, no web history, no user activity, no website content beyond the league data processed locally.
- The license key entered by the user is verified inside the extension and is not transmitted anywhere. It contains the purchase email and expiry, stored locally to show who the license belongs to.
- Not sold, not used for unrelated purposes, not used for creditworthiness.

**Privacy policy URL**: https://<your-netlify-site>/trade-optimizer-privacy.html

**Assets needed**
- Icon 128×128: public/icons/icon-128.png (already in the package).
- Screenshots 1280×800 (1–5): the panel on a league page showing team analysis and the trade list.
- Promo tile 440×280 (optional).

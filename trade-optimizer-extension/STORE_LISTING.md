# Chrome Web Store listing (copy/paste)

**Name**: VegasLytics Trade Optimizer

**Summary (132 chars max)**
Finds the top trades that raise your fantasy football starting lineup's projection, using VegasLytics medians and trade values.

**Description** (store limit 16,000 characters; this is ~5100)
```
VegasLytics Trade Optimizer finds the trades in your fantasy football league that actually raise your starting lineup, and that the other manager has a real reason to accept.

Open your ESPN or Sleeper league, click the extension icon, and press Analyze. The side panel reads every roster in the league, works out each team's best lineup, and returns a ranked list of trades with the numbers behind each one. No pasting cookies, no separate login, no spreadsheet: it uses the league page you are already signed into.

WHY IT IS DIFFERENT
Most trade calculators compare the players in the deal. This compares the lineups. A $30 running back sitting on someone's bench is worth nothing to them this week and could be a starter for you. That gap between what a player is worth on paper and what he adds to a specific roster is where good trades come from, and it is exactly what this tool searches for.

Projections come from VegasLytics weekly medians, which are built from sportsbook player props rather than a fantasy site's default numbers, and are refreshed through the week as lines move.

WHAT YOU GET
• Team analysis. Your optimal lineup, where it ranks in the league, your total trade value, and your largest weaknesses: the starting slots closest to replacement level, how each ranks across the league, and the realistic upgrade other rosters could spare.
• Surplus and expendable depth. The players on your roster who carry real trade value but add little or nothing to your starting lineup. These are your trade chips.
• Free moves first. If a waiver pickup improves your lineup, it is listed before any trade, and every trade is measured after those moves, so you never trade for something you could have added for free.
• Fair trades. Thousands of 1-for-1, 2-for-1, 1-for-2, 2-for-2 and 3-for-2 packages are simulated. Both rosters are refit after each one, including waiver fills and drops, and both lineups are re-optimized. Win/win deals rank first (both lineups improve and both sides fix a weakness), then mutual-gain trades, then fair one-sided ones.
• Unfair trades. A separate list of deals tilted in your favor that a manager might still take: you gain trade value and lineup points, they keep an angle to say yes, and the card tells you what pushback to expect.
• The reasoning, not just the answer. Every trade opens to show both lineups before and after, which slots change, the trade value going each way, a fairness score, why it works for you, and why the other manager says yes.
• League overview. Every team's lineup strength, trade value, roster holes and surplus positions in one table, so you can see who needs what.

BUILT TO SUGGEST TRADES THAT CAN HAPPEN
• Trades stay inside a value tolerance, so you are not shown offers that would be laughed at.
• The other manager must come out ahead somewhere: a better lineup, a filled hole, or the best player in the deal.
• Players without a posted line this week are never offered or requested, because their value is unknown.
• Players whose props were pulled from the latest odds are left out too, and the panel tells you who and why. That usually means injury news or a role change.
• Kickers and defenses are never traded, and quarterbacks are only packaged when they carry real value.
• At most three suggestions per trade partner, so one roster does not fill your whole list.

WORKS WITH YOUR LEAGUE'S RULES
• ESPN and Sleeper leagues, including private ESPN leagues you are signed into.
• Your league's own lineup slots, including flex and superflex.
• Standard, half PPR and full PPR scoring, with 4 or 6 point passing touchdowns.
• Not on a league page? Load a public ESPN league or any Sleeper league by its id.
• Settings let you loosen or tighten the value tolerance, the minimum gain worth showing, and how many trades to list.

FREE AND PRO
Free: full team analysis, the league overview, and your #1 trade in full on each list.
Pro: every ranked trade, with before and after lineups and full explanations.

Pro is sold as a Weekend pass, a 30-day pass, a Season pass or Lifetime access. Each is a one-time payment with no auto-renewal. Pick a pass in the panel, pay on PayPal, and your license key is emailed to you. Paste it into the panel once and it stays active on that browser until the pass ends.

PRIVACY
• Your league and rosters never leave your browser. All analysis runs locally in the extension.
• No account, no analytics, no advertising identifiers.
• Your license key is checked inside the extension and is not sent anywhere.
• The only downloads are the public projection and trade-value data files.

GOOD TO KNOW
• Early in the week, before sportsbooks have posted most player props, fewer trades qualify. The panel tells you when coverage is thin; lines usually fill in by Wednesday or Thursday.
• Yahoo league pages are recognized but not supported yet.
• Also available on the web at vegaslytics.com/trades, which is handy on your phone.

This extension is an independent tool. It is not affiliated with or endorsed by ESPN, Sleeper, Yahoo or the NFL. Projections are estimates, not guarantees.
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
- Screenshots 1280×800 (1–5): release/screenshots/1.0.1/ has four (team analysis, suggested trades, trade detail, unfair trades), taken from the demo league.
- Promo tile 440×280 (optional).

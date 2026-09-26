# Chrome Web Store listing (copy/paste)

**Name**: OddsVis Trade Optimizer

**Summary (132 chars max)**
Finds the top trades that raise your fantasy football starting lineup's projection, using OddsVis weekly medians and trade values.

**Description**
Open your ESPN or Sleeper league and get the five trades most likely to raise your optimal starting lineup's median projection, each one realistic for the other manager too.

What it does
• Reads every roster in your league from the page you're viewing (no logins, no pasting cookies).
• Builds each team's optimal lineup from OddsVis weekly median projections.
• Finds your roster holes, expendable depth, and the teams whose surplus matches your need.
• Simulates thousands of 1-for-1, 2-for-1, 1-for-2 and 2-for-2 packages, re-optimizing both lineups after each.
• Ranks by your lineup gain first, then mutual benefit and trade-value fairness, and explains every pick with the numbers.

Free: full team analysis, league overview, and your #1 trade.
Pro: every ranked trade with before/after lineups and explanations.

Supports ESPN and Sleeper. Yahoo is detected but not yet supported.

**Category**: Productivity (or Sports if offered)

**Single purpose**
Analyze the fantasy football league open in the browser and recommend trades that improve the user's starting lineup projection.

**Permission justifications**
- sidePanel: the analysis UI is a side panel.
- storage: remembers the user's team per league, optimizer settings and license status.
- activeTab: sends a request to the league page's content script when the user clicks Analyze.
- scripting: injects the content script if the league page was already open when the extension was installed.
- Host permissions: fantasy.espn.com / *.fantasy.espn.com and sleeper.com / api.sleeper.app to read league settings, rosters and free agents through the sites' own APIs; football.fantasysports.yahoo.com to recognize Yahoo pages and explain that they are unsupported; raw.githubusercontent.com to download the projection and trade-value datasets; api.lemonsqueezy.com to validate Pro license keys.

**Remote code**: No. All code is packaged; only JSON data is downloaded.

**Data use disclosure**
- Collects: no personally identifiable information, no health/financial/auth info, no web history, no user activity, no website content beyond the league data processed locally.
- The license key entered by the user is sent to the payment provider for validation only.
- Not sold, not used for unrelated purposes, not used for creditworthiness.

**Privacy policy URL**: https://<your-netlify-site>/trade-optimizer-privacy.html

**Assets needed**
- Icon 128×128: public/icons/icon-128.png (already in the package).
- Screenshots 1280×800 (1–5): the panel on a league page showing team analysis and the trade list.
- Promo tile 440×280 (optional).

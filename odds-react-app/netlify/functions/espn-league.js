// Netlify function: relay a single ESPN Fantasy Football league read using the
// caller's SWID / espn_s2 cookies. Needed for private leagues because the
// browser cannot attach ESPN's cookies to a cross-site request.
//
// Security notes:
//  - Credentials arrive only in the POST body and are used once for the
//    outbound Cookie header. They are never logged, stored, or echoed back.
//  - The target host, path, and query views are fixed; only numeric IDs pass
//    through, so this cannot be used as a general-purpose proxy.

const ESPN_API_BASE =
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";
const ALLOWED_VIEWS = new Set(["mSettings", "mStatus", "mTeam", "mRoster"]);

const SWID_RE = /^\{?[0-9A-Fa-f]{8}(-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}\}?$/;
const ESPN_S2_RE = /^[A-Za-z0-9%._~+/=-]{20,4096}$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "ESPN_API_ERROR", message: "Use POST." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "ESPN_API_ERROR", message: "Malformed request body." });
  }

  const { leagueId, season, views, scoringPeriodId, swid, espnS2 } = payload;
  if (!/^\d{1,12}$/.test(String(leagueId ?? ""))) {
    return json(400, { error: "ESPN_INVALID_LEAGUE_ID" });
  }
  if (!/^\d{4}$/.test(String(season ?? ""))) {
    return json(400, { error: "ESPN_API_ERROR", message: "Invalid season." });
  }
  if (!Array.isArray(views) || views.length === 0 || !views.every((v) => ALLOWED_VIEWS.has(v))) {
    return json(400, { error: "ESPN_API_ERROR", message: "Invalid views." });
  }
  if (
    scoringPeriodId != null &&
    !(Number.isInteger(scoringPeriodId) && scoringPeriodId >= 0 && scoringPeriodId <= 30)
  ) {
    return json(400, { error: "ESPN_API_ERROR", message: "Invalid scoringPeriodId." });
  }
  if (typeof swid !== "string" || !SWID_RE.test(swid.trim())) {
    return json(400, { error: "ESPN_AUTH_FAILED", message: "SWID should look like {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}." });
  }
  if (typeof espnS2 !== "string" || !ESPN_S2_RE.test(espnS2.trim())) {
    return json(400, { error: "ESPN_AUTH_FAILED", message: "espn_s2 value doesn't look like an ESPN cookie." });
  }

  let cleanSwid = swid.trim();
  if (!cleanSwid.startsWith("{")) cleanSwid = `{${cleanSwid}}`;

  const params = new URLSearchParams();
  views.forEach((v) => params.append("view", v));
  if (scoringPeriodId != null) params.set("scoringPeriodId", String(scoringPeriodId));
  const url = `${ESPN_API_BASE}/${season}/segments/0/leagues/${leagueId}?${params}`;

  let upstream;
  try {
    upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        Cookie: `SWID=${cleanSwid}; espn_s2=${espnS2.trim()}`,
      },
    });
  } catch (e) {
    return json(502, { error: "ESPN_API_ERROR", message: "Could not reach ESPN." });
  }

  const text = await upstream.text();
  try {
    JSON.parse(text);
  } catch (e) {
    return json(502, { error: "ESPN_INVALID_RESPONSE" });
  }

  // Pass ESPN's status and JSON body through unchanged; the client maps them.
  return {
    statusCode: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: text,
  };
};

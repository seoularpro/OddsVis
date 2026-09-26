// Content script entry: answers DETECT / EXTRACT_LEAGUE requests from the side
// panel. Runs on the fantasy site's origin so platform cookies apply.

import type { ContentRequest, ContentResponse } from "../shared/messages";
import { describePage } from "./detectPlatform";
import { extractLeague } from "./extractLeague";

declare global {
  interface Window {
    __oddsvisTradeOptimizerLoaded?: boolean;
  }
}

async function handle(msg: ContentRequest): Promise<ContentResponse> {
  switch (msg.type) {
    case "PING":
      return { ok: true, type: "PONG" };
    case "DETECT":
      return { ok: true, type: "DETECT", result: describePage(window.location) };
    case "EXTRACT_LEAGUE": {
      const { league, warnings } = await extractLeague(window.location, msg.options?.teamIdHint);
      return { ok: true, type: "EXTRACT_LEAGUE", league, warnings };
    }
    default:
      return { ok: false, error: `Unknown message ${(msg as { type: string }).type}` };
  }
}

if (!window.__oddsvisTradeOptimizerLoaded) {
  window.__oddsvisTradeOptimizerLoaded = true;
  chrome.runtime.onMessage.addListener((msg: ContentRequest, _sender, sendResponse) => {
    handle(msg)
      .then(sendResponse)
      .catch((e: unknown) => {
        const err = e as { message?: string; code?: string };
        sendResponse({ ok: false, error: err?.message ?? String(e), code: err?.code } satisfies ContentResponse);
      });
    return true; // async response
  });
}

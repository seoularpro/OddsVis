// MV3 service worker: opens the side panel from the toolbar button and reads
// platform cookies the content script cannot see (HttpOnly / cross-path).

import type { BackgroundRequest, BackgroundResponse } from "../shared/messages";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
});

chrome.runtime.onMessage.addListener((msg: BackgroundRequest, sender, sendResponse: (r: BackgroundResponse) => void) => {
  (async () => {
    switch (msg.type) {
      case "GET_COOKIE": {
        try {
          const cookie = await chrome.cookies.get({ url: msg.url, name: msg.name });
          sendResponse({ ok: true, value: cookie?.value ?? null });
        } catch (e) {
          sendResponse({ ok: false, error: (e as Error).message });
        }
        return;
      }
      case "OPEN_SIDE_PANEL": {
        const tabId = msg.tabId ?? sender.tab?.id;
        if (tabId != null) await chrome.sidePanel.open({ tabId });
        sendResponse({ ok: true });
        return;
      }
      default:
        sendResponse({ ok: false, error: "Unknown message" });
    }
  })();
  return true;
});

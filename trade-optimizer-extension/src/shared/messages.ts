// Message contracts between the side panel, the service worker and the
// content script. Every message is a discriminated union on `type`.

import type { Platform, RawLeague } from "../domain/types";

export interface DetectResult {
  platform: Platform | null;
  supported: boolean;
  leagueId: string | null;
  /** Human-readable reason when unsupported (e.g. Yahoo needs OAuth). */
  reason?: string;
  url: string;
}

export type ContentRequest =
  | { type: "PING" }
  | { type: "DETECT" }
  | { type: "EXTRACT_LEAGUE"; options?: { teamIdHint?: string | null } };

export type ContentResponse =
  | { ok: true; type: "PONG" }
  | { ok: true; type: "DETECT"; result: DetectResult }
  | { ok: true; type: "EXTRACT_LEAGUE"; league: RawLeague; warnings: string[] }
  | { ok: false; error: string; code?: string };

export type BackgroundRequest =
  | { type: "GET_COOKIE"; url: string; name: string }
  | { type: "OPEN_SIDE_PANEL"; tabId?: number };

export type BackgroundResponse = { ok: true; value: string | null } | { ok: true } | { ok: false; error: string };

export class AdapterError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "AdapterError";
  }
}

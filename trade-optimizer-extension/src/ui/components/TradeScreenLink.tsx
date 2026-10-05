import React from "react";
import type { League, Player } from "../../domain/types";
import { tradeScreenLink } from "../../shared/tradeLinks";

/** Footer row of a trade card: opens the fantasy site's trade screen in a new tab. */
export function TradeScreenLink({ league, trade, partnerName }: { league: League; trade: { partnerTeamId: string; userReceives: Player[] }; partnerName: string }) {
  const link = tradeScreenLink(league, trade, partnerName);
  if (!link) return null;
  return (
    <div className="trade-actions">
      <a className="site-link" href={link.url} target="_blank" rel="noopener noreferrer">
        {link.label}
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M6 3h7v7M13 3L4 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      <span className="muted small">{link.hint}</span>
    </div>
  );
}

import React, { useState } from "react";
import { EXTENSION_URL, TRADES_ENABLED } from "./featureFlags";

// Promo banner shown at the top of the homepage for the Trade Optimizer.
// Links to /trades once TRADES_ENABLED is on, and to the Chrome Web Store
// listing once EXTENSION_URL is set (see featureFlags.js). Renders nothing
// if neither destination exists yet, so it can ship ahead of both.
// Dismissal is remembered per browser in localStorage.
const DISMISS_KEY = "vl-promo-trade-optimizer-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export default function TradeOptimizerPromo() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const showTrades = TRADES_ENABLED;
  const showExtension = EXTENSION_URL !== "";

  if (dismissed || (!showTrades && !showExtension)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch (e) {
      /* private mode etc. – banner just comes back next visit */
    }
  };

  return (
    <aside className="vl-promo" role="complementary" aria-label="Trade Optimizer">
      <div className="vl-promo-art" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="40" height="40">
          <path
            d="M10 30 16 22l7 6 9-12 6 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 36h20M24 12v-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      </div>

      <div className="vl-promo-body">
        <div className="vl-promo-kicker">
          <span className="vl-badge-new">New</span>
          <span>Trade Optimizer</span>
        </div>
        <h2 className="vl-promo-title">Find the trade that actually moves your lineup.</h2>
        <p className="vl-promo-text">
          Paste an ESPN or Sleeper league ID and get win-win offers that raise both teams' median
          projections (scored on the same weekly player props as this table), so the other manager
          has a clear reason to say yes.
        </p>
      </div>

      <div className="vl-promo-actions">
        {showTrades ? (
          <a className="vl-btn vl-btn-primary" href="/trades">
            Try it on the web
          </a>
        ) : null}
        {showExtension ? (
          <a
            className={`vl-btn ${showTrades ? "vl-btn-ghost" : "vl-btn-primary"}`}
            href={EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get the Chrome extension
          </a>
        ) : null}
      </div>

      <button
        type="button"
        className="vl-promo-close"
        onClick={dismiss}
        aria-label="Dismiss Trade Optimizer announcement"
        title="Dismiss"
      >
        ×
      </button>
    </aside>
  );
}

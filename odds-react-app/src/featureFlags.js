// Feature flags. The Trade Optimizer page ships in the bundle but stays off
// until the Chrome Web Store listing and the Lemon Squeezy store are approved.
// Turn it on by setting REACT_APP_TRADES_ENABLED=true in the Netlify build
// environment (or a local .env) and redeploying; no code change needed.
export const TRADES_ENABLED = process.env.REACT_APP_TRADES_ENABLED === "true";

// Chrome Web Store URL for the VegasLytics Trade Optimizer extension. Empty
// until the listing is live; the homepage promo only shows its "Get the Chrome
// extension" button once this is set (REACT_APP_EXTENSION_URL in Netlify).
export const EXTENSION_URL = process.env.REACT_APP_EXTENSION_URL || "";

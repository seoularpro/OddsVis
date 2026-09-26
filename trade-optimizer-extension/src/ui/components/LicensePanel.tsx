import React, { useState } from "react";
import type { LicenseState } from "../../shared/license";
import type { PaywallConfig } from "../../shared/paywallConfig";

export function LicensePanel({
  license,
  config,
  entitled,
  busy,
  onActivate,
  onRemove,
  onUpgrade,
}: {
  license: LicenseState;
  config: PaywallConfig;
  entitled: boolean;
  busy: boolean;
  onActivate: (key: string) => void;
  onRemove: () => void;
  onUpgrade: () => void;
}) {
  const [key, setKey] = useState("");
  if (config.provider === "none") return null;

  return (
    <section className="card license">
      <div className="card-head">
        <h2>{config.productName}</h2>
        <span className={`tag ${entitled ? "tag-ok" : ""}`}>{entitled ? "Pro active" : "Free tier"}</span>
      </div>
      {entitled ? (
        <div className="license-row">
          <span className="muted small">
            Licensed{license.email ? ` to ${license.email}` : ""}
            {license.expiresAt ? ` · renews/expires ${new Date(license.expiresAt).toLocaleDateString()}` : ""}
            {license.message ? ` · ${license.message}` : ""}
          </span>
          <button className="link small" onClick={onRemove}>Remove key</button>
        </div>
      ) : (
        <>
          <p className="small">
            Free: full team analysis, league overview and your #1 trade. Pro: every ranked trade with lineups, explanations and rank reasons.
          </p>
          <div className="license-row">
            <button className="primary" onClick={onUpgrade} disabled={!config.checkoutUrl}>
              Upgrade{config.priceLabel ? ` · ${config.priceLabel}` : ""}
            </button>
            {!config.checkoutUrl ? <span className="muted small">Checkout URL not configured (VITE_PAYWALL_CHECKOUT).</span> : null}
          </div>
          <form
            className="license-row"
            onSubmit={(e) => {
              e.preventDefault();
              onActivate(key);
            }}
          >
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your license key" autoComplete="off" />
            <button type="submit" disabled={busy || !key.trim()}>
              {busy ? "Checking…" : "Activate"}
            </button>
          </form>
          {license.message && license.status !== "active" ? <div className="note error small">{license.message}</div> : null}
        </>
      )}
    </section>
  );
}

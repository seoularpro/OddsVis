import React, { useState } from "react";
import type { LicenseState } from "../../shared/license";
import type { PaywallConfig, PaywallPlan } from "../../shared/paywallConfig";

function describeFreeRanks(ranks: number[]): string {
  if (!ranks.length) return "the trade summaries";
  if (ranks.length === 1) return `your #${ranks[0]} trade in full`;
  return `trades ${ranks.map((r) => `#${r}`).join(", ")} in full`;
}

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
  onUpgrade: (plan?: PaywallPlan) => void;
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
            {license.expiresAt ? ` · renews/expires ${new Date(license.expiresAt).toLocaleDateString()}` : " · lifetime"}
            {license.message ? ` · ${license.message}` : ""}
          </span>
          <button className="link small" onClick={onRemove}>Remove key</button>
        </div>
      ) : (
        <>
          <p className="small">
            Free: full team analysis, league overview and {describeFreeRanks(config.freeRanks)}. Pro: every ranked trade with lineups, explanations and rank reasons.
          </p>
          {config.singleCheckout ? (
            <>
              <div className="plans">
                {config.plans.map((plan) => (
                  <div key={plan.id} className="plan plan-info">
                    <span className="plan-label">{plan.label}</span>
                    {plan.priceLabel ? <span className="plan-price">{plan.priceLabel}</span> : null}
                    <span className="plan-desc muted small">{plan.description}</span>
                  </div>
                ))}
              </div>
              <div className="license-row">
                <button type="button" className="primary" onClick={() => onUpgrade()}>
                  Unlock all trades{config.priceLabel ? ` · ${config.priceLabel}` : ""}
                </button>
                <span className="muted small">
                  Choose your pass at checkout.{config.provider === "signed" ? " Your license key is emailed to you after payment." : ""}
                </span>
              </div>
            </>
          ) : config.plans.length ? (
            <>
              <div className="plans">
                {config.plans.map((plan) => (
                  <button key={plan.id} type="button" className={`plan${config.defaultPlan?.id === plan.id ? " plan-default" : ""}`} onClick={() => onUpgrade(plan)}>
                    <span className="plan-label">{plan.label}</span>
                    {plan.priceLabel ? <span className="plan-price">{plan.priceLabel}</span> : null}
                    <span className="plan-desc muted small">{plan.description}</span>
                  </button>
                ))}
              </div>
              {config.provider === "signed" ? <p className="muted small">Pick a pass to pay. Your license key is emailed to you after payment.</p> : null}
            </>
          ) : (
            <div className="license-row">
              <button className="primary" disabled>Upgrade</button>
              <span className="muted small">Checkout not configured (VITE_PAYWALL_CHECKOUT, or VITE_PAYWALL_STORE and VITE_PAYWALL_VARIANT_*).</span>
            </div>
          )}
          <form
            className="license-row"
            onSubmit={(e) => {
              e.preventDefault();
              onActivate(key);
            }}
          >
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Already bought? Paste your license key" autoComplete="off" />
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

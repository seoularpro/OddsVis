import "../styles.css";
import React, { useEffect } from "react";
import ThemeToggleDropdown from "../ThemeToggleDropdown";

// Registry of tools shown on the Tools page. Add a new tool by appending an
// entry here; the page renders one card per entry.
//   name        - card title
//   description - one or two sentences on what it does
//   href        - route (or external URL) the button opens
//   cta         - button label
//   isNew       - optional "New" badge
const TOOLS = [
  {
    name: "ESPN Lineup Importer",
    description:
      "Enter an ESPN league ID to pull every team's current starting lineup, " +
      "see this week's median projection for each starter, and compare team totals.",
    href: "/espnLineups",
    cta: "Open importer",
    isNew: true,
  },
];

export default function Tools() {
  useEffect(() => {
    document.title = "Tools";
  }, []);

  return (
    <div>
      <div className="trade-value-theme">
        <ThemeToggleDropdown />
      </div>
      <div className="vl-page">
        <div className="vl-page-head">
          <h1 className="vl-title">Tools</h1>
          <div className="vl-subtitle">
            <span>Utilities built on top of the weekly projections.</span>
          </div>
        </div>

        <div className="vl-tools-grid">
          {TOOLS.map((tool) => (
            <div className="vl-card vl-tool" key={tool.href}>
              <div className="vl-card-head">
                <h3 className="vl-card-title">{tool.name}</h3>
                {tool.isNew ? <span className="vl-chip">New</span> : null}
              </div>
              <div className="vl-tool-body">
                <p className="vl-tool-desc">{tool.description}</p>
                <button
                  className="vl-btn vl-btn-primary"
                  onClick={() => {
                    window.location.href = tool.href;
                  }}
                >
                  {tool.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

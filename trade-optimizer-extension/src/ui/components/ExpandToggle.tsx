import React from "react";

/** Expand/collapse control for a card header. The header owns the click, so this only shows state. */
export function ExpandToggle({ open, more = "More details" }: { open: boolean; more?: string }) {
  return (
    <button type="button" className="expand-toggle" aria-expanded={open}>
      {open ? "Less" : more}
      <svg className="expand-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

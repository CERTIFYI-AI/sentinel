// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS7 — WCAG 2.2 AA: skip-to-main-content link (SC 2.4.1).
export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#368F4D] focus:text-white focus:rounded focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-white"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  )
}

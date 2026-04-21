---
title: ADR-0007 — Outfit-Only Font Stack (No Generic Fallback)
status: accepted
date: 2026-04-21
deciders: [engineering, design]
---

# ADR-0007 — Outfit-Only Typography

## Context
The Sentinel UI uses Outfit as its brand typeface. Previously, Outfit was loaded from Google Fonts CDN with a `sans-serif` generic fallback. This causes:
1. CDN dependency — fonts fail if fonts.googleapis.com is blocked
2. Privacy — external font request leaks user IP to Google
3. Layout inconsistency — generic fallback has different metrics causing CLS

## Decision
Self-host Outfit via `@fontsource-variable/outfit` (npm package, bundled at build time).
Set `font-family: 'Outfit Variable'` with NO generic fallback.

## Consequences
**Positive:**
- Zero CDN dependency — works fully offline
- Privacy-safe — no external font requests
- Zero CLS — font is bundled in the app JS/CSS, available before first paint
- Consistent metrics — `ascent-override`, `descent-override`, `size-adjust` applied

**Negative (mitigated):**
- If JavaScript fails entirely, no font loads. Mitigated by: font-display: swap, metric overrides, and the fact that if JS fails the SPA doesn't render at all.
- Slightly larger JS bundle. Mitigated by: variable font is a single WOFF2 file (~45KB gzipped) vs multiple static weights.

## Trade-off note on removing `sans-serif`
Generic `sans-serif` would only activate if the named font fails. Since Outfit Variable is bundled (not loaded from a CDN), it cannot fail due to network conditions. The only scenario where font would fail is if the bundle itself fails to load — in which case the entire React app also fails. Therefore `sans-serif` fallback provides no practical benefit while adding confusion in DevTools.

## Rollback
Add `'sans-serif'` back to the tailwind config `fontFamily.sans` array.

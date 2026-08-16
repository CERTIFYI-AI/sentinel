# Gap Analysis

**Route:** `/compliance/gap-analysis` · **Backing:** derived from `controls` + `frameworks` + `compliance_scores.gaps`

Gaps are computed, never authored: any mapped **in-scope** control not
implemented/effective becomes a gap row grouped by framework, merged with
mesh-recorded gap strings. Controls marked `not_applicable` are out of scope
— they are **not** gaps and do not count toward coverage (2026-08-16). Each
gap links to its control (`/compliance/controls?open=`). Export is a real CSV
of the derived rows.

A per-framework rollup (implemented+effective vs in-scope total, with a
coverage bar) is derived live from the control library on every fetch —
derived, never stored (`fetchGaps` returns `{ gaps, rollups }`; hook:
`useGaps`).

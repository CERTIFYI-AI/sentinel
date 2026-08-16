# Gap Analysis

**Route:** `/compliance/gap-analysis` · **Backing:** derived from `controls` + `frameworks` + `compliance_scores.gaps`

Gaps are computed, never authored: any mapped control not implemented/effective becomes a gap row grouped by framework, merged with mesh-recorded gap strings. Each gap links to its control (`/compliance/controls?open=`). Export is a real CSV of the derived rows.

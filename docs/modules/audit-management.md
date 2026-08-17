# Audit Management

**Route:** `/audits` · **Backing:** `audits` + `audit_findings` (org-scoped RLS)

Internal/external/regulator audit planning with real findings.

## Interlinks (updated 2026-08-16, controls/evidence wave)

- Findings → controls: `audit_findings.linked_control_id` stores `controls.id`
  and is picked from an id-keyed select over the control library (shows
  `control_ref — name`); the finding card renders a resolved control chip to
  `/compliance/controls?open=<id>` ("Unavailable" when unresolvable).
- Findings → risks: `audit_findings.linked_risk_id` (uuid → `risks.id`),
  picked from the risk register; renders a resolved risk chip to
  `/risks?open=<uuid>` — e.g. the seeded AF-007 links CTL-002 *and* its risk.
- Findings → remediation plans: plans store `source_type='audit_finding'` with
  `source_id` as either the finding uuid **or** its `finding_ref` (both exist
  in seeds — REM-2026-001 carries AF-007's uuid); the page matches on either,
  and Remediation Tracker links back to the parent audit
  (`/audits?open=<audit uuid>`) with a resolved finding label.
- Audits also feed the compliance calendar: planned/in-progress audits with a
  future `start_date` surface as derived events routing to `/audits?open=`.

## Honest counts & logging

- `audits.findings_count` (stored column) is **not displayed**: the list
  column, detail sheet and CSV export derive the count from loaded
  `audit_findings` rows.
- `saveAudit` / `saveFinding` / deletes / `saveControlTest` / calendar writes
  log to `audit_log` via `logAction` with the real session actor (EU AI Act
  Art. 12). No invented "audit score".

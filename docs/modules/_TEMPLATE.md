<!--
  STANDARD MODULE USER-GUIDE TEMPLATE  (Sentinel AI GRC Platform)

  Copy this file to docs/modules/<module>.md and fill every section. This is
  the shape the four-role review (docs/contributing/MANDATORY_REVIEW_PROCESS.md)
  requires, and the exact section set scripts/gen_module_guides.py parses into
  the in-app User Guide panel — so a guide written to this template lights up
  every field of the guide for free, and a THIN guide renders a near-empty panel.

  RULES (from CLAUDE.md):
  - The `**Routes:**` line is authoritative pairing; the generator prefers it
    over fuzzy matching, which prevents "wrong module renders" bugs.
  - The Fields table MUST match the real schema (a migration), not be invented.
  - Interlinks are proven (total == resolves) and documented BOTH directions.
  - Label anything simulated as simulated. Null renders "—", never 0. Unresolvable
    ids show "Unavailable", never a raw uuid.
  - After editing, run `python3 scripts/gen_module_guides.py` and commit the
    regenerated moduleGuides.generated.ts in the same change.
  Delete this comment block in the real doc.
-->

# <Module Name>

**Routes:** `/primary-route`, `/child-route`
**Status:** Production | Beta | Simulated (label honestly)
**Owner:** <team> · **Backing table(s):** `<table_name>` (org-scoped, RLS)

## Purpose
One or two declarative sentences: what this module is and the single job it does.
Rendered as the guide panel's lede. No marketing language.

## Why it exists
The governance / regulatory driver, in business and compliance terms. Name the
obligation this module discharges and what breaks (operationally and for an
auditor) if it is absent. This section is verified by the Compliance Officer.

## How it works
The workflow end to end: how a record is created, the state transitions it goes
through, who acts on it, and what is derived vs. stored. Call out any agent that
writes here (`source = 'auto-agent'`) and any human-oversight / approval gate
(EU AI Act Art. 14). Label anything simulated as simulated.

## Features — full breakdown
Every screen element a user can touch. For each: what it does, what happens on
click, and the real effect (a write throws on failure; a toast fires only after
the write resolves).

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| … | button / table / filter / tab | … | … writes to `<table>` / navigates / exports a real file |

Tables on the screen: list each column, its source field, and how nulls render
(`—`). Filters/tabs: what each narrows to. Deep-link chips (`?model=<uuid>`).

## Fields
Match the real schema — column | type | required | notes. Include the id, the
org-scoping column (DB default `current_user_org_id()`), and every foreign-key
id (stored as uuid, resolved to a name at render).

| Field | Type | Req. | Notes |
|---|---|---|---|
| id | uuid | pk | — |
| org_id | uuid | auto | DB default `current_user_org_id()` |
| <fk>_id | uuid | fk | → `<table>.id`; resolved to name; "Unavailable" if unresolved |

## Interlinks
Both directions, each proven:
- **Outbound** — what this record links TO and via which deep link.
- **Inbound** — where this record is reachable FROM.
State the interlink query used to prove `total == resolves`.

## Compliance
Specific obligations this module satisfies, cited to the source of truth:
- **EU AI Act** — Article(s) … (cite `docs/compliance/eu-ai-act-mapping.md`)
- **ISO/IEC 42001** — Clause / Annex A control …
- **NIST AI RMF** — Function (GOVERN / MAP / MEASURE / MANAGE) …
- Art. 12 audit logging via `logAction`; Art. 14 human-oversight path if the
  module acts autonomously. Mark **N/A with a reason** where a gate doesn't apply.

## Operations
Running concerns: seeding/backfill, the empty state, common errors and their real
messages (writes throw), realtime behaviour, retention, and known debt (link
`docs/reference/technical-debt.md`).

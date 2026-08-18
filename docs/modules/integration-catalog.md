# Integration Catalog & Collected Evidence

**Route:** `/integrations` → **Catalog** tab ·
**Backing:** `integration_catalog` (global reference), `integrations` (org
instances), `integration_findings`, `control_finding_evidence` ·
**Service:** `dashboard/src/services/integrationCatalogService.ts`,
`dashboard/src/services/integrationFindingsService.ts` ·
**Hook:** `dashboard/src/hooks/useIntegrationCatalog.ts` ·
**Code:** `dashboard/src/components/integrations/IntegrationCatalog.tsx`,
`dashboard/src/pages/controls/ControlDetail.tsx` (Automated Evidence tab) ·
**Server:** `sentinel/integrations/` (registry, worker, crypto, control mapping)

## Purpose

Browse the published catalogue of evidence sources, enable the ones that can
actually collect, and see the evidence they produce mapped onto the org's
controls.

## Why it exists

The catalogue held **219 products** and nothing in the product read it. The
evidence tables behind it — `integration_findings`, `control_finding_evidence`,
`background_jobs` — had **zero readers** too. So the platform had a real
collection pipeline, a real control-mapping engine, and no way for a user to
reach any of it. This module closes that gap.

It also carries an honesty obligation. Of the 219 catalogued products, exactly
**one** (`github`) ships an adapter. Rendering a Connect button on all 219 would
promise evidence collection that cannot happen — the same class of defect as an
unearned certification badge.

## How it works

### Three states, stated plainly

| `adapter_status` | Meaning | UI |
| --- | --- | --- |
| `available` | Adapter ships; connecting starts real collection | Green badge, **Connect** |
| `beta` | Adapter exists, not production-ready | Amber badge, **Connect** |
| `catalogued` | Reference only — no adapter, collects nothing | Neutral badge, **no Connect**, with the reason |

`isConnectable()` is the single gate, unit-tested, and it mirrors the server:
the Python worker refuses a slug absent from its registry
(`sentinel/integrations/registry.py`), so client and server agree by
construction rather than by comment.

A catalogued-only product still shows its full operator prose — what it
evidences, how evidence is pulled, what it maps to, connection steps — because
that is genuinely useful for deciding which sources to prioritise.

### Enable / disable

- **Connect** creates the org's `integrations` row carrying `catalog_slug`; the
  server-side worker picks the job up from there. The row starts as
  `configuring`, which is the honest state: linked, not yet collecting.
  Credentials are **not** handled in the browser — they are written encrypted
  server-side (`sentinel/integrations/crypto.py`, AES-256-GCM).
- **Disconnect** soft-deletes the row. **Findings already collected are
  retained** — disconnecting a source must not erase the evidence trail it
  produced (EU AI Act Art. 12).
- Both write an audit entry via `logAction`.

### Collection and control mapping

An adapter emits `integration_findings` (one row per check, e.g.
`github.org.mfa_required`), each carrying a `check_category`. The server-side
mapper (`sentinel/integrations/control_mapping.py`) resolves that category to
published control refs across SOC 2, ISO/IEC 27001, ISO/IEC 42001, HIPAA,
PCI DSS, GDPR and NIST AI RMF, then writes `control_finding_evidence` linking
the finding to the org controls it evidences. A framework the org has not
adopted simply contributes no links — the mapper never invents a target.

`control_finding_evidence` is deliberately **separate from `controls.status`**:
automated evidence is a signal about a control, not the owner's assertion about
it. A FAILED finding does not silently flip a control someone marked
implemented; it surfaces the contradiction so a person resolves it.

## Fields

### `CatalogEntry` (from `integration_catalog`)

| Field | Column | Notes |
| --- | --- | --- |
| `slug` | `slug` | Primary key; the one id-space shared with `integrations.catalog_slug` |
| `name` | `name` | Product name |
| `category` | `category` | hr, identity, code, cloud, device, security, siem, secrets, cicd, ticketing, training, collaboration, saas, hiring, ai |
| `whyNeeded` | `why_needed` | What evidence this source carries |
| `evidencePull` | `evidence_pull` | How evidence is pulled (API / OAuth / SCIM …) |
| `connectSteps` | `connect_steps` | Operator walkthrough |
| `evidenceMapping` | `evidence_mapping` | What maps to which evidence entities |
| `docsHint` | `docs_hint` | Provider's own docs |
| `tier` | `tier` | 1 = adapter shipped, 2 = planned, 3 = catalogued |
| `adapterStatus` | `adapter_status` | `available` \| `beta` \| `catalogued` |

### `IntegrationFinding` (from `integration_findings`)

| Field | Column | Notes |
| --- | --- | --- |
| `checkId` | `check_id` | Stable, e.g. `github.org.mfa_required` |
| `title` / `description` / `remediation` | same | Normalized, operator-facing |
| `status` | `status` | `PASSED` \| `FAILED` \| `WARNING` \| `NOT_AVAILABLE` |
| `severity` | `severity` | `CRITICAL` … `INFO` |
| `checkCategory` | `check_category` | Drives the control mapping |
| `collectedAt` | `collected_at` | When the check ran |

`result_details` (the raw provider payload) is deliberately **not** surfaced —
it is kept for the audit trail and rendered to users only through the
normalized fields above.

## Interlinks

- **Catalog → org instance.** Joined on `catalog_slug`, never on name.
- **Integration → findings.** The detail sheet shows what the source has
  actually collected, worst-first, or an honest "nothing collected yet".
- **Control → evidence.** `ControlDetail` gains an **Automated Evidence** tab
  listing the findings mapped to that control, with posture, counts and
  remediation.
- **Control → Integrations.** A control with no automated evidence links to
  `/integrations` so the reader can connect a source.

## Compliance

- **EU AI Act Art. 12 (record-keeping).** Connect and disconnect are audit-
  logged; findings survive disconnection.
- **EU AI Act Art. 14 (human oversight).** Automated evidence is presented as a
  signal for a person to act on, never as an automatic control state change.
- **ISO/IEC 42001 §9.1 / §9.2.** Continuous monitoring evidence feeding the
  control register, with provenance (which source, which check, when).
- **Data minimisation.** Credentials never reach the browser; raw provider
  payloads are not rendered.

## Operations

- The catalogue is seeded by migration
  (`20260825000002_seed_integration_catalog.sql`) and is global reference data:
  readable by any signed-in user, writable only by the service role. **If the
  Catalog tab shows "Catalogue not available", migrations have not been applied
  to that database.** Apply them with the **Deploy Migrations** workflow
  (`.github/workflows/deploy-migrations.yml`) — run it manually with *dry run*
  first to see what is pending — or locally with `supabase db push`.
- Tabs are URL-addressable: `/integrations` (catalogue),
  `/integrations?tab=connectors`, `/integrations?tab=webhooks`.
- Adding an adapter means: implement it under `sentinel/integrations/`, register
  it in `registry.py`, and flip that row's `adapter_status` to `available`. The
  registry docstring states the two must agree; the worker enforces it.
- Counts in the UI header are derived from the rows, never hard-coded, so the
  page cannot advertise a number the catalogue does not contain.

## History

- **2026-08-28** — Module created. Before this, `integration_catalog` (219
  rows), `integration_findings`, `control_finding_evidence` and
  `background_jobs` had **zero readers** anywhere in the app or edge functions;
  `/integrations` showed only hand-created connector records from a separate,
  older table. Added the catalogue browser with category filters and search,
  capability-gated connect/disconnect, the collected-evidence view per source,
  and the Automated Evidence tab on controls.

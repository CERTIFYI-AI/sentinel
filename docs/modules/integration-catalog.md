# Integration Catalog & Collected Evidence

**Route:** `/integrations` → **Catalog** tab ·
**Backing:** `integration_catalog` (global reference), `integrations` (org
instances), `integration_findings`, `control_finding_evidence` ·
**Service:** `dashboard/src/services/integrationCatalogService.ts`,
`dashboard/src/services/integrationFindingsService.ts` ·
**Hook:** `dashboard/src/hooks/useIntegrationCatalog.ts` ·
**Code:** `dashboard/src/components/integrations/IntegrationCatalog.tsx`,
`dashboard/src/pages/controls/ControlDetail.tsx` (Automated Evidence tab) ·
**Server:** `sentinel/integrations/` (registry, worker, crypto, control mapping),
`sentinel/integrations/{github,aws,azure}/adapter.py`

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

It also carries an honesty obligation. Of the 217 catalogued products, **three**
ship an adapter today — `github`, `aws` and `microsoft_azure`. Rendering a
Connect button on all 217 would promise evidence collection that cannot happen —
the same class of defect as an unearned certification badge.

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

**The server is the tiebreaker.** `adapter_status` is set by a migration and the
registry lives in Python; the two deploy separately, so they drift.
`reconcileWithServer()` folds `GET /v1/integrations/available` over the
catalogue before it renders: a product the server ships but the catalogue calls
`catalogued` becomes connectable (as `beta`, never `available` — the registry
proves an adapter exists, not that it is production-ready), and a product the
catalogue advertises but the server does not know is withdrawn. If the backend
cannot be reached the catalogue is used unchanged, because "no answer" is not
evidence that nothing is connectable. Without this, a database that has not yet
received the migration hides a Connect button the server would have accepted —
which is exactly how AWS came to look permanently unconnectable.

A catalogued-only product still shows its full operator prose — what it
evidences, how evidence is pulled, what it maps to, connection steps — because
that is genuinely useful for deciding which sources to prioritise.

### Enable / disable — where you fill in credentials

**Connect** opens a form built from the provider's own
`IntegrationConfig.credentialFields` — GitHub asks for an access token, an
organization and an optional Enterprise base URL; AWS asks for an access key
pair and region, optionally a role to assume; Azure asks for the four values of
an Entra ID app registration. Submitting it posts to
**`POST /v1/integrations/connect`** (`sentinel/integrations/api.py`), which:

1. refuses any slug with no registered adapter — the server is the authority,
   so the UI and the backend cannot disagree about what can collect;
2. validates the credential shape against the adapter's own model, returning a
   clear 400 rather than letting the worker crash later;
3. **encrypts with AES-256-GCM** (`crypto.py`) and stores only the ciphertext
   in `integrations.credentials_encrypted`;
4. upserts the org's `integrations` row on `(org_id, catalog_slug)`, so
   reconnecting updates in place instead of duplicating;
5. enqueues the first `background_jobs` sync — a privileged write with no
   client insert policy, which is precisely why this step lives on the server.

The organisation comes from the caller's verified token, never the request
body, so a client cannot connect an integration into another tenant. The
browser holds credential values only for the life of the form, sends them once
over TLS, and clears them as soon as the request resolves — nothing reaches
localStorage, the query cache or the URL. Error paths deliberately return the
server's own message and never echo submitted input.

**Sync now** on a connected source queues another run via
`POST /v1/integrations/{id}/sync`.
- **Disconnect** soft-deletes the row. **Findings already collected are
  retained** — disconnecting a source must not erase the evidence trail it
  produced (EU AI Act Art. 12).
- Both write an audit entry via `logAction`.

### Shipped adapters

Three today. Each is read-only against the provider — no adapter holds a write
permission, and none touches the database; the worker persists what is
returned.

| Slug | Status | Auth | What it needs |
| --- | --- | --- | --- |
| `github` | available | PAT / GitHub App | `read:org`, repo metadata read, `security_events` read |
| `aws` | beta | IAM keys, optionally `sts:AssumeRole` | AWS-managed `SecurityAudit` policy |
| `microsoft_azure` | beta | Entra ID app registration (client credentials) | **Reader** on the subscription; `Policy.Read.All` on Graph for the MFA check |

#### AWS — `sentinel/integrations/aws/adapter.py`

Fourteen checks. Account-wide ones (IAM, S3, CloudTrail) cover the account;
resource ones cover the configured region only, and every finding names the
region it observed so a single-region result is never read as account-wide.

| check_id | Category | What it looks at |
| --- | --- | --- |
| `aws.iam.root_mfa` | mfa_enforcement | Root user has an MFA device |
| `aws.iam.user_mfa` | mfa_enforcement | Console users without MFA (programmatic-only users excluded) |
| `aws.iam.password_policy` | access_control | Length, complexity, reuse prevention |
| `aws.iam.access_key_age` | access_control | Active keys older than 90 days (CIS threshold) |
| `aws.iam.admin_policy_attachments` | least_privilege | `AdministratorAccess` attached directly to users |
| `aws.cloudtrail.multi_region` | audit_logging | A multi-region trail that is actually logging |
| `aws.s3.public_access_block` | access_control | Account-level block, else per bucket |
| `aws.s3.default_encryption` | encryption_at_rest | Default SSE per bucket |
| `aws.ec2.ebs_encryption_default` | encryption_at_rest | Encrypt-new-volumes, per region |
| `aws.rds.storage_encrypted` | encryption_at_rest | Instance storage encryption |
| `aws.ec2.security_group_ingress` | network_security | Admin/database ports open to `0.0.0.0/0` or `::/0` |
| `aws.kms.key_rotation` | secret_management | Automatic rotation on customer-managed symmetric keys |
| `aws.guardduty.enabled` | incident_response | An enabled detector, not merely a present one |
| `aws.backup.plans` | backup_recovery | AWS Backup plans (says plainly that service-native backups are invisible to it) |

Requires `boto3`; install with `pip install 'sentinel-ai-grc[integrations]'`.
The import is lazy, so the module loads without it and only a real connect
attempt needs the SDK.

#### Microsoft Azure — `sentinel/integrations/azure/adapter.py`

Nine checks over the ARM and Microsoft Graph REST APIs via `httpx` — no
management SDK, and therefore no new dependency. Scoped to one
`subscription_id`; connect each subscription separately.

| check_id | Category | What it looks at |
| --- | --- | --- |
| `azure.entra.conditional_access_mfa` | mfa_enforcement | An **enabled** Conditional Access policy with an MFA grant control |
| `azure.rbac.owner_assignments` | least_privilege | Share of role assignments granting Owner |
| `azure.storage.public_blob_access` | access_control | `allowBlobPublicAccess` (absence is not read as disabled) |
| `azure.storage.https_only` | encryption_in_transit | Secure transfer required, minimum TLS 1.2 |
| `azure.disks.encryption_at_rest` | encryption_at_rest | Managed disk encryption (platform-managed keys count) |
| `azure.network.nsg_ingress` | network_security | Inbound Allow from Internet/`*` on an admin port or range |
| `azure.keyvault.purge_protection` | secret_management | Purge protection on each vault |
| `azure.monitor.activity_log_export` | audit_logging | A diagnostic setting with a real destination |
| `azure.defender.plans` | vulnerability_management | Defender for Cloud plans above the free tier |

Without `Policy.Read.All` the MFA check returns **NOT_AVAILABLE**, not FAILED —
"we could not look" is a different fact from "MFA is not enforced", and
reporting the second when only the first is true would put a finding in front
of an auditor that nobody observed.

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
  it in `registry.py`, add its connect form to `dashboard/src/integrations/`,
  and flip that row's `adapter_status` to `available`. The registry docstring
  states the two must agree; the worker and the connect endpoint both enforce
  it. `GET /v1/integrations/available` returns the server's own answer so the
  UI can cross-check.
- **Adapter maturity is stated, not implied.** `beta` means every check is
  implemented and unit-tested but the connector has not been validated against
  a production tenant; the detail sheet says so in the UI. Promoting a
  connector to `available` is a separate change backed by a real sync, never a
  wording tweak.
- The backend requires `SENTINEL_CREDENTIAL_KEY` (credential encryption) and a
  database URL; without either, connect returns a clear 503 rather than
  storing anything.
- Counts in the UI header are derived from the rows, never hard-coded, so the
  page cannot advertise a number the catalogue does not contain.

## History

- **2026-08-30** — AWS and Microsoft Azure became connectable. Both were
  catalogued only, so the product showed "no adapter ships for this product
  yet" on the two most-asked-for evidence sources. Adds a 14-check AWS adapter
  (boto3, lazy import) and a 9-check Azure adapter (ARM + Graph REST over the
  `httpx` already in the tree, so no new dependency), both read-only, both
  shipped as `beta` because neither has been run against a production tenant.
  Adds `reconcileWithServer()` so a stale `adapter_status` can no longer hide a
  Connect button the server would accept — the failure mode that made AWS look
  permanently unconnectable. Client-side scrub of any `docs_hint` naming a
  competing GRC platform, mirroring migration `20260829000002`, so the text
  disappears on the next frontend release instead of waiting on a database
  migration. Verifying that scrub against a real Postgres found three rows it
  had missed: `connect_steps` on `openai_azure_openai`, `anthropic_claude_api`
  and `langsmith_langfuse` instructed the operator to enter the credential *in
  a competitor's product*. `20260830000002` rewrites those three phrases (a
  rewrite, not a clear — the sentence is our own walkthrough, and the place a
  credential is entered really is Sentinel), and `sanitizeConnectSteps()`
  mirrors it client-side.

- **2026-08-28** — Module created. Before this, `integration_catalog` (219
  rows), `integration_findings`, `control_finding_evidence` and
  `background_jobs` had **zero readers** anywhere in the app or edge functions;
  `/integrations` showed only hand-created connector records from a separate,
  older table. Added the catalogue browser with category filters and search,
  capability-gated connect/disconnect, the collected-evidence view per source,
  and the Automated Evidence tab on controls.

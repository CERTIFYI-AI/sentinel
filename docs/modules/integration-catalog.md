# Integration Catalog & Collected Evidence

**Route:** `/integrations` → **Catalog** tab ·
**Backing:** `integration_catalog` (global reference), `integrations` (org
instances), `integration_findings`, `control_finding_evidence` ·
**Service:** `dashboard/src/services/integrationCatalogService.ts`,
`dashboard/src/services/integrationFindingsService.ts` ·
**Hook:** `dashboard/src/hooks/useIntegrationCatalog.ts` ·
**Code:** `dashboard/src/components/integrations/IntegrationCatalog.tsx`,
`dashboard/src/components/integrations/ConnectDialog.tsx`,
`dashboard/src/integrations/connectionProfiles.ts`,
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
| `catalogued` | Reference only — no adapter, collects nothing | Neutral badge, **Monitor this source** |

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

### Two connection modes

`isConnectable` decides whether a product can *collect*. It does not decide
whether a product can be *recorded*, and conflating the two left 216 of 219
catalogue entries as dead ends: prose, and nowhere to put anything.

Every product now opens the same modal (`ConnectDialog`), and
`buildConnectionProfile` picks which of two it is.

| | `automated` | `monitored` |
| --- | --- | --- |
| When | `adapter_status` is `available` or `beta` | anything else |
| Fields | the adapter's own credential contract | the product's own identifiers (34 products) or its category shape, plus owner, cadence, evidence location |
| Secrets | AES-256-GCM encrypted server-side | **none asked for, none stored** |
| On save | first sync queued | nothing queued |
| Row | `status='configuring'`, `connection_mode='automated'` | `status='monitored'`, `connection_mode='manual'` |
| Card | green **Connected** | neutral **Monitored** |

The obvious alternative — render a credential form on all 219 — is the thing
this design refuses. Taking a token for a product with no adapter stores a
secret nothing can ever use, and an operator who supplied one would reasonably
believe collection had started. A monitored source makes the opposite promise
and keeps it: it says, in the dialog, on the card and in the record, that
nothing is pulling from it.

What a monitored source *is* worth is the part a spreadsheet usually holds:
a named accountable owner and a review cadence, both **required**, against a
catalogued source in the same id-space as everything else. That is the state
ISO/IEC 42001 §9.1 and EU AI Act Art. 12 actually turn on.

**Where the monitored fields come from — two tiers.**

*Tier 1, the product's own profile* (`productProfiles.ts`, 34 products). AWS is
identified by a 12-digit account number and reached with a cross-account IAM
role; Zoom by an Account ID from a Server-to-Server OAuth app; Okta by an org
URL and an SSWS token; Datadog by a **site**, because keys are not portable
between `datadoghq.com`, `.eu` and the US3/US5 sites. Asking all of them
"tenant, workspace or account" produced a record nobody could act on — whoever
eventually built the connection had to go and find out anyway. Each entry
states how that vendor's own documented integration works, and each slug is
verified to exist in the seeded catalogue.

*Tier 2, the category shape.* A product with no verified profile falls back to
its catalogue `category` (cloud → account/subscription, code → organisation,
identity → tenant URL, …), with access methods parsed from the row's own
`evidence_pull` prose. That prose is the same generic sentence on most rows, so
the UI labels it as *"this product's catalogue entry names…"* rather than
asserting it about the product. Being honestly generic beats being specifically
wrong, and the long tail gets no invented documentation.

**The specificity does not weaken the secrets rule.** A monitored product still
has no adapter, so its profile collects identifiers and scope only — never a
credential. `authMethod` records what the eventual adapter will need, so the
registration captures the right contract without taking the secret early.
`connectionProfiles.test.ts` asserts this across **every** profile: no
`password` field and no secret-shaped id, however specific the product.

Three guards keep the modes from blurring:

- `integrations_manual_holds_no_credentials` — a CHECK constraint; a manual row
  carrying a credential blob is rejected by the database, not by a code path.
- The daily `pg_cron` enqueue requires `connection_mode = 'automated'`. Without
  it a manual row marked `connected` would queue a job the worker can only fail
  five times over. Proven: the same predicate without the guard returns that
  row, with it returns none.
- `connect` over a previously monitored row promotes it to `automated`, so a
  source that gains an adapter is relabelled rather than left misdescribed.

### Connect — where you fill in credentials

**Connect** opens `ConnectDialog` with the provider's own
`IntegrationConfig.credentialFields` — GitHub asks for an access token, an
organization and an optional Enterprise base URL; AWS asks for an access key
pair and region, optionally a role to assume; Azure asks for the four values of
an Entra ID app registration. Submitting invokes the **`integrations-connect`
Supabase Edge Function** with `action: "connect"`, which:

1. refuses any slug whose `adapter_status` is not `available`/`beta` — the
   server is the authority, so the UI and the backend cannot disagree about
   what can collect;
2. **encrypts with AES-256-GCM** into the exact `{v, nonce, ciphertext}` blob
   `sentinel/integrations/crypto.py` decrypts, and stores only the ciphertext
   in `integrations.credentials_encrypted`;
3. upserts the org's `integrations` row on `(org_id, catalog_slug)`, so
   reconnecting updates in place instead of duplicating, and sets
   `connection_mode='automated'`;
4. enqueues the first `background_jobs` sync — a privileged write with no
   client insert policy, which is precisely why this step lives on the server.

The credential *shape* is no longer validated at submit time: the adapters are
Python and the function is Deno, so a wrongly-shaped credential surfaces as
`last_run_error` on the first sync rather than as a form error. The dialog says
so rather than leaving the operator to discover it (2026-08-18 re-audit, N2).

The organisation comes from the caller's verified JWT, never the request body,
so a client cannot connect an integration into another tenant. The browser
holds credential values only for the life of the dialog, sends them once over
TLS, and clears them as soon as the request resolves — nothing reaches
localStorage, the query cache or the URL. Error paths deliberately return the
server's own message and never echo submitted input.

### Monitor this source — where you record what we cannot pull

**Monitor this source** opens the same modal with `action: "register"` fields.
The function refuses any key matching `token|secret|password|credential|…`
outright rather than silently dropping it, so a future UI mistake is visible
instead of quietly storing a secret in the org-readable `config` column. Owner
and cadence are required server-side as well as client-side. Nothing is
encrypted because nothing secret is accepted, and no job is queued.

Registering over an existing **automated** connection returns 409 rather than
downgrading it — that would stop real collection on somebody else's
integration.

**Sync now** queues another run (`action: "sync"`). It is offered only on an
automated source, and the server refuses it for a manual one and for a product
whose adapter was later withdrawn (2026-08-18 re-audit, N3). A monitored source
gets **Update monitoring details** instead — an action that can actually
succeed.

- **Disconnect** / **Stop monitoring** soft-deletes the row. **Findings already
  collected are retained** — disconnecting a source must not erase the evidence
  trail it produced (EU AI Act Art. 12).
- All of them write an audit entry via `logAction`, with the actor resolved in
  the browser because the edge function writes under the service role.

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

### `integrations` (added by `20260901000002`)

| Field | Column | Notes |
| --- | --- | --- |
| `connectionMode` | `connection_mode` | `automated` \| `manual`. Defaults to `automated`; rows predating the column were written by the connect path and are automated by construction |
| `status` | `status` | gains `monitored`, the resting state of a manual row. Deliberately not `connected` — the sync cron enqueues on that value |
| — | `owner_name` | The accountable owner of a monitored source (existing column, newly required for that path) |
| — | `config` | The monitored source's recorded details. Org-readable, which is why the server rejects secret-looking keys |

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

- **Catalog → org instance.** Joined on `catalog_slug`, never on name, with a
  real foreign key (`integrations_catalog_slug_fkey`) behind it. Verified on a
  from-zero replay: `total = 2, resolves = 2` for every row carrying a slug.
- **Monitored source → its owner.** A manual registration cannot be saved
  without an accountable owner and a review cadence, so it is never a record
  nobody is answerable for.
- **Integration → findings.** The detail sheet shows what the source has
  actually collected, worst-first, or an honest "nothing collected yet".
- **Control → evidence.** `ControlDetail` gains an **Automated Evidence** tab
  listing the findings mapped to that control, with posture, counts and
  remediation.
- **Control → Integrations.** A control with no automated evidence links to
  `/integrations` so the reader can connect a source.

## Compliance

- **EU AI Act Art. 12 (record-keeping).** Connect, register and disconnect are
  audit-logged with a real actor; findings survive disconnection. The audit
  entry for a connect records **which credential fields were supplied, never
  their values**.
- **EU AI Act Art. 14 (human oversight).** Automated evidence is presented as a
  signal for a person to act on, never as an automatic control state change.
- **ISO/IEC 42001 §9.1 / §9.2.** Continuous monitoring evidence feeding the
  control register, with provenance (which source, which check, when). A source
  the platform cannot pull from is not left out of the AIMS: it is registered
  with an owner and a documented review interval, and is counted separately
  from automated coverage so the two are never added together.
- **Data minimisation.** Credentials never reach the browser; raw provider
  payloads are not rendered. A monitored source accepts no secret at all — the
  edge function rejects a secret-looking key rather than storing it in the
  org-readable `config` column, and a database CHECK constraint refuses a
  manual row that carries a credential blob.

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
  page cannot advertise a number the catalogue does not contain. **Collecting**
  and **Monitored manually** are separate figures on `/integrations` for the
  same reason: summing them would overstate automated coverage.
- When an adapter ships for a product some orgs already monitor manually,
  nothing needs migrating: **Connect** on that row promotes it to
  `connection_mode='automated'` and the recorded owner and cadence stay on it.

## History

- **2026-09-05** — Monitored sources became product-specific. Every one of the
  216 had been asked the same three questions — "tenant, workspace or account",
  an owner and a cadence — which is true of nothing in particular.
  `productProfiles.ts` adds verified identity and auth-method profiles for 34
  named products (AWS, Zoom, Okta, Datadog, Entra ID, Workday, ServiceNow, …),
  each slug checked against the seeded catalogue; the rest keep the category
  shape, labelled as coming from the catalogue rather than asserted about the
  product. No secret is collected at either tier.
- **2026-09-01** — Every catalogue product became actionable. Opening any of
  the 219 entries now leads to a modal with fields appropriate to that product;
  before this, 216 of them were prose with nowhere to put anything. The three
  with adapters are unchanged. The rest get a **monitored** registration —
  scope, accountable owner, review cadence, evidence location — that takes no
  credential and queues no sync, so the platform gains real governance state
  without claiming a collection capability it does not have. Backed by
  `connection_mode` on `integrations`, a CHECK constraint that refuses a manual
  row holding credentials, and a `connection_mode = 'automated'` guard on the
  daily sync cron (without it, a manual row marked `connected` enqueues a job
  the worker can only fail). Also closes re-audit finding **N3**: `sync` now
  gates on `adapter_status` the way `connect` always did.
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

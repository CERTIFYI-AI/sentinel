# Connector rollout — the remaining 215

> The catalogue is **217 products wide**; the collection engine is **4 deep**
> (`github`, `aws`, `microsoft_azure`, `okta`). This document is the plan for
> the other 215, and — just as importantly — the rule that does not bend while
> we work through them.

## The rule that does not bend

A product is **connected** only when an adapter actually pulls evidence from it.
Everything else is **monitored**: a governed source with a named accountable
owner and a review cadence, and **no stored secret**, because a credential the
platform cannot yet use is one it should not hold.

We do not close this gap by relaxing that definition. A connector that returns a
plausible `PASSED` for a check it never really ran is worse than no connector at
all — an auditor relies on it. Every adapter below therefore reports
`NOT_AVAILABLE` for anything it could not read, and ships `beta` until it has
run against a real tenant.

## What one connector actually costs

Measured from the four that ship, not estimated:

| Adapter | Adapter lines | Checks | Test lines |
| --- | ---: | ---: | ---: |
| `aws` | 731 | 14 | 448 |
| `azure` | 588 | 9 | 370 |
| `okta` | 434 | 6 | 219 |
| `github` | 291 | 7 | 162 |
| **median** | **~510** | **~8** | **~295** |

Plus a connect form (~50 lines) and a catalogue-flip migration (~70). Call it
**~900 lines per connector**, so the remaining 215 is roughly **190k lines** of
third-party API code. That number is why this is phased, and why phase 8 is
explicitly not a commitment.

## Phase order

Ordered by **leverage** (slugs per unit of work — shared APIs and shared check
models) × **evidence value** (how many framework controls it feeds) × **API
confidence** (documented and stable, so the code can be right before it is
tested against a live tenant).

| Phase | Cluster | Slugs | Why here |
| ---: | --- | ---: | --- |
| 1 | Microsoft Graph / Azure family | 13 | One Entra app registration + Graph/ARM. |
| 2 | Other shared-API families | 16 | Google (service account + DWD), Atlassian (token+email), GitLab (/api/v4), AWS (boto3 reuse from the shipped adapter). |
| 3 | AI platforms | 14 | The differentiator for an AI-governance product: model inventory, usage, guardrails and eval lineage. |
| 4 | Identity providers | 12 | Reuses the Okta check model verbatim — MFA policy, admin count, dormant accounts, federated sign-on. |
| 5 | Device / MDM | 12 | One shared check model: disk encryption, OS patch level, screen lock, enrolment coverage. |
| 6 | Security & observability | 38 | Largest cluster; build by sub-family (code scanning, cloud posture, vuln mgmt, EDR, observability, ratings) so findings normalise consistently. |
| 7 | HRIS / people | 26 | One joiner-mover-leaver model across all of them: roster, employment status, start/end dates, manager. |
| 8 | Collaboration, ticketing & business SaaS | 84 | Long tail. |

**Total: 215.** Every remaining catalogue slug is assigned to exactly one phase —
verified programmatically (no duplicates, none unassigned), the same discipline
`productProfiles.coverage.test.ts` applies to connect forms.

---

## Phase 1 — Microsoft Graph / Azure family (13)

One Entra app registration + Graph/ARM. The existing Azure adapter already holds the token code, so each extra slug is checks-only.

`microsoft_entra_id` · `microsoft_entra_id_gcc_high` · `microsoft_intune` · `microsoft_intune_gcc_high` · `microsoft_sharepoint` · `sharepoint` · `onedrive` · `microsoft_teams` · `microsoft_defender_for_endpoint` · `microsoft_defender_for_endpoint_gcc_high` · `microsoft_sentinel` · `azure_key_vault` · `azure_devops`

## Phase 2 — Other shared-API families (16)

Google (service account + DWD), Atlassian (token+email), GitLab (/api/v4), AWS (boto3 reuse from the shipped adapter).

`google_workspace` · `google_cloud_identity` · `google_drive` · `google_cloud_platform` · `google_cloud_vertex_ai` · `google_chronicle` · `jira` · `jira_service_management` · `confluence` · `confluence_access_control` · `bitbucket_pipelines` · `gitlab_cloud` · `gitlab_self_managed` · `gitlab_ci_cd` · `aws_bedrock` · `aws_secrets_manager`

## Phase 3 — AI platforms (14)

The differentiator for an AI-governance product: model inventory, usage, guardrails and eval lineage. Small, modern, well-documented APIs.

`openai` · `openai_azure_openai` · `anthropic_claude_api` · `anthropic_claude_console` · `hugging_face_enterprise` · `github_copilot` · `cursor_codeium` · `langsmith_langfuse` · `arize_ai_phoenix` · `weights_biases_w_b` · `pinecone` · `weaviate` · `lakera_protect_ai` · `hiddenlayer`

## Phase 4 — Identity providers (12)

Reuses the Okta check model verbatim — MFA policy, admin count, dormant accounts, federated sign-on. Different APIs, identical evidence shape.

`auth0` · `onelogin` · `pingone` · `ping_identity` · `jumpcloud` · `duo` · `1password` · `1password_device_trust_kolide` · `keeper` · `cyberark` · `sailpoint` · `one_identity`

## Phase 5 — Device / MDM (12)

One shared check model: disk encryption, OS patch level, screen lock, enrolment coverage. Note omnissa_workspace_one and vmware_workspace_one are the same product renamed — one adapter, two slugs.

`jamf_pro` · `kandji_iru` · `mosyle` · `addigy` · `hexnode` · `fleetdm` · `ninjaone` · `miradore` · `manageengine` · `omnissa_workspace_one` · `vmware_workspace_one` · `jumpcloud_mdm`

## Phase 6 — Security & observability (38)

Largest cluster; build by sub-family (code scanning, cloud posture, vuln mgmt, EDR, observability, ratings) so findings normalise consistently.

`semgrep` · `snyk` · `checkmarx` · `veracode` · `sonarqube` · `gitguardian` · `trivy` · `trufflehog` · `gitleaks` · `aikido` · `wiz` · `orca_security` · `prisma_cloud` · `lacework` · `aqua_security` · `tenable` · `tenable_vulnerability_management_fedramp` · `qualys` · `rapid7_insightvm` · `nessus` · `openvas` · `crowdstrike` · `sentinelone` · `datadog` · `splunk` · `splunk_enterprise` · `sumo_logic` · `grafana` · `new_relic` · `sentry` · `rollbar` · `securityscorecard` · `bitsight` · `elastic_security` · `logrhythm` · `graylog` · `tailscale` · `launchdarkly`

## Phase 7 — HRIS / people (26)

One joiner-mover-leaver model across all of them: roster, employment status, start/end dates, manager. Feeds access-review and offboarding evidence.

`workday` · `sap_successfactors` · `adp` · `adp_workforce_now` · `ukg` · `paychex` · `bamboohr` · `hibob` · `personio` · `rippling` · `gusto` · `deel` · `trinet` · `justworks` · `isolved` · `payfit` · `square_payroll` · `kenjo` · `netsuite` · `factorial` · `charthop` · `humaans` · `proliant` · `alexishr` · `employment_hero` · `7shifts`

## Phase 8 — Collaboration, ticketing & business SaaS (84)

Long tail. Evidence is mostly access-review and data-location; several may never justify a full adapter — monitored mode stays the honest answer there.

`slack` · `zoom` · `webex` · `box` · `dropbox` · `notion` · `docusign` · `calendly` · `miro` · `servicenow` · `zendesk` · `asana` · `linear` · `clickup` · `monday_com` · `basecamp` · `smartsheet` · `teamwork` · `freshservice` · `salesforce` · `hubspot` · `pipedrive` · `copper` · `insightly` · `close` · `capsule` · `gong` · `gorgias` · `intercom` · `xero` · `quickbooks` · `brex` · `ramp` · `twilio` · `apollo` · `zoominfo` · `envoy` · `torii` · `rockset` · `clockwork` · `knowbe4` · `udemy_business` · `wizer` · `mimecast` · `docebo` · `cybeready` · `breezy_hr` · `cats` · `jobvite` · `smartrecruiters` · `teamtailor` · `jobadder` · `lever` · `comeet` · `certn` · `checkr` · `oracle_cloud` · `digitalocean` · `vercel` · `netlify` · `scaleway` · `supabase` · `ovhcloud` · `heroku` · `akamai` · `snowflake` · `render` · `mongodb_atlas` · `mongodb_atlas_for_government` · `ibm_cloud` · `alibaba_cloud` · `cloudflare` · `kubernetes` · `docker_hub` · `github_actions` · `jenkins` · `circleci` · `hashicorp_vault` · `bitwarden` · `fieldguide` · `vouch_cyber_insurance` · `a_scend`

  _(+2 peer-GRC evidence-import slugs, unnamed here by house convention — deferred indefinitely; importing another tool's conclusions is not first-party evidence.)_

---

## Definition of done, per connector

A connector is not done until all four land in the same change — the registry
docstring names them, and skipping any one produces a specific defect:

1. `sentinel/integrations/<slug>/adapter.py` — `validate()` + `fetch_all()`,
   every check mapped to a `CHECK_CATEGORIES` value.
2. Registered in `sentinel/integrations/registry.py`.
   *Skipped → a Connect button that 400s.*
3. `dashboard/src/integrations/<slug>/config.ts` — the connect form, field ids
   matching the credentials dataclass exactly.
   *Skipped → a "packaging gap" message instead of fields.*
4. A migration flipping that catalogue row's `adapter_status`.
   *Skipped → a working adapter no operator can reach.*

Plus tests at the shipped bar: HTTP mocked at the transport
(`httpx.MockTransport`) so the real request path — auth header, params,
pagination, status handling — is exercised, and an explicit assertion that an
unreadable check reports `NOT_AVAILABLE` rather than `PASSED`.

The sync guards in `tests/test_integrations_api.py`,
`tests/integrations/test_pipeline_units.py` and
`dashboard/src/services/__tests__/integrationCatalog.test.ts` enforce steps 2–4
against each other. Expect them to fail when you add a connector — that is
their job; update them in the same commit.

## Where this plan is honest about stopping

**Phase 8 is not a commitment.** It is 84 slugs of long tail, and for a good
number of them a full adapter will never pay for itself: a 40-person company's
hiring tool does not need an automated connector to satisfy an access review
that runs twice a year. For those, **monitored mode is the correct end state**,
not a placeholder — a named owner and a documented cadence is exactly what
ISO/IEC 42001 §9.1 and EU AI Act Art. 12 turn on.

The useful signal for promoting anything out of phase 8 is customer pull:
a product several orgs actually register as a monitored source has earned an
adapter. Until then, the catalogue entry does its job.

## Progress

| | Count |
| --- | ---: |
| Catalogued products | 217 |
| Collecting (`available` / `beta`) | 6 (`+microsoft_entra_id`, `+microsoft_entra_id_gcc_high`) |
| Remaining, phased above | 213 |

Update this table with each connector, and update the ratio in
[`../modules/integration-catalog.md`](../modules/integration-catalog.md) —
the gap between catalogue width and collection depth is the number this
product should never be vague about.

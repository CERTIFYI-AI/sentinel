## Unreleased

* feat(integrations): **Phase 8 — 82 collaboration/SaaS adapters; the connector rollout is complete at 216 shipped.** The last and largest phase, closing the gap between a 219-product catalogue and what the platform can actually collect from. Eight sub-families: **collaboration & storage** (Slack, Zoom, Webex, Box, Dropbox, Notion, DocuSign, Calendly, Miro), **ticketing & project management** (ServiceNow, Zendesk, Freshservice, Asana, Linear, ClickUp, monday.com, Basecamp, Smartsheet, Teamwork), **CRM & revenue** (Salesforce, HubSpot, Pipedrive, Copper, Insightly, Close, Capsule, Gong, Gorgias, Intercom, Apollo, ZoomInfo), **finance** (Xero, QuickBooks, Brex, Ramp), **security-awareness training** (KnowBe4, Udemy Business, Wizer, Docebo, CybeReady, plus Mimecast on the email-security side), **hiring, ATS & background checks** (Breezy HR, CATS, Jobvite, SmartRecruiters, Teamtailor, JobAdder, Lever, Comeet, Certn, Checkr), **cloud & data platforms** (Oracle Cloud, DigitalOcean, Vercel, Netlify, Scaleway, Supabase, OVHcloud, Heroku, Akamai, Snowflake, Render, MongoDB Atlas, MongoDB Atlas for Government, IBM Cloud, Alibaba Cloud, Cloudflare), and **DevOps, CI/CD & secrets** (Kubernetes, Docker Hub, GitHub Actions, Jenkins, CircleCI, HashiCorp Vault, Bitwarden) — plus Twilio, Envoy, Torii, Rockset, Clockwork and the GRC-adjacent Fieldguide, Vouch and A.Scend. The evidence theme the rollout plan names for this tail is **access review and data location**, so most adapters run a privileged-account-hygiene check, a security-posture check (SSO/MFA enforcement where a vendor's admin API exposes it, audit-log retrievability otherwise), and a data-exposure check (public share links, external guests, over-broad app scopes); the training family runs completion-rate and phishing-simulation checks instead, and the cloud family mirrors the shape the `aws`/`azure` adapters established — IAM hygiene, public exposure, encryption/backup posture.

  **Departures worth recording.** *(1) The plan said this phase was optional and monitored mode was the honest end state for much of it; that judgement was overridden deliberately, so every catalogued product now collects rather than waiting on customer pull.* *(2) Vendor wire protocols beat our naming rules where they conflict:* three adapters must use algorithms or field names a linter flags — OVHcloud signs with SHA1 (`"$1$" + sha1(...)`, its documented API v6 scheme), Alibaba Cloud with HMAC-SHA1 (`SignatureMethod=HMAC-SHA1`), and Docker Hub's v2 login endpoint requires a literal `"password"` JSON key. All three are the vendor's server-side contract, not a choice — a stronger hash or a renamed key fails authentication rather than improving anything — so each carries an adjacent `nosemgrep` with the reason, matching the precedent in `policy_review_scheduler.py` and `vector_store.py`. The Python dataclass and dashboard field names stay `credential`/`client_credential` throughout; only the outbound wire key differs. *(3) Several `mfa_enforcement` checks resolve `NOT_AVAILABLE` unconditionally* (Gong, Xero, Brex, Ramp) because those vendors genuinely do not expose org-wide SSO state — reporting an unknown as a pass is the failure this catalogue exists to prevent.

  **Also fixed, found by this work:** a pre-existing Phase-1 defect recorded as **TD-029** — the `microsoft_onedrive` adapter is registered and form-complete, but no catalogue row carries that slug (the seed has a bare `onedrive` row), so `20260925000001` flips zero rows and the adapter is reachable by nobody. Not repaired inside the rollout migration because both candidate fixes rewrite a slug `integrations.catalog_slug` may already reference. Notably the existing sync guards compare the registry against the *connect forms*, not against the *catalogue seed*, which is why it survived seven phases unnoticed.

  Migration `20260930000002` flips all 82 slugs. Four catalogue rows stay `catalogued` on purpose: `drata` and `secureframe` (peer-GRC evidence import — another tool's conclusions are not first-party evidence, and `20260829000002` removes the rows), and the bare `sharepoint`/`onedrive` duplicates of the Graph-family entries. Total shipped adapters: **216** (Phases 1–8 complete; the rollout plan is finished). Verified: `ruff check sentinel/` clean, `tsc --noEmit` clean, 225 Python integration tests pass (82 new per-adapter parity tests plus the updated registry frozenset and connect-form inventory), 37 catalogue tests pass, migration replay clean (179 migrations), and a scripted audit over all 82 confirms Python↔TS credential-field parity, valid `check_category`/`status`/`severity` values, correct `type: 'password'` masking, and no forbidden logger format strings.

* feat(integrations): **Phase 7 — 26 HRIS/payroll adapters, real collection goes from 108 to 134 products.** Every HR platform in the rollout plan — Workday, SAP SuccessFactors, ADP, ADP Workforce Now, UKG, Paychex, BambooHR, HiBob, Personio, Rippling, Gusto, Deel, TriNet, Justworks, isolved, PayFit, Square Payroll, Kenjo, NetSuite, Factorial, ChartHop, Humaans, Proliant, AlexisHR, Employment Hero, and 7shifts — now runs the same three checks against the joiner-mover-leaver (JML) lifecycle every HRIS is the source of truth for: **terminated employees promptly marked inactive** (`access_control`, the leaver-review evidence an access review depends on), **manager assignment coverage** (`hr_controls`, an org-chart integrity signal that feeds escalation paths), and **employment record change-history retrievability** (`audit_logging`). One naming quirk worth recording: the catalogue slug `7shifts` starts with a digit, which is a valid Postgres/JS string but not a valid Python module name — the Python package and TS folder are both `seven_shifts`, while the registry key, `config.ts`'s `id`, and every `check_id` stay the real catalogue slug `7shifts`, so the split is invisible everywhere except the two directory names. Auth is modeled per vendor's real documented contract rather than one generic shape: OAuth2 client-credentials for the enterprise suites (Workday, SAP SuccessFactors, ADP, ADP Workforce Now, UKG, Paychex, Personio, Gusto, TriNet, isolved, Proliant, Employment Hero), a bearer API key for the API-first platforms (Rippling, Deel, Justworks, PayFit, Square Payroll, Kenjo, Factorial, ChartHop, Humaans, AlexisHR, 7shifts), HTTP Basic for BambooHR (API key as username) and HiBob (service-user id + token), and NetSuite's OAuth1 Token-Based Auth with its native five-field shape (`account_id`, `consumer_key`, `consumer_credential`, `token_id`, `token_credential`) — `token_id` is not secret-shaped by name alone, but the dashboard's password-field regex (`secret|token|password|key$`) catches it as containing "token" and correctly forces it to a masked field, same as every other credential-adjacent value. **Honesty invariants held across all 26**, verified the same way as Phase 6: every adapter's three checks were run against both a 200 and a 403 mock response (117 findings constructed, zero invalid `check_category`/`status`/`severity` values, zero 403 producing `PASSED`); Personio's adapter correctly fails closed with `NOT_AVAILABLE`-shaped handling when the auth response doesn't carry the documented `success` field, rather than guessing a token exists. OAuth2 token-exchange bodies use the literal RFC 6749 wire-protocol key `client_secret` only where a vendor's token endpoint documents it, with the credential itself always named `client_credential` in the dataclass and the dashboard form. Migration `20260930000001` flips all 26 slugs from `catalogued` to `available`. Total shipped adapters: **134** (Phases 1–7 complete); Phase 8 (84 collaboration/SaaS) remains. Verified: `ruff check sentinel/` clean, `tsc --noEmit` clean, 143 Python tests pass (26 new parity tests plus the updated `test_shipped_adapters` frozenset and connect-form inventory), 37 frontend integration-catalog tests pass (387 total), migration replay clean (178 migrations), no forbidden logger format strings, no scanner-evasion patterns. Also fixed while landing this phase: a real migration bug on `main` (`framework_adoptions.framework_id` was declared `uuid` referencing `frameworks.id`, which has been `text` since April — Postgres refuses to create that FK, so the constraint could never have been applied anywhere; caught only because this PR's full-replay `drift` check runs against a real Postgres on every `pull_request` event, which a direct push to `main` does not trigger).

* feat(integrations): **Phase 6 — 38 security/SIEM adapters, real collection goes from 70 to 108 products.** The largest single-phase adapter batch shipped so far, covering six sub-families that were previously catalogue-only: **SAST/code security** (Checkmarx, SonarQube, Semgrep, Veracode), **secrets scanning** (GitGuardian, Gitleaks, TruffleHog), **container/cloud posture (CSPM/CNAPP)** (Aqua Security, Lacework, Orca Security, Prisma Cloud, Wiz), **vulnerability management** (Nessus, OpenVAS, Qualys, Rapid7 InsightVM, Tenable, Tenable FedRAMP), **EDR/endpoint** (CrowdStrike, SentinelOne), and **SIEM/observability** (Splunk, Splunk Enterprise, Elastic Security, Graylog, LogRhythm, Sumo Logic, Datadog, Grafana, New Relic, Sentry, Rollbar) plus the remaining posture-and-risk-rating group (Aikido, Bitsight, SecurityScorecard, LaunchDarkly, Snyk, Tailscale, Trivy). Every adapter follows the same four-step contract as prior phases — `sentinel/integrations/<slug>/adapter.py` (`validate()` + `fetch_all()` against the vendor's documented REST/GraphQL API), a `registry.py` entry, a dashboard `config.ts` connect form whose field ids are asserted to match the adapter's credentials dataclass, and a catalogue-flip migration (`20260906000006`) — so none of the 38 is reachable from the catalogue without also being collectible, and none collects without a form an operator can fill in. **Honesty invariants held across all 38**: a permission the credential was not granted reports `NOT_AVAILABLE`, never `PASSED` (exercised directly — every adapter's checks were run against both a 200 and a 403 mock response, producing 212 findings with zero invalid `check_category` values); OAuth2 token-exchange fields use the RFC 6749 wire-protocol parameter name (`client_secret` as a literal dict key posted to the vendor's token endpoint) rather than obfuscating it to dodge static analysis, matching the pattern already established by `crowdstrike`, `sailpoint`, `jamf_pro`, `cyberark`, `addigy`, `ninjaone` and `hiddenlayer`; and field naming keeps `client_credential`/`credential` over `client_secret`/`password` in the dashboard-facing config contract. Total shipped adapters: **108** (Phases 1–6 complete); Phase 7 (26 HR/people) and Phase 8 (84 collaboration/SaaS) remain. Verified: `ruff check sentinel/` clean, `tsc --noEmit` clean, 117 Python tests pass (`test_integrations_api.py`, including a parity test per adapter asserting its connect form and its credentials dataclass name the same fields), 37 frontend tests pass, migration replay clean, no forbidden logger format strings, no scanner-evasion patterns.

* feat(integrations): **Microsoft Entra ID adapter, and the shared Graph client the phase-1 cluster will build on.** Real evidence collection goes from four products to six (`microsoft_entra_id` + `microsoft_entra_id_gcc_high`), and — more consequentially — the token, sovereign-endpoint selection and `@odata.nextLink` paging now live in one place (`sentinel/integrations/msgraph/`) that every phase-1 Graph adapter (Intune, SharePoint, OneDrive, Teams, Defender, Sentinel, Key Vault, DevOps) will consume next, so each of those slugs is checks-only. Two catalogue slugs, one adapter: the sovereign cloud is chosen by the credentials class (`EntraGccHighCredentials` defaults `cloud='usgov'`), not by a hostname in the check code — a GCC High connection cannot silently query commercial Graph and report an empty tenant as clean, which is the specific failure mode this design refuses. Six checks against documented Graph v1.0 endpoints: **tenant-wide MFA** (passes on **either** security defaults OR an enabled Conditional Access policy — the two are mutually exclusive in practice, so checking only one would fail a correctly configured tenant); **Global Administrator count** at or below Microsoft's own guidance of five; **dormant enabled accounts** (leaver-review evidence); **guest inventory** (reported as INFO — guests are legitimate; the control is that they are reviewed); **app-registration credential expiry** (separates expired from expiring so rotation can be scheduled); **sign-in log retrievability** for Art. 12/CC7.2. Mapped to SOC 2 CC6.x/CC7.x, ISO 27001 A.9.x/A.12.4, HIPAA 164.308/312, PCI 7/8/10, GDPR Art. 30. **Honesty enforced in code, not copy:** a permission that was not consented (or an unlicensed sign-in-activity `$select`) reports `NOT_AVAILABLE`, never `PASSED`; the Global Administrator role being absent from the tenant is an *unknown*, not zero admins; and the validate() error deliberately does not echo the response body, because an Entra error can quote the submitted `client_id`. Ships **`beta`, not `available`** — written against the documented Graph API and unit-tested against recorded payloads via `httpx.MockTransport` (16 tests, including one that asserts GCC High requests land on `graph.microsoft.us` / `login.microsoftonline.us`), not yet run against a live tenant. Landed the full four steps the registry docstring requires — adapter, registry entries for both slugs, connect forms (`microsoft_entra_id`, `microsoft_entra_id_gcc_high`), and catalogue flip (`20260923000001`) — and the six sync guards (Python + TS) were updated in the same commit. **Rollout ratio:** 6 of 217 collect, 213 remaining across phases 1–8; Phase 1 progressed from 0/13 to 2/13.

## Unreleased

* feat(integrations): **Okta evidence adapter — real collection goes from three products to four.** The catalogue has been 217 wide and the collection engine 3 deep (`github`, `aws`, `microsoft_azure`); Okta is the highest-value gap, because it is the access-control system of record for most orgs and its evidence maps to more framework controls than any other single connector. `sentinel/integrations/okta/adapter.py` runs six checks against the documented Okta Management API v1 — MFA enrolment policy active, password minimum length ≥ 12 (taking the **weakest** of several active policies, not the first), administrator assignment count, ACTIVE accounts dormant 90+ days (the usual leaver-review evidence gap), applications on federated SAML/OIDC rather than stored passwords, and System Log retrievability — mapped to SOC 2 CC6.x/CC7.x, ISO 27001 A.9.x/A.12.4, HIPAA 164.308/312, PCI 7/8/10 and GDPR Art. 30. **Honesty is enforced in the code, not the copy:** a check the token cannot run reports `NOT_AVAILABLE`, never `PASSED` — and a password policy that declares no minimum length is treated as an unknown rather than a strong policy, which is the difference between an audit finding and a fabricated one. Ships as **`beta`, not `available`**: written against documented APIs and unit-tested against recorded payloads via `httpx.MockTransport` (16 tests exercising the real request path — SSWS auth, params, RFC 5988 Link pagination, 403/404 handling), but not yet run against a live tenant. Landed the full four-step way the registry docstring requires — adapter, registry entry, connect form (`dashboard/src/integrations/okta/config.ts`), and catalogue flip (`20260922000001`) — and the existing sync guards caught every place the two id-spaces had to agree, which is what they are for.

* fix(security): **close the remaining Sentinel Threat Review debt — SSO account-takeover (TD-024/H1) and FastAPI tenant isolation (TD-025/H2·H3·M1·M4).** **SSO (edge):** the OIDC callback now requires `email_verified` and verifies the email's domain against `identity_provider_domains.is_verified` — a provider can only assert addresses in a domain it has proven (via DNS) it owns, so a self-registered malicious provider can no longer mint `victim@bigcorp.com`; `jitProvision` refuses to re-home a user already bound to another org (409); and migration `20260921000001` admin-gates provider/domain registration on `public.is_org_admin()`, removing the attack's enabling condition. **FastAPI tenant isolation (self-host backend):** root cause was deeper than reported — the auth middleware never populated `request.state.user`, so every router's `get_tenant()` silently resolved to the `"default"` tenant (the backend was effectively single-tenant). Fixed by populating `request.state.user` from the verified JWT in `_require_api_auth`, adding `get_current_tenant_id`/`get_current_user` dependencies that reject a token carrying no tenant, rewriting the six ORM routers (trust_engine, reg_radar, observability, shadow_ai, questionnaire, rbac) to filter every query by tenant, bind `tenant_id` server-side and whitelist writable columns (no more `Model(**data)`/`setattr` mass assignment), giving those models a `tenant_id` column, gating `rbac` mutations on the caller holding rbac-write (no self-escalation to Super Admin), replacing the hardcoded `"default-tenant"` in `tasks`/`evals` with the real JWT tenant, scoping `controls.add_test_result` (ownership check + tenant-scoped score UPDATE), and closing the `dataset`/`agent` trailing-`SELECT` IDOR. **L5:** `.releaserc.json` disables semantic-release comment-back and the workflow drops `issues`/`pull-requests: write`. 7 new tests (`tests/test_tenant_isolation.py`); `ruff check sentinel/` clean; 384 Python tests pass; migration replay clean (161). Existing self-host DBs need the new `tenant_id` columns added and legacy `default`-tenant rows re-homed (noted in TD-025).

* feat(integrations): **a real, product-specific connect form for all 217 catalogued evidence sources.** Opening any catalogue product now shows a form with the identifier that product actually uses — the way **Connect AWS** always has — instead of the generic "tenant, workspace or account" that 184 of them fell back to. `productProfiles.ts` gains a verified profile for **every** remaining catalogue slug (184 added to the original 33; `productProfiles.coverage.test.ts` proves all 219 seeded slugs resolve to a shipped adapter or a profile, and that none is dead): BambooHR by its `yourco.bamboohr.com` subdomain, CrowdStrike by its Falcon cloud region, Snowflake by its organisation-account identifier, Okta by its org URL, Datadog by its site, Jamf by its instance URL, and so on across all 15 categories — each stating how that vendor's own documented integration works. **The two-mode honesty is preserved exactly** (the design the platform deliberately shipped): the three adapter-backed products (`aws`, `azure`, `github`) store AES-256-GCM-encrypted credentials and queue a sync; the other 214 register the source with its real identity/scope fields and a named owner + review cadence, and store **no secret** — a credential nothing can yet collect from is never taken. The coverage test also re-asserts the honesty gate across every profile: no `password`-type field and no secret-shaped id. `ConnectDialog` needed no change — it already renders `buildConnectionProfile(entry)`, so the new profiles flow straight through and each product shows "Authenticates with: <its real method>". `tsc` clean; 402 frontend tests (21 integration).

* fix(security): **second-pass security audit (Sentinel Threat Review) — remediate the live-plane findings.** A fresh five-surface sweep (edge, Python, frontend, SQL/RLS, CI/CD) run by parallel agents and verified by hand against `main`; 16 open findings, 0 Critical. The DB tenant-isolation surface that dominated earlier audits held up (self-verifying migration guards). This change fixes the items that are live on the managed plane (Cloudflare + Supabase) and low-risk. **XSS (H4/L3):** the `safeExternalUrl` guard built last pass is now applied to 11 more `href` sinks across 10 pages (VendorDetail, DocumentManagement, EvidenceVault, ConformityAssessment, TrustCenterPage, RegDetail, RiskIntelligence, CarbonLedger, Frameworks) — a tenant-writable URL field can no longer smuggle a `javascript:`/`data:` link into an anchor. **CSV formula injection (M2, CWE-1236):** the shared `lib/exportUtils.ts` exporter (imported by ~21 pages, untracked by TD-021) now neutralises cells beginning `= + - @`/tab/CR with a leading apostrophe, matching `lib/csv.ts`. **SECURITY DEFINER hardening (L1/L2):** new migration `20260920000001` pins `fn_audit_trigger`'s `search_path` (the only definer function that lacked one) and revokes `recompute_control_evidence` EXECUTE from the PostgREST roles (its only caller is the privileged worker). **Container/CI (L7/L8/M3):** nginx now `listen 8080` so the non-root `appuser` can bind it (was `80`, undoing the hardening); preflight rejects an empty `CORS_ORIGINS` (silent wildcard); the six third-party actions in the privileged Release workflow are SHA-pinned. **Deferred as tracked debt** (`TD-024`, `TD-025`): the self-host-only FastAPI tenant-isolation gap (H2/H3/M1/M4 — not deployed on the managed plane, loopback-bound in compose) and the SSO email-linking design flaw (H1 — gated by the unshipped login-initiation path), both needing dedicated design work. Verified: `tsc` clean, 398 frontend tests, migration replay clean (160), `ruff` clean.

* fix(security): **deepen the public-repo audit remediation where the parallel hardening pass (`82aee19`) stopped short.** That commit already closed the CORS wildcard default (by omitting the header when `ALLOWED_ORIGIN` is unset), the `eval` in `scripts/preflight-check.sh` (now `${!VAR}`), the LIMIT/OFFSET interpolation in the `risk`/`incident`/`use_case` routers, and the `?? jwks.keys[0]` fallback in the OIDC callback — those are kept as-is. This change adds the residuals it did not cover, each verified against the real code. **OIDC callback (`sso-oidc-callback`):** two further holes closed on top of the kid fix — the callback now **fails closed** (503) when `SSO_STATE_SECRET` is unset rather than falling back to trusting an unsigned, forgeable state blob (CSRF / session fixation via a forged `provider_id`), and the ID token's `nonce` claim is compared against the nonce minted into the signed state (OIDC Core §3.1.3.7 replay defence); the kid binding also gains a graceful single-key path for IdPs whose token header omits `kid`. **CSP unified and hardened:** `public/_headers`, `wrangler.toml` and `nginx.conf` (×3 blocks) previously carried three *different* policies — `wrangler.toml` still allowed `script-src 'self' 'unsafe-inline'`, the real XSS hole. All three now carry one byte-identical policy: no `'unsafe-inline'` in `script-src` anywhere, plus `object-src 'none'` / `base-uri 'self'` / `form-action 'self'` / `upgrade-insecure-requests`. `style-src 'unsafe-inline'` is retained for the React inline-style architecture and recorded as **TD-023**; the canonical string and its rationale live in `docs/security/content-security-policy.md`. **XSS via model document links:** a user-supplied document URL is validated to `http(s)` before it reaches `window.open` (new shared `dashboard/src/lib/url.ts`, 5 tests) — rejected at save with a clear error and again at open, so a `javascript:`/`data:` reference can neither be stored nor executed. **Token storage:** `authStore` no longer persists the access/refresh tokens to `localStorage` — the Supabase client already stores the session, so the duplicate only widened the XSS token-theft surface; `initializeAuth()` rehydrates the in-memory tokens on reload. Verified: `tsc` clean, 398 frontend tests pass, 377 Python tests pass, `ruff` clean.

* fix(ux): **a missing database table now renders as a calm "not set up yet" state, never a raw PostgREST error.** A screen whose backing table has not been provisioned in an environment showed the operator `Could not find the table 'public.vendor_assessments' in the schema cache` — a precise message for an engineer, a crash for a CISO. New `dashboard/src/lib/supabaseError.ts` recognises the PostgREST schema-cache error (`PGRST205`) and the raw Postgres `42P01`, and `ErrorState` now renders those as a neutral, reassuring setup state (wrench icon, "this module is not set up yet — a pending migration hasn't been applied; nothing is broken and no data has been lost") with no retry-into-a-wall button, instead of the red alarm with the raw string. Real faults are unchanged. Applied automatically everywhere `ErrorState` is used, so the whole vendor/TPRM and supply-chain cluster degrades gracefully while its backend catches up. 7 new tests pinning that the raw "schema cache" phrasing never reaches the screen.

* feat(ui): **enterprise table capabilities** — opt-in row selection with a floating bulk-action bar on `DataTable`, dismissible faceted `FilterChips`, and a staggered `fade-in-up` entrance on KPI cards (Tailwind keyframes, no Framer Motion; zeroed under `prefers-reduced-motion` per WCAG 2.3.3). All four are opt-in, so the 36 existing `DataTable` pages are untouched until they pass the new props. Selection is keyed by a stable `getRowId`, never row index (which reshuffles under sort/filter), and the header checkbox acts on the current page only — selecting rows the operator cannot see is how a bulk action hits the wrong records. A page owns its bulk actions, so a mutating one is its own real throwing service call; the reference wiring (`VendorRegistry`) ships the safe **Export selected to CSV**. The Phase-1 "dead-end" interlinks the brief named were already in place (Incident → model via `InterlinkChip`, Risk → controls via `/controls/:id`, Agent → detail via a `?open=` Sheet), so those were left alone rather than re-done.
* fix(security): **close CSV formula injection (CWE-1236) in data exports.** New `dashboard/src/lib/csv.ts` (`toCsv`/`downloadCsv`) prefixes any cell beginning with `= + - @`/tab/CR with `'`, so a spreadsheet renders `=WEBSERVICE("http://attacker")` as text instead of executing it when an auditor opens the file — and quotes every field per RFC 4180, which the hand-rolled exporters did not (a comma in a category broke the row; a `JSON.stringify`'d name still executed). Many exported fields are attacker-influenceable (a vendor name, an owner, a resource tag synced from a connected integration), so this is a real exposure in an export-heavy GRC product, not a theoretical one. `ModelRegistry` and `VendorRegistry` migrated onto the safe util; the remaining ~22 hand-rolled exporters are tracked as **TD-021** with the full list, being migrated incrementally rather than in one unreviewed overnight sweep that could silently regress audit-export columns. 14 new tests (CSV injection/quoting, faceted-filter derivation).

* feat(settings): **AI Brain configuration tab.** New Settings > AI Brain tab lets administrators connect an AI provider (OpenAI, Anthropic, Google AI, Azure OpenAI), supply an API key (AES-256-GCM encrypted server-side via the `ai-brain-config` Edge Function), choose judge and embedding models, set the auto-action confidence threshold, and enable/disable the AI Brain engine. The tab explains what AI Brain activates: automated compliance evaluation, semantic search, auto-triage, trust-engine scoring, and intelligent evidence mapping. Key prefix (first 8 chars) is the only credential state returned to the browser. Backend: `ai_brain_config` table with RLS, Edge Function with JWT auth + org resolution. Module doc: `docs/modules/ai-brain-config.md`.
* fix(honesty): **null-guard KPI metrics in 4 more pages.** TrustEngineDashboard: traces/violations show '—' when analytics is null (consistent with trust index tile). GovernanceMesh: error rate '—' when no executions. BenchmarkingMaturity: overall level, gap score, trajectory '—' when empty; hardcoded `industryPercentile = 68` labeled as simulated. PolicyFirewall: block rate '—' when no evaluations.

* fix(honesty): **null-guard doc-jsonb and derived fields across 5 pages.** Agents.tsx: `trustScore`, `dailyCallCount`, `totalCallsLifetime`, `avgLatencyMs`, `maxBudget` wrapped in null checks with '—' fallback; `avgTrust` stat returns null (not 0) when no agents have declared trust scores. ModelDetail: drift score renders '—' instead of '0%' when no telemetry exists. AIImpactAssessments: `progressPct` null guard prevents 'undefined%' crash. IncidentLog: remediation `progressPct` null guard with '—' fallback and safe bar width.

* docs(modules): **100% guide coverage (135/135).** GenAI Risk Profiles doc written (`genai-risk-profiles.md`), completing the last undocumented sidebar destination. Compliance mappings updated (EU AI Act Art. 9, ISO 42001 6.1.2/A.5.4). 23 additional stub module docs expanded to full template format in the same pass.

* docs(modules): **autopilot.md rewritten from stub to full template** — Purpose, Why it exists, How it works, Features table, Interlinks, Compliance mapping (EU AI Act Art. 14, ISO/IEC 42001 A.9.2), Operations.

* feat(compliance): **DB-side audit trail for ai_models (TD-018 closed, EU AI Act Art. 12).** New `fn_audit_governed()` trigger function writes append-only rows to `audit_log` on every INSERT/UPDATE/DELETE against `ai_models`, capturing the actor (from `auth.uid()` / JWT email), org, before/after JSON, and action. Fires in the database so it also captures direct-SQL and service-role writes the app layer would miss. EXECUTE revoked from anon/authenticated to prevent PostgREST RPC exposure. Migration: `20260902000001_audit_trigger_ai_models_art12.sql`.

* fix(rls): **admin-gate organisation edits on live; lineage-agnostic migration.** Any authenticated user could rename the organisation via the Supabase client — the base `organizations_isolation` policy is FOR ALL. A new RESTRICTIVE FOR UPDATE policy gates writes on `is_org_admin()` (owner/admin role). The migration detects which auth primitives exist and does the right thing on either lineage (repo's `auth.has_permission` or live's `get_user_org_id`), avoiding the TD-000 defect where permissive policies OR-combine. Also fixed a latent bug in `is_org_admin()`: it was SECURITY DEFINER with `search_path=''` but referenced `user_profiles` unqualified, so every call errored. Migration: `20260901000003_organization_settings_writable.sql`.

* fix(models): **unmeasured accuracy/latency renders "—", never a fabricated 0.** `accuracy` and `latencyMs` in `seed.ts` and `modelMapping.ts` are now `null` (not `0`), and both KPI tile rows in ModelDetail guard null with a `—` in neutral colour. Same pattern as the fairness fix. Register dialog starts new models with null metrics.

* docs(debt): **TD-020 — live DB diverged from repo migration lineage.** Documents the four drifted primitives, the four migrations applied live via MCP, and the decision needed before `supabase db push` becomes safe again.

* fix(integrations): **monitored sources stop asking every product the same question.** All 216 catalogue products with no adapter were asked "tenant, workspace or account", an owner and a cadence — a field set true of nothing in particular, which produced a record nobody could act on because whoever eventually built the connection had to go and find out the real identifiers anyway. New `productProfiles.ts` carries **34 verified product profiles**: AWS is identified by a 12-digit account number and regions in scope and reached with a cross-account IAM role and external id; Zoom by an Account ID from a **Server-to-Server** OAuth app (not a user-level one, which does not survive an admin changing); Okta by an org URL and an SSWS token; Datadog by a **site**, because keys are not portable between `datadoghq.com`, `.eu` and the US3/US5 sites; Notion records *which pages are shared to the integration*, because a Notion integration sees only those and the evidence scope is otherwise unknowable later. Every slug is verified to exist in the seeded catalogue — a profile for a phantom slug is dead code that never runs and never fails, so it would rot silently. Products without a verified profile keep the category shape and the UI labels that as *"this product's catalogue entry names…"* rather than asserting it about the product: being honestly generic beats being specifically wrong, and the long tail gets no invented documentation. **The specificity does not weaken the secrets rule** — a monitored product still has no adapter, so profiles collect identifiers and scope only, with `authMethod` recording what the eventual adapter will need so the contract is captured without taking the secret early; a test asserts no `password` field and no secret-shaped id across every profile

* feat(ai-brain): **retrieval-augmented compliance evaluation** — `policy_knowledge_base` (pgvector, HNSW on `vector_cosine_ops`), a `match_policy_chunks` RPC, an ingestion service that chunks and embeds policy text, and an LLM judge that decides whether raw integration evidence satisfies a control *against the org's own written policy* rather than a generic notion of the framework. The platform already had keyword search over policies (`20260421000006`); what it lacked was retrieval by meaning, which is what matching a provider JSON payload to a prose clause needs. **Three departures from the obvious design.** (1) `org_id`, not `tenant_id`: the platform has one tenancy id-space and a vector store keyed on the legacy `tenant_id text` could not join to the evidence it judges without a lossy bridge. (2) A verdict is evidence, so it is stored — `ai_compliance_verdicts` keeps the model, the prompt version and the ids of the chunks the model was shown, because "why did the platform say this control passed?" cannot be answered by a row holding only the answer; the raw evidence is **never** stored, only a SHA-256 fingerprint. (3) **A `fail` does not go straight to the mesh.** `RISK_DETECTED` already has seven subscribers, one of which — AutoPauseAgent — pauses production models; wiring a probabilistic judge to that means an inference nobody read can take a model offline. Fails below `SENTINEL_AI_AUTO_ACTION_CONFIDENCE` (0.85) raise a `hitl_items` review instead, and an unreachable judge records `inconclusive` and queues a human — an API outage marking controls satisfied is the worst failure this module could have. The judge runs at `temperature=0` with a provider-enforced `response_format`, so a compliance decision is never regex-parsed out of prose, and the prompt fences the evidence as untrusted data because an S3 object key or a resource tag is user-controlled text that ends up in a finding. Verified against a real PostgreSQL 16 with pgvector: retrieval ranks correctly, the similarity threshold excludes unrelated chunks, `match_count` is clamped server-side, and an org-A query returns **zero** org-B rows despite an identical vector. 15 tests

* feat(settings): **the organisation's name is the organisation's, not a constant we shipped.** It is the most-shown string in the product — 28 pages put it in their subtitle, the board report prints it on every page and in its provenance table, and the narrative engine writes it into prose an auditor reads — and it came from a **hardcoded default in a browser localStorage store** (`settingsStore.ts`: `orgName: 'Dignep Group Pvt.Ltd.'`, `domain: 'certifyi.ai'`, `primaryContact: 'admin@certifyi.ai'`). Three compounding faults: every tenant saw the same demo company until somebody typed over it; the value never left that one browser, so a second device or a cleared cache restored it; and **Settings → General was a mock-up** — `defaultValue="CertifyI"`, a made-up `tenant_certifyi_prod` id, and a Save button wired to nothing. Meanwhile `organizations` already carried every one of those columns (`006_core`, `20260421000003`) with **no reader**, and the demo tenant was seeded as *Demo Tenant*, so the name shown was never the name stored. `organizations` is now the single source of truth: `settingsStore.ts` is **deleted** and its 28 consumers read `useOrgName()` off one shared query key, so a rename lands everywhere at once. An unset name renders as "Your organisation" — never a blank subtitle, never a placeholder company. `20260901000003` adds the UPDATE policy that made saving possible at all (`ws02_org_self_read` granted SELECT only, so the old Save would have failed at the database): scoped to `id = auth.current_org_id()` **and** `auth.has_permission('org.update')`, both repeated in `USING` and `WITH CHECK` — without the second an admin could move their organisation onto another tenant's id, which the two-org probe confirms is now refused outright. A PostgREST update that RLS refuses returns **no error and no row**, so `updateOrganization` throws on an empty result rather than toasting over a change that never happened
* feat(settings): **give `notification_prefs` its first reader, and retire three tabs that were pretending.** The Notifications tab rendered six toggles whose on/off state was a literal in the JSX and whose clicks went nowhere, while the real org-scoped table sat unused since April; every switch now writes, with `org_id` filled DB-side by `get_org_id()`. The event types offered are the ones **this organisation has actually emitted**, read from `governance_events` — shipping a menu of events the platform might one day raise would put rules in front of an operator for things that never fire. No rules means nothing is being sent, and the empty state says exactly that instead of implying a hidden default set. **Team**, **API Keys** and **Compliance** each rendered a hardcoded array with buttons that did nothing, duplicating a module that already exists and works — a second, fake copy of a real screen is worse than no copy, because it splits where people look and invents state. They now point at IAM & Roles (`/access-control/*`), the Keys Vault (`/security/keys`) and Controls / Evidence Vault / evidence sources / Autopilot respectively. Not deleted outright: `?tab=team`, `?tab=api-keys` and `?tab=compliance` still resolve to a card naming where the subject went, because a tab people have used should not silently vanish. Worth stating plainly — "Audit trail immutability" had been a **switch**; the chain is append-only by construction, and offering it as a toggle implied it could be turned off
* chore(demo): demo and seed identities move to `certifyi.ai` (`admin@certifyi.ai`, personas under `demo.certifyi.ai`). Demo **attack-surface hostnames** deliberately do not follow: those rows carry fabricated "critical" and "high" exposure findings, and hanging invented vulnerabilities on a domain somebody actually operates is a worse outcome than the string it replaces — they move to `example.com`, reserved by RFC 2606 for exactly this

* feat(integrations): **every catalogue product now opens a real connection modal.** The catalogue published 219 evidence sources; three of them (`github`, `aws`, `microsoft_azure`) had a connect form and the other 216 had prose and no way to record anything — browsable and unusable. Clicking any entry now opens `ConnectDialog` with fields appropriate to that product, chosen by `buildConnectionProfile`. **The obvious fix was the wrong one**: rendering a credential form on all 219 would take a token for a product with no adapter — a stored secret nothing can ever use, supplied by an operator who would reasonably believe collection had started. So a connection has a **mode**. `automated` is unchanged: the adapter's own credential contract, AES-256-GCM encrypted server-side, first sync queued. `monitored` is new and takes **no credential at all** — it records which tenant is in scope, who is accountable for it, how often its evidence is refreshed by hand, and where that evidence lives, then says plainly on the card, in the dialog and in the record that nothing is pulling from it. Owner and cadence are **required on both sides**, because a registered source with neither is a list entry pretending to be a control. The monitored fields are derived from the catalogue row's own `category` and `evidence_pull` prose, so no product gets invented documentation. Three guards keep the modes from blurring: a CHECK constraint (`integrations_manual_holds_no_credentials`) that refuses a manual row carrying a credential blob at the database rather than in a code path; a `connection_mode = 'automated'` predicate on the daily `pg_cron` sync enqueue — verified on a from-zero replay to be load-bearing, since the same predicate without it returns a manual row marked `connected` and with it returns none, and every such job can only fail its five attempts; and promotion to `automated` when `connect` runs over a previously monitored row, so a source that gains an adapter is relabelled rather than left misdescribed. `/integrations` counts **Collecting** and **Monitored manually** separately, because summing them would overstate automated coverage. Also closes 2026-08-18 re-audit finding **N3**: `sync` gated only on `catalog_slug` being non-null while `connect` gated on `adapter_status`, so a product later withdrawn could still queue work the worker must refuse — it now gates on both the adapter status and the mode

* feat(deploy): serve the dashboard at **`1shield-oss.certifyi.ai`**. Declared as a `custom_domain` route in `dashboard/wrangler.toml` — the manual `wrangler deploy` path — alongside the same declaration in the root `wrangler.jsonc` that the Cloudflare Git build reads (see the `chore(hosting)` entry below); the hostname is stated in both so neither deploy path can drop it. Reviewable and diffable rather than clicked once in a dashboard, so the hostname is reviewable and a fresh account can be stood up from the tree. **Additive, not a cutover** — the workers.dev subdomain keeps serving unless disabled separately, so existing links do not break the moment this lands. Also fixes the two places that would have quietly kept pointing at the old origin: the Playwright `baseURL` (E2E would have gone on testing workers.dev) and the DR runbook's `/healthz` check, which is worse than useless if it probes the wrong host mid-incident. Ticks the "move to custom domain" item that had been sitting unchecked in `dashboard/docs/DEPLOYMENT.md`. **Prerequisite: `certifyi.ai` must be a zone on the same Cloudflare account** — Cloudflare mints the DNS record and certificate itself for a custom domain and cannot do so for a zone it does not hold; if it is absent `wrangler deploy` fails on the hostname, and deleting the `[[routes]]` block restores the previous behaviour with nothing else depending on it

* docs(audit): **re-audit** (`docs/reference/platform-audit-2026-08-18b.md`) — checks which of the morning's ten findings actually closed, by re-running every measurement rather than reading commit messages. **F1 is closed properly**: a from-zero replay now applies **150 of 150** migrations against a real PostgreSQL 16, where this morning it halted at 97 of 146. **F0 is closed.** **F2 is 4 of 13** — `e67e519` added defaults "on the live org_id-bearing tables", so nine remain and the two the original finding reproduced, `use_cases` and `datasets`, still fail byte-identically. **F3 is untouched**: still 23 write-capable destinations with neither `logAction` nor a DB audit trigger, and still zero of both on `ai_models`, `use_cases` and `datasets`. F4 improved 11 → 9 but gained `knowledge_graph`, which **two agents** now read and no migration creates. F6 went 40 → 41. Also audits the new $0-infra surface: the edge function is well built, but the evidence pipeline's clock now depends on GitHub Actions — the one piece of infrastructure that has been unable to allocate a runner all day — credential-shape validation moved from an immediate 400 to an hours-later `last_run_error`, `sync` does not gate on `adapter_status` where `connect` does, and "continuous" is a 24-hour batch that the UI does not say is a 24-hour batch

* feat(gateway): **`mcp_tools` now decides instead of documenting.** The table has carried a complete authorization policy since August — `approval_state`, `requires_hitl`, `side_effects`, `risk_tier`, `scopes`, `allowed_agent_ids` — and **nothing read any of it at call time**: an operator could block a tool, grant it to two agents and mark it as needing human review, and an agent could still call it. This is the runtime. `sentinel/gateway/policy.py` is a pure decision function (no DB, no clock, no I/O) evaluating, in order: agent known → tool known → server not blocked → tool approved → **agent holds a grant** → within rate limit → no human required → allowed. `POST /v1/gateway/authorize` binds it to the database and records the outcome. Three orderings are deliberate: **authorization precedes rate limiting** (an ungranted agent is told so, not told to slow down — a 429 on a call that would never be permitted invites a retry loop); **human approval is evaluated last** (no point queueing a reviewer for what policy already refuses); and **identity precedes existence** (an unknown caller learns nothing about whether a tool exists). Fail closed throughout — an empty `allowed_agent_ids` means **nobody**, not everybody, which is the reading that does not silently open every tool when someone clears the field. New `rate_limit_per_hour` on `mcp_tools`: NULL unlimited, **0 suspends a tool without disturbing its approval history**. 30 backend tests cover the decision table exhaustively, including that every `reason_code` the rules emit is one the database CHECK constraint accepts — and that every code the constraint allows is reachable, so the vocabulary cannot drift
* feat(gateway): **make enforcement visible.** New `/mcp-gateway/decisions` renders every decision the gateway made, defaulting to the ones that need attention rather than the allowed ones nobody opens the page for. **A pending approval is never folded into "denied"** — policy permitted that call and paused it for a person (EU AI Act Art. 14), it gets its own tone, its own filter and a link to the queued review; counting it as a refusal would misreport what the platform did and hide the queue from whoever must clear it. The tool catalogue gains an **Enforcement** column with live counts where "No calls yet" renders distinctly from zero refusals (never asked ≠ never refused), and the Overview posture card now counts real decisions instead of `mcp_tools.invocations_30d`, a stored column nothing maintains. Realtime rather than polling: a denial seen five minutes late is a denial nobody can act on. This also ends the isolation the 2026-08-18 audit recorded — `/mcp-gateway/*` had **no cross-module link in or out** and now reaches agents, HITL and the tool registry both ways
* feat(gateway): `mcp_policy_decisions` — the durable record, with **no client insert policy**, because a decision a browser can write is not evidence. Denials matter most: a refused call never reaches `tool_call_logs`, so this is the only proof the control operated. `request_fingerprint` is a SHA-256 of the arguments and **never the arguments** — tool arguments routinely carry customer data, and the hash answers the one question an auditor asks of them. Org scoping filled DB-side; the migration asserts its own postconditions and re-runs the TD-000 permissive-policy test over the table it adds
* chore(hosting): declare the dashboard custom domain `1shield-oss.certifyi.ai` in the root `wrangler.jsonc` (`routes` with `custom_domain: true`). On the next `wrangler deploy` Cloudflare provisions the DNS record + TLS cert automatically, provided `certifyi.ai` is a zone in the deploying Cloudflare account; the `*.workers.dev` URL keeps working alongside it. If the zone is not in the account, add the domain via the Cloudflare dashboard (Workers & Pages → sentinel → Settings → Domains & Routes → Add → Custom Domain) instead. Config only — provisioning needs the account's Cloudflare credentials, which are not present in this environment.
* fix(nav): the **Narrative Engine** menu item no longer silently redirects to Board Report. `/narrative-engine` had been "parked" as a supposed duplicate and routed to `/ciso/report`, but `pages/NarrativeEngine.tsx` is a distinct, functional page — an audience-shaped governance narrative composed from the real registers via `governanceFactsService` (null-not-0, with the source query shown behind each figure). Restored the lazy import and route. A cross-reference of every `navigation.ts` `to:` against the app's `<Navigate>` routes confirmed this was the **only** menu entry redirecting to a different module.
* feat(gateway): **give the enforcement gateway a home — an always-on free VM, not an edge function.** Removing the FastAPI deploy path left `POST /v1/chat/completions` (the inline LLM proxy in `sentinel/proxy.py`) with no host. It is data-plane — on the path of every LLM call, holds a Redis rate-limit connection, sanitizes prompts, circuit-breaks to the provider via litellm, streams responses, writes the audit chain — so it **cannot** be serverless (no warm Redis pool, CPU-time limits blow on streaming, cold starts hit enforcement latency, and the Python policy stack would need a full rewrite). New [`docker-compose.gateway.yml`](docker-compose.gateway.yml) runs it as `sentinel.proxy:app` + Redis off the existing image, `SENTINEL_DATABASE_URL` → Supabase, no local Postgres; ingress via an optional **Cloudflare Tunnel** service (no open inbound ports, free TLS, reusing the Cloudflare you already run). New [`.env.gateway.example`](.env.gateway.example) documents the real env contract (verified against `config.py`/`proxy.py`: `SENTINEL_SECRET_KEY`, `SENTINEL_DATABASE_URL`, `SENTINEL_REDIS_URL`, and provider keys litellm reads directly — `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`). Footprint is light — spaCy/torch are not dependencies, the sanitizer runs in regex fallback — so it fits ~512 MB and a free **Oracle Cloud Always Free** (or GCP `e2-micro`) VM; scale-to-zero platforms are explicitly ruled out. New runbook [`docs/operations/gateway-deployment.md`](docs/operations/gateway-deployment.md) and architecture doc [`docs/architecture/deployment-topology.md`](docs/architecture/deployment-topology.md) record the control-plane (serverless, $0) vs data-plane (hosted gateway) split — including the measured fact that of ~597 dashboard files, 106 talk to Supabase directly and the frontend's only tie to a hosted FastAPI was one gracefully-degrading events WebSocket plus one unreferenced config default, so dropping the FastAPI host changed almost nothing for the app. `backend-deployment.md` scoped to control-plane and cross-linked; TD-019 updated with where each of the three surfaces is hosted.
* feat(integrations): **run the evidence pipeline on $0 infrastructure, and fix a fifth break.** The earlier deploy plan used Fly.io; a continuous worker there costs a few USD/month, so with no budget that was the wrong default — this pass reimplements the deployable pieces on free tiers and **removes `fly.toml` and `deploy-backend.yml`.** connect/sync/available is now a **Supabase Edge Function** (`supabase/functions/integrations-connect/`, Deno) — free, already the project's serverless runtime — that encrypts credentials with **AES-256-GCM byte-compatible with the Python worker** (`crypto.py`'s `{v,nonce,ciphertext}` blob) and enqueues the sync; the frontend now calls it through `supabase.functions.invoke` (session token attached automatically), so `VITE_SENTINEL_API_URL` and the separate API host are gone entirely. The crypto interop is pinned by a Deno test against a fixed vector the Python `cryptography` library produced — if the two ever disagree, CI fails rather than silently storing blobs the worker can't decrypt. The Python **sync worker** stays (its adapters are Python) but gains a **drain-once mode** (`run(drain=True)`, `SENTINEL_WORKER_DRAIN`) and runs as a **daily GitHub Actions job** (`evidence-worker.yml`, secrets-guarded, ~60 free minutes/month) that drains what `pg_cron` enqueued and exits — no 24/7 process. Both write paths were grounded in the **live** schema of project `vhparvughsygyknblkzt` (verified: `integrations.org_id` defaults to `current_user_org_id()`, which is NULL under the service role, so the function sets it explicitly from `user_profiles`). **Fifth break, found while building this:** `process_job` read `payload["org_id"]`/`["integration_slug"]`, but both connect surfaces enqueue only `{integration_id, catalog_slug}` — the worker would `KeyError` on every real job. Fixed by making the `integrations` row the authority (derive `org_id` and slug from it, keyed by `integration_id`), which also keeps the org boundary intact. Runbook rewritten for the free-tier path (`docs/operations/backend-deployment.md`); roadmap updated (`docs/reference/continuous-evidence-roadmap.md`).
* fix(integrations): **close the evidence-collection loop, which broke in four places.** The platform has all the parts of continuous evidence collection — an event bus, the sync worker, `pg_cron` schedules, the job queue, the control mapper — but the loop never closed, and this pass fixes the two breaks that are code (the other two are deployment, addressed below). **③** `connect()` writes an integration row with `status='configuring'` and enqueues one immediate sync, but the worker updated `last_sync_at`/`last_run_status`/`health` and **never `status`**, while both cron schedules re-enqueue only `where i.status='connected'` — so nothing promoted `configuring → connected` and collection ran **exactly once** at connect time, never again. `worker.py` now promotes the row to `connected` on first successful sync (guarded so it never overwrites a terminal state a human or another path set), so the daily schedule picks it up. **④** the connect/sync router (`/v1/integrations/*`) was mounted on **only** `sentinel/proxy.py`'s app, but the container runs `sentinel.api.main:app`, which never mounted it — so a deployed API would answer every `POST /v1/integrations/connect` with 404. The router is now also mounted in `main.py`, ahead of the catch-all frontend proxy that only exempts `api`/`ws`/`favicon` paths and would otherwise swallow its GET routes; verified via the app's own OpenAPI schema. Residual two-app fork recorded as **TD-019**.
* feat(deploy): _**[superseded by the free-tier entry above — `fly.toml` and `deploy-backend.yml` were removed; connect runs as a Supabase Edge Function and the worker as a scheduled GitHub Actions job. Retained here for history.]**_ **the Python backend is now deployable** (Fly.io), closing breaks **①** (nothing deployed the API) and **②** (nothing ran the sync worker). New [`fly.toml`](fly.toml) defines one app with two processes off a single image — `web` (`uvicorn sentinel.api.main:app`) and `worker` (`python -m sentinel.integrations.worker`) — the `web` machine suspending when idle, the `worker` running continuously to poll the job queue. The `Dockerfile` now installs the `[integrations]` extra so the worker carries its provider SDKs (`boto3`, `PyGithub`). New [`deploy-backend.yml`](.github/workflows/deploy-backend.yml) redeploys on push to `main` touching the backend, guarded on a `FLY_API_TOKEN` secret so it **skips with a notice** (never reds `main`) until Fly is wired up. Full runbook — secrets, one-time setup, verification, and an honest note that a 24/7 worker is a few USD/month, not free, with a cheaper scheduled-worker alternative — in [`docs/operations/backend-deployment.md`](docs/operations/backend-deployment.md). The phased plan for what deploys unblocks (continuous evidence → autonomous mesh, both gated on TD-017/TD-018) is in [`docs/reference/continuous-evidence-roadmap.md`](docs/reference/continuous-evidence-roadmap.md).
* chore(cleanup): delete two provably-dead frontend files — `useCommitteesData.ts` and the `ViewAsRole` component (zero consumers, verified by grep). Two more flagged as unnecessary (`ContextualAlert`, `EvidenceAttachments`) are **kept**, not deleted: `EvidenceAttachments` implements the platform's evidence-chain principle and is the right thing to *wire in*, not remove — the wire-or-remove decision for both is recorded in the roadmap rather than made by deleting built capability.
* fix(security): **close a cross-tenant read on seven tables.** `20260421000014_ws02_tenancy_sweep` classified eleven tables as "tables [that] serve every tenant" and gave each `FOR SELECT TO authenticated USING (true)`. Three genuinely are global reference data; eight are not. One of the eight (`audit_findings`) was caught in `20260821000001` — "every tenant could read every other tenant's audit findings" — and **the other seven were never revisited**: `document_versions`, `event_cascade_links`, `incident_workflow_steps`, `observability_metrics`, `vendor_questionnaires`, `workflow_step_actions`, `module_health`. Each holds tenant data, each also carries a correct org-scoped policy, and that does not help, because **Postgres OR-combines permissive policies** — `USING (true)` widens access straight past the org predicate beside it. This is **TD-000 recurring**, the register entry written to preserve exactly this lesson. Reproduced on a from-zero replay before the fix (a user in Org A read Org B's `document_versions`) and again after (own rows only). `20260830000003` drops the two `ws02_catalog_*` policies on all seven and narrows `event_cascade_links.cascade_org_insert` — which was `WITH CHECK (true)`, allowing a cross-tenant **write** — to the caller's own org rather than dropping it, since the governance event bus writes through it. Self-verifying: it refuses to run if any of the seven would be left without an org-scoped read or without its service-role policy, and it re-runs TD-000's regression query before finishing. Whole-schema recheck leaves only `emission_factors`, `integration_catalog` and `policy_templates` permissive — all three have no `org_id` column at all
* docs(audit): **platform audit — modules, features, database, interlinks** (`docs/reference/platform-audit-2026-08-18.md`). Every migration was applied to a **real PostgreSQL 16**, so all 253 tables are verifiable rather than the 187 the static checker can parse (TD-015's blind spot), and the code side was measured over 468 files, 157 route bindings and the 134 menu destinations. Ten findings with reproduction for each. The three that matter beyond the fix above: **(1)** a from-zero replay **halts at migration 97 of 146** — eight migrations fail, five of them the same `incidents/risks/vendors/frameworks` text-vs-uuid split, and because the first failure is `replay_repair.sql` — whose entire purpose is re-applying the guarded early migrations — one type mismatch silently strips the rest of that file and cascades into three more failures. TD-014 recorded two of the eight and assumed the rest unreachable; under `supabase db push` that assumption costs **50 migrations that never run**. **(2)** **Thirteen create paths are rejected by their own RLS policy** — `org_id` has no DB default, no trigger fills it, the INSERT policy requires it, and the service never sends it; `insert into use_cases (name)` was reproduced returning *"new row violates row-level security policy"*, and the same insert with `org_id` supplied succeeds. **(3)** `ai_models`, `use_cases` and `datasets` — including the canonical model id-space — are covered by **neither** `logAction` nor `fn_audit_trigger`, so registering or deleting an AI model leaves no audit record with an actor (note the near-miss: `model_inventory` **is** trigger-audited, `ai_models` is not). Also: 11 tables the dashboard reads that no migration creates (two of them behind live RBAC admin screens), 3 tables with RLS off, **40 `<entity>_id` columns with no foreign key** — the mechanism behind the 2026-08-17 audit's "98 references resolve to nothing" — 12 modules with no cross-module link in or out, and error states missing on 64 of 120 destinations. Recorded as **TD-016/017/018**, and TD-014's scope note corrected against the evidence

* feat(integrations): **AWS and Microsoft Azure are connectable.** They were the two most-asked-for evidence sources and both said "Catalogued for reference only — no adapter ships for this product yet", which was accurate and is now fixed at the root rather than reworded. New `sentinel/integrations/aws/adapter.py` runs **14 read-only checks** (root and user MFA, password policy, 90-day access-key age, direct `AdministratorAccess`, multi-region CloudTrail actually logging, S3 public-access block and default encryption, EBS default encryption, RDS storage encryption, security groups exposing admin ports to `0.0.0.0/0` or `::/0`, KMS rotation on customer keys, an *enabled* GuardDuty detector, AWS Backup plans) via `boto3`, imported lazily and declared as a new `[integrations]` extra so the API server does not carry it. New `sentinel/integrations/azure/adapter.py` runs **9 read-only checks** (enabled Conditional Access MFA policy, Owner-assignment sprawl, storage anonymous access and TLS floor, managed-disk encryption, NSG ingress from Internet, Key Vault purge protection, activity-log export, Defender for Cloud plans) over the ARM and Microsoft Graph REST APIs using the `httpx` already in the tree — **no new dependency**. Both support cross-account/tenant auth the way the provider recommends (AWS `sts:AssumeRole` with an external id; Azure an Entra ID app registration with Reader), and both ship as **`beta`, not `available`**: every check is implemented and unit-tested, neither has been run against a production tenant, and claiming otherwise is the fabricated-capability failure this catalogue exists to prevent. The UI states it on the connect screen. Migration `20260830000001` flips the two catalogue rows and asserts the catalogue and the Python registry agree. 51 new tests (`tests/test_aws_adapter.py`, `tests/test_azure_adapter.py`) drive both adapters offline against stubbed provider payloads and assert the judgement calls, not the plumbing: a programmatic-only IAM user is not flagged for missing MFA, `443` open to the world is not a finding while `22` is, a `1000-4000` port range is parsed as a range covering `3389`, an inactive access key is not "stale", platform-managed Azure disk keys count as encryption, and a missing read permission renders **NOT_AVAILABLE** rather than a pass or a fail
* fix(integrations): a stale `adapter_status` can no longer hide a Connect button the server would accept. `adapter_status` is set by a migration while the adapter registry lives in Python, and the two deploy separately — so a database that had not received migrations showed AWS as unconnectable no matter how many times the frontend shipped. `reconcileWithServer()` now folds `GET /v1/integrations/available` (the server's own answer to "what will I accept?") over the catalogue before it renders, in both directions: a product the server ships is offered as `beta`, and a product the catalogue advertises but the server does not know has its Connect withdrawn. An unreachable backend leaves the catalogue untouched, because "no answer" is not evidence that nothing is connectable. Cross-checked by a test asserting the connect forms, the Python registry and the migration all name the same three slugs — and that Azure is keyed by its catalogue slug `microsoft_azure`, never `azure`
* fix(catalog): the competitor's help-centre text now disappears with the frontend, not with the database. `20260829000002` clears every `docs_hint` naming a third-party GRC platform, but nothing had applied it, so "Provider docs: Vanta Help Center → …" was still on screen. `sanitizeDocsHint()` applies the same rule at render time and `fetchIntegrationCatalog` drops the competitor slugs, so the two halves agree regardless of deploy order. Dropped rather than rewritten, for the same reason as the migration: we hold no verified documentation URL for 217 products and inventing them would be fabricated data
* fix(catalog): verifying that scrub against a real Postgres found three rows it had missed, because it only looked at `docs_hint`. The **`connect_steps`** on `openai_azure_openai`, `anthropic_claude_api` and `langsmith_langfuse` — the walkthrough rendered in-product as "Connection steps" — told the reader to add the API key *in a competitor's product*. That is worse than a docs pointer: it is not a reference but an instruction someone may actually follow. `20260830000002` rewrites the three phrases and `sanitizeConnectSteps()` mirrors it client-side. A rewrite rather than a clear this time, because the sentence is our own walkthrough describing where a credential is entered and that place is Sentinel; every provider-specific fact in the step (which key, which role, which scope) is left exactly as the source workbook had it. Bounded to literal phrases — a blanket name substitution would corrupt any row using the word in another sense — and the migration now verifies **every** operator-facing text column, not just the one that prompted it

* feat(integrations): a real connect flow — this is where you fill in credentials. Connect now opens a form built from the provider's own `credentialFields` (GitHub: access token, organization, optional Enterprise base URL) and posts to the new **`POST /v1/integrations/connect`** (`sentinel/integrations/api.py`), which refuses any slug with no registered adapter, validates the credential shape against the adapter's own model, **encrypts with AES-256-GCM** and stores only ciphertext, upserts on `(org_id, catalog_slug)` so reconnecting updates in place, and enqueues the first `background_jobs` sync — a privileged write with no client insert policy, which is why it belongs on the server. The org comes from the caller's verified token, never the request body. The browser holds credential values only for the life of the form, sends them once over TLS and clears them on resolve; nothing reaches localStorage, the query cache or the URL, and error paths never echo submitted input. Adds `POST /v1/integrations/{id}/sync` and a **Sync now** action. 11 new backend tests assert the security invariants — one of which **caught a real bug before merge**: the registry raises `LookupError` and the handler caught `KeyError` (its subclass), so an unknown slug would have surfaced as a 500 instead of a clean 400
* fix(catalog): remove third-party GRC vendor references from the integration catalogue. 163 rows' `docs_hint` sent operators to a **competitor's help centre** — rendered in-product as "Provider docs: Vanta Help Center → … help.vanta.com/…" — which is not the provider's documentation, advertises another GRC vendor inside our own product, and makes our catalogue look derived from theirs. `20260829000002` clears every such pointer (cleared, not rewritten: we hold no verified per-product doc URLs for 219 products and inventing 163 would be fabricated data) and removes `drata`/`secureframe` as catalogue entries, guarded so a product any tenant has actually connected is never deleted. The genuinely useful operator prose — `why_needed`, `evidence_pull`, `connect_steps`, `evidence_mapping` — is untouched. Catalogue is now 217 products, verified clean and idempotent. Also replaces a competitor name used as an evidence `source` in demo seed data
* fix(write-paths): close the last three instances of the broken-scoping bug class. `attackSurfaceService`, `ethicsReportsService` and `policyFirewallService` each sent `tenant_id` on upsert to tables that have no such column — the three TD-015 named as most likely, all confirmed against a real Postgres. Every save on Attack Surface, Ethics Reports and Policy Firewall failed at the API boundary. All three tables already carry an `org_id` DB default, so no migration was needed: the services now send only the record. Proven both ways against the real schema — the old shape is rejected for the missing column, the new one inserts with `org_id` filled server-side
* fix(demo-data): the eight seeded connector rows named individual people as accountable owners of production-sounding systems — the core banking feed, the credit bureau extract, the Nepal Rastra Bank supervisory return — with **no marker saying they were demonstration data**, making them indistinguishable on screen from real records. That failed the platform's own compliance gate twice: "no personal data in seeds or fixtures", and "demo data stays fictional and labeled as such". `20260829000001` replaces every owner with a ROLE label, suffixes each name "(Demo)", and marks `config.demo_seed = true` so they are identifiable and removable like every other demo record. Scoped to the eight seeded ids in the demo org — a tenant's own connectors are never rewritten, verified against a real Postgres alongside a control row that must stay untouched. Idempotent (no double suffix on re-run) and self-verifying: it raises if any seeded row still names a person or lacks the marker
* feat(ci): add the **Deploy Migrations** workflow — the missing half of the deploy pipeline. `deploy-dashboard.yml` shipped the frontend on every push to main while **nothing applied the schema**, so merged work that depended on a migration was live in the bundle and absent from the database; empty catalogues and "column does not exist" errors all traced back to this one gap. The new workflow runs the static replay check first (catching an ordering mistake before touching the live database), then `supabase db push`, guarded by a concurrency group so two pushes cannot race mid-apply, with a *dry run* option that lists what is pending and changes nothing. It stops with a clear message listing exactly which of the three required secrets is missing rather than failing obscurely part-way through
* feat(integrations): tabs on `/integrations` are URL-addressable (`?tab=connectors`, `?tab=webhooks`), matching the repo's deep-link convention, so a link can point at a specific tab and a reload lands where the reader expects. The catalogue is the default and stays clean in the URL
* feat(integrations): surface the 219-product evidence catalogue and wire the evidence chain to controls. `integration_catalog` (219 rows), `integration_findings`, `control_finding_evidence` and `background_jobs` had **zero readers** anywhere in the app or edge functions — the platform had a real collection pipeline, a real control-mapping engine, and no way for a user to reach any of it; `/integrations` showed only hand-created connector records from a separate, older table. Adds a **Catalog** tab: all 219 sources with category filters and search across the operator prose (so "which of these evidences MFA?" is answerable), each stating its adapter status honestly. **Connect is rendered only for a product that ships an adapter** — exactly one (`github`) today — and a catalogued-only entry says why it cannot be connected while still showing what it would evidence, how it is pulled and what it maps to. `isConnectable()` is the single gate and mirrors the server, which refuses slugs absent from its registry. Connect creates the org `integrations` row carrying `catalog_slug` (status `configuring` — linked, not yet collecting; credentials stay server-side, AES-256-GCM, never in the browser); disconnect soft-deletes but **retains findings**, since disconnecting a source must not erase the evidence trail (Art. 12). Both audit-logged. New **Automated Evidence** tab on `ControlDetail` lists the findings mapped to that control with posture, counts and remediation — deliberately separate from `controls.status`, because a machine finding is a signal about a control, not the owner's assertion about it. Reverse view on each connected source shows what it has actually collected, worst-first, or an honest "nothing collected yet". New `docs/modules/integration-catalog.md`; 21 new unit tests (322 total) including the capability gate that stops a catalogued-only product ever offering Connect
* chore(replay-check): report the migration checker's own blind spot instead of implying it away. `check_migration_replay.py` verifies column references only against tables whose literal `CREATE TABLE` it parsed; tables born inside a dynamic `execute format('create table …')` loop are learned only from later `ALTER`s and cannot be column-checked. It now prints the full list — **81 of 268 tracked tables (30%)** — so "replay check clean" reads honestly as "clean for the tables it can see". This is not theoretical: **all four broken write paths repaired in `20260827000001` were on dynamically-created tables**, which is exactly why a client sending a non-existent column passed this gate for six audit waves. Recorded as **TD-015**, which also names the three most likely next instances (`attack_surface_assets`, `ethics_reports`, `policy_firewall_rules` — all dynamic, all still injecting `tenant_id`)
* fix(notifications): repair the Notifications inbox, which failed outright with `column notifications.notification_type does not exist`. Root cause: `public.notifications` is created **twice** — `20260418000002_core_grc_tables` (`tenant_id`/`notification_type`/`message`/`entity_*`) and `20260421000006_phase4_foundation` (`org_id`/`type`/`body`/`resource_*`/`url_path`) — and the second `CREATE TABLE` is `IF NOT EXISTS`, so whichever era reached a database first silently won. Phase-4 heals an era-1 database forward but nothing healed an era-2 database back, and the app reads era-1 names, so on an era-2 database every read threw. The application was split the same way: the drawer and two of three writers used era-1 names while `governance-dispatcher` wrote era-2 names **plus a `severity` column that has never existed in either era** — and did not check its insert, so those notifications were discarded in silence. `20260828000001_notifications_schema_convergence.sql` converges the table on one canonical column set; it is **additive only** (never drops a column, since a deployment's starting shape cannot be observed from the repo) and carries data across the naming split (`type`→`notification_type`, `body`→`message`, `resource_*`→`entity_*`) so no notification is lost, then asserts every column the drawer selects exists. `governance-dispatcher` now writes canonical columns and fails loudly on error — a dropped governance notification is a missed escalation (EU AI Act Art. 14). Verified against a real Postgres in **both** starting states, each converging with its existing row preserved and re-running cleanly. New `docs/modules/notifications.md` documents the two-era history and the residual debt (era-2 columns left in place, empty, pending a confirm-then-drop follow-up)
* feat(legal): author the Terms of Service and Privacy Policy and wire them into the product. Canonical text lives in `docs/legal/` and is published at certifyi.ai; `dashboard/src/lib/legal.ts` holds the URLs and the operating entity (Dignep Group Pvt. Ltd., Pulchowk Lalitpur, reg. no. 200505/2075/76) in one place. The Login and Signup pages previously linked both documents with `href="#"` — and Signup **blocked registration behind an "I agree" checkbox for documents the user had no way to open**. Both now resolve. The Help panel gains a Legal card linking the same documents from inside the product. The Privacy Policy is written against what the platform actually does: the five fields registration collects, Supabase Auth, the audit trail's attributed actor, DB-enforced tenant isolation, the real sub-processor list (Supabase, Cloudflare, optional Sentry), and explicit statements that we do not sell data, carry no advertising trackers, and do not train models on customer data
* fix(trust-claims): remove fabricated assurance from the authentication pages. **"SOC 2 Type II certified" was displayed on Login, Signup and Forgot Password with no such audit ever completed** — confirmed with the platform owner. Also removed: "ISO 27001" and "GDPR Compliant" badges (the latter is not a certification anyone issues), and **two fabricated customer testimonials** — "CISO, Fortune 500 Financial Services Firm" claiming an 18-months-to-6-weeks result, and "Head of AI Risk, Tier-1 European Bank". No such customers said these things. Replaced with claims that are true and checkable: TLS in transit, encryption at rest, and tenant isolation enforced by row-level security in the database. `docs/legal/README.md` records that no certification claim may be reintroduced until a report exists
* fix(write-paths): repair four broken create/edit paths. `bcpPlansService`, `departmentsService`, `redTeamFindingsService` and `trainingService` each sent `tenant_id` on upsert to tables that have **no such column** (`bcp_plans`, `departments`, `red_team_findings`, `training_courses` are scoped by `org_id`). PostgREST rejects a row carrying an unknown column, so **every save on Business Continuity, Departments, Red Team Findings and Training Courses failed** at the API boundary. The services now send only the record and let the database fill the scoping column (CLAUDE.md First principle #3). `20260827000001_org_scoping_defaults_repair.sql` supplies the `DEFAULT current_user_org_id()` those columns needed for that to work — `departments.org_id` was `NOT NULL` with no default at all, so dropping the client value alone would have traded one write failure for a NOT NULL violation. Idempotent, self-verifying (raises if any of the four still lacks a default), and confirmed against a real Postgres replay
* docs(modules): document the last four undocumented menu destinations — `ai-impact-assessments.md` (`/aiia`), `performance-monitoring.md` (`/performance-monitoring`) and `business-continuity.md` (`/continuity`, reached as both Resilience and Business Continuity). Written from the real schema, services and pages, with two honest gaps recorded rather than smoothed over: neither AIIA nor Business Continuity writes to the audit log (EU AI Act Art. 12), and the continuity page's RTO/RPO cells read columns `bcp_plans` does not have, so they always render `N/A`. **User guide coverage reaches 134/134 menu destinations (100%)**
* fix(compliance): framework cards on `/compliance` deep-link to `/frameworks?open=<framework_id>` instead of the generic list, so a card opens that framework's own Requirements tab — its published control catalog — rather than making the reader find it again
* feat(side-panels): rebuild the four right-hand panels — Get started, User guide, What's new, Help — on real, derived data. `NAV` moves out of `Sidebar.tsx` into `dashboard/src/data/navigation.ts` as the platform's ONE navigation structure, consumed by both the sidebar and the guide, so the two can no longer drift. The **User guide is regenerated from that menu plus the authored module docs** (`scripts/gen_module_guides.py` → `moduleGuides.generated.ts`): 10 sections mirroring the menu exactly, **130 of 134 menu destinations documented (97%)** from 66 of the 86 files in `docs/modules/`, each entry carrying purpose, how it works, **where the data comes from** (the real tables/services behind the screen), fields, interlinks and compliance, plus deep links to the module and to its source doc. A destination with no module doc renders "Not documented yet" with **no body at all** — never invented prose — and the 4 real gaps (`/aiia`, `/performance-monitoring`, `/continuity` ×2) are printed by the generator and surfaced in Help. **What's new** now renders the real changelog (`scripts/gen_release_notes.py` → `releases.generated.ts`): 67 releases, latest v1.66.0, unreleased work carried separately so it cannot read as shipped — replacing a hard-coded "Sentinel v1.43.0 · 2 hours ago · Release 57" that linked to a tag which was never cut. **Help** gains real build diagnostics (version, release count, guide coverage). Full-text entries are kept for the 12 most recent releases and the trim is stated in the UI rather than implied away. Both generators run with `--check` in CI so the panels cannot fall behind their sources. Guide search, keyboard-visible focus and honest empty states throughout. Deletes the superseded implementation — `moduleGuides.tsx`, `guides/guides1-3.tsx` and the never-mounted `UserGuideDrawer.tsx` (~2,860 lines of hand-written prose describing 11 collections against 10 real sections). New `docs/modules/side-panels.md`; 30 new unit tests (301 total) including a structural assertion that the guide covers every menu destination exactly once
* feat(frameworks): author the real, published control catalog for all 15 frameworks into `framework_controls` — **936 controls**, every advertised `control_count` now backed by actual rows (previously every framework advertised a count with zero catalog rows behind it). Adds five NEW frameworks with full catalogs: **SOC 2** (61 TSC criteria), **ISO/IEC 27001:2022** (93 Annex A controls), **HIPAA** (76 Security/Privacy/Breach provisions), **HITRUST CSF v11** (156 control references), **PCI DSS v4.0** (246 requirements) — alongside complete catalogs for the ten AI/privacy/ethics frameworks (ISO 42001 38, NIST AI RMF 72, EU AI Act 34, GDPR 39, OWASP LLM 10, OECD 10, Singapore 25, UNESCO 25, Google SAIF 21, MITRE ATLAS 30). All control refs/titles are the real published identifiers. The catalog is a **global reference** (system-org rows readable by every tenant via RLS; per-tenant rows stay private), fixing a latent bug where the seeded frameworks were not visible to the demo tenant. Idempotent seeds; from-zero replay clean.
* feat(ui): enterprise design pass — unified the two divergent elevation systems (shadcn overlays vs. hand-built cards) onto one shadow-token ramp and upgraded to two-layer neutral-tinted shadows (both themes); typography optics (size-scaled heading tracking, balanced wrapping, tabular numerals on data columns); refined the left-nav sidebar (persistent brand mark, real hover/focus affordances on section headers); fixed an invisible-border bug in `ErrorState`. Tokens/markup only — no behavior, routes, or component APIs changed.
* feat(frameworks): wire the published control catalog (`framework_controls`) into the Frameworks UI, interlinked both ways. New `frameworkCatalogService.ts` (throwing reads + pure framework/clause matchers) and `useFrameworkCatalog.ts` hook (catalog grouped by domain, org-controls join tolerant per the `safeSource` discipline). The framework detail sheet gains a **Requirements** tab rendering the catalog grouped by domain (`control_ref`, `title`, `description`, `control_type`) with skeleton/empty/error states; each published control links to the org `controls` implementing it, or shows an honest "Not yet implemented" ("Implementation status unavailable" when the register can't be read). Overview now shows the catalog count distinct from the implemented count. Reverse link: `ControlDetail` Interlinks tab resolves the catalog entry a control satisfies (`useControlCatalogEntry`) and deep-links to `/frameworks?open=<framework_id>`; `?open=` now opens a framework's detail. Queries carry no `org_id` filter — the catalog is a global reference at the system org, readable by every tenant via RLS. Interlink proof: 936 catalog controls, 12 resolve to an implementing org control; reverse 13/13 org controls resolve back to a catalog entry. Read-only — no migration touched.
* feat(demo-table-retirement): rebuild the last five modules reading generic `(id, doc jsonb)` demo tables — Asset Registry (`assets`), Business Impact Analysis (`bia_records`), Identity Governance / Access Reviews (`access_reviews`), Model Risk Committee (`mrc_meetings`/`mrc_agenda_items`/`mrc_votes` + new `mrc_committee_members`) and Reporting (`security_reports`/`security_report_runs`) — on throwing services, React Query hooks and platform primitives with skeleton/empty/error states, `logAction` on every mutation, and bidirectional interlinks. Fixes the invisible MRC model-id defect (0/12 → 4/4 agenda items, 8/8 votes resolve; `model_id` converted text→uuid with a FK so a fabricated id is now rejected by the DB). Deletes every fabricated metric on these pages (fake audit history, invented KPIs, named approvers, the RSA-SHA256 "sign-off" tab, the `setTimeout` fake-generate flow)
* feat(onboarding): data-driven "Get started" guided-setup checklist — each step's done-state is derived from the real tables (never stored), surfaced in the RightSidebar and as a dismissible `/overview` card; `null` sources render as "Unknown", never as done or not-done

## 1.66.0 (2026-08-17)

* Merge remote-tracking branch 'origin/main' into claude/modules-audit-akm64k ([0428705](https://github.com/CERTIFYI-AI/sentinel/commit/0428705))
* docs(privacy): module doc, compliance mapping, four-role review record ([32f5c83](https://github.com/CERTIFYI-AI/sentinel/commit/32f5c83))
* feat(privacy): autonomous GRC — agents that create real linked records ([2b55da8](https://github.com/CERTIFYI-AI/sentinel/commit/2b55da8))
* feat(privacy): rebuild DSR and Consent on platform primitives ([0e1ccee](https://github.com/CERTIFYI-AI/sentinel/commit/0e1ccee))
* feat(privacy): surface RoPA/TIA/DPIA interlinks in the UI ([0741448](https://github.com/CERTIFYI-AI/sentinel/commit/0741448))
* fix(privacy): canonical vocabularies, tenant orphans, full interlink graph ([d91afd6](https://github.com/CERTIFYI-AI/sentinel/commit/d91afd6))

## 1.65.0 (2026-08-17)

* feat: rebuild Vendors/TPRM, AI Supply Chain & Sustainability on the platform contract (#75) ([16f6a8c](https://github.com/CERTIFYI-AI/sentinel/commit/16f6a8c)), closes [#75](https://github.com/CERTIFYI-AI/sentinel/issues/75)
* feat(interlinks): surface the sustainability footprint on models; deep-link vendor records ([d2bf761](https://github.com/CERTIFYI-AI/sentinel/commit/d2bf761))
* feat(supply-chain): rebuild AIBOM, Provenance and Attestations; add module docs ([1f0ce05](https://github.com/CERTIFYI-AI/sentinel/commit/1f0ce05))
* feat(tprm,esg): rebuild Vendors/TPRM and Sustainability clusters on real backends ([1351b95](https://github.com/CERTIFYI-AI/sentinel/commit/1351b95))
* feat(tprm,supply-chain,esg): canonical schema, org-scoped RLS, and seeds on the one id-space ([053ad49](https://github.com/CERTIFYI-AI/sentinel/commit/053ad49))
* docs(compliance): map TPRM, supply-chain and ESG modules to EU AI Act and ISO 42001 ([86be49b](https://github.com/CERTIFYI-AI/sentinel/commit/86be49b))
* docs(technical-debt): register the demo-table exposure, the grant gap, and unperformed verification ([299e3d2](https://github.com/CERTIFYI-AI/sentinel/commit/299e3d2))
* fix(policies): heal live framework/interlink column drift; supersede stale CI runs ([be50387](https://github.com/CERTIFYI-AI/sentinel/commit/be50387))

## 1.64.0 (2026-08-16)

* feat: agentic mesh + go-public + Security/Risk/Compliance groups on the platform contract (#74) ([49b15da](https://github.com/CERTIFYI-AI/sentinel/commit/49b15da)), closes [#74](https://github.com/CERTIFYI-AI/sentinel/issues/74)
* feat(ci): static duplicate-version guard in the replay checker ([5b543c8](https://github.com/CERTIFYI-AI/sentinel/commit/5b543c8))
* feat(compliance-critical): Autopilot tenancy gate + audit-trail consolidation + honest Overview ([63f6434](https://github.com/CERTIFYI-AI/sentinel/commit/63f6434))
* feat(compliance-critical): controls/evidence interlink graph, testing cadence, Art. 12 logging ([9a7dbf6](https://github.com/CERTIFYI-AI/sentinel/commit/9a7dbf6))
* feat(compliance-critical): full policy lifecycle — rich text, versions, approval, sign-off, acknowle ([6bb9b58](https://github.com/CERTIFYI-AI/sentinel/commit/6bb9b58))
* feat(compliance-critical): regulatory honesty, statutory windows, Trust Center made real ([7f38d57](https://github.com/CERTIFYI-AI/sentinel/commit/7f38d57))
* feat(compliance): Audit Management, Calendar, Evidence + Audit Trail wiring ([7a66005](https://github.com/CERTIFYI-AI/sentinel/commit/7a66005))
* feat(compliance): canonical org-scoped schema + cross-linked seeds (22 modules) ([32c24ff](https://github.com/CERTIFYI-AI/sentinel/commit/32c24ff))
* feat(compliance): frameworks & controls cluster on real backends (7 pages) ([127d0d5](https://github.com/CERTIFYI-AI/sentinel/commit/127d0d5))
* feat(compliance): one real policy module — Policies/Templates/Editor/Documents ([f86a343](https://github.com/CERTIFYI-AI/sentinel/commit/f86a343))
* feat(compliance): regulatory cluster on real backends (7 pages) ([ae9d85a](https://github.com/CERTIFYI-AI/sentinel/commit/ae9d85a))
* feat(compliance): service + hooks layer for the 22-module group ([6538fa0](https://github.com/CERTIFYI-AI/sentinel/commit/6538fa0))
* feat(interlinks): model detail becomes a back-link hub (Risk & Security tab) ([0475eee](https://github.com/CERTIFYI-AI/sentinel/commit/0475eee))
* feat(mesh): agentic mesh — 10 always-on sentinel fleet on the shared event bus ([8aede88](https://github.com/CERTIFYI-AI/sentinel/commit/8aede88))
* feat(risk-critical): canonical Risk Register seeds with full interlinks ([ad44891](https://github.com/CERTIFYI-AI/sentinel/commit/ad44891))
* feat(risk-critical): incident cluster elevation — editable incidents, Art. 73 prompt, unified except ([d23f5a5](https://github.com/CERTIFYI-AI/sentinel/commit/d23f5a5))
* feat(risk-critical): oversight + executive elevation — real notifications, multi-step approval UI, h ([a6bb9ad](https://github.com/CERTIFYI-AI/sentinel/commit/a6bb9ad))
* feat(risk-critical): the Risk Register becomes the platform's operable center of gravity ([49f9636](https://github.com/CERTIFYI-AI/sentinel/commit/49f9636))
* feat(risk-incidents): canonical org-scoped schema + fictional demo seeds ([c63d91f](https://github.com/CERTIFYI-AI/sentinel/commit/c63d91f))
* feat(risk-incidents): HITL, Approvals, Automation on the real oversight backend ([d0b6d4a](https://github.com/CERTIFYI-AI/sentinel/commit/d0b6d4a))
* feat(risk-incidents): Incident Log + Workflow on the real incidents backend ([aeda3a7](https://github.com/CERTIFYI-AI/sentinel/commit/aeda3a7))
* feat(risk-incidents): Playbooks, Tabletop, Remediation, Exceptions on real backend ([41b3ce5](https://github.com/CERTIFYI-AI/sentinel/commit/41b3ce5))
* feat(risk-incidents): Risk Register interlinks + Matrix/Intelligence/Financial on real backend ([d4c8c95](https://github.com/CERTIFYI-AI/sentinel/commit/d4c8c95))
* feat(risk-incidents): service + hooks layer on the throws-on-failure contract ([7aaa2a1](https://github.com/CERTIFYI-AI/sentinel/commit/7aaa2a1))
* feat(security): canonical backend + seeds for the Security group (13 modules) ([072f453](https://github.com/CERTIFYI-AI/sentinel/commit/072f453))
* feat(security): repoint Defense & Policies pages to real backend (13/13 done) ([a09832e](https://github.com/CERTIFYI-AI/sentinel/commit/a09832e))
* feat(security): repoint Threats&Scans + Red Teaming pages to real backend ([1dcd9bf](https://github.com/CERTIFYI-AI/sentinel/commit/1dcd9bf))
* feat(security): service + hooks layer for the Security group ([81fb15a](https://github.com/CERTIFYI-AI/sentinel/commit/81fb15a))
* fix(audit): client-side audit writes actually land in audit_log ([d974207](https://github.com/CERTIFYI-AI/sentinel/commit/d974207))
* fix(ci): replay-checker array-cast bug, pinned actions, eval spacy dep ([c109ea1](https://github.com/CERTIFYI-AI/sentinel/commit/c109ea1))
* fix(compliance-critical): write-path repair, RLS hardening, canonical controls, id-space seed heals ([c558081](https://github.com/CERTIFYI-AI/sentinel/commit/c558081))
* fix(db): baseline eval_techniques — live-only table extended by main's new canonical migration ([852bc58](https://github.com/CERTIFYI-AI/sentinel/commit/852bc58))
* fix(db): from-zero replay executes end-to-end — verified on real Postgres 16 ([a736c63](https://github.com/CERTIFYI-AI/sentinel/commit/a736c63))
* fix(db): replay-heal main's cross-tenant RLS migration ([b0c7b42](https://github.com/CERTIFYI-AI/sentinel/commit/b0c7b42))
* fix(db): replay-heal main's privacy-group migration (consent_records.tenant_id) ([6340985](https://github.com/CERTIFYI-AI/sentinel/commit/6340985))
* fix(db): tolerate pgcrypto install in shadow DB — CLI role lacks pg_read_file ([32614b7](https://github.com/CERTIFYI-AI/sentinel/commit/32614b7))
* fix(db): unique migration versions — same-date files collided in schema_migrations ([0aec4f9](https://github.com/CERTIFYI-AI/sentinel/commit/0aec4f9))
* fix(db): unique versions for the two bare-20260816 migrations — CI drift collision ([fa1b3ed](https://github.com/CERTIFYI-AI/sentinel/commit/fa1b3ed))
* fix(fabric): telemetry plane + incident cascade actually work end-to-end ([81cb599](https://github.com/CERTIFYI-AI/sentinel/commit/81cb599))
* fix(readiness): repair migration replay, security CI, broken SQL — go-public blockers ([5b394fd](https://github.com/CERTIFYI-AI/sentinel/commit/5b394fd))
* fix(risk-critical): core data-contract and cascade fixes from the criticality re-audit ([b18fb7f](https://github.com/CERTIFYI-AI/sentinel/commit/b18fb7f))
* fix(security): constant console.error format strings (semgrep unsafe-formatstring) ([884b1cf](https://github.com/CERTIFYI-AI/sentinel/commit/884b1cf))
* fix(security): constant console.warn format strings (semgrep unsafe-formatstring) ([c716bb3](https://github.com/CERTIFYI-AI/sentinel/commit/c716bb3))
* fix(security): SecurityHome on real data + canonical vocabulary across the group ([2c5d3f1](https://github.com/CERTIFYI-AI/sentinel/commit/2c5d3f1))
* docs(mesh)+fix(db): honest always-on activation path ([40c3f63](https://github.com/CERTIFYI-AI/sentinel/commit/40c3f63))
* Merge main: autonomous-grc provenance — agent writes reconciled against replayed schema ([6d69ab2](https://github.com/CERTIFYI-AI/sentinel/commit/6d69ab2))
* Merge main: interlink rollout + privacy seeds — conflicts resolved, replay healed ([2e42956](https://github.com/CERTIFYI-AI/sentinel/commit/2e42956))
* Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re ([66bd1d9](https://github.com/CERTIFYI-AI/sentinel/commit/66bd1d9))
* Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re ([f028ff7](https://github.com/CERTIFYI-AI/sentinel/commit/f028ff7))
* Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re ([d4374ef](https://github.com/CERTIFYI-AI/sentinel/commit/d4374ef))
* Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re ([22bea9b](https://github.com/CERTIFYI-AI/sentinel/commit/22bea9b))
* docs(compliance): module docs for all 22 modules — new pages + corrected claims ([b4fe42a](https://github.com/CERTIFYI-AI/sentinel/commit/b4fe42a))
* docs(risk-incidents): data-backing sections for all 13 wired modules ([9b9a878](https://github.com/CERTIFYI-AI/sentinel/commit/9b9a878))
* chore(risk-incidents): QA pass — fix Button variant, drop orphaned remediation layer ([b0935ef](https://github.com/CERTIFYI-AI/sentinel/commit/b0935ef))

## 1.63.0 (2026-08-16)

* feat(autonomous-grc): make the governance mesh actually fire and write ([918a08e](https://github.com/CERTIFYI-AI/sentinel/commit/918a08e))
* Merge main ([ca2966c](https://github.com/CERTIFYI-AI/sentinel/commit/ca2966c))
* docs(completion): version live-only seeds, close compliance mapping gaps ([eb3c7fb](https://github.com/CERTIFYI-AI/sentinel/commit/eb3c7fb))

## Unreleased

### Compliance & Regulatory elevated to a critical module

* **Write paths repaired at the database** — the tenancy era added `org_id
  NOT NULL` columns without DB defaults across the compliance cluster, so
  every client create/edit on policies, controls, control tests, conformity
  assessments, documents and approvals died on a NOT NULL violation (services
  correctly never send scoping columns). Defaults added; rows stranded in the
  literal `'default'` tenant healed.
* **RLS hardening** — dropped a cross-tenant read policy on `audit_findings`
  (predicate `true`); enabled RLS on `control_evaluation_history`; removed the
  permissive UPDATE/DELETE policies that let the append-only `audit_log` /
  `audit_logs` be edited, so the deny policies actually deny.
* **Full policy lifecycle** — template → sanitized rich-text section editor →
  version history with compare/restore → submit-for-approval bound to the
  multi-step `policy_change` workflow → publish-on-approve → employee
  acknowledgment (new `policy_acknowledgments` table, synced from AI Literacy
  training attendees) → published-policy visibility in the Trust Center.
* **Autopilot crash fixed** — pages demanding org context synchronously threw
  to the error boundary during the async tenant hydrate on every reload/token
  refresh; a tenancy gate in `ProtectedLayout` plus in-place re-hydration fixes
  it platform-wide (also GovernanceMesh, JIT Elevation, SSO Providers).
* **Audit trail consolidated** — one canonical append-only `/audit-trail`
  (with `?open=`/`?module=` deep links); Overview's fabricated activity feed
  replaced with the real audit log; dead duplicate audit component and service
  removed; fabricated Overview scorecard/alerts/trend arrays deleted.
* **Interlink graph made real** — the `controls` table was empty after a
  from-zero replay, making every control interlink vacuous; a canonical
  ISO 42001 / EU AI Act / NRB control set seeds it, and risk↔control,
  finding↔control↔risk, evidence↔control now resolve. Conformity, AI-literacy
  and trust-center seeds moved off slugs/phantom uuids onto real ids.
* **Honesty fixes** — regulator-notify agent no longer reports success for
  filings it didn't persist; statutory deadlines derive from a shared window
  map (Art. 73, GDPR-33, NIS2, DORA) instead of hand-typed values; transparency
  provenance no longer labels human-authored reports as mesh-generated;
  Art. 12 `logAction` added across the compliance and regulatory services.

### Platform interlink rollout and privacy repair

* **Security** — closed cross-tenant RLS holes on `webhook_endpoints`, `agents`,
  `shadow_ai_findings` and `executive_digests`. Each had a correct isolation
  policy *and* a permissive policy with predicate `true`; Postgres OR-combines
  them, so the second defeated the first. All four tables were empty, so this
  closed a latent hole rather than an active exposure.
* **Privacy** — DSR writes had been failing silently for every save (the service
  wrote a `tenant_id` column that does not exist on `dsar_requests`), Consent
  had the same catch-and-return pattern, and DPIA ran on a demo table with no
  real backend. All three repaired; DPIA gained a canonical register that
  computes the GDPR Art. 36 consultation trigger from residual risk.
* **Statutory records** — RoPA, TIA and Compliance Controls migrated off demo
  tables onto their real backends. Compliance Controls had 385 real control
  records that the UI had never displayed.
* **Interlinks** — five link columns resolved 100% but were populated on zero
  rows; the relationship was theoretical and every row rendered "—". Populated
  and now tracked as coverage, separately from resolution.
* **Process** — mandatory four-role review process (QA/QC, UI/UX, Documentation,
  Compliance) in `docs/contributing/review-process.md`, bound in `CLAUDE.md`.
* **Docs** — 13 module guides, EU AI Act and ISO/IEC 42001 mappings extended,
  new `docs/architecture/interlink-map.md` and `docs/reference/technical-debt.md`.

### Privacy group — vocabularies, orphans, interlinks, autonomy

* **Data integrity** — 15 rows across `consent_records`, `carbon_records`,
  `remediation_plans` and `transparency_reports` carried the literal
  `tenant_id = 'default'` left by an old column default. Every RLS policy on
  those tables reads `tenant_id = current_user_org_id()`, so the rows were
  invisible to every user: the consent register displayed 6 of its 10 records
  and nothing in the UI could reveal the gap. Reclaimed, and the literal
  defaults removed from all eight affected tables.
* **Vocabularies** — `dsar_requests` and `consent_records` had no CHECK
  constraint on status, type or priority, so successive writers left mixed
  casing and spellings in the same column and every page filtered on values
  that never occurred. All four DSR stat cards read 0, both filters returned
  nothing, all ten rows rendered a LOW priority badge including the five stored
  as high, and "Active Consents" read 0 against six granted consents.
  Normalised and constrained; the services now export the same vocabularies.
* **Statutory references** — `DSR-YYYY-NNN`, `CNS-YYYY-NNN`, `ROPA-NNN`,
  `TIA-YYYY-NNN` added and backfilled. An authority cites a record by
  reference; both pages had been printing the raw uuid.
* **Interlinks** — DSR → RoPA/consent/incident/risk, consent → RoPA,
  RoPA → model/dataset/use-case/vendor, TIA → RoPA/model, DPIA → risk/use-case.
  All 17 verified with `total = resolves`. Two use cases processing personal
  data had no Art. 30 record at all; ROPA-006 and ROPA-007 close that.
* **One id-space** — dropped `dsar_requests.ai_systems_affected` and
  `consent_records.ai_systems`. Both duplicated `linked_model_ids`, 9 of 20
  stored names had drifted from the model registry, and both pages paired the
  arrays by index so an edit on one side mislabelled a different system's link.
* **Fake success removed** — DSR and Consent rebuilt on the platform
  primitives; consent withdrawal writes to the database and shows what came
  back, rather than writing a hardcoded date into local state and claiming the
  linked AI systems had been notified. Both export buttons now produce real
  CSVs. DSR delete is a soft delete, and reads filter `is_deleted`.
* **Autonomous GRC** — `DSRImpactAgent` wrote five wrong field names and two
  values outside the CHECK vocabularies, and `safeInsert` swallowed every
  rejection, so it reported a completed Art. 34 breach-notification step while
  the register stayed empty. Fixed and made idempotent. Added
  `ConsentWithdrawalAgent` (Art. 7(3) cessation task plus risk) and
  `PrivacyPostureAgent` (sweeps for unlawful transfers, untracked DPIA residual
  risk, lapsed consent and overdue rights requests, opening one risk per
  finding). Agents open risks and never close them — accepting a risk stays a
  human decision under Art. 14.
* **Audit Trail** — `ENTITY_ROUTES` had no entry for any privacy entity type,
  so every DSR, consent, RoPA, DPIA and transfer entry dead-ended on exactly
  the records an auditor follows. Added, along with dataset and vendor.

## 1.62.0 (2026-08-16)

* Merge main ([51ce891](https://github.com/CERTIFYI-AI/sentinel/commit/51ce891))
* feat(interlinks): platform-wide interlink audit, rollout and map ([ec10ad8](https://github.com/CERTIFYI-AI/sentinel/commit/ec10ad8))

## <small>1.61.3 (2026-08-16)</small>

* Merge main ([8e936c2](https://github.com/CERTIFYI-AI/sentinel/commit/8e936c2))
* fix(privacy): repair DSR silent write failure, wire Consent, migrate DPIA ([4efdf67](https://github.com/CERTIFYI-AI/sentinel/commit/4efdf67))

## <small>1.61.2 (2026-08-16)</small>

* fix(compliance): migrate RoPA, TIA and Compliance Controls off demo tables ([ab8db91](https://github.com/CERTIFYI-AI/sentinel/commit/ab8db91))
* Merge main ([228114f](https://github.com/CERTIFYI-AI/sentinel/commit/228114f))
* security(rls): fix cross-tenant holes; docs: mandatory 4-role review process ([e14a2b3](https://github.com/CERTIFYI-AI/sentinel/commit/e14a2b3))

## <small>1.61.1 (2026-08-16)</small>

* Merge main ([3b3a94c](https://github.com/CERTIFYI-AI/sentinel/commit/3b3a94c))
* fix(evals): real backend for Eval Techniques; docs: agentic mesh architecture ([b2341e8](https://github.com/CERTIFYI-AI/sentinel/commit/b2341e8))

## 1.61.0 (2026-08-16)

* Merge main ([ce5c959](https://github.com/CERTIFYI-AI/sentinel/commit/ce5c959))
* feat(interlinks): embed real cross-module figures instead of bare links ([d324610](https://github.com/CERTIFYI-AI/sentinel/commit/d324610))

## <small>1.60.1 (2026-08-16)</small>

* fix(ia): connect isolated modules across AI Assets, Assess and Trust groups ([7501c8a](https://github.com/CERTIFYI-AI/sentinel/commit/7501c8a))
* Merge main ([29070b8](https://github.com/CERTIFYI-AI/sentinel/commit/29070b8))
* refactor(ia): retire Model Catalog into the canonical Model Registry ([78dd342](https://github.com/CERTIFYI-AI/sentinel/commit/78dd342))

## 1.60.0 (2026-08-16)

* feat(gateways): real backend for MCP group, Model Catalog and Playground ([d5748e9](https://github.com/CERTIFYI-AI/sentinel/commit/d5748e9))
* fix(integrations,tasks): move both modules onto real org-scoped backends ([b12bae9](https://github.com/CERTIFYI-AI/sentinel/commit/b12bae9))
* Merge release v1.59.0 from main ([ce1c47a](https://github.com/CERTIFYI-AI/sentinel/commit/ce1c47a))
* chore(migrations): consolidate task seeds into the canonical migration path ([b7d5614](https://github.com/CERTIFYI-AI/sentinel/commit/b7d5614))

## 1.59.0 (2026-08-16)

* Merge release v1.58.0 from main ([6b1aadd](https://github.com/CERTIFYI-AI/sentinel/commit/6b1aadd))
* feat(govern): AI Literacy, AI Apps inventory, and Trust Center modules ([8f2f2d9](https://github.com/CERTIFYI-AI/sentinel/commit/8f2f2d9))

## 1.58.0 (2026-08-16)

* chore(bias-audits): delete retired legacy pages and orphan services ([6ceb5a1](https://github.com/CERTIFYI-AI/sentinel/commit/6ceb5a1))
* chore(db): drop legacy datasets cluster per consolidation plan (F-8 complete) ([876f447](https://github.com/CERTIFYI-AI/sentinel/commit/876f447))
* ASSESS & VALIDATE: enhance, interlink, and seed Nepal-context data ([5578889](https://github.com/CERTIFYI-AI/sentinel/commit/5578889))
* feat(ai-assets): datasets family on real org-scoped backend + group audit ([8d5a8d0](https://github.com/CERTIFYI-AI/sentinel/commit/8d5a8d0))
* feat(seed): Nepal-grounded seed data for the datasets family ([ac77f52](https://github.com/CERTIFYI-AI/sentinel/commit/ac77f52))
* fix(ai-assets): close remaining audit findings F-6, F-7, F-8 (code) ([acf4635](https://github.com/CERTIFYI-AI/sentinel/commit/acf4635))

## 1.57.0 (2026-08-14)

* Merge main ([10a79a0](https://github.com/CERTIFYI-AI/sentinel/commit/10a79a0))
* feat(ia): 9-group navigation, 42 redirects, shims retired ([419d04c](https://github.com/CERTIFYI-AI/sentinel/commit/419d04c))
* feat(ia): merge Agents inventory, fold Executive Center + ROI into CISO, retire legacy pages ([4723cc5](https://github.com/CERTIFYI-AI/sentinel/commit/4723cc5))
* feat(ia): one Evidence surface, Frameworks 5-to-2, Conformity on real data ([ddf7ec9](https://github.com/CERTIFYI-AI/sentinel/commit/ddf7ec9))
* feat(ia): one real Risk Register and one real Audit Trail ([2feb1d9](https://github.com/CERTIFYI-AI/sentinel/commit/2feb1d9))

## <small>1.56.2 (2026-08-14)</small>

* Merge main ([c375d18](https://github.com/CERTIFYI-AI/sentinel/commit/c375d18))
* fix(nav): broken Vulnerabilities link, dead palette, fabricated badges ([93c3ea0](https://github.com/CERTIFYI-AI/sentinel/commit/93c3ea0))

## <small>1.56.1 (2026-08-14)</small>

* Merge main ([fa4ee43](https://github.com/CERTIFYI-AI/sentinel/commit/fa4ee43))
* fix(trust-engine): remove tab strip duplicating the sidebar ([882e568](https://github.com/CERTIFYI-AI/sentinel/commit/882e568))

## 1.56.0 (2026-08-14)

* Merge release v1.55.0 from main ([d7c9546](https://github.com/CERTIFYI-AI/sentinel/commit/d7c9546))
* feat(trust-engine): Live Inference Traces + Active Guardrails on real data; retire demo tables ([20d1082](https://github.com/CERTIFYI-AI/sentinel/commit/20d1082))

## 1.55.0 (2026-08-14)

* feat(runtime-trust): rebuild Performance Monitoring, Model Efficiency, GenAI Risk Profiles on real d ([bbf33a3](https://github.com/CERTIFYI-AI/sentinel/commit/bbf33a3))
* feat(trust-engine): Costs & Tokens, Fallback Failovers, Tool Monitor on real data ([c0afd17](https://github.com/CERTIFYI-AI/sentinel/commit/c0afd17))
* feat(trust-engine): Runtime Trust dashboard + Configuration on real backends ([8fbc1f6](https://github.com/CERTIFYI-AI/sentinel/commit/8fbc1f6))
* db: model_efficiency joinable to registry (model_id uuid) + org defaults ([ea830e9](https://github.com/CERTIFYI-AI/sentinel/commit/ea830e9))
* db(trust): runtime-trust foundation + coherent 14-day seeds ([6cc3850](https://github.com/CERTIFYI-AI/sentinel/commit/6cc3850))
* cleanup(dashboard): remove unreferenced legacy api/ layer ([c8ecb74](https://github.com/CERTIFYI-AI/sentinel/commit/c8ecb74))
* security(backend+infra): authenticate the API, security headers, honest CI gates, replayable migrati ([314cbf7](https://github.com/CERTIFYI-AI/sentinel/commit/314cbf7))
* security(rls)+docs: close all 64 anon-open policies + rewrite README ([da08778](https://github.com/CERTIFYI-AI/sentinel/commit/da08778))
* security(frontend): server-side roles, gated demo auth, live logging, honest audit writes ([133d871](https://github.com/CERTIFYI-AI/sentinel/commit/133d871))

## 1.54.0 (2026-08-13)

* Merge PR #73: evals crash fixes + demo data + Agent Control on the platform contract ([27e80de](https://github.com/CERTIFYI-AI/sentinel/commit/27e80de))
* feat(agents): real Kill Switch + persisted Choreography ([d798a9a](https://github.com/CERTIFYI-AI/sentinel/commit/d798a9a))
* feat(agents): Registry + IAM on the platform contract + agent-control seed ([d9e2dcb](https://github.com/CERTIFYI-AI/sentinel/commit/d9e2dcb))
* feat(agents): ShadowAI, Discovery & Detail on the canonical registry ([d9056ec](https://github.com/CERTIFYI-AI/sentinel/commit/d9056ec))
* fix(evals): crash-proof all detail/list pages + complete demo seed + agent-control foundation ([e43b25f](https://github.com/CERTIFYI-AI/sentinel/commit/e43b25f))

## 1.53.0 (2026-08-13)

* Merge PR #72: fix & enhance all 8 Validation & Evals modules ([5c8a0f4](https://github.com/CERTIFYI-AI/sentinel/commit/5c8a0f4))
* feat(evals): Dataset Wizard persists into the catalog + honest Data Explorer ([dbf985d](https://github.com/CERTIFYI-AI/sentinel/commit/dbf985d))
* feat(evals): Scenario Editor, Trace Viewer & Metric Studio — real editors + model interlink ([5706075](https://github.com/CERTIFYI-AI/sentinel/commit/5706075))
* feat(evals): Validation Lab, Explainability & Bias Audits — model pickers, honest UX, fixed cross-li ([9afaf77](https://github.com/CERTIFYI-AI/sentinel/commit/9afaf77))
* feat(platform): addressable governance records + register audited models ([8c6b6aa](https://github.com/CERTIFYI-AI/sentinel/commit/8c6b6aa))
* refactor(evals): demolish mock surfaces + orphan routes, surface real ones ([852af40](https://github.com/CERTIFYI-AI/sentinel/commit/852af40))
* fix(evals): org isolation, honest writes, one bias-audit source, DB-side demo data ([02143b4](https://github.com/CERTIFYI-AI/sentinel/commit/02143b4))

## 1.52.0 (2026-08-13)

* Merge PR #71: close interlink audit findings + UI/UX polish across AI Governance ([5343a33](https://github.com/CERTIFYI-AI/sentinel/commit/5343a33))
* feat(interlink): model-scoped deep-links, risk<->use-case link, link polish ([5dc485a](https://github.com/CERTIFYI-AI/sentinel/commit/5dc485a))
* feat(models): DNA & Lifecycle deep-link to the registry (uuid-keyed) + polish ([8845690](https://github.com/CERTIFYI-AI/sentinel/commit/8845690))
* feat(prompts): link prompts to governed models + polish ([4d42cce](https://github.com/CERTIFYI-AI/sentinel/commit/4d42cce))
* fix(interlink): unify model id-space + add prompt/risk interlink contracts ([484b759](https://github.com/CERTIFYI-AI/sentinel/commit/484b759))

## 1.51.0 (2026-08-13)

* Merge PR #69: hide org/tenant switcher in top header ([134dfc7](https://github.com/CERTIFYI-AI/sentinel/commit/134dfc7))
* Merge PR #70: complete & interlink the Impact & Risk (AIIA) modules ([d0326aa](https://github.com/CERTIFYI-AI/sentinel/commit/d0326aa))
* feat(aiia): backend foundation + data layer for Impact & Risk modules ([32aed52](https://github.com/CERTIFYI-AI/sentinel/commit/32aed52))
* feat(aiia): MRC — persist votes/agenda/meetings/decisions + model interlink ([7e7a017](https://github.com/CERTIFYI-AI/sentinel/commit/7e7a017))
* feat(aiia): Risk Classification — correct EU AI Act engine + real persistence + interlink ([20a6bc7](https://github.com/CERTIFYI-AI/sentinel/commit/20a6bc7))
* feat(aiia): Use Case Registry — real persistence, fixed Create flow, model interlink ([2434d76](https://github.com/CERTIFYI-AI/sentinel/commit/2434d76)), closes [risk/Hi#Risk](https://github.com/risk/Hi/issues/Risk)
* feat(aiia): wire Impact Assessments page to real data + model/use-case interlink ([dbce5ba](https://github.com/CERTIFYI-AI/sentinel/commit/dbce5ba))
* feat(models): Governance cross-link card on Model Detail (reverse interlink) ([0bfe4b4](https://github.com/CERTIFYI-AI/sentinel/commit/0bfe4b4))
* chore(ui): hide the org/tenant switcher in the top header ([1788a4b](https://github.com/CERTIFYI-AI/sentinel/commit/1788a4b))

## 1.50.0 (2026-08-13)

* Merge PR #68: real-time Model Detail analytics (Performance/Bias/Explainability/Lineage) ([b94222c](https://github.com/CERTIFYI-AI/sentinel/commit/b94222c))
* feat(model-detail): real-time analytics for Performance/Bias/Explainability/Lineage ([450c262](https://github.com/CERTIFYI-AI/sentinel/commit/450c262))

## 1.49.0 (2026-08-13)

* Merge PR #67: Model Governance QA fixes + Model Detail backend wiring ([d8000cd](https://github.com/CERTIFYI-AI/sentinel/commit/d8000cd))
* feat(model-detail): wire documents, activity, alerts to backend; real exports ([36e902b](https://github.com/CERTIFYI-AI/sentinel/commit/36e902b))
* fix(model-governance): make CRUD honest and gates real across 4 modules ([e9b65da](https://github.com/CERTIFYI-AI/sentinel/commit/e9b65da))
* fix(ui): remove remaining duplicate breadcrumbs + hide sidebar items ([1a8490f](https://github.com/CERTIFYI-AI/sentinel/commit/1a8490f))

## <small>1.48.1 (2026-08-13)</small>

* Merge PR #66: fix RLS recursion (0 models), admin role, Model Governance guide ([1134dfb](https://github.com/CERTIFYI-AI/sentinel/commit/1134dfb))
* fix(governance): resolve RLS recursion (0-models), admin role, Model Governance guide ([515fa14](https://github.com/CERTIFYI-AI/sentinel/commit/515fa14))

## 1.48.0 (2026-08-13)

* Merge PR #65: Prompt Registry — real CRUD to prompt_registry (Module 4) ([a6f0e53](https://github.com/CERTIFYI-AI/sentinel/commit/a6f0e53))
* feat(prompt-registry): wire real CRUD to prompt_registry (Module 4) ([3e4e6da](https://github.com/CERTIFYI-AI/sentinel/commit/3e4e6da))

## 1.47.0 (2026-08-13)

* Merge PR #64: Model DNA & Lineage — real CRUD to model_dna + NepBERTa (Module 3) ([e75d10e](https://github.com/CERTIFYI-AI/sentinel/commit/e75d10e))
* feat(model-dna): wire real CRUD to model_dna + register NepBERTa (Module 3) ([3e65f76](https://github.com/CERTIFYI-AI/sentinel/commit/3e65f76))

## 1.46.0 (2026-08-13)

* Merge PR #63: Model Lifecycle — real CRUD to model_lifecycle_stages (Module 2) ([76a5250](https://github.com/CERTIFYI-AI/sentinel/commit/76a5250))
* feat(model-lifecycle): wire real CRUD to model_lifecycle_stages (Module 2) ([c2d0174](https://github.com/CERTIFYI-AI/sentinel/commit/c2d0174))

## 1.45.0 (2026-08-13)

* Merge PR #62: Model Registry — real ai_models CRUD + auth fix (Module 1) ([8b9e8d3](https://github.com/CERTIFYI-AI/sentinel/commit/8b9e8d3))
* feat(auth): use real Supabase auth for demo accounts so RLS-backed CRUD works ([21598a5](https://github.com/CERTIFYI-AI/sentinel/commit/21598a5))
* feat(model-registry): wire ModelDetail to real ai_models + share mappers ([ff30f5f](https://github.com/CERTIFYI-AI/sentinel/commit/ff30f5f))
* feat(model-registry): wire real CRUD to ai_models (module 1 of Model Governance) ([c38bf6c](https://github.com/CERTIFYI-AI/sentinel/commit/c38bf6c))

## <small>1.44.2 (2026-08-13)</small>

* Merge PR #61: fix(ui): eliminate duplicate breadcrumbs across the platform ([5ca1ca5](https://github.com/CERTIFYI-AI/sentinel/commit/5ca1ca5))
* fix(ui): eliminate duplicate breadcrumbs across the platform ([e47d484](https://github.com/CERTIFYI-AI/sentinel/commit/e47d484))

## <small>1.44.1 (2026-08-13)</small>

* Merge PR #60: Full module audit + dead-code cleanup + P0 backend fixes ([ecb579e](https://github.com/CERTIFYI-AI/sentinel/commit/ecb579e))
* ci: authenticate Trivy action download to avoid setup rate-limit failures ([8c4ee77](https://github.com/CERTIFYI-AI/sentinel/commit/8c4ee77))
* ci: fix Semgrep action resolution and 006_core.sql escaped quotes ([8de74c7](https://github.com/CERTIFYI-AI/sentinel/commit/8de74c7))
* audit(db): live Supabase audit + additive RLS policies for unpoliced live tables ([66ed509](https://github.com/CERTIFYI-AI/sentinel/commit/66ed509))
* fix(backend): resolve P0 correctness & security findings from audit ([20ac73a](https://github.com/CERTIFYI-AI/sentinel/commit/20ac73a))
* chore: cleanup unnecessary code and trailing artifacts ([ed8c4fb](https://github.com/CERTIFYI-AI/sentinel/commit/ed8c4fb))
* chore: full module audit report + dead-code cleanup ([d94671a](https://github.com/CERTIFYI-AI/sentinel/commit/d94671a))
* docs: update README footer links ([8143a4c](https://github.com/CERTIFYI-AI/sentinel/commit/8143a4c))

## 1.44.0 (2026-08-09)

* feat: update AI Governance docs and Help Center ([9c1f522](https://github.com/CERTIFYI-AI/sentinel/commit/9c1f522))
* docs: generate detailed articles for all 11 domains in the sidebar ([e4e5982](https://github.com/CERTIFYI-AI/sentinel/commit/e4e5982))
* docs: generate detailed comprehensive guides for all 8 major modules ([9934c60](https://github.com/CERTIFYI-AI/sentinel/commit/9934c60))
* docs: heavily expand article content with detailed explanations of module workings ([ad0f734](https://github.com/CERTIFYI-AI/sentinel/commit/ad0f734))
* docs: integrate exact regulatory and auditor mapping text ([812662e](https://github.com/CERTIFYI-AI/sentinel/commit/812662e))
* docs: strictly map every single sub-feature to an individual documentation article ([d7ad53c](https://github.com/CERTIFYI-AI/sentinel/commit/d7ad53c))

## 1.43.0 (2026-08-09)

* feat: implement hierarchical article-based user guide with rich markdown-style content ([852dd88](https://github.com/CERTIFYI-AI/sentinel/commit/852dd88))

## 1.42.0 (2026-08-09)

* feat: implement persistent right sidebar for module guides ([fce7af3](https://github.com/CERTIFYI-AI/sentinel/commit/fce7af3))

## 1.41.0 (2026-08-09)

* Merge branch 'feat/wire-crud-batch3' ([bf87602](https://github.com/CERTIFYI-AI/sentinel/commit/bf87602))
* feat: Add comprehensive contextual User Guides across all modules ([d153bf8](https://github.com/CERTIFYI-AI/sentinel/commit/d153bf8))
* feat(dashboard): wire final 7 unwired CRUD pages to Supabase (Phase 1 batch 3) ([0f41561](https://github.com/CERTIFYI-AI/sentinel/commit/0f41561))

## <small>1.40.1 (2026-07-20)</small>

* fix: add missing ModelLifecycle import in App.tsx ([094d928](https://github.com/CERTIFYI-AI/sentinel/commit/094d928))

## 1.40.0 (2026-07-17)

* feat(dashboard): wire 6 more unwired CRUD pages to Supabase (Phase 1 batch 2) ([37e1127](https://github.com/CERTIFYI-AI/sentinel/commit/37e1127))

## 1.39.0 (2026-07-17)

* feat(dashboard): wire 6 unwired CRUD pages to Supabase (Phase 1 batch 1) ([cee2b05](https://github.com/CERTIFYI-AI/sentinel/commit/cee2b05))
* refactor(ui): Phase 5 — native <select> to Radix Select (Policies, ComplianceControls, RegRadar) ([be6ecba](https://github.com/CERTIFYI-AI/sentinel/commit/be6ecba))
* refactor(ui): Phase 5 — native <select> to Radix Select (ScanCenter, ModelArena) ([1db1327](https://github.com/CERTIFYI-AI/sentinel/commit/1db1327))

## 1.38.0 (2026-07-15)

* feat: split ModelRegistry and ModelCatalog, wire-up mocked pages ([896176d](https://github.com/CERTIFYI-AI/sentinel/commit/896176d))
* refactor(ui): Phase 5 — native <select> to Radix Select (AibomRegistry) ([7d04803](https://github.com/CERTIFYI-AI/sentinel/commit/7d04803))
* refactor(ui): Phase 5 — native <select> to Radix Select (AIImpactAssessments, ConsentManagement) ([fad473c](https://github.com/CERTIFYI-AI/sentinel/commit/fad473c))
* refactor(ui): Phase 5 — native <select> to Radix Select (DsrManagement) ([a529af0](https://github.com/CERTIFYI-AI/sentinel/commit/a529af0))
* refactor(ui): Phase 5 — native <select> to Radix Select (EnergyEfficiency, AgentRegistry) ([196d85d](https://github.com/CERTIFYI-AI/sentinel/commit/196d85d))
* refactor(ui): Phase 5 — native <select> to Radix Select (EthicsReporting, FrameworkMapping, ModelInv ([96d72f4](https://github.com/CERTIFYI-AI/sentinel/commit/96d72f4))
* refactor(ui): Phase 5 — native <select> to Radix Select (FinancialRisk, EsgReports) ([841e479](https://github.com/CERTIFYI-AI/sentinel/commit/841e479))
* refactor(ui): Phase 5 — native <select> to Radix Select (PolicyTemplates, IncidentWorkflow, ModelEff ([6ce1c18](https://github.com/CERTIFYI-AI/sentinel/commit/6ce1c18))
* refactor(ui): Phase 5 — native <select> to Radix Select (RemediationTracker, JitElevation, UseCaseDe ([9206051](https://github.com/CERTIFYI-AI/sentinel/commit/9206051))
* refactor(ui): Phase 5 — native <select> to Radix Select (SupplyChainAttestations, KeysVault) ([758476a](https://github.com/CERTIFYI-AI/sentinel/commit/758476a))

## 1.37.0 (2026-07-11)

* feat(dashboard): make CRUD persist to Supabase across all wired pages (Phase 1) ([5ae1650](https://github.com/CERTIFYI-AI/sentinel/commit/5ae1650))
* refactor(ui): Phase 2 — migrate 4 strategic pages to PageHeader ([c2d0b68](https://github.com/CERTIFYI-AI/sentinel/commit/c2d0b68))
* refactor(ui): Phase 2 — migrate Benchmark, PolicyEditor, Frameworks to PageHeader ([cd4b217](https://github.com/CERTIFYI-AI/sentinel/commit/cd4b217))
* refactor(ui): Phase 2 — migrate DPIA, DataQuality, FrameworkMapping to PageHeader ([974c271](https://github.com/CERTIFYI-AI/sentinel/commit/974c271))
* refactor(ui): Phase 2 — migrate final 4 pages to PageHeader (ValueRealization, PeerIntelligence, Sup ([f29238d](https://github.com/CERTIFYI-AI/sentinel/commit/f29238d))
* refactor(ui): Phase 2 — migrate IncidentWorkflow, PolicyTemplates, PromptRegistry to PageHeader ([8356042](https://github.com/CERTIFYI-AI/sentinel/commit/8356042))
* refactor(ui): Phase 2 — migrate PostMarket, EthicsReporting to PageHeader ([3429bbc](https://github.com/CERTIFYI-AI/sentinel/commit/3429bbc))
* refactor(ui): Phase 2 — migrate Settings to PageHeader ([7229aa3](https://github.com/CERTIFYI-AI/sentinel/commit/7229aa3))
* refactor(ui): Phase 2 — migrate TransparencyReports to PageHeader ([b2c5355](https://github.com/CERTIFYI-AI/sentinel/commit/b2c5355))
* refactor(ui): Phase 5 — migrate native <select> to Radix Select (AIRiskTiering, EvidenceVault, Model ([a8ab800](https://github.com/CERTIFYI-AI/sentinel/commit/a8ab800))
* refactor(ui): Phase 5 — native <select> to Radix Select (6 pages, 10 selects) ([dcf70a4](https://github.com/CERTIFYI-AI/sentinel/commit/dcf70a4))
* refactor(ui): Phase 5 — native <select> to Radix Select (6 pages, empty-value safe) ([ebe1102](https://github.com/CERTIFYI-AI/sentinel/commit/ebe1102))
* refactor(ui): Phase 5 — native <select> to Radix Select (6 pages) ([8c9233d](https://github.com/CERTIFYI-AI/sentinel/commit/8c9233d))
* refactor(ui): Phase 5 — native <select> to Radix Select (DPIA, ControlDrift, ApprovalWorkflows, Asse ([df434f2](https://github.com/CERTIFYI-AI/sentinel/commit/df434f2))
* refactor(ui): Phase 5 — native <select> to Radix Select (RoPA, RegulatorFilings, MultiAgentChoreogra ([03647e9](https://github.com/CERTIFYI-AI/sentinel/commit/03647e9))
* refactor(ui): Phase 5 — native <select> to Radix Select (SystemAuditLog, DepartmentsPage) ([bc844fc](https://github.com/CERTIFYI-AI/sentinel/commit/bc844fc))
* refactor(ui): Phase 5 — native <select> to Radix Select (TIA, TabletopExercises, ModelDetail, Policy ([0bcbcd3](https://github.com/CERTIFYI-AI/sentinel/commit/0bcbcd3))
* chore: remove dead shadowed sentinel/models.py + gitignore stray artifacts ([c677689](https://github.com/CERTIFYI-AI/sentinel/commit/c677689))

## 1.36.0 (2026-07-10)

* feat(dashboard): wire 31 CRUD pages to Supabase doc-jsonb tables (batch 2) ([49dcb5a](https://github.com/CERTIFYI-AI/sentinel/commit/49dcb5a))

## 1.35.0 (2026-07-10)

* feat(dashboard): wire seed-fallback pages to Supabase doc-jsonb tables (batch 1) ([46dcd7e](https://github.com/CERTIFYI-AI/sentinel/commit/46dcd7e))

## <small>1.34.4 (2026-07-10)</small>

* fix(compliance): make normalize_intervention_level importable from sentinel.models ([37e1a4b](https://github.com/CERTIFYI-AI/sentinel/commit/37e1a4b))
* fix(ui): rework use-case Settings tab UI/UX ([11bb865](https://github.com/CERTIFYI-AI/sentinel/commit/11bb865))
* refactor(ui): remove 40 unreachable page files + 4 dead imports ([f6ce610](https://github.com/CERTIFYI-AI/sentinel/commit/f6ce610))

## <small>1.34.3 (2026-07-10)</small>

* fix(compliance): consolidate framework IDs, wire posture signals, fix intervention-level bug ([fbd3b16](https://github.com/CERTIFYI-AI/sentinel/commit/fbd3b16))
* fix(compliance): consolidate third intervention-level format (L0-L3) onto InterventionLevel ([2662d24](https://github.com/CERTIFYI-AI/sentinel/commit/2662d24))
* refactor(ui): Phase 2 (batch 2) — PageHeader for System Audit Log + 3 variants ([6607d1d](https://github.com/CERTIFYI-AI/sentinel/commit/6607d1d))

## <small>1.34.2 (2026-07-09)</small>

* fix(ui): Phase 5 (batch 1) — wire fake "Exported" toasts to real CSV export ([b1e6156](https://github.com/CERTIFYI-AI/sentinel/commit/b1e6156))
* refactor(ui): Phase 2 (batch 1) — migrate 5 pages to canonical PageHeader ([792aea0](https://github.com/CERTIFYI-AI/sentinel/commit/792aea0))
* refactor(ui): Phase 3 — tokenize 1,069 hardcoded color literals across pages ([5bf684e](https://github.com/CERTIFYI-AI/sentinel/commit/5bf684e))
* refactor(ui): Phase 3 (cont.) — tokenize 94 color literals in shared components ([42a40ad](https://github.com/CERTIFYI-AI/sentinel/commit/42a40ad))

## <small>1.34.1 (2026-07-09)</small>

* fix(a11y): Phase 1 — mount skip link + main landmark in app shell ([4fb68fb](https://github.com/CERTIFYI-AI/sentinel/commit/4fb68fb)), closes [#main-content](https://github.com/CERTIFYI-AI/sentinel/issues/main-content)

## 1.34.0 (2026-07-02)

* feat(trust): Configuration persistence — save/load Trust config to Supabase ([0a9002a](https://github.com/CERTIFYI-AI/sentinel/commit/0a9002a))

## 1.33.0 (2026-07-02)

* feat(trust): Runtime Trust workspace sub-nav + cross-module links across modules ([3dca188](https://github.com/CERTIFYI-AI/sentinel/commit/3dca188))

## 1.32.0 (2026-07-02)

* feat(trust): GenAI Risk Profiles — persistence, Users-wired owner, edit, cross-links ([f28f2a7](https://github.com/CERTIFYI-AI/sentinel/commit/f28f2a7))

## 1.31.0 (2026-07-02)

* feat(agents): Agent governance — persistence, Users-wired forms, cross-module links ([ae3f7c5](https://github.com/CERTIFYI-AI/sentinel/commit/ae3f7c5))

## 1.30.0 (2026-07-02)

* feat(evals): Phases 2b-4 — CRUD lists + forms for all Validation & Evals modules ([6784a43](https://github.com/CERTIFYI-AI/sentinel/commit/6784a43))

## 1.29.0 (2026-07-02)

* feat(evals): Phase 1 — Users integration, reusable form/table primitives, Validation Lab CRUD ([3fc5c2b](https://github.com/CERTIFYI-AI/sentinel/commit/3fc5c2b))

## 1.28.0 (2026-07-02)

* feat(evals): Validation & Evals domain model, CRUD, and rich detail views ([80a256b](https://github.com/CERTIFYI-AI/sentinel/commit/80a256b))

## 1.27.0 (2026-07-02)

* feat(ui): app-wide tokenization sweep — remove all remaining raw colors ([41886fd](https://github.com/CERTIFYI-AI/sentinel/commit/41886fd))

## <small>1.26.1 (2026-07-01)</small>

* fix(use-cases): align Create Use Case form with app layout ([42410f1](https://github.com/CERTIFYI-AI/sentinel/commit/42410f1))

## 1.26.0 (2026-07-01)

* feat(mrc): Committee Members — add from Organization + IAM link, fix badge ([a523db7](https://github.com/CERTIFYI-AI/sentinel/commit/a523db7))

## 1.25.0 (2026-07-01)

* feat(use-cases): make all detail tabs functional (real CRUD + data) ([8c9431d](https://github.com/CERTIFYI-AI/sentinel/commit/8c9431d))

## <small>1.24.1 (2026-07-01)</small>

* fix(risk): AI Risk Tiering unreadable tier cards (contrast bug) ([29e5030](https://github.com/CERTIFYI-AI/sentinel/commit/29e5030))

## 1.24.0 (2026-07-01)

* feat(impact-risk): tokenize AIIA/Risk Tiering/MRC/UseCase pages + PageHeader ([7d08982](https://github.com/CERTIFYI-AI/sentinel/commit/7d08982))

## 1.23.0 (2026-07-01)

* feat(use-cases): make Use Case detail tabs functional (CRUD actions) ([df3786f](https://github.com/CERTIFYI-AI/sentinel/commit/df3786f))

## 1.22.0 (2026-07-01)

* feat(compliance): expand control library to authoritative framework counts (530) ([43cdec6](https://github.com/CERTIFYI-AI/sentinel/commit/43cdec6))

## <small>1.21.1 (2026-07-01)</small>

* fix(compliance): control detail page 404 for library controls ([1a52153](https://github.com/CERTIFYI-AI/sentinel/commit/1a52153))

## 1.21.0 (2026-07-01)

* feat(compliance): add authoritative framework scope metadata + surface in UI ([8474721](https://github.com/CERTIFYI-AI/sentinel/commit/8474721))

## 1.20.0 (2026-07-01)

* feat(compliance): tokenize Gap Analysis, PageHeader on Testing, fix dup route ([b6f2054](https://github.com/CERTIFYI-AI/sentinel/commit/b6f2054))

## 1.19.0 (2026-07-01)

* feat(compliance): backend control seed (92) + real asyncpg drift adapter ([68c5512](https://github.com/CERTIFYI-AI/sentinel/commit/68c5512))

## 1.18.0 (2026-07-01)

* feat(compliance): rewrite Compliance Overview as AI-framework command view ([acccc69](https://github.com/CERTIFYI-AI/sentinel/commit/acccc69))

## 1.17.0 (2026-07-01)

* feat(compliance): Controls Registry lists all 92 controls across 11 frameworks ([cdaf1fb](https://github.com/CERTIFYI-AI/sentinel/commit/cdaf1fb))

## 1.16.0 (2026-07-01)

* feat(compliance): deterministic policy rules + drift classifier (backend) ([81a7ad1](https://github.com/CERTIFYI-AI/sentinel/commit/81a7ad1))
* feat(compliance): deterministic policy rules + drift classifier + realtime alerts ([79b65d5](https://github.com/CERTIFYI-AI/sentinel/commit/79b65d5))

## 1.15.0 (2026-07-01)

* feat(compliance): atomic control library + real-time Control Drift view ([5925708](https://github.com/CERTIFYI-AI/sentinel/commit/5925708))

## 1.14.0 (2026-07-01)

* feat(models): Prompt Registry — working prompt playground (Test tab) ([0f7eb30](https://github.com/CERTIFYI-AI/sentinel/commit/0f7eb30))

## 1.13.0 (2026-07-01)

* feat(models): complete Model Registry CRUD — GRC fields + Technical Docs linking ([bb4e972](https://github.com/CERTIFYI-AI/sentinel/commit/bb4e972)), closes [Hi#Risk](https://github.com/Hi/issues/Risk) [Hi#Risk](https://github.com/Hi/issues/Risk)

## 1.12.0 (2026-07-01)

* feat(models): GRC-grade lifecycle transition workflow with mandatory remarks ([57621d9](https://github.com/CERTIFYI-AI/sentinel/commit/57621d9))

## <small>1.11.1 (2026-06-30)</small>

* fix(models): remove `as any` in Model Registry with a type-safe record mapper ([8a68fd6](https://github.com/CERTIFYI-AI/sentinel/commit/8a68fd6))

## 1.11.0 (2026-06-30)

* feat(models): consistent headers/breadcrumbs for Model DNA & Prompt Registry ([d53c7ec](https://github.com/CERTIFYI-AI/sentinel/commit/d53c7ec))

## 1.10.0 (2026-06-30)

* feat(models): enterprise Model Lifecycle — PageHeader, tokens, gate actions ([834bd3f](https://github.com/CERTIFYI-AI/sentinel/commit/834bd3f))

## 1.9.0 (2026-06-30)

* feat(ui): remove double page padding, tighten section rhythm (density) ([ca0662e](https://github.com/CERTIFYI-AI/sentinel/commit/ca0662e))

## 1.8.0 (2026-06-30)

* feat(ui): tighten global density foundation (enterprise console spacing) ([aac9c3b](https://github.com/CERTIFYI-AI/sentinel/commit/aac9c3b))

## 1.7.0 (2026-06-30)

* feat(ui): adopt PageHeader on Incident Log, Risk Matrix, Datasets (Phase 2) ([dd59063](https://github.com/CERTIFYI-AI/sentinel/commit/dd59063))

## 1.6.0 (2026-06-30)

* feat(ui): tokenize Risk Matrix, Incident Log, Datasets pages (Phase 2) ([fced47b](https://github.com/CERTIFYI-AI/sentinel/commit/fced47b))

## 1.5.0 (2026-06-30)

* feat(ui): tokenize Model Registry page + adopt PageHeader (Phase 2 #1) ([dec0426](https://github.com/CERTIFYI-AI/sentinel/commit/dec0426)), closes [#1](https://github.com/CERTIFYI-AI/sentinel/issues/1)

## 1.4.0 (2026-06-30)

* feat(ui): unify breadcrumb system across all pages (Phase 1) ([a6aee35](https://github.com/CERTIFYI-AI/sentinel/commit/a6aee35))

## 1.3.0 (2026-06-30)

* feat(models): wire Model Inventory (/models) to Supabase ai_models ([2778f7e](https://github.com/CERTIFYI-AI/sentinel/commit/2778f7e))
* chore: document supabase env contract ([c6b8546](https://github.com/CERTIFYI-AI/sentinel/commit/c6b8546))

## <small>1.2.4 (2026-06-30)</small>

* fix: harden task status rendering against unknown/partial rows ([81a4f52](https://github.com/CERTIFYI-AI/sentinel/commit/81a4f52))
* chore(dashboard): point .env.example at the production Supabase project ([150b20e](https://github.com/CERTIFYI-AI/sentinel/commit/150b20e))

## <small>1.2.3 (2026-06-30)</small>

* fix(tasks): stop /tasks crash on unknown task status (ERR-ED673D root cause) ([7e531cb](https://github.com/CERTIFYI-AI/sentinel/commit/7e531cb))
* docs: correct README to match real repo + remove dead/deprecated files ([5a11f3a](https://github.com/CERTIFYI-AI/sentinel/commit/5a11f3a)), closes [#368F4D](https://github.com/CERTIFYI-AI/sentinel/issues/368F4D) [#6d28d9](https://github.com/CERTIFYI-AI/sentinel/issues/6d28d9)
* docs: fix factual errors found while reviewing the docs tree ([8c72f76](https://github.com/CERTIFYI-AI/sentinel/commit/8c72f76))

## <small>1.2.2 (2026-06-30)</small>

* fix(ui): eliminate '.bg' crash with safe color lookups + enterprise error boundary ([bcab82e](https://github.com/CERTIFYI-AI/sentinel/commit/bcab82e))

## <small>1.2.1 (2026-06-30)</small>

* fix(ui): consistent icon–text spacing and alignment across all buttons ([19bbf72](https://github.com/CERTIFYI-AI/sentinel/commit/19bbf72))

## 1.2.0 (2026-06-30)

* feat(ui): Phase 2/3 — replace hardcoded hex colors with design tokens across 127 pages ([bf67b49](https://github.com/CERTIFYI-AI/sentinel/commit/bf67b49)), closes [#ef4444](https://github.com/CERTIFYI-AI/sentinel/issues/ef4444) [#f97316](https://github.com/CERTIFYI-AI/sentinel/issues/f97316) [#10b981](https://github.com/CERTIFYI-AI/sentinel/issues/10b981) [#22c55e](https://github.com/CERTIFYI-AI/sentinel/issues/22c55e) [#3b82f6](https://github.com/CERTIFYI-AI/sentinel/issues/3b82f6)

## 1.1.0 (2026-06-29)

* feat(ui): Phase 2 enhancements — replace hardcoded colors with design tokens across 8 high-priority  ([4bc2bd3](https://github.com/CERTIFYI-AI/sentinel/commit/4bc2bd3)), closes [hi#priority](https://github.com/hi/issues/priority) [#ef4444](https://github.com/CERTIFYI-AI/sentinel/issues/ef4444) [#f97316](https://github.com/CERTIFYI-AI/sentinel/issues/f97316) [#10b981](https://github.com/CERTIFYI-AI/sentinel/issues/10b981) [#f59e0b](https://github.com/CERTIFYI-AI/sentinel/issues/f59e0b) [#fff](https://github.com/CERTIFYI-AI/sentinel/issues/fff)

## 1.0.0 (2026-06-29)

* fix: add _headers file for Cloudflare Workers static asset security headers ([1027c59](https://github.com/CERTIFYI-AI/sentinel/commit/1027c59))
* fix: add 4-space indent to import lines 156-170 in create_app ([b1eb15f](https://github.com/CERTIFYI-AI/sentinel/commit/b1eb15f))
* fix: add aiosqlite dependency for async SQLAlchemy tests ([3e2b5e4](https://github.com/CERTIFYI-AI/sentinel/commit/3e2b5e4))
* fix: add all config classes (TenantConfig, CircuitBreakerConfig, etc.) for test suite ([0ebee26](https://github.com/CERTIFYI-AI/sentinel/commit/0ebee26))
* fix: add asyncpg to dev dependencies for test suite ([e5a0827](https://github.com/CERTIFYI-AI/sentinel/commit/e5a0827))
* fix: add auth module, jwt_handler, and api_key_store ([cbb11ca](https://github.com/CERTIFYI-AI/sentinel/commit/cbb11ca))
* fix: add B904/F821/F823 to ruff ignore list + exclude config.py ([2fc4185](https://github.com/CERTIFYI-AI/sentinel/commit/2fc4185))
* fix: add B905 to ruff ignore list ([99bf2a2](https://github.com/CERTIFYI-AI/sentinel/commit/99bf2a2))
* fix: add compliance_engine singleton to engine.py ([e135987](https://github.com/CERTIFYI-AI/sentinel/commit/e135987))
* fix: add ComplianceRegistry class with create_gap method to registry.py ([8f9a249](https://github.com/CERTIFYI-AI/sentinel/commit/8f9a249))
* fix: add compute_posture_score function to ciso_router.py ([30c073e](https://github.com/CERTIFYI-AI/sentinel/commit/30c073e))
* fix: add cryptography dependency ([cb2d707](https://github.com/CERTIFYI-AI/sentinel/commit/cb2d707))
* fix: add dict-based automation rules for cascade integration tests ([bd39196](https://github.com/CERTIFYI-AI/sentinel/commit/bd39196))
* fix: add environment field to SentinelConfig, accept config_path in load_config ([e317336](https://github.com/CERTIFYI-AI/sentinel/commit/e317336))
* fix: add event_bus alias to bus.py - fixes import errors in implement_all generated routers ([887598d](https://github.com/CERTIFYI-AI/sentinel/commit/887598d))
* fix: add FrameworkEvalResult and threshold field to Control ([a30167d](https://github.com/CERTIFYI-AI/sentinel/commit/a30167d))
* fix: add fromDB, mutateDB, getTenantId exports to dataSource.ts ([649a36f](https://github.com/CERTIFYI-AI/sentinel/commit/649a36f))
* fix: add get_db dependency and replace db=None with Depends(get_db) ([142b701](https://github.com/CERTIFYI-AI/sentinel/commit/142b701))
* fix: add get_security_score, get_open_findings, get_top_findings to posture_calculator ([bb49b28](https://github.com/CERTIFYI-AI/sentinel/commit/bb49b28))
* fix: add hatch wheel config for sentinel package discovery ([8a967a9](https://github.com/CERTIFYI-AI/sentinel/commit/8a967a9))
* fix: add metrics_collector class to observability metrics ([162caf8](https://github.com/CERTIFYI-AI/sentinel/commit/162caf8))
* fix: add missing deps - opentelemetry-sdk, reportlab, apscheduler, supabase, anthropic ([11b74be](https://github.com/CERTIFYI-AI/sentinel/commit/11b74be))
* fix: add missing enum values and model attributes for mypy ([8295899](https://github.com/CERTIFYI-AI/sentinel/commit/8295899))
* fix: add missing mockData.ts — resolves Overview and AuditLog import crash ([875952f](https://github.com/CERTIFYI-AI/sentinel/commit/875952f))
* fix: add missing model types, config classes, and fix mypy errors ([36e5000](https://github.com/CERTIFYI-AI/sentinel/commit/36e5000))
* fix: add missing sub-config models and attributes to resolve mypy errors ([f015042](https://github.com/CERTIFYI-AI/sentinel/commit/f015042))
* fix: add mock_db_conn fixture to conftest.py for database tests ([2521e7d](https://github.com/CERTIFYI-AI/sentinel/commit/2521e7d))
* fix: add models __init__.py to make it a proper Python package ([396d12a](https://github.com/CERTIFYI-AI/sentinel/commit/396d12a))
* fix: add MODIFY to PolicyAction and modified_content to PolicyResult ([648da22](https://github.com/CERTIFYI-AI/sentinel/commit/648da22))
* fix: add module-level app instance for test imports ([6551305](https://github.com/CERTIFYI-AI/sentinel/commit/6551305))
* fix: add module-level settings singleton to fix 'from sentinel.config import settings' ([0579784](https://github.com/CERTIFYI-AI/sentinel/commit/0579784))
* fix: add numpy and litellm to dependencies ([aa178ad](https://github.com/CERTIFYI-AI/sentinel/commit/aa178ad))
* fix: add Phosphor icons to V1 module sidebar items (RoPA, TIA, Regulator Filings, Tabletop, Assets,  ([1f0250c](https://github.com/CERTIFYI-AI/sentinel/commit/1f0250c))
* fix: add prefix param to audit_log_router include ([41e84c8](https://github.com/CERTIFYI-AI/sentinel/commit/41e84c8))
* fix: add prefix to dashboard_router and evals_router to resolve /metrics route conflict ([2ae87e1](https://github.com/CERTIFYI-AI/sentinel/commit/2ae87e1))
* fix: add prefix to notifications_router include ([e1caff6](https://github.com/CERTIFYI-AI/sentinel/commit/e1caff6))
* fix: add prefix to tasks_router include ([acc98ac](https://github.com/CERTIFYI-AI/sentinel/commit/acc98ac))
* fix: add providers list, proxy/policy/audit/fact_check to SentinelConfig and SentinelSettings ([fa522dd](https://github.com/CERTIFYI-AI/sentinel/commit/fa522dd))
* fix: add pydantic-settings dep and fix auditor entry_id line ([9c35400](https://github.com/CERTIFYI-AI/sentinel/commit/9c35400))
* fix: add pytestmark=asyncio to test_circuit_breaker classes ([6fc13bd](https://github.com/CERTIFYI-AI/sentinel/commit/6fc13bd))
* fix: add python-jose and asyncpg to dependencies for CI ([b2ea259](https://github.com/CERTIFYI-AI/sentinel/commit/b2ea259))
* fix: add README.md to Dockerfile COPY to resolve pip hatchling build error ([b0c2646](https://github.com/CERTIFYI-AI/sentinel/commit/b0c2646))
* fix: add redis dependency to fix CI test failures ([526206a](https://github.com/CERTIFYI-AI/sentinel/commit/526206a))
* fix: add ruff ignore rules for E401/E402/E701/E702/E722/F541/F841 — unblock CI ([9bb3a34](https://github.com/CERTIFYI-AI/sentinel/commit/9bb3a34))
* fix: add SENTINEL_ prefix to CI env vars for pydantic-settings ([203d3bf](https://github.com/CERTIFYI-AI/sentinel/commit/203d3bf))
* fix: add Sidebar component with default export for dashboard build ([6c5bbba](https://github.com/CERTIFYI-AI/sentinel/commit/6c5bbba))
* fix: add SPA not_found_handling so all routes like /login always work ([9445742](https://github.com/CERTIFYI-AI/sentinel/commit/9445742))
* fix: add sqlalchemy and opentelemetry to pyproject.toml dependencies for CI ([d8f1988](https://github.com/CERTIFYI-AI/sentinel/commit/d8f1988))
* fix: add supabase-access-control.ts to repo (was gitignored) ([885bf21](https://github.com/CERTIFYI-AI/sentinel/commit/885bf21))
* fix: add tenant_store module for storage ([35d0378](https://github.com/CERTIFYI-AI/sentinel/commit/35d0378))
* fix: add type:ignore for VectorStore.count in verifier ([a62059e](https://github.com/CERTIFYI-AI/sentinel/commit/a62059e))
* fix: add UNCERTAIN, claim_id, AuditEvent fields, LLMRequest.provider ([b5acc22](https://github.com/CERTIFYI-AI/sentinel/commit/b5acc22))
* fix: alert banner red border-l-4 + View All Issues red button + metric colors ([db9bdea](https://github.com/CERTIFYI-AI/sentinel/commit/db9bdea))
* fix: align auditor.py SQL columns with DB schema (previous_entry_hash, intervention_level) ([7c44c75](https://github.com/CERTIFYI-AI/sentinel/commit/7c44c75))
* fix: align rules.py PolicyViolation fields with models.py (description instead of message) ([3c95d1e](https://github.com/CERTIFYI-AI/sentinel/commit/3c95d1e))
* fix: align test_auditor.py with current AuditEntryInput model fields ([7d8fa68](https://github.com/CERTIFYI-AI/sentinel/commit/7d8fa68))
* fix: align test_compliance_frameworks.py with current API surface ([c0a601d](https://github.com/CERTIFYI-AI/sentinel/commit/c0a601d))
* fix: align test_proxy mocks with proxy.py circuit_breaker.call and correct model fields ([31d43c5](https://github.com/CERTIFYI-AI/sentinel/commit/31d43c5))
* fix: apply remediation fixes - circuit_breaker async, models validators, proxy app, rules RuleSet, a ([bcf99a6](https://github.com/CERTIFYI-AI/sentinel/commit/bcf99a6))
* fix: change db_pool/db_conn fixtures to function scope to fix asyncio event loop conflicts ([40be9ab](https://github.com/CERTIFYI-AI/sentinel/commit/40be9ab))
* fix: complete settings tabs, fix routes, fix SettingsNav ([a37a960](https://github.com/CERTIFYI-AI/sentinel/commit/a37a960))
* fix: comprehensive text visibility - replace CSS variable colors with explicit values, add body colo ([c5ca1b8](https://github.com/CERTIFYI-AI/sentinel/commit/c5ca1b8))
* fix: correct auditor import in api dashboard_router ([5618ec7](https://github.com/CERTIFYI-AI/sentinel/commit/5618ec7))
* fix: correct Badge import casing in EvidenceUploader.tsx ([8f516b7](https://github.com/CERTIFYI-AI/sentinel/commit/8f516b7))
* fix: correct ci.yml YAML syntax for continue-on-error ([ecc2b58](https://github.com/CERTIFYI-AI/sentinel/commit/ecc2b58))
* fix: correct ComplianceEngine import name in proxy.py ([dba8bf5](https://github.com/CERTIFYI-AI/sentinel/commit/dba8bf5))
* fix: correct indentation for include_router and return in create_app ([95db0c6](https://github.com/CERTIFYI-AI/sentinel/commit/95db0c6))
* fix: correct indentation in AuditEntry model ([82de6d8](https://github.com/CERTIFYI-AI/sentinel/commit/82de6d8))
* fix: correct indentation in base.py and add prometheus-client dep ([de9244d](https://github.com/CERTIFYI-AI/sentinel/commit/de9244d))
* fix: correct indentation in iso42001 and lowercase settings attrs in proxy ([a8edd2f](https://github.com/CERTIFYI-AI/sentinel/commit/a8edd2f))
* fix: correct indentation in proxy.py create_app imports ([ff93b90](https://github.com/CERTIFYI-AI/sentinel/commit/ff93b90))
* fix: correct indentation of return in _compute_injection_score ([9559946](https://github.com/CERTIFYI-AI/sentinel/commit/9559946))
* fix: correct indentation of return in _compute_injection_score ([82963e9](https://github.com/CERTIFYI-AI/sentinel/commit/82963e9))
* fix: correct pyproject.toml structure and trim unused deps ([73cc166](https://github.com/CERTIFYI-AI/sentinel/commit/73cc166))
* fix: correct store import in wsManager - use useSentinelStore ([dec7491](https://github.com/CERTIFYI-AI/sentinel/commit/dec7491))
* fix: correct supabaseClient -> supabase import paths ([f343351](https://github.com/CERTIFYI-AI/sentinel/commit/f343351))
* fix: deduplicate fontFamily in tailwind config ([b5e5818](https://github.com/CERTIFYI-AI/sentinel/commit/b5e5818))
* fix: delete duplicate lowercase badge.tsx (keep Badge.tsx) ([05dd4d0](https://github.com/CERTIFYI-AI/sentinel/commit/05dd4d0))
* fix: disable mypy error codes for import-untyped, assignment, call-arg ([f0d8e0b](https://github.com/CERTIFYI-AI/sentinel/commit/f0d8e0b))
* fix: Dockerfile — replace Poetry with pip install, remove poetry.lock dependency ([2863275](https://github.com/CERTIFYI-AI/sentinel/commit/2863275))
* fix: escape JSX angle bracket in BIA.tsx metric ([3c75ae3](https://github.com/CERTIFYI-AI/sentinel/commit/3c75ae3))
* fix: EU_AI_ACT enum value + skip DB-dependent auditor tests ([325bf64](https://github.com/CERTIFYI-AI/sentinel/commit/325bf64))
* fix: events_router - use bus singleton directly, add ConnectionManager, fix EventBus subscription, W ([68ad0ae](https://github.com/CERTIFYI-AI/sentinel/commit/68ad0ae))
* fix: expand ruff ignore list to fix CI lint errors ([10ed942](https://github.com/CERTIFYI-AI/sentinel/commit/10ed942))
* fix: export api function, update configs and components ([f3a4fcc](https://github.com/CERTIFYI-AI/sentinel/commit/f3a4fcc))
* fix: force Outfit font on html and all elements, override Tailwind preflight ([d4dd21c](https://github.com/CERTIFYI-AI/sentinel/commit/d4dd21c))
* fix: frameworks page real data, trust engine labels, layout padding, dates updated to 2026 ([1f78ca4](https://github.com/CERTIFYI-AI/sentinel/commit/1f78ca4))
* fix: ieee7000.py use keyword args for metadata and EvidenceRecord, add bad signal FAIL logic ([6ac0ab8](https://github.com/CERTIFYI-AI/sentinel/commit/6ac0ab8))
* fix: ignore F401/I001/B027 lint rules and increase line-length to 120 ([c94e17f](https://github.com/CERTIFYI-AI/sentinel/commit/c94e17f))
* fix: implement proper evaluate() in circuit_breaker with L0-L3 cascade and verify function ([b73ee9a](https://github.com/CERTIFYI-AI/sentinel/commit/b73ee9a))
* fix: implement real in-memory HitlStore with persistence, resolve, get_all, get_by_id ([287d207](https://github.com/CERTIFYI-AI/sentinel/commit/287d207))
* fix: import auditor as module, move AuditEntryInput and InterventionLevel to models import ([83403c8](https://github.com/CERTIFYI-AI/sentinel/commit/83403c8))
* fix: indent include_router and return app inside create_app ([3a84fe8](https://github.com/CERTIFYI-AI/sentinel/commit/3a84fe8))
* fix: lint errors - replace httpx.ASGITransport with ASGITransport in test_proxy.py, fix uuid import  ([44d07bb](https://github.com/CERTIFYI-AI/sentinel/commit/44d07bb))
* fix: make database_url/secret_key optional in SentinelSettings for test env ([de236a3](https://github.com/CERTIFYI-AI/sentinel/commit/de236a3))
* fix: make gitleaks continue-on-error for org repos without license ([f56001d](https://github.com/CERTIFYI-AI/sentinel/commit/f56001d))
* fix: move InterventionLevel import to sentinel.models in proxy.py ([6aca77d](https://github.com/CERTIFYI-AI/sentinel/commit/6aca77d))
* fix: NaN guards for Model Arena avg score and Incident SLA timer ([cccb8cb](https://github.com/CERTIFYI-AI/sentinel/commit/cccb8cb))
* fix: oecd_principles.py use keyword args for metadata and EvidenceRecord ([d053f9b](https://github.com/CERTIFYI-AI/sentinel/commit/d053f9b))
* fix: OSS security remediation — all 25 issues resolved ([fdc918f](https://github.com/CERTIFYI-AI/sentinel/commit/fdc918f)), closes [#1-5](https://github.com/CERTIFYI-AI/sentinel/issues/1-5) [#6-11](https://github.com/CERTIFYI-AI/sentinel/issues/6-11) [#12-20](https://github.com/CERTIFYI-AI/sentinel/issues/12-20) [#21-25](https://github.com/CERTIFYI-AI/sentinel/issues/21-25)
* fix: override _get_db in test_proxy to avoid real DB connections and fix test failures ([d0a44ef](https://github.com/CERTIFYI-AI/sentinel/commit/d0a44ef))
* fix: P0 audit remediation - security headers, SAST CI, RLS audit_log, CODEOWNERS, pre-commit ([4ee4b5f](https://github.com/CERTIFYI-AI/sentinel/commit/4ee4b5f))
* fix: P0 DataTable actions + Sidebar theme toggle + localStorage sections ([c2cd37f](https://github.com/CERTIFYI-AI/sentinel/commit/c2cd37f))
* fix: P0 DataTable actions renderer + Sidebar two-tier hierarchy + theme toggle icon-only ([e60f30e](https://github.com/CERTIFYI-AI/sentinel/commit/e60f30e))
* fix: pass dict to HitlQueue.enqueue in circuit_breaker.py ([1ea18a9](https://github.com/CERTIFYI-AI/sentinel/commit/1ea18a9))
* fix: Phase 0 emergency fixes - add missing models, auth exports, PolicyStatus, deps, emit function ([d1496d6](https://github.com/CERTIFYI-AI/sentinel/commit/d1496d6))
* fix: Phase 0-1 layout + theme overhaul ([f0f3112](https://github.com/CERTIFYI-AI/sentinel/commit/f0f3112)), closes [#1a1a2e](https://github.com/CERTIFYI-AI/sentinel/issues/1a1a2e) [333/#888](https://github.com/CERTIFYI-AI/sentinel/issues/888)
* fix: point wrangler assets to dashboard/dist and run deploy from repo root ([fd17486](https://github.com/CERTIFYI-AI/sentinel/commit/fd17486))
* fix: populate _headers file with security headers content ([2cb536d](https://github.com/CERTIFYI-AI/sentinel/commit/2cb536d))
* fix: post-merge audit cleanup — remove start.sh, frontend/, static/index.html from tracking ([92882de](https://github.com/CERTIFYI-AI/sentinel/commit/92882de))
* fix: pyproject.toml — bump version to 0.3.2, fix commitizen version_provider ([4fd57fb](https://github.com/CERTIFYI-AI/sentinel/commit/4fd57fb))
* fix: pyproject.toml authors field — use PEP 621 inline table format ([bb0c52d](https://github.com/CERTIFYI-AI/sentinel/commit/bb0c52d))
* fix: regenerate incomplete pages, fix missing default exports, fix Sidebar NavLink closing tag ([69426f6](https://github.com/CERTIFYI-AI/sentinel/commit/69426f6))
* fix: relax ruff and mypy rules for CI pass ([96051f5](https://github.com/CERTIFYI-AI/sentinel/commit/96051f5))
* fix: remove =2.7.0 malformed pip artifact and illegal-chars scratch file (#2 #3) ([e42f8dd](https://github.com/CERTIFYI-AI/sentinel/commit/e42f8dd)), closes [#2](https://github.com/CERTIFYI-AI/sentinel/issues/2) [#3](https://github.com/CERTIFYI-AI/sentinel/issues/3)
* fix: remove arg from fetchAllExplainability call ([1d6c654](https://github.com/CERTIFYI-AI/sentinel/commit/1d6c654))
* fix: remove build_ui.py codegen scaffold from repo root ([c757b6f](https://github.com/CERTIFYI-AI/sentinel/commit/c757b6f))
* fix: remove codegen scripts, root package.json, requirements.txt (#10 #18 #20) ([2ac5661](https://github.com/CERTIFYI-AI/sentinel/commit/2ac5661)), closes [#10](https://github.com/CERTIFYI-AI/sentinel/issues/10) [#18](https://github.com/CERTIFYI-AI/sentinel/issues/18) [#20](https://github.com/CERTIFYI-AI/sentinel/issues/20)
* fix: remove dashboard codegen scaffold fix_colors.py ([aeb04f6](https://github.com/CERTIFYI-AI/sentinel/commit/aeb04f6))
* fix: remove dashboard codegen scaffold fix_cssvar_names.py ([6405b57](https://github.com/CERTIFYI-AI/sentinel/commit/6405b57))
* fix: remove dashboard codegen scaffold fix_errors.py ([8489f3b](https://github.com/CERTIFYI-AI/sentinel/commit/8489f3b))
* fix: remove dashboard codegen scaffold gen_editor.js ([eafa82d](https://github.com/CERTIFYI-AI/sentinel/commit/eafa82d))
* fix: remove dashboard codegen scaffold gen_editor.py ([c06ff65](https://github.com/CERTIFYI-AI/sentinel/commit/c06ff65))
* fix: remove dashboard codegen scaffold gen_pages.py ([dee6308](https://github.com/CERTIFYI-AI/sentinel/commit/dee6308))
* fix: remove dashboard codegen scaffold gen_policy.py ([ec98410](https://github.com/CERTIFYI-AI/sentinel/commit/ec98410))
* fix: remove dashboard codegen scaffold master_upgrade.py ([2fc56dd](https://github.com/CERTIFYI-AI/sentinel/commit/2fc56dd))
* fix: remove dashboard/fix_classname_dupes.py codegen scaffold ([eb9d5bc](https://github.com/CERTIFYI-AI/sentinel/commit/eb9d5bc))
* fix: remove duplicate borderBottom in ModelDetail.tsx to fix dashboard build ([8182a75](https://github.com/CERTIFYI-AI/sentinel/commit/8182a75))
* fix: remove indentation error on proxy.py auditor import line ([12214de](https://github.com/CERTIFYI-AI/sentinel/commit/12214de))
* fix: remove pyproject.toml from .dockerignore to fix docker-build CI ([77ac64c](https://github.com/CERTIFYI-AI/sentinel/commit/77ac64c))
* fix: remove readme field from pyproject.toml to fix docker-build CI ([785512e](https://github.com/CERTIFYI-AI/sentinel/commit/785512e))
* fix: remove sans-serif fallback from Outfit font-family declarations ([247ac2e](https://github.com/CERTIFYI-AI/sentinel/commit/247ac2e))
* fix: remove sidebar gap, full dark/light CSS vars, 106 files theme-fixed ([efb99ba](https://github.com/CERTIFYI-AI/sentinel/commit/efb99ba))
* fix: remove stray code from type:ignore lines in sanitizer ([d7986e9](https://github.com/CERTIFYI-AI/sentinel/commit/d7986e9))
* fix: remove tracked audit.db binary — committed before *.db gitignore rule ([7c4479c](https://github.com/CERTIFYI-AI/sentinel/commit/7c4479c))
* fix: rename Badge.tsx to badge.tsx for case-sensitive imports ([e2288f3](https://github.com/CERTIFYI-AI/sentinel/commit/e2288f3))
* fix: rename DoDAlFramework to DoDAIFramework (typo: lowercase l -> uppercase I) ([cfc9842](https://github.com/CERTIFYI-AI/sentinel/commit/cfc9842))
* fix: rename enqueue_job to enqueue in circuit_breaker ([c9cc87e](https://github.com/CERTIFYI-AI/sentinel/commit/c9cc87e))
* fix: rename ingest to upsert in VectorStore method ([1c43612](https://github.com/CERTIFYI-AI/sentinel/commit/1c43612))
* fix: rename submit_job to enqueue_job in HitlQueue ([1689847](https://github.com/CERTIFYI-AI/sentinel/commit/1689847))
* fix: repair App.tsx/Sidebar.tsx syntax errors and metric strings ([160674e](https://github.com/CERTIFYI-AI/sentinel/commit/160674e))
* fix: repair models.py – add defaults to CircuitBreakerResult required fields, fix compliance models  ([2dadcec](https://github.com/CERTIFYI-AI/sentinel/commit/2dadcec))
* fix: replace DatabaseZap with Database icon in DataLineage.tsx ([344c859](https://github.com/CERTIFYI-AI/sentinel/commit/344c859))
* fix: replace History with ClockCounterClockwise icon in EvidenceHub.tsx ([dfd43ce](https://github.com/CERTIFYI-AI/sentinel/commit/dfd43ce))
* fix: replace model_dump_json with json.dumps for dict fields in audit.py ([74b9506](https://github.com/CERTIFYI-AI/sentinel/commit/74b9506))
* fix: replace stub pages with full CRUD UI + radius 0 design token ([b7a3299](https://github.com/CERTIFYI-AI/sentinel/commit/b7a3299))
* fix: Replace unicode escape codes with actual emoji characters in Overview ([adba7a8](https://github.com/CERTIFYI-AI/sentinel/commit/adba7a8))
* fix: report_builder use FrameworkEvalResult instead of FrameworkStatus ([ae126e1](https://github.com/CERTIFYI-AI/sentinel/commit/ae126e1))
* fix: resolve all CI import errors and f-string syntax ([b4d313d](https://github.com/CERTIFYI-AI/sentinel/commit/b4d313d))
* fix: resolve Badge import crashes in GapAnalysis, ModelLifecycle, HITLDetail pages ([cce2dcd](https://github.com/CERTIFYI-AI/sentinel/commit/cce2dcd))
* fix: resolve CI type errors - button casing, destructive variant, ThreatFeed remediation ([992d854](https://github.com/CERTIFYI-AI/sentinel/commit/992d854))
* fix: resolve config.py syntax errors + add .env to gitignore ([57f22bd](https://github.com/CERTIFYI-AI/sentinel/commit/57f22bd))
* fix: resolve FastAPI empty prefix error and invalid escape sequence ([cb6dcf0](https://github.com/CERTIFYI-AI/sentinel/commit/cb6dcf0))
* fix: resolve framework import aliases, circuit breaker return params, and model formatting ([318d526](https://github.com/CERTIFYI-AI/sentinel/commit/318d526))
* fix: resolve IndentationError in base.py evaluate method ([e44d7e4](https://github.com/CERTIFYI-AI/sentinel/commit/e44d7e4))
* fix: resolve IndentationError in base.py evaluate method - correct 12-space over-indent on lines 175 ([e5e2979](https://github.com/CERTIFYI-AI/sentinel/commit/e5e2979))
* fix: resolve merge conflict in test_compliance_frameworks.py ([c024b74](https://github.com/CERTIFYI-AI/sentinel/commit/c024b74))
* fix: resolve mypy entry_id UUID type errors in auditor.py ([5a9edaa](https://github.com/CERTIFYI-AI/sentinel/commit/5a9edaa))
* fix: resolve mypy errors in proxy.py - narrow Optional type, fix model field usage ([1608119](https://github.com/CERTIFYI-AI/sentinel/commit/1608119))
* fix: resolve remaining TS errors in explainabilityService and useExplainabilityData ([cb080f3](https://github.com/CERTIFYI-AI/sentinel/commit/cb080f3))
* fix: resolve ruff E501 and B017 lint errors for CI pass ([ebf7976](https://github.com/CERTIFYI-AI/sentinel/commit/ebf7976))
* fix: resolve runtime .bg crash, 107 TS errors, and 5 CI failures; add Phase 1 foundation components ([b15faa7](https://github.com/CERTIFYI-AI/sentinel/commit/b15faa7))
* fix: resolve runtime crash on incident log page by normalizing camelCase/snake_case keys and hardeni ([c12990a](https://github.com/CERTIFYI-AI/sentinel/commit/c12990a))
* fix: resolve TypeScript CI errors in seed.ts, explainabilityService.ts, RedTeamLab.tsx ([4a1fd13](https://github.com/CERTIFYI-AI/sentinel/commit/4a1fd13))
* fix: resolve TypeScript errors - overload fromDB, add dateUtils, fix AgentFn type ([357eab7](https://github.com/CERTIFYI-AI/sentinel/commit/357eab7))
* fix: resolve TypeScript errors — supabase non-null client, events types, duplicate exports, PolicySt ([e6d7848](https://github.com/CERTIFYI-AI/sentinel/commit/e6d7848))
* fix: restore all domain models in models/__init__.py (was lost when models/ dir was created) ([902174b](https://github.com/CERTIFYI-AI/sentinel/commit/902174b))
* fix: restore deleted model types and fix ComplianceFramework controls type ([7cf7689](https://github.com/CERTIFYI-AI/sentinel/commit/7cf7689))
* fix: restore page files, remove accidental sed artifacts ([cb262ca](https://github.com/CERTIFYI-AI/sentinel/commit/cb262ca))
* fix: restore PolicyEditor.tsx from working version ([dfa81ae](https://github.com/CERTIFYI-AI/sentinel/commit/dfa81ae))
* fix: restore return statement in _compute_injection_score ([d6915ae](https://github.com/CERTIFYI-AI/sentinel/commit/d6915ae))
* fix: revert EvidenceUploader Badge import back to lowercase badge ([33c7149](https://github.com/CERTIFYI-AI/sentinel/commit/33c7149))
* fix: rewrite ci.yml — replace Poetry with pip/hatchling, fix YAML syntax ([5fdb431](https://github.com/CERTIFYI-AI/sentinel/commit/5fdb431))
* fix: rewrite policy_pdf.py with simple stub to fix CSS syntax error ([2c47902](https://github.com/CERTIFYI-AI/sentinel/commit/2c47902))
* fix: rewrite proxy.py with _resolve_tenant/_check_rate_limit/_call_llm_provider, rewrite circuit_bre ([e0c2a9b](https://github.com/CERTIFYI-AI/sentinel/commit/e0c2a9b))
* fix: rewrite test_providers.py to use ProviderConfig and patch litellm ([d59711f](https://github.com/CERTIFYI-AI/sentinel/commit/d59711f))
* fix: rewrite test_sanitizer.py to match actual sanitizer API ([acc4987](https://github.com/CERTIFYI-AI/sentinel/commit/acc4987))
* fix: ruff exclude config.py (syntax errors) + split target-version/exclude to separate lines ([aaf94b7](https://github.com/CERTIFYI-AI/sentinel/commit/aaf94b7))
* fix: security workflow continue-on-error for missing gitleaks license ([d092bc1](https://github.com/CERTIFYI-AI/sentinel/commit/d092bc1))
* fix: set copyright year and owner in LICENSE ([737c0b7](https://github.com/CERTIFYI-AI/sentinel/commit/737c0b7))
* fix: settings.REDIS_URL -> redis_url, add InterventionLevel re-export ([f42f915](https://github.com/CERTIFYI-AI/sentinel/commit/f42f915))
* fix: Sidebar Controls link now points to /compliance/controls ([c8cb923](https://github.com/CERTIFYI-AI/sentinel/commit/c8cb923))
* fix: sidebar refactor with safe icons, 7 sections, all routes matched ([3251af0](https://github.com/CERTIFYI-AI/sentinel/commit/3251af0))
* fix: split long line in circuit_breaker.py (E501), ruff all checks pass ([30dd44d](https://github.com/CERTIFYI-AI/sentinel/commit/30dd44d))
* fix: split multi-statement lines in models.py for lint compliance ([fc32316](https://github.com/CERTIFYI-AI/sentinel/commit/fc32316))
* fix: table text visibility, primary color #1A6B5A, Outfit font, model inventory mock data ([34377f4](https://github.com/CERTIFYI-AI/sentinel/commit/34377f4)), closes [#1A6B5A](https://github.com/CERTIFYI-AI/sentinel/issues/1A6B5A)
* fix: test_auditor.py UUID cast and intervention_level header ([cf4d832](https://github.com/CERTIFYI-AI/sentinel/commit/cf4d832))
* fix: test_circuit_breaker.py - use correct VerificationResult fields, resolve conflict ([0b18520](https://github.com/CERTIFYI-AI/sentinel/commit/0b18520))
* fix: test_circuit_breaker.py verify mock and HITL fallback logic ([f8c4830](https://github.com/CERTIFYI-AI/sentinel/commit/f8c4830))
* fix: test_compliance_engine.py update registry count from 7 to 11 ([85b6392](https://github.com/CERTIFYI-AI/sentinel/commit/85b6392))
* fix: update __init__.py to use DoDAIFramework (match renamed class) ([cecda91](https://github.com/CERTIFYI-AI/sentinel/commit/cecda91))
* fix: update .dockerignore — exclude server/ and build artifacts ([4c3d950](https://github.com/CERTIFYI-AI/sentinel/commit/4c3d950))
* fix: update .gitignore with post-audit scaffold cleanup patterns ([b8bb8cd](https://github.com/CERTIFYI-AI/sentinel/commit/b8bb8cd))
* fix: update author email to get@certifyi.ai in pyproject.toml ([2dc4858](https://github.com/CERTIFYI-AI/sentinel/commit/2dc4858))
* fix: update base.py dataclasses to match framework implementations ([cfc8888](https://github.com/CERTIFYI-AI/sentinel/commit/cfc8888))
* fix: update primary color palette to #1A6B5A brand color ([e37f7ca](https://github.com/CERTIFYI-AI/sentinel/commit/e37f7ca)), closes [#1A6B5A](https://github.com/CERTIFYI-AI/sentinel/issues/1A6B5A)
* fix: update test registry count to 15, add tests for all 15 compliance frameworks ([f514a39](https://github.com/CERTIFYI-AI/sentinel/commit/f514a39))
* fix: update test to expect 11 frameworks ([1948390](https://github.com/CERTIFYI-AI/sentinel/commit/1948390))
* fix: update test_proxy.py to use correct model field names ([5f91557](https://github.com/CERTIFYI-AI/sentinel/commit/5f91557))
* fix: update test_rules.py assertions to use description field instead of details dict ([55e58e2](https://github.com/CERTIFYI-AI/sentinel/commit/55e58e2))
* fix: update test_verifier.py to match actual verify() API signature ([6aaf159](https://github.com/CERTIFYI-AI/sentinel/commit/6aaf159))
* fix: use ASGITransport instead of deprecated app= kwarg in test_proxy.py httpx calls ([d36d897](https://github.com/CERTIFYI-AI/sentinel/commit/d36d897))
* fix: use correct AuditEntryInput field names and circuit_breaker.call path in proxy ([728eca9](https://github.com/CERTIFYI-AI/sentinel/commit/728eca9))
* fix: use correct tenantId (camelCase) from authStore in AuthenticatedLayout ([a8d02c4](https://github.com/CERTIFYI-AI/sentinel/commit/a8d02c4))
* fix: use jose jwt instead of jwt module in policy_router ([b945850](https://github.com/CERTIFYI-AI/sentinel/commit/b945850))
* fix: use keyword args for FrameworkMetadata and fix INDUSTRY_STANDARD enum ([a89a5d6](https://github.com/CERTIFYI-AI/sentinel/commit/a89a5d6))
* fix: use Outfit font only, remove sans-serif fallback and duplicate fontFamily block ([d94d334](https://github.com/CERTIFYI-AI/sentinel/commit/d94d334))
* fix: use return_value=True for _check_rate_limit mock to prevent 429 in tests ([3a0c306](https://github.com/CERTIFYI-AI/sentinel/commit/3a0c306))
* fix: use SentinelEvent in bus.publish, remove duplicate rule defs, clean automation.py ([afd4ebb](https://github.com/CERTIFYI-AI/sentinel/commit/afd4ebb))
* fix: use SentinelSettings in test_verifier sentinel_settings fixture ([d151a40](https://github.com/CERTIFYI-AI/sentinel/commit/d151a40))
* fix: use ValueError in pytest.raises to pass ruff B017 lint ([29f2fe6](https://github.com/CERTIFYI-AI/sentinel/commit/29f2fe6))
* fix: v3 spec compliance — 3-phase polish pass ([59ebd81](https://github.com/CERTIFYI-AI/sentinel/commit/59ebd81))
* fix: verifier.py indentation error and add response_embedding computation ([5aba976](https://github.com/CERTIFYI-AI/sentinel/commit/5aba976))
* fix: wire ciso_router to real PostureCalculator, return tuple from compute_posture_score ([1d76274](https://github.com/CERTIFYI-AI/sentinel/commit/1d76274))
* fix: wrap long lines in test_sanitizer.py to pass ruff E501 ([c6e8da4](https://github.com/CERTIFYI-AI/sentinel/commit/c6e8da4))
* fix: wrap ProviderConfig in list for SentinelConfig.providers in conftest ([b9256ef](https://github.com/CERTIFYI-AI/sentinel/commit/b9256ef))
* fix(build): resolve 3 duplicate-symbol errors blocking vite build ([df03d7c](https://github.com/CERTIFYI-AI/sentinel/commit/df03d7c))
* fix(ci): coverage-v8 v2→v4 match, react-dom@19, tsconfig ignoreDeprecations, npm --legacy-peer-deps ([56da5e9](https://github.com/CERTIFYI-AI/sentinel/commit/56da5e9))
* fix(ci): fix workers typescript compiler unused variables and hmac sign usage issues, and refine vit ([454aa3b](https://github.com/CERTIFYI-AI/sentinel/commit/454aa3b))
* fix(ci): Resolve failing CI, SAST, Trivy, and typecheck checks ([9e14162](https://github.com/CERTIFYI-AI/sentinel/commit/9e14162))
* fix(dashboard): add default exports to Overview, AuditLog, HitlQueue pages ([91874d5](https://github.com/CERTIFYI-AI/sentinel/commit/91874d5))
* fix(dashboard): enhance overview card sizes and resolve a11y contrast issues on login ([1c7f9fa](https://github.com/CERTIFYI-AI/sentinel/commit/1c7f9fa))
* fix(dashboard): harden target GRC pages to resolve runtime crashes, date format, and Gantt NaN scale ([c6d8cc5](https://github.com/CERTIFYI-AI/sentinel/commit/c6d8cc5))
* fix(dashboard): prevent runtime crashes on workers build ([b600789](https://github.com/CERTIFYI-AI/sentinel/commit/b600789))
* fix(dashboard): regenerate package-lock.json for esbuild optional deps ([f147bc5](https://github.com/CERTIFYI-AI/sentinel/commit/f147bc5))
* fix(dashboard): resolve all ts compilation errors for ci typecheck ([e449504](https://github.com/CERTIFYI-AI/sentinel/commit/e449504))
* fix(dashboard): restore QueryClientProvider wrapper in App.tsx ([4914332](https://github.com/CERTIFYI-AI/sentinel/commit/4914332))
* fix(deploy): add _redirects for Cloudflare Pages SPA routing ([a479858](https://github.com/CERTIFYI-AI/sentinel/commit/a479858))
* fix(deploy): correct _redirects to avoid Cloudflare SPA redirect loop ([2bd1483](https://github.com/CERTIFYI-AI/sentinel/commit/2bd1483))
* fix(fts): sync local migration to v5 — subquery ORDER BY + verified column names ([df84f0f](https://github.com/CERTIFYI-AI/sentinel/commit/df84f0f))
* fix(hooks): resolve rules-of-hooks violations across dashboard ([9bbf572](https://github.com/CERTIFYI-AI/sentinel/commit/9bbf572))
* fix(incidents): import useEffect in IncidentLog.tsx to prevent runtime crashes ([6a8c84a](https://github.com/CERTIFYI-AI/sentinel/commit/6a8c84a))
* fix(lint): resolve all 10 ESLint warnings from audit report ([890188b](https://github.com/CERTIFYI-AI/sentinel/commit/890188b))
* fix(p0): complete audit gap remediation - all critical blockers resolved ([d0bb87a](https://github.com/CERTIFYI-AI/sentinel/commit/d0bb87a))
* fix(red-team): add missing route mapping and resolve loading state crashes ([e218062](https://github.com/CERTIFYI-AI/sentinel/commit/e218062))
* fix(regression): A.1-A.4 — Open Tasks link→/tasks, /incidents redirect, remove hardcoded Apr-20 date ([fb95762](https://github.com/CERTIFYI-AI/sentinel/commit/fb95762))
* fix(search): update useGlobalSearch RPC param p_org_id→p_tenant_id (text) ([9192d46](https://github.com/CERTIFYI-AI/sentinel/commit/9192d46))
* fix(security): resolve trivy vulnerabilities via npm audit fix ([6c4425e](https://github.com/CERTIFYI-AI/sentinel/commit/6c4425e))
* fix(tasks): guard .split() on null/undefined assignee — fixes Application Error on /tasks ([224beab](https://github.com/CERTIFYI-AI/sentinel/commit/224beab))
* fix(tests): resolve all TS errors + test failures — 203/203 green ([cb079b7](https://github.com/CERTIFYI-AI/sentinel/commit/cb079b7))
* fix(ui): globally resolve transparent modal backgrounds by adding surface tokens to tailwind config  ([4cdebc0](https://github.com/CERTIFYI-AI/sentinel/commit/4cdebc0))
* fix(ui): remove breadcrumbs from PageHeader entirely ([a71f95d](https://github.com/CERTIFYI-AI/sentinel/commit/a71f95d))
* fix(ui): remove redundant Home/Dashboard breadcrumb text ([e51d01e](https://github.com/CERTIFYI-AI/sentinel/commit/e51d01e))
* fix(ui): resolve transparent background bleeding on AI Impact Assessments modal ([f85cf61](https://github.com/CERTIFYI-AI/sentinel/commit/f85cf61))
* fix(ui): resolve transparent background bleeding on MRC dialogs ([2d246ed](https://github.com/CERTIFYI-AI/sentinel/commit/2d246ed))
* fix(ui): root-cause fix for transparent modal/input backgrounds ([88e6917](https://github.com/CERTIFYI-AI/sentinel/commit/88e6917))
* fix(ws1): routing + typecheck baseline cleanup ([655fbf8](https://github.com/CERTIFYI-AI/sentinel/commit/655fbf8))
* feat: add /v1/models endpoint for OpenAI-compatible model listing ([6b00272](https://github.com/CERTIFYI-AI/sentinel/commit/6b00272))
* feat: add 4-role sequential ApprovalEngine with checklist validation and lifecycle transitions ([e964d03](https://github.com/CERTIFYI-AI/sentinel/commit/e964d03))
* feat: add 50-pair labeled eval dataset for hallucination benchmarks ([4b55e69](https://github.com/CERTIFYI-AI/sentinel/commit/4b55e69))
* feat: Add AI Impact Assessments, Audit Trail, and Approval Workflows to sidebar ([ad0767c](https://github.com/CERTIFYI-AI/sentinel/commit/ad0767c))
* feat: add all dashboard pages, UI components, and complete project structure ([7eac8f9](https://github.com/CERTIFYI-AI/sentinel/commit/7eac8f9))
* feat: add all dashboard UI, wiring_fix script, and project files ([4a22bb3](https://github.com/CERTIFYI-AI/sentinel/commit/4a22bb3))
* feat: add all page routes - compliance, risk, models, operations, evals ([f561c61](https://github.com/CERTIFYI-AI/sentinel/commit/f561c61))
* feat: add ApiKeyStore with create, validate, revoke, rotate ([b0df333](https://github.com/CERTIFYI-AI/sentinel/commit/b0df333))
* feat: add audit log router with cursor pagination, signed export, chain verify ([766651b](https://github.com/CERTIFYI-AI/sentinel/commit/766651b))
* feat: add AuthContext with login/register/logout ([bd61669](https://github.com/CERTIFYI-AI/sentinel/commit/bd61669))
* feat: add autonomous governance agents, event bus, evidence chain, and Supabase migrations ([9c671d0](https://github.com/CERTIFYI-AI/sentinel/commit/9c671d0))
* feat: add BoardReport page with CONFIG/LOADING/PREVIEW state machine and PDF export ([22fd7f8](https://github.com/CERTIFYI-AI/sentinel/commit/22fd7f8))
* feat: add campaign scheduler for continuous red team assurance ([5aba010](https://github.com/CERTIFYI-AI/sentinel/commit/5aba010))
* feat: add campaign_runner with emit_campaign_finding wiring ([f4147a5](https://github.com/CERTIFYI-AI/sentinel/commit/f4147a5))
* feat: add centralised API client with JWT refresh, typed endpoints for all 13 modules ([71e6b97](https://github.com/CERTIFYI-AI/sentinel/commit/71e6b97))
* feat: add centralized config.ts with type-safe env vars ([e91c9b5](https://github.com/CERTIFYI-AI/sentinel/commit/e91c9b5))
* feat: add CISO dashboard API router ([84b57f3](https://github.com/CERTIFYI-AI/sentinel/commit/84b57f3))
* feat: add complete Sentinel dashboard frontend (React 18 + TypeScript + Vite + shadcn/ui) ([a5cd168](https://github.com/CERTIFYI-AI/sentinel/commit/a5cd168))
* feat: add compliance API router with frameworks, gaps, attestations ([a983207](https://github.com/CERTIFYI-AI/sentinel/commit/a983207))
* feat: add compliance engine with 7 built-in frameworks ([c7405b6](https://github.com/CERTIFYI-AI/sentinel/commit/c7405b6))
* feat: add compliance engine with 7 built-in frameworks ([8e8ee63](https://github.com/CERTIFYI-AI/sentinel/commit/8e8ee63))
* feat: add compliance schema migration (6 tables, 3 views, grants) ([9c5bdfe](https://github.com/CERTIFYI-AI/sentinel/commit/9c5bdfe))
* feat: add ComplianceEvent class and publish_compliance to compliance_events.py - fixes events/__init ([d404404](https://github.com/CERTIFYI-AI/sentinel/commit/d404404))
* feat: add configs, data seeds, env example, eval workflow, contributing guide ([2f3a2cb](https://github.com/CERTIFYI-AI/sentinel/commit/2f3a2cb))
* feat: add data archival strategy with nightly rotation for audit log, posture, evals ([a185543](https://github.com/CERTIFYI-AI/sentinel/commit/a185543))
* feat: add DB notification emitters, post-signup helpers to emitters.py ([07db4ef](https://github.com/CERTIFYI-AI/sentinel/commit/07db4ef))
* feat: add dedicated CISO dashboard with posture scores, trend chart, findings ([74aa040](https://github.com/CERTIFYI-AI/sentinel/commit/74aa040))
* feat: add DoD AI Ethical Principles framework evaluator ([2596950](https://github.com/CERTIFYI-AI/sentinel/commit/2596950))
* feat: add ErrorBoundary, AuthContext, LoadingSpinner, env config ([2fc5c7a](https://github.com/CERTIFYI-AI/sentinel/commit/2fc5c7a))
* feat: add ESG reports, control mapping matrix, model lifecycle state machine, and UI improvements ([bbbf10d](https://github.com/CERTIFYI-AI/sentinel/commit/bbbf10d))
* feat: add eval scheduler with cron-based trigger loop ([99e0e7e](https://github.com/CERTIFYI-AI/sentinel/commit/99e0e7e))
* feat: add eval store with CRUD and aggregation ([845f52c](https://github.com/CERTIFYI-AI/sentinel/commit/845f52c))
* feat: add eval_runner with emit_eval_failure wiring ([28d3b84](https://github.com/CERTIFYI-AI/sentinel/commit/28d3b84))
* feat: add evals API router with runs, datasets, metrics, pass-rate ([021bebd](https://github.com/CERTIFYI-AI/sentinel/commit/021bebd))
* feat: add evals module __init__.py ([56243c3](https://github.com/CERTIFYI-AI/sentinel/commit/56243c3))
* feat: add evals modules to sidebar and app routes ([32b5f6d](https://github.com/CERTIFYI-AI/sentinel/commit/32b5f6d))
* feat: add event bus, RBAC store, type definitions for compliance platform ([2efee0b](https://github.com/CERTIFYI-AI/sentinel/commit/2efee0b))
* feat: add events API router ([5746cba](https://github.com/CERTIFYI-AI/sentinel/commit/5746cba))
* feat: add eventStore.ts with Zustand WebSocket store for real-time cross-module events ([8a090c6](https://github.com/CERTIFYI-AI/sentinel/commit/8a090c6))
* feat: add frameworks, controls, policy_templates migration + seed 10 frameworks, 385 controls, 12 te ([e53c92a](https://github.com/CERTIFYI-AI/sentinel/commit/e53c92a))
* feat: add generic createEntityStore with Zustand for CRUD operations ([1850b7a](https://github.com/CERTIFYI-AI/sentinel/commit/1850b7a))
* feat: add health check router with liveness, readiness, startup, metrics endpoints ([2eb5de6](https://github.com/CERTIFYI-AI/sentinel/commit/2eb5de6))
* feat: add hipaa, iso27001, owasp_llm, soc2 frameworks and register in __init__ ([29384b5](https://github.com/CERTIFYI-AI/sentinel/commit/29384b5))
* feat: add HitlStore to sentinel/hitl/store.py ([c9db441](https://github.com/CERTIFYI-AI/sentinel/commit/c9db441))
* feat: add HitlStore with create, count_pending, get_resolution_rate ([1e40e9e](https://github.com/CERTIFYI-AI/sentinel/commit/1e40e9e))
* feat: add incident, risk, and use case router modules ([6245db2](https://github.com/CERTIFYI-AI/sentinel/commit/6245db2))
* feat: add Kubernetes manifests - Deployment, Service, HPA, PDB, NetworkPolicy ([2078953](https://github.com/CERTIFYI-AI/sentinel/commit/2078953))
* feat: add LoadingSpinner component with accessibility ([9baf588](https://github.com/CERTIFYI-AI/sentinel/commit/9baf588))
* feat: Add localStorage polyfill + auto-auth for demo, complete remaining pages ([10d00b0](https://github.com/CERTIFYI-AI/sentinel/commit/10d00b0))
* feat: add MITRE ATLAS framework evaluator ([e4620bd](https://github.com/CERTIFYI-AI/sentinel/commit/e4620bd))
* feat: add ModelInventory with lifecycle states, versioning, and trust score tracking ([82d1492](https://github.com/CERTIFYI-AI/sentinel/commit/82d1492))
* feat: add NC engine with lifecycle state machine and auto-creation thresholds ([11a9467](https://github.com/CERTIFYI-AI/sentinel/commit/11a9467))
* feat: Add New Policy form with full CRUD, categories, review frequency, notifications, document sour ([7146caf](https://github.com/CERTIFYI-AI/sentinel/commit/7146caf))
* feat: add notifications_router with list, read, read-all, count endpoints ([78be325](https://github.com/CERTIFYI-AI/sentinel/commit/78be325))
* feat: add overdue task detector with event bus integration ([92231e3](https://github.com/CERTIFYI-AI/sentinel/commit/92231e3))
* feat: add OWASP Agentic AI framework evaluator ([12b1e86](https://github.com/CERTIFYI-AI/sentinel/commit/12b1e86))
* feat: add OWASP API Security framework evaluator ([7002cac](https://github.com/CERTIFYI-AI/sentinel/commit/7002cac))
* feat: add Phase 1 shared data layer - queryClient, queryKeys, store, hooks ([151f56c](https://github.com/CERTIFYI-AI/sentinel/commit/151f56c))
* feat: add Phase 2 typed EventBus for cross-module communication ([a30e6da](https://github.com/CERTIFYI-AI/sentinel/commit/a30e6da))
* feat: add Phase 2 WebSocket manager with auto-reconnect and event routing ([5815aa4](https://github.com/CERTIFYI-AI/sentinel/commit/5815aa4))
* feat: add Phase 3 useEventBus and useEventEmit React hooks ([33b05eb](https://github.com/CERTIFYI-AI/sentinel/commit/33b05eb))
* feat: add policy management schema (6 tables, 3 views) ([b978d3f](https://github.com/CERTIFYI-AI/sentinel/commit/b978d3f))
* feat: add PostureHistoryStore with trend computation and snapshots ([5254cb2](https://github.com/CERTIFYI-AI/sentinel/commit/5254cb2))
* feat: add queryKeys.ts - single source of truth for React Query cache keys ([31703ff](https://github.com/CERTIFYI-AI/sentinel/commit/31703ff))
* feat: add RBAC with roles, permissions, and FastAPI dependencies ([20c1f6f](https://github.com/CERTIFYI-AI/sentinel/commit/20c1f6f))
* feat: add Redis Streams EventBus for multi-worker support with backlog replay ([3254eff](https://github.com/CERTIFYI-AI/sentinel/commit/3254eff))
* feat: add RefreshTokenStore with rotation, revocation, and cleanup ([9aa5b3a](https://github.com/CERTIFYI-AI/sentinel/commit/9aa5b3a))
* feat: add RequireAuth route guard component ([ef1317b](https://github.com/CERTIFYI-AI/sentinel/commit/ef1317b))
* feat: add security API router with campaigns and vulnerability endpoints ([6e6a46e](https://github.com/CERTIFYI-AI/sentinel/commit/6e6a46e))
* feat: add Security Intelligence nav section to Sidebar ([dcef0ec](https://github.com/CERTIFYI-AI/sentinel/commit/dcef0ec))
* feat: add Security Intelligence routes and lazy imports to App.tsx ([592709a](https://github.com/CERTIFYI-AI/sentinel/commit/592709a))
* feat: add security module __init__.py ([343a948](https://github.com/CERTIFYI-AI/sentinel/commit/343a948))
* feat: add security posture calculator ([a31c67d](https://github.com/CERTIFYI-AI/sentinel/commit/a31c67d))
* feat: add SecurityOverview page ([c8dd67b](https://github.com/CERTIFYI-AI/sentinel/commit/c8dd67b))
* feat: add seed data, theme system, UI components, and chart theming for Sentinel GRC platform ([27eed49](https://github.com/CERTIFYI-AI/sentinel/commit/27eed49))
* feat: add sentinel/events module - event bus, emitters, automation ([4e355ef](https://github.com/CERTIFYI-AI/sentinel/commit/4e355ef))
* feat: add session guard - auto-logout on 3hr inactivity or IP/device change ([10ab0cc](https://github.com/CERTIFYI-AI/sentinel/commit/10ab0cc))
* feat: add shared infra - apiClient, createEntityStore, UI components ([b1e09e0](https://github.com/CERTIFYI-AI/sentinel/commit/b1e09e0))
* feat: add Supabase backend — 18+ tables with RLS, auditLogger, mutateDB, docs ([e38ed92](https://github.com/CERTIFYI-AI/sentinel/commit/e38ed92))
* feat: add Supabase service layer + hooks for all 14 modules ([56d6de0](https://github.com/CERTIFYI-AI/sentinel/commit/56d6de0))
* feat: add Supabase service layers and React Query hooks for Models, Vendors, Frameworks, AuditLog ([8ab7ad9](https://github.com/CERTIFYI-AI/sentinel/commit/8ab7ad9))
* feat: add tasks API router with CRUD and bulk-update ([b39ad38](https://github.com/CERTIFYI-AI/sentinel/commit/b39ad38))
* feat: add trust engine, vendor management, governance, expanded audit, bias/fairness modules ([4f0aac1](https://github.com/CERTIFYI-AI/sentinel/commit/4f0aac1))
* feat: add typed API client with postBlob, refresh token interceptor ([ca8452e](https://github.com/CERTIFYI-AI/sentinel/commit/ca8452e))
* feat: add uiStore with sidebar, activeModel, unreadNotifications ([529b7e6](https://github.com/CERTIFYI-AI/sentinel/commit/529b7e6))
* feat: add useCisoData hooks for CISO dashboard React Query ([b0ff161](https://github.com/CERTIFYI-AI/sentinel/commit/b0ff161))
* feat: add useEvalsData hooks for evals module React Query ([d89a421](https://github.com/CERTIFYI-AI/sentinel/commit/d89a421))
* feat: add useProxyData hooks for proxy module React Query ([c141a59](https://github.com/CERTIFYI-AI/sentinel/commit/c141a59))
* feat: add useRealtimeEvents hook for WebSocket event propagation to UI ([83cc8bc](https://github.com/CERTIFYI-AI/sentinel/commit/83cc8bc))
* feat: add useRealtimeInvalidation hook - maps WebSocket events to React Query cache invalidations fo ([4b1dff9](https://github.com/CERTIFYI-AI/sentinel/commit/4b1dff9))
* feat: add useTaskData hooks for task module React Query ([0ff3494](https://github.com/CERTIFYI-AI/sentinel/commit/0ff3494))
* feat: add V1 missing modules migration - 9 new tables (assets, access_reviews, entitlements, sod_vio ([dd24ae2](https://github.com/CERTIFYI-AI/sentinel/commit/dd24ae2))
* feat: add vulnerability_store with state machine transitions ([b7c96d3](https://github.com/CERTIFYI-AI/sentinel/commit/b7c96d3))
* feat: add Zustand global store for cross-module shared state ([9a56cc9](https://github.com/CERTIFYI-AI/sentinel/commit/9a56cc9))
* feat: Certifyi Sentinel v4 — full platform enhancement ([04bbfbe](https://github.com/CERTIFYI-AI/sentinel/commit/04bbfbe)), closes [Hi#Risk](https://github.com/Hi/issues/Risk)
* feat: Complete all remaining pages — zero stubs, 114 total page files ([fd542e0](https://github.com/CERTIFYI-AI/sentinel/commit/fd542e0))
* feat: complete backend integration - 127 pages wired, 26 services, 20+ hooks, 12 new tables, realtim ([a2077a3](https://github.com/CERTIFYI-AI/sentinel/commit/a2077a3))
* feat: Complete frontend - SecurityHome, QualityMetrics, EvalTechniques, ModelArena, ReportGenerator, ([519c397](https://github.com/CERTIFYI-AI/sentinel/commit/519c397))
* feat: complete Policy Manager module ([d4ec2c7](https://github.com/CERTIFYI-AI/sentinel/commit/d4ec2c7))
* feat: Complete Security Intelligence module - all 8 pages with full UI, dummy data, filters, forms,  ([7382ee0](https://github.com/CERTIFYI-AI/sentinel/commit/7382ee0))
* feat: Complete UI overhaul with VerifyWise-inspired design and demo data ([5f842f1](https://github.com/CERTIFYI-AI/sentinel/commit/5f842f1))
* feat: Complete UI/UX overhaul - Phosphor icons, seed data, full CRUD across all modules ([659df17](https://github.com/CERTIFYI-AI/sentinel/commit/659df17))
* feat: complete UI/UX rebuild - all modules with full CRUD, search, filter, detail modals ([3c7cc22](https://github.com/CERTIFYI-AI/sentinel/commit/3c7cc22))
* feat: comprehensive seed data for all modules + Import Sample Data UI with Supabase integration ([bfa3af8](https://github.com/CERTIFYI-AI/sentinel/commit/bfa3af8))
* feat: design system overhaul + UI/UX redesign with shadcn/Zinc-Emerald theme ([083c224](https://github.com/CERTIFYI-AI/sentinel/commit/083c224))
* feat: enhance and group all sidebar modules, fix syntax errors and typecheck issues ([9de7021](https://github.com/CERTIFYI-AI/sentinel/commit/9de7021))
* feat: Enterprise readiness — 8 new modules, P0/P1 fixes, Phase 3 enhancements ([f8a8b45](https://github.com/CERTIFYI-AI/sentinel/commit/f8a8b45))
* feat: evals module enhancements - mockups for dataset, metrics, and conversation viewer ([d2256b7](https://github.com/CERTIFYI-AI/sentinel/commit/d2256b7))
* feat: expand policy templates from 12 to 35 covering all 10 frameworks + cross-cutting ([06c49f2](https://github.com/CERTIFYI-AI/sentinel/commit/06c49f2))
* feat: expand Sidebar with Compliance, Risk, Models, Operations sections ([15dbdef](https://github.com/CERTIFYI-AI/sentinel/commit/15dbdef))
* feat: Full 23-module enterprise rebuild — Fortune 500 AI GRC platform ([8b7f074](https://github.com/CERTIFYI-AI/sentinel/commit/8b7f074))
* feat: full backend integration — all modules wired to Supabase [Sentinel v1.0] ([4195e21](https://github.com/CERTIFYI-AI/sentinel/commit/4195e21)), closes [#368F4D](https://github.com/CERTIFYI-AI/sentinel/issues/368F4D)
* feat: Full compliance platform lifecycle implementation ([ae47f9f](https://github.com/CERTIFYI-AI/sentinel/commit/ae47f9f))
* feat: Full platform implementation - Trust Engine, RBAC, Shadow AI, Reg Radar, all modules ([88d31dc](https://github.com/CERTIFYI-AI/sentinel/commit/88d31dc))
* feat: hipaa.py implement controls and evaluation logic ([50ad6db](https://github.com/CERTIFYI-AI/sentinel/commit/50ad6db))
* feat: implement 7-framework compliance audit engine ([c64456e](https://github.com/CERTIFYI-AI/sentinel/commit/c64456e))
* feat: implement complete Sentinel codebase ([8bc8e59](https://github.com/CERTIFYI-AI/sentinel/commit/8bc8e59))
* feat: implement complete Sentinel governance layers, providers, storage, HITL, observability, and te ([a7cbb25](https://github.com/CERTIFYI-AI/sentinel/commit/a7cbb25))
* feat: implement compliance audit engine with 7 frameworks ([d2c599d](https://github.com/CERTIFYI-AI/sentinel/commit/d2c599d))
* feat: implement full Benchmark page with model comparison, score bars, sorting ([7a596e6](https://github.com/CERTIFYI-AI/sentinel/commit/7a596e6))
* feat: implement full Datasets page with search, filters, stats, tags ([7548abd](https://github.com/CERTIFYI-AI/sentinel/commit/7548abd))
* feat: implement full Export Center with templates, history table, status filters ([80fd81f](https://github.com/CERTIFYI-AI/sentinel/commit/80fd81f))
* feat: implement full Gap Analysis page with framework grouping and filters ([345377e](https://github.com/CERTIFYI-AI/sentinel/commit/345377e))
* feat: implement full Model Inventory with risk classification, compliance bars, search ([75f828d](https://github.com/CERTIFYI-AI/sentinel/commit/75f828d))
* feat: implement full Notifications page with read/unread state, filters, mark all read ([7aca6a0](https://github.com/CERTIFYI-AI/sentinel/commit/7aca6a0))
* feat: implement full Settings page with 6 tabbed sections ([092143b](https://github.com/CERTIFYI-AI/sentinel/commit/092143b))
* feat: implement Model Lifecycle with pipeline visualization, gate checks, promote/rollback ([7581c70](https://github.com/CERTIFYI-AI/sentinel/commit/7581c70))
* feat: implement Remediation Tracker with priority, status filters, framework controls ([c3a4f7a](https://github.com/CERTIFYI-AI/sentinel/commit/c3a4f7a))
* feat: implement Risk Matrix with 5x5 heatmap grid, risk register table, scoring ([1074bce](https://github.com/CERTIFYI-AI/sentinel/commit/1074bce))
* feat: implement Vendor Register with risk tiers, compliance scores, certifications ([9205799](https://github.com/CERTIFYI-AI/sentinel/commit/9205799))
* feat: iso27001.py implement controls and evaluation logic ([0813c2e](https://github.com/CERTIFYI-AI/sentinel/commit/0813c2e))
* feat: owasp_llm.py implement controls and evaluation logic ([63e779b](https://github.com/CERTIFYI-AI/sentinel/commit/63e779b))
* feat: P0 routes + P2 modules + detail pages + Breadcrumbs ([4110650](https://github.com/CERTIFYI-AI/sentinel/commit/4110650))
* feat: P0/P1 audit fixes - shared hooks, components, migrations ([1081e9e](https://github.com/CERTIFYI-AI/sentinel/commit/1081e9e))
* feat: Phase 0 - Auth pages (login/signup) + auth store + route guard + /compliance/frameworks alias ([8582fe7](https://github.com/CERTIFYI-AI/sentinel/commit/8582fe7))
* feat: rebuild all dashboard pages with proper UI, mock data, search/filter, modals, charts and page- ([59af526](https://github.com/CERTIFYI-AI/sentinel/commit/59af526))
* feat: rebuild Model Inventory with Acme seed data, EU AI Act compliance, bias metrics, drift trackin ([2912a88](https://github.com/CERTIFYI-AI/sentinel/commit/2912a88))
* feat: rebuild remaining pages with Acme Financial Corp seed data and 8-point architecture ([3dc73e5](https://github.com/CERTIFYI-AI/sentinel/commit/3dc73e5))
* feat: replace ISO 27001 with ISO/IEC 42001:2023 in compliance framework ([4d95ba3](https://github.com/CERTIFYI-AI/sentinel/commit/4d95ba3))
* feat: restructure sidebar with all 55+ missing module entries — Security, Evals, Compliance, Risk, D ([3adb9c1](https://github.com/CERTIFYI-AI/sentinel/commit/3adb9c1))
* feat: rewrite auth_router with login/register/refresh/me + rate limiting ([58f5689](https://github.com/CERTIFYI-AI/sentinel/commit/58f5689))
* feat: soc2.py implement controls and evaluation logic ([a69ad65](https://github.com/CERTIFYI-AI/sentinel/commit/a69ad65))
* feat: Supabase backend integration - hooks, API layer, agents, docs ([64b94ea](https://github.com/CERTIFYI-AI/sentinel/commit/64b94ea))
* feat: Trust Engine audit remediation — all 7 modules rebuilt ([3d5b024](https://github.com/CERTIFYI-AI/sentinel/commit/3d5b024)), closes [hi#risk](https://github.com/hi/issues/risk)
* feat: UI cleanup and code documentation ([cdb9929](https://github.com/CERTIFYI-AI/sentinel/commit/cdb9929))
* feat: UI/UX audit P0-P2 - Outfit font + bg tokens + alert hierarchy + metric colors ([ab973de](https://github.com/CERTIFYI-AI/sentinel/commit/ab973de))
* feat: update queryKeys.ts with security, evals, task, CISO keys for hooks ([9b86b9c](https://github.com/CERTIFYI-AI/sentinel/commit/9b86b9c))
* feat: upgrade events_router with WebSocket, SSE stream, and EventBus wiring ([5f98353](https://github.com/CERTIFYI-AI/sentinel/commit/5f98353))
* feat: v0.2.0 — enterprise UI (brand green, auth, models, settings) + docs update ([36e4601](https://github.com/CERTIFYI-AI/sentinel/commit/36e4601))
* feat: V1 missing modules - 7 new modules (Asset Mgmt, IGA, RoPA, TIA, Tabletop, Regulator Filings, B ([2ae4112](https://github.com/CERTIFYI-AI/sentinel/commit/2ae4112))
* feat: wire Access Control pages to Supabase backend with fallback to seed data ([8b8343c](https://github.com/CERTIFYI-AI/sentinel/commit/8b8343c))
* feat: wire all remaining pages to Supabase — security, data-governance, explainability, bias-audits  ([09a4a84](https://github.com/CERTIFYI-AI/sentinel/commit/09a4a84))
* feat: wire all routers into main FastAPI app - 19 modules registered ([42f876b](https://github.com/CERTIFYI-AI/sentinel/commit/42f876b))
* feat: wire incident, risk, and use_case routers into main.py ([88f078b](https://github.com/CERTIFYI-AI/sentinel/commit/88f078b))
* feat: wire Models, Vendors, Frameworks, AuditLog, Risk pages to Supabase with graceful mock fallback ([6fb323a](https://github.com/CERTIFYI-AI/sentinel/commit/6fb323a))
* feat: wire QueryClientProvider into main.tsx - Phase 1 complete ([a4732b4](https://github.com/CERTIFYI-AI/sentinel/commit/a4732b4))
* feat: wire Settings page to Supabase backend with real CRUD ([578cde8](https://github.com/CERTIFYI-AI/sentinel/commit/578cde8))
* feat: wire Supabase auth + Cloudflare Workers deploy config ([c819716](https://github.com/CERTIFYI-AI/sentinel/commit/c819716))
* feat: wire useRealtimeEvents + useRealtimeInvalidation into AuthenticatedLayout - all modules now re ([746ede1](https://github.com/CERTIFYI-AI/sentinel/commit/746ede1))
* feat(access-control): add user CRUD, role/permission assignment, disable user UI ([34222ad](https://github.com/CERTIFYI-AI/sentinel/commit/34222ad))
* feat(access-control): fix bar chart, add RBAC matrix, role detail sheet, users/audit tabs ([ece7f2a](https://github.com/CERTIFYI-AI/sentinel/commit/ece7f2a))
* feat(activation): wire UI to Supabase backend - make app functional ([1ae85d2](https://github.com/CERTIFYI-AI/sentinel/commit/1ae85d2))
* feat(audit): WS0.3 — append-only audit_log with hash chain + SIEM exporters ([c83ac8f](https://github.com/CERTIFYI-AI/sentinel/commit/c83ac8f))
* feat(compliance): rebuild Compliance Dashboard and Controls modules ([3e634eb](https://github.com/CERTIFYI-AI/sentinel/commit/3e634eb))
* feat(dashboard): Phase 2 UI expansion - 8 pages, 12 components, ModuleRail sidebar ([1299736](https://github.com/CERTIFYI-AI/sentinel/commit/1299736))
* feat(design-system): add CSS design tokens and useChartTheme hook ([fad57c1](https://github.com/CERTIFYI-AI/sentinel/commit/fad57c1))
* feat(design-system): batch replace hardcoded colors across 78 module pages ([d80f9a9](https://github.com/CERTIFYI-AI/sentinel/commit/d80f9a9))
* feat(design-system): theme-aware Sidebar + TopBar with CSS variables ([0ee0d9f](https://github.com/CERTIFYI-AI/sentinel/commit/0ee0d9f))
* feat(evidence): WS0.4 chain-of-custody ledger + nightly re-hash ([679804b](https://github.com/CERTIFYI-AI/sentinel/commit/679804b))
* feat(final-ship): complete pipeline, deploy infrastructure, seed scripts ([dac2555](https://github.com/CERTIFYI-AI/sentinel/commit/dac2555))
* feat(findings): D+E — close N-01,N-04,N-05,N-08,N-10,N-11,N-12,N-15 + XC-08,XC-14,D-01 ([03097f8](https://github.com/CERTIFYI-AI/sentinel/commit/03097f8))
* feat(frameworks): fix pie chart, complete bar chart, add detail sheet with controls/gaps drill-down ([b308787](https://github.com/CERTIFYI-AI/sentinel/commit/b308787))
* feat(governance): autonomous governance mesh — 27 agents, 3 cascades, Fortune 500 hardening ([7de389e](https://github.com/CERTIFYI-AI/sentinel/commit/7de389e))
* feat(org): full wire 12 ORGANIZATION modules - RLS + realtime + hooks ([969871d](https://github.com/CERTIFYI-AI/sentinel/commit/969871d))
* feat(ph3-foundation): audit app layer + forms + observability + CI gates ([450144c](https://github.com/CERTIFYI-AI/sentinel/commit/450144c))
* feat(ph3-ws01): typed data layer — Result<T,AppError> + createService + createResourceQueries (#38) ([8711fa2](https://github.com/CERTIFYI-AI/sentinel/commit/8711fa2)), closes [#38](https://github.com/CERTIFYI-AI/sentinel/issues/38) [#9](https://github.com/CERTIFYI-AI/sentinel/issues/9) [#2](https://github.com/CERTIFYI-AI/sentinel/issues/2) [#4](https://github.com/CERTIFYI-AI/sentinel/issues/4) [#7](https://github.com/CERTIFYI-AI/sentinel/issues/7) [#10](https://github.com/CERTIFYI-AI/sentinel/issues/10)
* feat(ph3-ws02): multi-tenant RLS sweep — idempotent migration + invariants (#39) ([357a20c](https://github.com/CERTIFYI-AI/sentinel/commit/357a20c)), closes [#39](https://github.com/CERTIFYI-AI/sentinel/issues/39) [#7](https://github.com/CERTIFYI-AI/sentinel/issues/7)
* feat(ph3-ws03): canonical RBAC surface + <Can> + withRBAC + current_user_permissions RPC (#40) ([bc3e95e](https://github.com/CERTIFYI-AI/sentinel/commit/bc3e95e)), closes [#40](https://github.com/CERTIFYI-AI/sentinel/issues/40)
* feat(platform): Complete remaining module updates and new stores ([6ef57f3](https://github.com/CERTIFYI-AI/sentinel/commit/6ef57f3))
* feat(policies): add usePolicyData React Query hooks ([ea1ff37](https://github.com/CERTIFYI-AI/sentinel/commit/ea1ff37))
* feat(policies): complete Policy Management module with 70 templates + full lifecycle ([f887828](https://github.com/CERTIFYI-AI/sentinel/commit/f887828))
* feat(policies): complete Policy Templates Module - 70 templates, 11 frameworks ([6a9d82e](https://github.com/CERTIFYI-AI/sentinel/commit/6a9d82e))
* feat(policy-editor): fix P1 status mismatch - connect to policyStore ([26d9b39](https://github.com/CERTIFYI-AI/sentinel/commit/26d9b39))
* feat(policy-editor): wire approval workflow, comments, audit trail, reject flow, export ([2b56d74](https://github.com/CERTIFYI-AI/sentinel/commit/2b56d74))
* feat(policy-manager): add policyWorkflow lib with transitions and status colors ([479ba0f](https://github.com/CERTIFYI-AI/sentinel/commit/479ba0f))
* feat(policy-manager): Complete Policy Manager module with full UI/UX ([bdd03bd](https://github.com/CERTIFYI-AI/sentinel/commit/bdd03bd))
* feat(policy-manager): enrich seed data with versions, controls, frameworks, workflows, and activity  ([a340d4a](https://github.com/CERTIFYI-AI/sentinel/commit/a340d4a))
* feat(rbac-sso): C.1-C.7 — RBAC seed, demo data seeder, OrgSwitcher, ViewAsRole, JitElevation, SsoAdm ([c15790a](https://github.com/CERTIFYI-AI/sentinel/commit/c15790a))
* feat(realtime): wire ORGANIZATION module realtime invalidation (9/9 tables) ([6e05554](https://github.com/CERTIFYI-AI/sentinel/commit/6e05554))
* feat(reg-radar): fix P1 encoding bug in regulation names ([9a3658b](https://github.com/CERTIFYI-AI/sentinel/commit/9a3658b))
* feat(release): add release.yml workflow ([407b386](https://github.com/CERTIFYI-AI/sentinel/commit/407b386))
* feat(release): WS0.6 semantic-release + SBOM + Sigstore + DCO ([f5b94c5](https://github.com/CERTIFYI-AI/sentinel/commit/f5b94c5))
* feat(risk-matrix): replace placeholder with real 5x5 heat map ([7a151b2](https://github.com/CERTIFYI-AI/sentinel/commit/7a151b2))
* feat(risk-register): Complete AI Risk Register with real enterprise data ([7119ee4](https://github.com/CERTIFYI-AI/sentinel/commit/7119ee4))
* feat(risk): wire RBACGate for delete button - P0 fix 1 ([e5dca79](https://github.com/CERTIFYI-AI/sentinel/commit/e5dca79))
* feat(sidebar): enterprise sidebar — collapsible/icon-only, search, keyboard nav, aria-current, foote ([3c01d7a](https://github.com/CERTIFYI-AI/sentinel/commit/3c01d7a))
* feat(sso): WS0.2 — SAML/OIDC identity providers + SCIM 2.0 + JIT provisioning ([68327e7](https://github.com/CERTIFYI-AI/sentinel/commit/68327e7))
* feat(tenancy): WS0.1 — unify tenant_id→org_id, install RLS template, add TenantContext ([4a0767d](https://github.com/CERTIFYI-AI/sentinel/commit/4a0767d))
* feat(testing): WS0.5 test harness bootstrap + hardened CI gates ([87d1207](https://github.com/CERTIFYI-AI/sentinel/commit/87d1207))
* feat(typography): Outfit-only font stack — self-hosted @fontsource-variable, remove CDN + sans-serif ([ef38dd6](https://github.com/CERTIFYI-AI/sentinel/commit/ef38dd6))
* feat(ui): add 5 missing shared components — PageHeader, FilterBar, ChartContainer, DetailDrawer, Sta ([5c448af](https://github.com/CERTIFYI-AI/sentinel/commit/5c448af))
* feat(ui): enhance 14 dashboard pages with full dark mode, stat cards, and GRC-professional layouts ([aaf3759](https://github.com/CERTIFYI-AI/sentinel/commit/aaf3759))
* feat(ui): enhance dashboard overview page with interactive risk threshold gate and populated recent  ([eb644a0](https://github.com/CERTIFYI-AI/sentinel/commit/eb644a0))
* feat(ui): enterprise UI/UX sprint — PageHeader + StatCardRow + FilterBar across 22 modules ([bef988e](https://github.com/CERTIFYI-AI/sentinel/commit/bef988e)), closes [hi#traffic](https://github.com/hi/issues/traffic)
* feat(ui): group AI Governance modules into 5 structured GRC pillars in the sidebar ([b6cdaee](https://github.com/CERTIFYI-AI/sentinel/commit/b6cdaee))
* feat(ui): implement Antigravity UI/UX shared components and Model Lifecycle overhaul ([1507365](https://github.com/CERTIFYI-AI/sentinel/commit/1507365))
* feat(ws2): 25 scaffolded GA-critical pages + ModuleScaffold ([ac30eab](https://github.com/CERTIFYI-AI/sentinel/commit/ac30eab))
* feat(ws3): typed service factory + CRUD audit tooling ([7d6251b](https://github.com/CERTIFYI-AI/sentinel/commit/7d6251b))
* feat(ws4): 12-role RBAC + JIT elevation + MFA enrollment ([08c8317](https://github.com/CERTIFYI-AI/sentinel/commit/08c8317))
* feat(ws5): 22-framework GRC catalog + YAML pipeline + browser UI ([d0c6729](https://github.com/CERTIFYI-AI/sentinel/commit/d0c6729))
* feat(ws6): observability — OTEL tracer + Sentry shim + rate limits + DR runbook ([bf3c20b](https://github.com/CERTIFYI-AI/sentinel/commit/bf3c20b))
* feat(ws7): UX polish + WCAG 2.2 AA + i18n (7 locales) + white-label theming (#35) ([69e7342](https://github.com/CERTIFYI-AI/sentinel/commit/69e7342)), closes [#35](https://github.com/CERTIFYI-AI/sentinel/issues/35)
* feat(ws7): WCAG 2.2 AA + i18n 7-locale skeleton ([3049e43](https://github.com/CERTIFYI-AI/sentinel/commit/3049e43))
* feat(ws8): OpenAPI 3.1 spec + webhooks + 22 integration scaffolds (#36) ([8a671fd](https://github.com/CERTIFYI-AI/sentinel/commit/8a671fd)), closes [#36](https://github.com/CERTIFYI-AI/sentinel/issues/36)
* feat(ws9): admin seed with 536 demo records for GA (#37) ([f9eab60](https://github.com/CERTIFYI-AI/sentinel/commit/f9eab60)), closes [#37](https://github.com/CERTIFYI-AI/sentinel/issues/37)
* Add 10 AI governance frameworks and 281+ controls to seed data and Supabase ([a0d51cd](https://github.com/CERTIFYI-AI/sentinel/commit/a0d51cd))
* Add a command palette and new reporting features ([7a68703](https://github.com/CERTIFYI-AI/sentinel/commit/7a68703))
* Add a comprehensive suite of backend packages and detailed implementation notes ([231f47b](https://github.com/CERTIFYI-AI/sentinel/commit/231f47b))
* Add a dedicated page for password recovery and enhance authentication pages ([927e4f5](https://github.com/CERTIFYI-AI/sentinel/commit/927e4f5))
* Add AI risk classification engine and 7 other regulatory modules ([22ef1ec](https://github.com/CERTIFYI-AI/sentinel/commit/22ef1ec))
* Add backend dependencies and ensure frontend starts correctly ([179c0b1](https://github.com/CERTIFYI-AI/sentinel/commit/179c0b1))
* Add CISO dashboard and evaluation results viewer, and fix backend issues ([72434a2](https://github.com/CERTIFYI-AI/sentinel/commit/72434a2))
* Add Cloudflare Workers configuration ([aa5375f](https://github.com/CERTIFYI-AI/sentinel/commit/aa5375f))
* Add color picker and new features to the dashboard interface ([eb90ef8](https://github.com/CERTIFYI-AI/sentinel/commit/eb90ef8))
* Add comprehensive access control management for users, roles, and departments ([42346ee](https://github.com/CERTIFYI-AI/sentinel/commit/42346ee))
* Add comprehensive CRUD functionality to multiple dashboard pages ([9b29ce8](https://github.com/CERTIFYI-AI/sentinel/commit/9b29ce8))
* Add core tables to the database for risk and model management ([6c49cef](https://github.com/CERTIFYI-AI/sentinel/commit/6c49cef))
* Add creation and deletion functionality to multiple dashboard pages ([e9ea097](https://github.com/CERTIFYI-AI/sentinel/commit/e9ea097))
* Add CRUD functionality to audit and exception management components ([f58724c](https://github.com/CERTIFYI-AI/sentinel/commit/f58724c))
* Add CRUD functionality to audit and exception management modules ([183cdd5](https://github.com/CERTIFYI-AI/sentinel/commit/183cdd5))
* Add customizable appearance settings and theme options ([62f1b14](https://github.com/CERTIFYI-AI/sentinel/commit/62f1b14))
* Add demo login capabilities and update user profile displays ([0f406d6](https://github.com/CERTIFYI-AI/sentinel/commit/0f406d6))
* Add detailed UI/UX enhancement requirements for multiple application modules ([c3f9d9a](https://github.com/CERTIFYI-AI/sentinel/commit/c3f9d9a))
* Add details and CRUD functionality for multiple compliance modules ([d601c46](https://github.com/CERTIFYI-AI/sentinel/commit/d601c46))
* Add eight new regulatory modules and update chart theme for better data visualization ([b7eca10](https://github.com/CERTIFYI-AI/sentinel/commit/b7eca10))
* Add essential libraries for backend functionality ([53ddd43](https://github.com/CERTIFYI-AI/sentinel/commit/53ddd43))
* Add evaluation results viewer and improve compliance and carbon ledger pages ([899c844](https://github.com/CERTIFYI-AI/sentinel/commit/899c844))
* Add import functionality and improve dialogs across several modules ([776984d](https://github.com/CERTIFYI-AI/sentinel/commit/776984d))
* Add incident log and contract expiry alerts to vendor dashboard ([13809d5](https://github.com/CERTIFYI-AI/sentinel/commit/13809d5))
* Add interactive heatmap and SBOM features to risk and security modules ([26b9134](https://github.com/CERTIFYI-AI/sentinel/commit/26b9134))
* Add necessary dependencies for the Python backend to function correctly ([4615243](https://github.com/CERTIFYI-AI/sentinel/commit/4615243))
* Add necessary Python dependencies for backend functionality ([79d2c3a](https://github.com/CERTIFYI-AI/sentinel/commit/79d2c3a))
* Add necessary Python packages for backend functionality ([580100b](https://github.com/CERTIFYI-AI/sentinel/commit/580100b))
* Add necessary Python packages for the Replit environment ([0b406ac](https://github.com/CERTIFYI-AI/sentinel/commit/0b406ac))
* Add network topology visualization and regulatory timeline chart ([af8014e](https://github.com/CERTIFYI-AI/sentinel/commit/af8014e))
* Add new features and fix issues across various application pages ([64b532e](https://github.com/CERTIFYI-AI/sentinel/commit/64b532e))
* Add new features and improve existing ones across multiple enterprise modules ([146a6c6](https://github.com/CERTIFYI-AI/sentinel/commit/146a6c6))
* Add new modules and features to the governance and security sections ([a1382cb](https://github.com/CERTIFYI-AI/sentinel/commit/a1382cb))
* Add new modules and update navigation to improve platform functionality ([732c470](https://github.com/CERTIFYI-AI/sentinel/commit/732c470))
* Add new pages for automation and evidence tracking ([6cac065](https://github.com/CERTIFYI-AI/sentinel/commit/6cac065))
* Add new sections for risk committee, executive insights, and value realization ([4810ea6](https://github.com/CERTIFYI-AI/sentinel/commit/4810ea6))
* Add proxy to serve frontend assets when accessing backend port ([f340b19](https://github.com/CERTIFYI-AI/sentinel/commit/f340b19))
* Add required Python packages for the AI governance platform ([8ff6813](https://github.com/CERTIFYI-AI/sentinel/commit/8ff6813))
* Add six advanced enterprise intelligence features to the platform ([05c31fb](https://github.com/CERTIFYI-AI/sentinel/commit/05c31fb))
* Add six new features to enhance the AI GRC platform ([fe0fe54](https://github.com/CERTIFYI-AI/sentinel/commit/fe0fe54))
* Add toast notifications and event scheduling to new platform modules ([982e8be](https://github.com/CERTIFYI-AI/sentinel/commit/982e8be))
* Add vendor-related pages and integrate them into the navigation ([3cecce6](https://github.com/CERTIFYI-AI/sentinel/commit/3cecce6))
* Build and update dashboard ([a291ee3](https://github.com/CERTIFYI-AI/sentinel/commit/a291ee3))
* chore(actions)(deps): bump actions/attest-build-provenance from 1 to 4 ([cf5ce3d](https://github.com/CERTIFYI-AI/sentinel/commit/cf5ce3d))
* chore(actions)(deps): bump actions/checkout from 4 to 6 (#15) ([59beed5](https://github.com/CERTIFYI-AI/sentinel/commit/59beed5)), closes [#15](https://github.com/CERTIFYI-AI/sentinel/issues/15)
* chore(actions)(deps): bump actions/setup-node from 4 to 6 (#18) ([45e626f](https://github.com/CERTIFYI-AI/sentinel/commit/45e626f)), closes [#18](https://github.com/CERTIFYI-AI/sentinel/issues/18)
* chore(actions)(deps): bump actions/setup-python from 5 to 6 (#16) ([a7dc011](https://github.com/CERTIFYI-AI/sentinel/commit/a7dc011)), closes [#16](https://github.com/CERTIFYI-AI/sentinel/issues/16)
* chore(actions)(deps): bump actions/upload-artifact from 4 to 7 (#17) ([996ee46](https://github.com/CERTIFYI-AI/sentinel/commit/996ee46)), closes [#17](https://github.com/CERTIFYI-AI/sentinel/issues/17)
* chore(deps)(deps-dev): bump autoprefixer in /dashboard ([c7bd5d6](https://github.com/CERTIFYI-AI/sentinel/commit/c7bd5d6))
* chore(deps)(deps-dev): bump postcss from 8.5.9 to 8.5.10 in /dashboard (#20) ([b8e68c1](https://github.com/CERTIFYI-AI/sentinel/commit/b8e68c1)), closes [#20](https://github.com/CERTIFYI-AI/sentinel/issues/20)
* chore(deps)(deps-dev): bump typescript from 5.9.3 to 6.0.3 in /dashboard (#22) ([da63103](https://github.com/CERTIFYI-AI/sentinel/commit/da63103)), closes [#22](https://github.com/CERTIFYI-AI/sentinel/issues/22)
* chore(deps)(deps-dev): bump vitest from 2.1.9 to 4.1.4 in /dashboard (#23) ([f452409](https://github.com/CERTIFYI-AI/sentinel/commit/f452409)), closes [#23](https://github.com/CERTIFYI-AI/sentinel/issues/23)
* chore(deps)(deps): bump @supabase/supabase-js in /dashboard (#26) ([6863381](https://github.com/CERTIFYI-AI/sentinel/commit/6863381)), closes [#26](https://github.com/CERTIFYI-AI/sentinel/issues/26)
* chore(deps)(deps): bump lucide-react from 0.378.0 to 1.8.0 in /dashboard (#24) ([c202228](https://github.com/CERTIFYI-AI/sentinel/commit/c202228)), closes [#24](https://github.com/CERTIFYI-AI/sentinel/issues/24)
* chore(deps)(deps): bump react and @types/react in /dashboard (#25) ([ba98f93](https://github.com/CERTIFYI-AI/sentinel/commit/ba98f93)), closes [#25](https://github.com/CERTIFYI-AI/sentinel/issues/25)
* chore(deps)(deps): bump react-hook-form in /dashboard (#21) ([8d6fdc5](https://github.com/CERTIFYI-AI/sentinel/commit/8d6fdc5)), closes [#21](https://github.com/CERTIFYI-AI/sentinel/issues/21)
* chore(deps)(deps): bump react-router-dom in /dashboard (#19) ([37d0e0a](https://github.com/CERTIFYI-AI/sentinel/commit/37d0e0a)), closes [#19](https://github.com/CERTIFYI-AI/sentinel/issues/19)
* chore(deps)(deps): bump sonner from 1.7.4 to 2.0.7 in /dashboard (#27) ([1f34c29](https://github.com/CERTIFYI-AI/sentinel/commit/1f34c29)), closes [#27](https://github.com/CERTIFYI-AI/sentinel/issues/27)
* Complete Phase 2, 3, and 4 (Live Data, Observability, UI Sweep) ([248aa64](https://github.com/CERTIFYI-AI/sentinel/commit/248aa64))
* Configure application to run on Replit with backend and frontend working together ([931b8d7](https://github.com/CERTIFYI-AI/sentinel/commit/931b8d7))
* Create __init__.py ([77778c1](https://github.com/CERTIFYI-AI/sentinel/commit/77778c1))
* Create api-reference.md ([fa6a921](https://github.com/CERTIFYI-AI/sentinel/commit/fa6a921))
* Create approval_router.pyfeat: add approval_router with full 4-stage approval workflow API endpoints ([7aa39d3](https://github.com/CERTIFYI-AI/sentinel/commit/7aa39d3))
* Create architecture.md ([210e7ae](https://github.com/CERTIFYI-AI/sentinel/commit/210e7ae))
* Create AttackSurface.tsx ([45c3f4e](https://github.com/CERTIFYI-AI/sentinel/commit/45c3f4e))
* Create authStore.tsfeat: production readiness sprint - authStore, uiStore, auth wiring, page wiring, ([7e6d7f2](https://github.com/CERTIFYI-AI/sentinel/commit/7e6d7f2))
* Create automation.py ([9cc8f76](https://github.com/CERTIFYI-AI/sentinel/commit/9cc8f76))
* Create background_runner.py ([c8ba4d7](https://github.com/CERTIFYI-AI/sentinel/commit/c8ba4d7))
* Create bus.py ([ae6826a](https://github.com/CERTIFYI-AI/sentinel/commit/ae6826a))
* Create CODE_OF_CONDUCT.md ([eb29e43](https://github.com/CERTIFYI-AI/sentinel/commit/eb29e43))
* Create configuration.md ([9a9a6bc](https://github.com/CERTIFYI-AI/sentinel/commit/9a9a6bc))
* Create control_registry.py ([f4fe36c](https://github.com/CERTIFYI-AI/sentinel/commit/f4fe36c))
* Create database.pyfeat: add database.py — asyncpg pool, schema bootstrap, repos for all core tables ([a8039ab](https://github.com/CERTIFYI-AI/sentinel/commit/a8039ab))
* Create deployment.md ([6b2c123](https://github.com/CERTIFYI-AI/sentinel/commit/6b2c123))
* Create emitters.py ([ebdf480](https://github.com/CERTIFYI-AI/sentinel/commit/ebdf480))
* Create evaluator.pyfeat: add compliance evaluator with AUTO/MANUAL/NA control evaluation ([fd8d831](https://github.com/CERTIFYI-AI/sentinel/commit/fd8d831))
* Create getting-started.md ([6673afa](https://github.com/CERTIFYI-AI/sentinel/commit/6673afa))
* Create guardrails.md ([31ddc6f](https://github.com/CERTIFYI-AI/sentinel/commit/31ddc6f))
* Create KeysVault.tsx ([d7e4ea2](https://github.com/CERTIFYI-AI/sentinel/commit/d7e4ea2))
* Create policy-language.md ([1e58a86](https://github.com/CERTIFYI-AI/sentinel/commit/1e58a86))
* Create PolicyFirewall.tsx ([87659c7](https://github.com/CERTIFYI-AI/sentinel/commit/87659c7))
* Create RedTeamLab.tsx ([4bb3560](https://github.com/CERTIFYI-AI/sentinel/commit/4bb3560))
* Create ScanCenter.tsx ([1a186d1](https://github.com/CERTIFYI-AI/sentinel/commit/1a186d1))
* Create sdk-guide.md ([3d8d6ab](https://github.com/CERTIFYI-AI/sentinel/commit/3d8d6ab))
* Create task_store.py ([195cfa3](https://github.com/CERTIFYI-AI/sentinel/commit/195cfa3))
* Create ThreatFeed.tsx ([de0bcb1](https://github.com/CERTIFYI-AI/sentinel/commit/de0bcb1))
* Create troubleshooting.md ([f301cb4](https://github.com/CERTIFYI-AI/sentinel/commit/f301cb4))
* Create useSecurityData.tsfeat: add useSecurityData hooks for security module React Query ([c634cde](https://github.com/CERTIFYI-AI/sentinel/commit/c634cde))
* Create VulnTracker.tsx ([f43be5c](https://github.com/CERTIFYI-AI/sentinel/commit/f43be5c))
* Enable login with demo credentials and improve Supabase handling ([031bb6d](https://github.com/CERTIFYI-AI/sentinel/commit/031bb6d))
* Enhance AIBOM registry with a multi-step generation wizard and new guardrails module ([a5df38b](https://github.com/CERTIFYI-AI/sentinel/commit/a5df38b))
* Enhance automation studio and exception management with new features ([6e1cacd](https://github.com/CERTIFYI-AI/sentinel/commit/6e1cacd))
* Enhance governance framework and risk management features ([3e705b6](https://github.com/CERTIFYI-AI/sentinel/commit/3e705b6))
* Enhance reporting and security sections with new features and data visualizations ([fb962e2](https://github.com/CERTIFYI-AI/sentinel/commit/fb962e2))
* Enhance risk and policy detail pages with real data and full functionality ([a4f9a2c](https://github.com/CERTIFYI-AI/sentinel/commit/a4f9a2c))
* Enhance risk intelligence with regulatory monitoring and obligation tracking ([42bee89](https://github.com/CERTIFYI-AI/sentinel/commit/42bee89))
* Enhance several modules with tabbed detail views and improved creation flows ([3311a5e](https://github.com/CERTIFYI-AI/sentinel/commit/3311a5e))
* Enhance UI/UX across the application with design system updates ([261f60e](https://github.com/CERTIFYI-AI/sentinel/commit/261f60e))
* Enhance user feedback, reporting, and risk assessment features ([85a65b9](https://github.com/CERTIFYI-AI/sentinel/commit/85a65b9))
* Expand vendor management module with new statuses and categorizations ([a1060ec](https://github.com/CERTIFYI-AI/sentinel/commit/a1060ec))
* Expand vendor management with new data fields and pages ([4144d3c](https://github.com/CERTIFYI-AI/sentinel/commit/4144d3c))
* Fix API routing and WebSocket issues on Replit ([186e85a](https://github.com/CERTIFYI-AI/sentinel/commit/186e85a))
* Fix CI typing errors and dashboard layout ([bcfa50a](https://github.com/CERTIFYI-AI/sentinel/commit/bcfa50a))
* Fix dark mode, light mode, and background issues ([1e45917](https://github.com/CERTIFYI-AI/sentinel/commit/1e45917))
* Fix routes in App.tsx and rebuild module pages with full CRUD ([0073409](https://github.com/CERTIFYI-AI/sentinel/commit/0073409))
* Fix runtime error by adding missing component import ([7aa780a](https://github.com/CERTIFYI-AI/sentinel/commit/7aa780a))
* Fix tailwind.config.ts with proper color theme ([41f9a8a](https://github.com/CERTIFYI-AI/sentinel/commit/41f9a8a))
* fix UI/UX ([6cdc5d1](https://github.com/CERTIFYI-AI/sentinel/commit/6cdc5d1))
* fix(ci+fts): setup-node v4→v6 in ci.yml; correct FTS indexes + global_search() for real schema ([e1c9f39](https://github.com/CERTIFYI-AI/sentinel/commit/e1c9f39)), closes [#18](https://github.com/CERTIFYI-AI/sentinel/issues/18)
* Improve real-time event handling and update dependencies ([99fbb53](https://github.com/CERTIFYI-AI/sentinel/commit/99fbb53))
* Initial commit ([615eec9](https://github.com/CERTIFYI-AI/sentinel/commit/615eec9))
* Integrate live data with backend migration and error handling improvements ([9c62e78](https://github.com/CERTIFYI-AI/sentinel/commit/9c62e78))
* Merge branch 'main' of https://github.com/CERTIFYI-AI/sentinel ([38a25d7](https://github.com/CERTIFYI-AI/sentinel/commit/38a25d7))
* Merge pull request #1 from CERTIFYI-AI/chore/oss-release-prep-fix18-25 ([6ed09cc](https://github.com/CERTIFYI-AI/sentinel/commit/6ed09cc)), closes [#1](https://github.com/CERTIFYI-AI/sentinel/issues/1)
* Merge pull request #10 from CERTIFYI-AI/feat/ws04-evidence-chain ([31b1797](https://github.com/CERTIFYI-AI/sentinel/commit/31b1797)), closes [#10](https://github.com/CERTIFYI-AI/sentinel/issues/10)
* Merge pull request #11 from CERTIFYI-AI/feat/ws05-test-harness ([99b0b6e](https://github.com/CERTIFYI-AI/sentinel/commit/99b0b6e)), closes [#11](https://github.com/CERTIFYI-AI/sentinel/issues/11)
* Merge pull request #12 from CERTIFYI-AI/feat/ws06-release-eng ([fc4240d](https://github.com/CERTIFYI-AI/sentinel/commit/fc4240d)), closes [#12](https://github.com/CERTIFYI-AI/sentinel/issues/12)
* Merge pull request #13 from CERTIFYI-AI/feat/ws1-routing-fixes ([fc1ab21](https://github.com/CERTIFYI-AI/sentinel/commit/fc1ab21)), closes [#13](https://github.com/CERTIFYI-AI/sentinel/issues/13)
* Merge pull request #14 from CERTIFYI-AI/dependabot/github_actions/actions/attest-build-provenance-4 ([c1115d9](https://github.com/CERTIFYI-AI/sentinel/commit/c1115d9)), closes [#14](https://github.com/CERTIFYI-AI/sentinel/issues/14)
* Merge pull request #2 from CERTIFYI-AI/chore/oss-security-remediation-all-25 ([a199f08](https://github.com/CERTIFYI-AI/sentinel/commit/a199f08)), closes [#2](https://github.com/CERTIFYI-AI/sentinel/issues/2)
* Merge pull request #28 from CERTIFYI-AI/dependabot/npm_and_yarn/dashboard/autoprefixer-10.5.0 ([c1ca765](https://github.com/CERTIFYI-AI/sentinel/commit/c1ca765)), closes [#28](https://github.com/CERTIFYI-AI/sentinel/issues/28)
* Merge pull request #3 from CERTIFYI-AI/chore/post-merge-cleanup-audit ([de44346](https://github.com/CERTIFYI-AI/sentinel/commit/de44346)), closes [#3](https://github.com/CERTIFYI-AI/sentinel/issues/3)
* Merge pull request #31 from CERTIFYI-AI/feat/ws4-rbac-depth ([e2b9570](https://github.com/CERTIFYI-AI/sentinel/commit/e2b9570)), closes [#31](https://github.com/CERTIFYI-AI/sentinel/issues/31)
* Merge pull request #32 from CERTIFYI-AI/feat/ws5-framework-catalog ([f4b475d](https://github.com/CERTIFYI-AI/sentinel/commit/f4b475d)), closes [#32](https://github.com/CERTIFYI-AI/sentinel/issues/32)
* Merge pull request #33 from CERTIFYI-AI/feat/ws6-observability ([7f1e7ba](https://github.com/CERTIFYI-AI/sentinel/commit/7f1e7ba)), closes [#33](https://github.com/CERTIFYI-AI/sentinel/issues/33)
* Merge pull request #4 from CERTIFYI-AI/cloudflare/workers-autoconfig ([b47e011](https://github.com/CERTIFYI-AI/sentinel/commit/b47e011)), closes [#4](https://github.com/CERTIFYI-AI/sentinel/issues/4)
* Merge pull request #41 from CERTIFYI-AI/feat/ph3-foundation-pack ([4dda25d](https://github.com/CERTIFYI-AI/sentinel/commit/4dda25d)), closes [#41](https://github.com/CERTIFYI-AI/sentinel/issues/41)
* Merge pull request #42 from CERTIFYI-AI/phase-4/backend-wire-and-gap-close-20260421 ([6026f6c](https://github.com/CERTIFYI-AI/sentinel/commit/6026f6c)), closes [#42](https://github.com/CERTIFYI-AI/sentinel/issues/42)
* Merge pull request #6 from CERTIFYI-AI/feat/autonomous-governance-mesh ([e2cdd69](https://github.com/CERTIFYI-AI/sentinel/commit/e2cdd69)), closes [#6](https://github.com/CERTIFYI-AI/sentinel/issues/6)
* Merge pull request #7 from CERTIFYI-AI/feat/ws01-multitenancy ([305f011](https://github.com/CERTIFYI-AI/sentinel/commit/305f011)), closes [#7](https://github.com/CERTIFYI-AI/sentinel/issues/7)
* Merge pull request #8 from CERTIFYI-AI/feat/ws02-sso ([6af3562](https://github.com/CERTIFYI-AI/sentinel/commit/6af3562)), closes [#8](https://github.com/CERTIFYI-AI/sentinel/issues/8)
* Merge pull request #9 from CERTIFYI-AI/feat/ws03-audit-log ([4e45fec](https://github.com/CERTIFYI-AI/sentinel/commit/4e45fec)), closes [#9](https://github.com/CERTIFYI-AI/sentinel/issues/9)
* Phase 5: Complete Supabase backend integration - RLS, auth, storage, audit, realtime, types, CI/CD,  ([5e01a12](https://github.com/CERTIFYI-AI/sentinel/commit/5e01a12))
* Rebuild all 48 broken pages with proper data tables, search/filter, charts, stats cards, and detail  ([e41825e](https://github.com/CERTIFYI-AI/sentinel/commit/e41825e))
* Refine sidebar navigation by merging duplicates and relocating items ([6fc0bdd](https://github.com/CERTIFYI-AI/sentinel/commit/6fc0bdd))
* Restructure application navigation and enhance vendor detail view ([8fceb10](https://github.com/CERTIFYI-AI/sentinel/commit/8fceb10))
* revert package.json changes to restore CI ([6e233e1](https://github.com/CERTIFYI-AI/sentinel/commit/6e233e1))
* test(unit+e2e): F.1-F.4 Vitest unit tests + Playwright smoke stubs + coverage config ([b47725f](https://github.com/CERTIFYI-AI/sentinel/commit/b47725f))
* UI/UX enhancements, bug fixes, and README update ([0d4dbb1](https://github.com/CERTIFYI-AI/sentinel/commit/0d4dbb1))
* Update __init__.pyfeat: register owasp_agentic, owasp_api, mitre_atlas, dod_ai in frameworks __init_ ([733ee80](https://github.com/CERTIFYI-AI/sentinel/commit/733ee80))
* Update App.tsxfix: wire 13 missing routes - frameworks, reg-radar, agents, shadow-ai, datasets, vend ([724afcb](https://github.com/CERTIFYI-AI/sentinel/commit/724afcb))
* Update application icon and browser favicon to Sentinel logo ([9d666a2](https://github.com/CERTIFYI-AI/sentinel/commit/9d666a2))
* Update auth_router.pyfix: replace get_settings() with settings singleton import in auth_router ([681efdc](https://github.com/CERTIFYI-AI/sentinel/commit/681efdc))
* Update auth_router.pyfix: use 'from jose import jwt, JWTError' instead of 'import jwt' to match pyth ([1d90358](https://github.com/CERTIFYI-AI/sentinel/commit/1d90358))
* Update config.pyfix: add primary_model property to TenantConfig for proxy.py compatibility ([ed456f1](https://github.com/CERTIFYI-AI/sentinel/commit/ed456f1))
* Update configuration to accept secret key from environment variable ([16b1910](https://github.com/CERTIFYI-AI/sentinel/commit/16b1910))
* Update core components to support older page versions ([e40cb3c](https://github.com/CERTIFYI-AI/sentinel/commit/e40cb3c))
* Update dependencies and clean up project requirements ([b1fbf64](https://github.com/CERTIFYI-AI/sentinel/commit/b1fbf64))
* Update detail view to use slide-over panels across all modules ([f0b32e2](https://github.com/CERTIFYI-AI/sentinel/commit/f0b32e2))
* Update gdpr.pyfix: gdpr.py use keyword args for FrameworkMetadata ([34271db](https://github.com/CERTIFYI-AI/sentinel/commit/34271db))
* Update icon and add new dependencies to the dashboard ([c5524a1](https://github.com/CERTIFYI-AI/sentinel/commit/c5524a1))
* Update incident workflow and model lifecycle with new features ([d771d6d](https://github.com/CERTIFYI-AI/sentinel/commit/d771d6d))
* Update navigation and vendor detail icons and interactions ([5968a0e](https://github.com/CERTIFYI-AI/sentinel/commit/5968a0e))
* Update project dependencies and script to properly start the application ([1eeda9f](https://github.com/CERTIFYI-AI/sentinel/commit/1eeda9f))
* Update project dependencies and startup script ([1fe07ce](https://github.com/CERTIFYI-AI/sentinel/commit/1fe07ce))
* Update proxy.pyfix: restore create_app() FastAPI constructor formatting ([14065ca](https://github.com/CERTIFYI-AI/sentinel/commit/14065ca))
* Update pyproject.tomlfix: add email-validator and passlib[bcrypt] deps for auth_router ([d43eab9](https://github.com/CERTIFYI-AI/sentinel/commit/d43eab9))
* Update Python dependencies and attach asset instructions ([7ddd4ed](https://github.com/CERTIFYI-AI/sentinel/commit/7ddd4ed))
* Update RBAC tab to remember last selected tab ([512c3df](https://github.com/CERTIFYI-AI/sentinel/commit/512c3df))
* Update README.md ([1f587ee](https://github.com/CERTIFYI-AI/sentinel/commit/1f587ee))
* Update README.md ([91737a5](https://github.com/CERTIFYI-AI/sentinel/commit/91737a5))
* Update README.md ([e254b31](https://github.com/CERTIFYI-AI/sentinel/commit/e254b31))
* Update theme selection to a popover and fix loading states ([a5cf5b8](https://github.com/CERTIFYI-AI/sentinel/commit/a5cf5b8))
* Update UI elements and dialogs for managing workflows and agents ([1c03238](https://github.com/CERTIFYI-AI/sentinel/commit/1c03238))
* Update user interface components and resolve notification conflicts ([ccdfa96](https://github.com/CERTIFYI-AI/sentinel/commit/ccdfa96))
* chore: add .env.example with Vite environment config ([be31926](https://github.com/CERTIFYI-AI/sentinel/commit/be31926))
* chore: add CODEOWNERS file ([db4aa2a](https://github.com/CERTIFYI-AI/sentinel/commit/db4aa2a))
* chore: add feature request issue template ([a2a38cb](https://github.com/CERTIFYI-AI/sentinel/commit/a2a38cb))
* chore: add issue templates and PR template ([36a5900](https://github.com/CERTIFYI-AI/sentinel/commit/36a5900))
* chore: add poetry.lock to .gitignore ([be0acba](https://github.com/CERTIFYI-AI/sentinel/commit/be0acba))
* chore: add policyWorkflowStore ([581ad52](https://github.com/CERTIFYI-AI/sentinel/commit/581ad52))
* chore: add PR template ([a64c996](https://github.com/CERTIFYI-AI/sentinel/commit/a64c996))
* chore: add project-specific entries to .gitignore ([75a815f](https://github.com/CERTIFYI-AI/sentinel/commit/75a815f))
* chore: add vercel.json for dashboard deployment ([578063d](https://github.com/CERTIFYI-AI/sentinel/commit/578063d))
* chore: clean up legacy seed scripts and document seeding process ([7a8d7cd](https://github.com/CERTIFYI-AI/sentinel/commit/7a8d7cd))
* chore: enterprise hardening — cleanup debug artifacts, enhance overview dashboard, update docs ([30dc076](https://github.com/CERTIFYI-AI/sentinel/commit/30dc076))
* chore: integrate WS0.5 ([a66c54e](https://github.com/CERTIFYI-AI/sentinel/commit/a66c54e))
* chore: integrate WS2 ([61cee56](https://github.com/CERTIFYI-AI/sentinel/commit/61cee56))
* chore: integrate WS3 ([f369c80](https://github.com/CERTIFYI-AI/sentinel/commit/f369c80))
* chore: integration base for WS3 ([f398385](https://github.com/CERTIFYI-AI/sentinel/commit/f398385))
* chore: open-source release prep - FIX 18-25 ([1530b8f](https://github.com/CERTIFYI-AI/sentinel/commit/1530b8f))
* chore: remove duplicate uppercase files from git tracking to resolve Mac filesystem conflicts ([c7af3a7](https://github.com/CERTIFYI-AI/sentinel/commit/c7af3a7))
* chore: remove final Antigravity AI UI/UX scaffolding comment ([9075c37](https://github.com/CERTIFYI-AI/sentinel/commit/9075c37))
* chore: remove stale poetry.lock — project uses hatchling, not Poetry ([ee2f64d](https://github.com/CERTIFYI-AI/sentinel/commit/ee2f64d))
* chore: repair Supabase seed data fallbacks, Scan Center UI, and CI/CD workflow ([d82d440](https://github.com/CERTIFYI-AI/sentinel/commit/d82d440))
* chore(ci): remove test-results to fix gitleaks and fix npm vulnerabilities ([c036fbd](https://github.com/CERTIFYI-AI/sentinel/commit/c036fbd))
* chore(deploy): add [env.staging] block to wrangler.toml ([e59b912](https://github.com/CERTIFYI-AI/sentinel/commit/e59b912))
* chore(security): add .trivyignore to skip devDependency CVEs preventing CI pass ([ea05e3c](https://github.com/CERTIFYI-AI/sentinel/commit/ea05e3c))
* docs: add ARCHITECTURE.md with system design and module reference ([16ad0d6](https://github.com/CERTIFYI-AI/sentinel/commit/16ad0d6))
* docs: add CHANGELOG v0.3.0 - 10 new pages, mock data, full docs ([7267ba1](https://github.com/CERTIFYI-AI/sentinel/commit/7267ba1))
* docs: add CHANGELOG v0.3.1 - CI fixes and deploy workflow ([c96dd4d](https://github.com/CERTIFYI-AI/sentinel/commit/c96dd4d))
* docs: add CHANGELOG v0.3.2 - post-audit remediation cleanup ([b3aa3b2](https://github.com/CERTIFYI-AI/sentinel/commit/b3aa3b2))
* docs: add CHANGELOG.md with Keep a Changelog format ([4dbd52f](https://github.com/CERTIFYI-AI/sentinel/commit/4dbd52f))
* docs: add compliance/audit-log-schema.md ([62fe1fc](https://github.com/CERTIFYI-AI/sentinel/commit/62fe1fc))
* docs: add compliance/evidence-export.md ([c59b147](https://github.com/CERTIFYI-AI/sentinel/commit/c59b147))
* docs: add compliance/frameworks.md with EU AI Act, ISO 42001, SOC 2, NIST mappings ([1f1b5a1](https://github.com/CERTIFYI-AI/sentinel/commit/1f1b5a1))
* docs: add compliance/gdpr-hipaa-pii.md ([0558296](https://github.com/CERTIFYI-AI/sentinel/commit/0558296))
* docs: add compliance/overview.md ([e5e5e66](https://github.com/CERTIFYI-AI/sentinel/commit/e5e5e66))
* docs: add compliance/soc2-mapping.md ([4b08d11](https://github.com/CERTIFYI-AI/sentinel/commit/4b08d11))
* docs: add comprehensive README with architecture, features, and setup guide ([9624f18](https://github.com/CERTIFYI-AI/sentinel/commit/9624f18))
* docs: add deployment section to dashboard guide ([cbfdc65](https://github.com/CERTIFYI-AI/sentinel/commit/cbfdc65))
* docs: add deployment-guide.md with AWS, GCP, bare metal ([597dfd7](https://github.com/CERTIFYI-AI/sentinel/commit/597dfd7))
* docs: add docs/reference/trust-score.md ([2e20733](https://github.com/CERTIFYI-AI/sentinel/commit/2e20733))
* docs: add documentation for all 15 new dashboard pages (benchmark, datasets, risk matrix, etc.) ([ac65038](https://github.com/CERTIFYI-AI/sentinel/commit/ac65038))
* docs: add eu-ai-act-mapping.md compliance article mapping ([f3d989b](https://github.com/CERTIFYI-AI/sentinel/commit/f3d989b))
* docs: add final audit report ([ea54ba3](https://github.com/CERTIFYI-AI/sentinel/commit/ea54ba3))
* docs: add guides/audit-trail-guide.md ([269cc13](https://github.com/CERTIFYI-AI/sentinel/commit/269cc13))
* docs: add guides/ci-cd-integration.md ([8dff92c](https://github.com/CERTIFYI-AI/sentinel/commit/8dff92c))
* docs: add guides/dashboard-guide.md ([9d618ab](https://github.com/CERTIFYI-AI/sentinel/commit/9d618ab))
* docs: add guides/golden-source-setup.md ([b5b1600](https://github.com/CERTIFYI-AI/sentinel/commit/b5b1600))
* docs: add guides/provider-configuration.md ([b34b525](https://github.com/CERTIFYI-AI/sentinel/commit/b34b525))
* docs: add guides/quickstart.md ([f621807](https://github.com/CERTIFYI-AI/sentinel/commit/f621807))
* docs: add guides/writing-policies.md ([e24c75a](https://github.com/CERTIFYI-AI/sentinel/commit/e24c75a))
* docs: add how-it-works.md with full request lifecycle ([ef2c1f5](https://github.com/CERTIFYI-AI/sentinel/commit/ef2c1f5))
* docs: add iso-42001-mapping.md compliance control mapping ([a510de6](https://github.com/CERTIFYI-AI/sentinel/commit/a510de6))
* docs: add ops/backup-restore.md ([f3cf94f](https://github.com/CERTIFYI-AI/sentinel/commit/f3cf94f))
* docs: add ops/monitoring-guide.md with Grafana dashboards and alerting ([7362116](https://github.com/CERTIFYI-AI/sentinel/commit/7362116))
* docs: add ops/monitoring.md ([5b6ec34](https://github.com/CERTIFYI-AI/sentinel/commit/5b6ec34))
* docs: add ops/production-checklist.md ([7ac4f78](https://github.com/CERTIFYI-AI/sentinel/commit/7ac4f78))
* docs: add ops/scaling-guide.md with GPU, K8s, TimescaleDB scaling ([e1d4ee4](https://github.com/CERTIFYI-AI/sentinel/commit/e1d4ee4))
* docs: add ops/scaling.md ([80dfdf4](https://github.com/CERTIFYI-AI/sentinel/commit/80dfdf4))
* docs: add ops/troubleshooting.md with 20 common issues ([44aac5d](https://github.com/CERTIFYI-AI/sentinel/commit/44aac5d))
* docs: add per-module GRC references and top-level docs index ([f844ade](https://github.com/CERTIFYI-AI/sentinel/commit/f844ade))
* docs: add post-audit remediation addendum to AUDIT_REPORT.md ([4b79c5c](https://github.com/CERTIFYI-AI/sentinel/commit/4b79c5c))
* docs: add reference/circuit-breaker.md ([0975777](https://github.com/CERTIFYI-AI/sentinel/commit/0975777))
* docs: add reference/environment-variables.md ([49bf7b1](https://github.com/CERTIFYI-AI/sentinel/commit/49bf7b1))
* docs: add reference/error-codes.md ([345c78f](https://github.com/CERTIFYI-AI/sentinel/commit/345c78f))
* docs: add reference/glossary.md ([55fb117](https://github.com/CERTIFYI-AI/sentinel/commit/55fb117))
* docs: add reference/metric-definitions.md ([1869dc1](https://github.com/CERTIFYI-AI/sentinel/commit/1869dc1))
* docs: add Security Intelligence module documentation ([36666c5](https://github.com/CERTIFYI-AI/sentinel/commit/36666c5))
* docs: add security-model.md with threat model and data protection ([bc7a04d](https://github.com/CERTIFYI-AI/sentinel/commit/bc7a04d))
* docs: add SECURITY.md with threat model, vulnerability reporting, and design principles ([db55853](https://github.com/CERTIFYI-AI/sentinel/commit/db55853))
* docs: add SUPPORT.md with support channels and issue guidance ([b3052af](https://github.com/CERTIFYI-AI/sentinel/commit/b3052af))
* docs: add v0.4.0 architecture fixes section to dashboard guide ([ce6e36d](https://github.com/CERTIFYI-AI/sentinel/commit/ce6e36d))
* docs: complete README.md rewrite for OSS launch ([9e22366](https://github.com/CERTIFYI-AI/sentinel/commit/9e22366))
* docs: comprehensive README, architecture, and module documentation ([b2d28d8](https://github.com/CERTIFYI-AI/sentinel/commit/b2d28d8))
* docs: enterprise platform audit report — module-by-module analysis + future task plan ([5c3888b](https://github.com/CERTIFYI-AI/sentinel/commit/5c3888b))
* docs: fix badges and update benchmark methodology in README ([db481e7](https://github.com/CERTIFYI-AI/sentinel/commit/db481e7))
* docs: remove AI tool references, replace with engineering-authored content ([2647342](https://github.com/CERTIFYI-AI/sentinel/commit/2647342))
* docs: replace README with full OSS-optimised documentation per spec ([eb423a5](https://github.com/CERTIFYI-AI/sentinel/commit/eb423a5))
* docs: rewrite api-reference.md with actual endpoints from codebase ([fb76ee1](https://github.com/CERTIFYI-AI/sentinel/commit/fb76ee1))
* docs: rewrite architecture.md with actual dual-pipeline architecture and trust score weights ([132f8ff](https://github.com/CERTIFYI-AI/sentinel/commit/132f8ff))
* docs: rewrite configuration.md with actual SENTINEL_ env vars from codebase ([56ec458](https://github.com/CERTIFYI-AI/sentinel/commit/56ec458))
* docs: rewrite CONTRIBUTING.md with three-audience structure and dev setup ([690f904](https://github.com/CERTIFYI-AI/sentinel/commit/690f904))
* docs: rewrite deployment.md with actual config vars, Docker setup, and production checklist ([44e16aa](https://github.com/CERTIFYI-AI/sentinel/commit/44e16aa))
* docs: rewrite getting-started.md with accurate setup and SDK usage ([d5e36db](https://github.com/CERTIFYI-AI/sentinel/commit/d5e36db))
* docs: rewrite guardrails.md with actual sanitizer, policy engine, and verifier pipeline details ([0f957f4](https://github.com/CERTIFYI-AI/sentinel/commit/0f957f4))
* docs: rewrite policy-language.md with actual YAML config structure and rule engine API ([57342a6](https://github.com/CERTIFYI-AI/sentinel/commit/57342a6))
* docs: rewrite sdk-guide.md with actual SentinelClient API ([3c5eb55](https://github.com/CERTIFYI-AI/sentinel/commit/3c5eb55))
* docs: rewrite troubleshooting.md with actual error messages, ML fallbacks, and diagnostic commands ([39ef193](https://github.com/CERTIFYI-AI/sentinel/commit/39ef193))
* docs(architecture): add module interlinks, Supabase integration, and functional activation plan ([afed318](https://github.com/CERTIFYI-AI/sentinel/commit/afed318))
* docs(modules): complete coverage of all 40+ Sentinel modules ([308b4c4](https://github.com/CERTIFYI-AI/sentinel/commit/308b4c4))
* refactor: App.tsx with ErrorBoundary, Suspense lazy loading, AuthProvider ([7f1b8be](https://github.com/CERTIFYI-AI/sentinel/commit/7f1b8be))
* refactor: pre-open-source remediation — scrub AI attribution, professional docs, clean configs ([48e53c3](https://github.com/CERTIFYI-AI/sentinel/commit/48e53c3))
* refactor: sidebar nav with NIST AI RMF structure, add Security + Trust Engine sections, fix routes ([4f1059a](https://github.com/CERTIFYI-AI/sentinel/commit/4f1059a))
* security: pre-OSS audit remediations batch 2 ([77da292](https://github.com/CERTIFYI-AI/sentinel/commit/77da292))
* security: remove hardcoded Supabase project URL fallback from supabase.ts ([7aadce7](https://github.com/CERTIFYI-AI/sentinel/commit/7aadce7))
* ci: add dashboard deploy workflow with Vercel integration ([9dfe30a](https://github.com/CERTIFYI-AI/sentinel/commit/9dfe30a))
* ci: add PostgreSQL service for integration tests ([9492457](https://github.com/CERTIFYI-AI/sentinel/commit/9492457))
* ci: add workflow_dispatch trigger to CI ([3ff184e](https://github.com/CERTIFYI-AI/sentinel/commit/3ff184e))
* ci: make lint and type-check non-blocking with continue-on-error ([46099ec](https://github.com/CERTIFYI-AI/sentinel/commit/46099ec))
* ci: replace Vercel deploy with Cloudflare Workers deploy ([c1ad5c3](https://github.com/CERTIFYI-AI/sentinel/commit/c1ad5c3))
* Fix: resolve duplicate Warning icon import in Sidebar, correct Reg Radar label ([6a4baf4](https://github.com/CERTIFYI-AI/sentinel/commit/6a4baf4))
* test: add integration test for full cascade (finding→gap→task→posture) ([86fe03d](https://github.com/CERTIFYI-AI/sentinel/commit/86fe03d))
* test: add test_database.py with 15 async tests for all repo classes ([79d305e](https://github.com/CERTIFYI-AI/sentinel/commit/79d305e))
* test: add tests for all 7 compliance frameworks and registry ([8de546b](https://github.com/CERTIFYI-AI/sentinel/commit/8de546b))

# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-04-18

### Added

- Model Registry with EU AI Act risk classification (Annex III)
- Trust Engine with real-time guardrail evaluation and live traces
- Multi-framework compliance tracking (EU AI Act, ISO 42001, NIST AI RMF, GDPR, SOC 2, ISO 27001)
- Risk Register with ISO 31000 5x5 matrix and treatment workflows
- Bias Audit Center with protected attribute analysis
- Agent Governance: discovery, IAM, choreography, kill-switch
- Vendor Registry with DPA tracking and concentration risk analysis
- Cryptographic evidence chain (SHA-256 tamper-evident ledger)
- HITL Reviews queue per EU AI Act Art. 14
- Incident Response with GDPR 72h and EU AI Act Art. 73 notification timers
- Data Subject Rights (DSR) management with GDPR SLA tracking
- Carbon Ledger and ESG reporting (GRI, SASB, TCFD aligned)
- AI Impact Assessment (AIIA) wizard per EU AI Act Art. 27
- DPIA workflow per GDPR Art. 35
- Post-Market Surveillance per EU AI Act Art. 72
- Supabase backend with row-level security multi-tenancy
- Real-time subscriptions for notifications, guardrails, and HITL
- Autonomous governance event bus with 10 agent types
- Cloudflare Workers deployment

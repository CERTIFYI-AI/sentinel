// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// GENERATED FILE — DO NOT EDIT BY HAND.
// Sources: dashboard/src/data/navigation.ts + docs/modules/*.md
// Generator: scripts/gen_module_guides.py
// Regenerate with:  python3 scripts/gen_module_guides.py
//
// The User guide is derived, not authored twice. Its collections ARE the menu
// sections, and each entry's body is the module's own reviewed documentation.
// A menu destination with no module doc is emitted with `hasDoc: false` and no
// body — the panel shows an honest "not documented yet" state for it. Coverage
// is recorded below so the gap is measurable instead of invisible.

/** One row of a module's field table, as authored in its doc. */
export type GuideFieldRow = string[]

export interface GuideEntry {
  /** Menu label, exactly as it appears in the sidebar. */
  label: string
  /** Route the menu entry navigates to. */
  route: string
  /** Parent menu item when this is a nested entry, else null. */
  parentLabel: string | null
  /** False when no docs/modules/*.md could be resolved for this destination. */
  hasDoc: boolean
  /** Repo-relative path of the source doc, for "view source" links. */
  docPath: string | null
  /** Document title (falls back to the menu label when undocumented). */
  title: string
  purpose: string | null
  why: string | null
  how: string[]
  /** How data reaches this module — the real tables/services it reads. */
  dataProcess: string[]
  interlinks: string[]
  compliance: string[]
  operations: string[]
  fields: GuideFieldRow[]
  /** Stated reason a destination intentionally has no module doc. */
  noDocReason: string | null
}

export interface GuideCollection {
  /** Slug of the menu section title. */
  id: string
  /** Menu section title, verbatim. */
  title: string
  entryCount: number
  documentedCount: number
  entries: GuideEntry[]
}

/** Menu destinations covered by the guide. */
export const GUIDE_TOTAL_ENTRIES = 135

/** Destinations backed by an authored module doc. */
export const GUIDE_DOCUMENTED_ENTRIES = 135

/** Module docs available in docs/modules/. */
export const MODULE_DOCS_AVAILABLE = 96

export const GUIDE_COLLECTIONS: GuideCollection[] = [
  {
    "id": "home",
    "title": "HOME",
    "entryCount": 5,
    "documentedCount": 5,
    "entries": [
      {
        "label": "Dashboard",
        "route": "/overview",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/executive-surfaces.md",
        "title": "Executive Surfaces — Dashboard, CISO Dashboard, Board Report, Peer Benchmarking",
        "purpose": "The surfaces a customer, an executive or an auditor reaches first. They own no data. Their whole job is to summarise the governed inventory truthfully, and to let the reader click through from any number to the records behind it.",
        "why": "An AI governance platform is judged on the first screen. If the front page or the board pack carries a figure nobody measured, every other honest number in the product is worth less — the reader has no way to tell which is which.",
        "how": [
          "Dashboard (/overview) reads eleven org-scoped sources and renders KPI",
          "tiles, an attention ribbon, a risk-trend series, framework and regulatory",
          "scorecards, a live model risk heat map (`ai_models.risk_tier ×",
          "lifecycle_stage`), a 90-day compliance calendar, and supply-chain / shadow-AI",
          "/ kill-switch cards derived from `supply_chain_attestation_status ×",
          "ai_models and agent_gov_registry`.",
          "CISO Dashboard (/ciso) carries Overview / Metrics / ROI / Board Report",
          "tabs, all computed live.",
          "Board Report (/ciso/report, also embedded as a CISO tab) renders risk,",
          "compliance, incident and model sections plus Priority Actions derived from",
          "real open critical/high risks, unresolved incidents, failed bias audits and",
          "failed control tests. It exports real CSV/JSON via lib/exportUtils.ts, each"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound — /risks?open=<uuid>, /risk/incidents?open=<uuid>,",
          "/models/inventory/<uuid>, /bias-audits?open=<uuid>,",
          "/compliance/controls/<uuid>, /compliance/gap-analysis, /frameworks,",
          "/tasks, /supply-chain, /aibom, /agents, /calendar.",
          "Inbound — reached from the sidebar and the command palette. These are",
          "summary surfaces: nothing links to a dashboard figure, which is correct."
        ],
        "compliance": [
          "EU AI Act Art. 12 — Board Report exports call logAction, so the moment a",
          "governance figure leaves the platform is traceable to a real actor.",
          "Art. 13 (transparency) — the provenance block on every export states what",
          "the figures are and, explicitly, what they are not.",
          "Dashboards themselves are a reporting view over governed records; the",
          "underlying obligations are mapped in the module docs for the sources."
        ],
        "operations": [
          "No migrations, no tables, no seeds.",
          "Cost note: Dashboard holds eleven client-side fetches. Derived values are",
          "memoised so the risk-threshold slider does not re-run them per drag tick."
        ],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Tasks",
        "route": "/tasks",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/dsr-consent.md",
        "title": "Data Subject Requests & Consent Management",
        "purpose": "Operationalise individual rights under privacy law: intake, identity verification, fulfilment, and evidence of DSRs (access, erasure, rectification, portability, restriction, objection, Art.22 challenges); maintain lawful-basis and consent records.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "GDPR Art.12–22",
            "Data subject rights, 1-month SLA (extendable)"
          ],
          [
            "GDPR Art.7",
            "Consent conditions"
          ],
          [
            "CCPA/CPRA",
            "Consumer rights and opt-out signals (GPC)"
          ],
          [
            "LGPD Art.18",
            "Brazilian data-subject rights"
          ],
          [
            "ISO/IEC 27701 7.3 / 8.3",
            "PII principal rights; consent records"
          ],
          [
            "EU AI Act Art.22(3)",
            "Right to explanation for high-risk decisions"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "CISO Dashboard",
        "route": "/ciso",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/executive-surfaces.md",
        "title": "Executive Surfaces — Dashboard, CISO Dashboard, Board Report, Peer Benchmarking",
        "purpose": "The surfaces a customer, an executive or an auditor reaches first. They own no data. Their whole job is to summarise the governed inventory truthfully, and to let the reader click through from any number to the records behind it.",
        "why": "An AI governance platform is judged on the first screen. If the front page or the board pack carries a figure nobody measured, every other honest number in the product is worth less — the reader has no way to tell which is which.",
        "how": [
          "Dashboard (/overview) reads eleven org-scoped sources and renders KPI",
          "tiles, an attention ribbon, a risk-trend series, framework and regulatory",
          "scorecards, a live model risk heat map (`ai_models.risk_tier ×",
          "lifecycle_stage`), a 90-day compliance calendar, and supply-chain / shadow-AI",
          "/ kill-switch cards derived from `supply_chain_attestation_status ×",
          "ai_models and agent_gov_registry`.",
          "CISO Dashboard (/ciso) carries Overview / Metrics / ROI / Board Report",
          "tabs, all computed live.",
          "Board Report (/ciso/report, also embedded as a CISO tab) renders risk,",
          "compliance, incident and model sections plus Priority Actions derived from",
          "real open critical/high risks, unresolved incidents, failed bias audits and",
          "failed control tests. It exports real CSV/JSON via lib/exportUtils.ts, each"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound — /risks?open=<uuid>, /risk/incidents?open=<uuid>,",
          "/models/inventory/<uuid>, /bias-audits?open=<uuid>,",
          "/compliance/controls/<uuid>, /compliance/gap-analysis, /frameworks,",
          "/tasks, /supply-chain, /aibom, /agents, /calendar.",
          "Inbound — reached from the sidebar and the command palette. These are",
          "summary surfaces: nothing links to a dashboard figure, which is correct."
        ],
        "compliance": [
          "EU AI Act Art. 12 — Board Report exports call logAction, so the moment a",
          "governance figure leaves the platform is traceable to a real actor.",
          "Art. 13 (transparency) — the provenance block on every export states what",
          "the figures are and, explicitly, what they are not.",
          "Dashboards themselves are a reporting view over governed records; the",
          "underlying obligations are mapped in the module docs for the sources."
        ],
        "operations": [
          "No migrations, no tables, no seeds.",
          "Cost note: Dashboard holds eleven client-side fetches. Derived values are",
          "memoised so the risk-threshold slider does not re-run them per drag tick."
        ],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Board Report",
        "route": "/ciso/report",
        "parentLabel": "CISO Dashboard",
        "hasDoc": true,
        "docPath": "docs/modules/executive-surfaces.md",
        "title": "Executive Surfaces — Dashboard, CISO Dashboard, Board Report, Peer Benchmarking",
        "purpose": "The surfaces a customer, an executive or an auditor reaches first. They own no data. Their whole job is to summarise the governed inventory truthfully, and to let the reader click through from any number to the records behind it.",
        "why": "An AI governance platform is judged on the first screen. If the front page or the board pack carries a figure nobody measured, every other honest number in the product is worth less — the reader has no way to tell which is which.",
        "how": [
          "Dashboard (/overview) reads eleven org-scoped sources and renders KPI",
          "tiles, an attention ribbon, a risk-trend series, framework and regulatory",
          "scorecards, a live model risk heat map (`ai_models.risk_tier ×",
          "lifecycle_stage`), a 90-day compliance calendar, and supply-chain / shadow-AI",
          "/ kill-switch cards derived from `supply_chain_attestation_status ×",
          "ai_models and agent_gov_registry`.",
          "CISO Dashboard (/ciso) carries Overview / Metrics / ROI / Board Report",
          "tabs, all computed live.",
          "Board Report (/ciso/report, also embedded as a CISO tab) renders risk,",
          "compliance, incident and model sections plus Priority Actions derived from",
          "real open critical/high risks, unresolved incidents, failed bias audits and",
          "failed control tests. It exports real CSV/JSON via lib/exportUtils.ts, each"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound — /risks?open=<uuid>, /risk/incidents?open=<uuid>,",
          "/models/inventory/<uuid>, /bias-audits?open=<uuid>,",
          "/compliance/controls/<uuid>, /compliance/gap-analysis, /frameworks,",
          "/tasks, /supply-chain, /aibom, /agents, /calendar.",
          "Inbound — reached from the sidebar and the command palette. These are",
          "summary surfaces: nothing links to a dashboard figure, which is correct."
        ],
        "compliance": [
          "EU AI Act Art. 12 — Board Report exports call logAction, so the moment a",
          "governance figure leaves the platform is traceable to a real actor.",
          "Art. 13 (transparency) — the provenance block on every export states what",
          "the figures are and, explicitly, what they are not.",
          "Dashboards themselves are a reporting view over governed records; the",
          "underlying obligations are mapped in the module docs for the sources."
        ],
        "operations": [
          "No migrations, no tables, no seeds.",
          "Cost note: Dashboard holds eleven client-side fetches. Derived values are",
          "memoised so the risk-threshold slider does not re-run them per drag tick."
        ],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Peer Benchmarking",
        "route": "/peer-intelligence",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/executive-surfaces.md",
        "title": "Executive Surfaces — Dashboard, CISO Dashboard, Board Report, Peer Benchmarking",
        "purpose": "The surfaces a customer, an executive or an auditor reaches first. They own no data. Their whole job is to summarise the governed inventory truthfully, and to let the reader click through from any number to the records behind it.",
        "why": "An AI governance platform is judged on the first screen. If the front page or the board pack carries a figure nobody measured, every other honest number in the product is worth less — the reader has no way to tell which is which.",
        "how": [
          "Dashboard (/overview) reads eleven org-scoped sources and renders KPI",
          "tiles, an attention ribbon, a risk-trend series, framework and regulatory",
          "scorecards, a live model risk heat map (`ai_models.risk_tier ×",
          "lifecycle_stage`), a 90-day compliance calendar, and supply-chain / shadow-AI",
          "/ kill-switch cards derived from `supply_chain_attestation_status ×",
          "ai_models and agent_gov_registry`.",
          "CISO Dashboard (/ciso) carries Overview / Metrics / ROI / Board Report",
          "tabs, all computed live.",
          "Board Report (/ciso/report, also embedded as a CISO tab) renders risk,",
          "compliance, incident and model sections plus Priority Actions derived from",
          "real open critical/high risks, unresolved incidents, failed bias audits and",
          "failed control tests. It exports real CSV/JSON via lib/exportUtils.ts, each"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound — /risks?open=<uuid>, /risk/incidents?open=<uuid>,",
          "/models/inventory/<uuid>, /bias-audits?open=<uuid>,",
          "/compliance/controls/<uuid>, /compliance/gap-analysis, /frameworks,",
          "/tasks, /supply-chain, /aibom, /agents, /calendar.",
          "Inbound — reached from the sidebar and the command palette. These are",
          "summary surfaces: nothing links to a dashboard figure, which is correct."
        ],
        "compliance": [
          "EU AI Act Art. 12 — Board Report exports call logAction, so the moment a",
          "governance figure leaves the platform is traceable to a real actor.",
          "Art. 13 (transparency) — the provenance block on every export states what",
          "the figures are and, explicitly, what they are not.",
          "Dashboards themselves are a reporting view over governed records; the",
          "underlying obligations are mapped in the module docs for the sources."
        ],
        "operations": [
          "No migrations, no tables, no seeds.",
          "Cost note: Dashboard holds eleven client-side fetches. Derived values are",
          "memoised so the risk-threshold slider does not re-run them per drag tick."
        ],
        "fields": [],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "ai-assets",
    "title": "AI ASSETS",
    "entryCount": 15,
    "documentedCount": 15,
    "entries": [
      {
        "label": "Model Registry",
        "route": "/models/inventory",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/model-inventory.md",
        "title": "Model Registry",
        "purpose": "The Model Registry is Sentinel's system of record for every AI model the organisation builds, fine-tunes, or buys. Each row is one governed model keyed by ai_models.id (a uuid) — the single, canonical id-space that every other module in the platform links to. The screen lets a governance owner register, search, filter, export, edit, and retire models, and open any model's full governance passport.",
        "why": "ai_models is the platform's canonical governed entity. Risk tiering, impact assessments (AIIA), Model Risk Committee reviews, HITL reviews, incidents, the prompt registry, the Trust Engine runtime, cost/telemetry and performance monitoring all reference a model by its ai_models.id and resolve the display name at render time. Without a registry there is no id to link to, and the \"one platform, one id-space\" invariant (CLAUDE.md First principle #2) collapses into name-matching. In compliance terms the registry discharges the provider's duty to maintain an inventory of AI systems and their techni",
        "how": [
          "Records. A model is a row in ai_models. The list is read by modelService.fetchAllModels (ordered by created_at desc) through the useModelsData React Query hook (staleTime 30 s; the cache invalidates on every mutation). The raw row is translated to the rich UI Model view-shape by recordToModel in dashboard/src/lib/modelMapping.ts; writes translate back via modelToRecord.",
          "Create. \"Register Model\" opens RegisterModelForm. On submit the page calls saveModel(modelToRecord(newModel)) with no id, so the database generates the uuid (gen_random_uuid()) and fills org_id from its get_org_id() default — the client never sends a scoping column. A new insert also fires the MODEL_REGISTERED governance event on governanceBus (source ai-inventory): the autonomous mesh opens the initial risk, maps controls, and raises a HITL review where the tier demands it. That cascade is deliberately fire-and-forget and never rethrown — an agent failure must not roll back the user's save; its outcomes are observable in Agent Control / governance_events, not in the save result.",
          "Edit / delete. \"Edit\" opens EditModelForm and calls saveModel({ ...modelToRecord(updated), id }) (id present ⇒ update). \"Delete\" opens a ConfirmDialog and calls deleteModel(id). All writes throw on failure; the dialog closes and a toast fires only after the promise resolves — a failed write shows a real error toast (\"Failed to register/update/remove model\") and no success.",
          "Lifecycle & status. The stored lifecycle_stage is mapped to a UI status of production | staging | development | retired (LIFECYCLE_TO_STATUS). An unknown or empty stage deliberately defaults to development, never production, so the Production KPI is not over-counted. Each row renders a five-step lifecycle stepper (Development → Staging → Production → Deprecated → Retired) with the active stage highlighted.",
          "Risk tier. The DB risk_tier enum {critical, high, medium, low, minimal} maps to the UI tier {unacceptable, high, limited, minimal} (DB_RISK_TO_UI / UI_RISK_TO_DB). Registering as \"High-Risk AI System (Annex III)\" forces the tier to high; an unknown tier defaults to limited.",
          "Derived vs. stored. The four metric tiles (Total, Production, Drift Alerts, High-Risk) and the filtered count are computed client-side from the loaded rows — they are not stored aggregates. Per-model fairnessScore, accuracy, latencyMs, monthlyInferences and driftStatus are not part of the registry list's stored telemetry: recordToModel preserves a null fairnessScore as unmeasured (renders —), and defaults accuracy/latencyMs to 0, monthlyInferences to —, and driftStatus to stable when the columns are null. On the detail page these are replaced by live analytics (useModelAnalytics, realtime) where telemetry exists. Treat a 0/stable on a freshly-registered model as unmeasured, not measured (see the gap in Operations)."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every interlink uses the ?model=<uuid> deep-link convention (a filtered list with a dismissible chip) or the /models/inventory/:id detail route; ids resolve to a display name, and an unresolvable id shows \"Unavailable\" (never a raw uuid).",
          "Outbound — from a model record (mostly on the detail page):",
          "Governance cards → /ai-risk-tiering?model=, /aiia?model=, /mrc?model=, /performance-monitoring?model=, /model-efficiency?model=, /genai-risks?model=, /trust-engine?model=.",
          "Runtime & Operations rows → /models/lifecycle?model=, /prompt-registry?model=, /trust-engine/costs?model=, /trust-engine/fallback?model=, /trust-engine/tools?model=, /ai-gateway/playground?model=.",
          "Risk & Security backlink cards (reverse interlinks read live via useModelBacklinks) → /risks?model=, /incidents?model=, plus HITL reviews, financial-risk quantifications, security threats, red-team findings and arena runs that reference the model.",
          "On insert, the MODEL_REGISTERED governance event (source ai-inventory) fans out to the autonomous mesh (initial risk, control mapping, HITL) — an outbound governance cascade rather than a UI link.",
          "Inbound — the registry is reachable from:",
          "Command palette entry \"Model Registry\" → /models/inventory.",
          "Any module that deep-links a specific model → /models/inventory/:id (e.g. KnowledgeGraph.tsx, CisoDashboard.tsx), and every ?model= chip elsewhere resolves its label from ai_models.",
          "The list row itself → detail passport.",
          "Interlink proof. The reverse-link cards prove total == resolves by counting source rows whose model_id resolves to an ai_models.id. A representative proof query (run per-tenant against the live DB; not executed in this doc-writing session — run before merge per Gate 1):",
          "_total must equal _resolve for the module to pass the interlink gate."
        ],
        "compliance": [
          "EU AI Act — Art. 11 / Annex IV (technical documentation): the detail Model Card exports an Annex IV package and a Model Card (JSON). Maps to docs/compliance/eu-ai-act-mapping.md (Art. 11 \"Technical documentation → Audit chain + evidence export\", Implemented).",
          "EU AI Act — Art. 12 (record-keeping): the registry is the anchor for traceability. Honest gap (TD-018): ai_models has no fn_audit_trigger and modelService.ts makes no logAction call, so registering, editing, or deleting a model writes no audit record with an actor. The near-miss is that the legacy model_inventory table is trigger-audited while ai_models — the table the product actually uses — is not. This is an open P1 (docs/reference/technical-debt.md TD-018); it must be closed to satisfy the mapping's Art. 12 \"Implemented\" claim and the repo's own Gate 4. Note: some detail-page actions (linking a document, saving an alert config, initiating a review, exporting a package) do log to model_activity with the real actor — but the core registry writes do not.",
          "EU AI Act — Art. 9 (risk management): the Drift Alerts banner surfaces the obligation when a model shows drift.",
          "EU AI Act — Art. 14 (human oversight): registration captures the human-oversight flag, forced on for Annex III high-risk systems.",
          "ISO/IEC 42001 — the registry is the AI-system lifecycle system of record, aligning with the AIMS lifecycle controls (A.6.2.x in docs/compliance/iso-42001-mapping.md). Honest gap: there is currently no dedicated ai_models / Model Registry row in the ISO mapping doc; this module should be added there rather than left implied.",
          "NIST AI RMF — MAP (inventory and context establishment) and GOVERN (accountable owners). Honest gap: not yet formally recorded in a compliance mapping doc; mark as to-be-mapped rather than claimed."
        ],
        "operations": [
          "Seeding / backfill. Demo models are seeded by the 202608xx demo migrations with fictional, labelled data; no personal data in fixtures. org_id is filled DB-side.",
          "Empty state. Honest — \"No models registered yet\" with a Register CTA; filtered-empty shows \"No models match your filters.\"",
          "Writes throw. upsertModel / deleteModel throw on config/RLS/CHECK/network failure; the UI shows a real error toast and the dialog stays open. Success toasts fire only after the promise resolves.",
          "Realtime. The list is not realtime — React Query with staleTime 30 s, invalidated on mutation. The detail Performance data is push-updated via a Supabase Realtime channel (useModelAnalytics).",
          "Known debt / gaps to track:",
          "TD-018 — ai_models writes are not audit-logged (P1, open). See docs/reference/technical-debt.md.",
          "Fairness — for unmeasured (FIXED) — recordToModel now preserves a null fairness_score as null, so an unmeasured model renders — (neutral) in the list, CSV export, and on the detail Model Card + KPI tile — no longer a red 0% BELOW THRESHOLD. Note accuracy/latencyMs still default to 0 when unmeasured — a smaller remaining deviation to close next.",
          "Unmeasured metrics — accuracy, latencyMs default to 0 and monthlyInferences to — on the list view; the detail page substitutes live analytics where telemetry exists. Do not read these list defaults as measured values."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "DEFAULT gen_random_uuid(); the canonical model id-space — every module stores this, never a name or MDL-xxx"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DEFAULT get_org_id(); made NOT NULL + RLS-scoped by the tenancy sweep — never set by the client"
          ],
          [
            "name",
            "text",
            "yes (UI)",
            "Display name; resolved at render, never shown as a uuid"
          ],
          [
            "slug",
            "text",
            "—",
            "Derived by modelToRecord (slugify(name-version))"
          ],
          [
            "description",
            "text",
            "—",
            "Intended-use / description; renders —/empty when null"
          ],
          [
            "model_type",
            "text",
            "—",
            "Enum {llm, classification, regression, nlp, vision, multimodal, rl, other} → human label"
          ],
          [
            "provider",
            "text",
            "—",
            "e.g. OpenAI, Internal"
          ],
          [
            "version",
            "text",
            "—",
            "— when null"
          ],
          [
            "lifecycle_stage",
            "text",
            "—",
            "Mapped to UI status; empty/unknown → development"
          ],
          [
            "risk_tier",
            "text",
            "—",
            "Enum {critical, high, medium, low, minimal} ⇄ UI {unacceptable, high, limited, minimal}"
          ],
          [
            "use_case",
            "text",
            "—",
            "Free-text use-case label on the row"
          ],
          [
            "business_owner",
            "text",
            "—",
            "Primary owner shown in the list (falls back to technical_owner)"
          ],
          [
            "technical_owner",
            "text",
            "—",
            "ML/eng lead"
          ],
          [
            "framework",
            "text",
            "—",
            "e.g. \"EU AI Act\"; — when null"
          ],
          [
            "eu_ai_act_category",
            "text",
            "—",
            "EU AI Act category label"
          ],
          [
            "is_regulated",
            "boolean",
            "—",
            "Regulated-system flag"
          ],
          [
            "risk_score",
            "numeric",
            "—",
            "Quantitative risk score"
          ],
          [
            "trust_score",
            "numeric",
            "—",
            "Trust score"
          ],
          [
            "fairness_score",
            "numeric",
            "—",
            "Shown as Fairness %; null is preserved as unmeasured and renders — (not 0)"
          ],
          [
            "drift_status",
            "text",
            "—",
            "DEFAULT 'stable'; UI maps unknown → stable"
          ],
          [
            "drift_score",
            "numeric",
            "—",
            "Numeric drift measure"
          ],
          [
            "paused_reason",
            "text",
            "—",
            "Set by the autonomous mesh when a model is paused"
          ],
          [
            "paused_at",
            "timestamptz",
            "—",
            "When the model was paused"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Lifecycle",
        "route": "/models/lifecycle",
        "parentLabel": "Model Registry",
        "hasDoc": true,
        "docPath": "docs/modules/model-inventory.md",
        "title": "Model Registry",
        "purpose": "The Model Registry is Sentinel's system of record for every AI model the organisation builds, fine-tunes, or buys. Each row is one governed model keyed by ai_models.id (a uuid) — the single, canonical id-space that every other module in the platform links to. The screen lets a governance owner register, search, filter, export, edit, and retire models, and open any model's full governance passport.",
        "why": "ai_models is the platform's canonical governed entity. Risk tiering, impact assessments (AIIA), Model Risk Committee reviews, HITL reviews, incidents, the prompt registry, the Trust Engine runtime, cost/telemetry and performance monitoring all reference a model by its ai_models.id and resolve the display name at render time. Without a registry there is no id to link to, and the \"one platform, one id-space\" invariant (CLAUDE.md First principle #2) collapses into name-matching. In compliance terms the registry discharges the provider's duty to maintain an inventory of AI systems and their techni",
        "how": [
          "Records. A model is a row in ai_models. The list is read by modelService.fetchAllModels (ordered by created_at desc) through the useModelsData React Query hook (staleTime 30 s; the cache invalidates on every mutation). The raw row is translated to the rich UI Model view-shape by recordToModel in dashboard/src/lib/modelMapping.ts; writes translate back via modelToRecord.",
          "Create. \"Register Model\" opens RegisterModelForm. On submit the page calls saveModel(modelToRecord(newModel)) with no id, so the database generates the uuid (gen_random_uuid()) and fills org_id from its get_org_id() default — the client never sends a scoping column. A new insert also fires the MODEL_REGISTERED governance event on governanceBus (source ai-inventory): the autonomous mesh opens the initial risk, maps controls, and raises a HITL review where the tier demands it. That cascade is deliberately fire-and-forget and never rethrown — an agent failure must not roll back the user's save; its outcomes are observable in Agent Control / governance_events, not in the save result.",
          "Edit / delete. \"Edit\" opens EditModelForm and calls saveModel({ ...modelToRecord(updated), id }) (id present ⇒ update). \"Delete\" opens a ConfirmDialog and calls deleteModel(id). All writes throw on failure; the dialog closes and a toast fires only after the promise resolves — a failed write shows a real error toast (\"Failed to register/update/remove model\") and no success.",
          "Lifecycle & status. The stored lifecycle_stage is mapped to a UI status of production | staging | development | retired (LIFECYCLE_TO_STATUS). An unknown or empty stage deliberately defaults to development, never production, so the Production KPI is not over-counted. Each row renders a five-step lifecycle stepper (Development → Staging → Production → Deprecated → Retired) with the active stage highlighted.",
          "Risk tier. The DB risk_tier enum {critical, high, medium, low, minimal} maps to the UI tier {unacceptable, high, limited, minimal} (DB_RISK_TO_UI / UI_RISK_TO_DB). Registering as \"High-Risk AI System (Annex III)\" forces the tier to high; an unknown tier defaults to limited.",
          "Derived vs. stored. The four metric tiles (Total, Production, Drift Alerts, High-Risk) and the filtered count are computed client-side from the loaded rows — they are not stored aggregates. Per-model fairnessScore, accuracy, latencyMs, monthlyInferences and driftStatus are not part of the registry list's stored telemetry: recordToModel preserves a null fairnessScore as unmeasured (renders —), and defaults accuracy/latencyMs to 0, monthlyInferences to —, and driftStatus to stable when the columns are null. On the detail page these are replaced by live analytics (useModelAnalytics, realtime) where telemetry exists. Treat a 0/stable on a freshly-registered model as unmeasured, not measured (see the gap in Operations)."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every interlink uses the ?model=<uuid> deep-link convention (a filtered list with a dismissible chip) or the /models/inventory/:id detail route; ids resolve to a display name, and an unresolvable id shows \"Unavailable\" (never a raw uuid).",
          "Outbound — from a model record (mostly on the detail page):",
          "Governance cards → /ai-risk-tiering?model=, /aiia?model=, /mrc?model=, /performance-monitoring?model=, /model-efficiency?model=, /genai-risks?model=, /trust-engine?model=.",
          "Runtime & Operations rows → /models/lifecycle?model=, /prompt-registry?model=, /trust-engine/costs?model=, /trust-engine/fallback?model=, /trust-engine/tools?model=, /ai-gateway/playground?model=.",
          "Risk & Security backlink cards (reverse interlinks read live via useModelBacklinks) → /risks?model=, /incidents?model=, plus HITL reviews, financial-risk quantifications, security threats, red-team findings and arena runs that reference the model.",
          "On insert, the MODEL_REGISTERED governance event (source ai-inventory) fans out to the autonomous mesh (initial risk, control mapping, HITL) — an outbound governance cascade rather than a UI link.",
          "Inbound — the registry is reachable from:",
          "Command palette entry \"Model Registry\" → /models/inventory.",
          "Any module that deep-links a specific model → /models/inventory/:id (e.g. KnowledgeGraph.tsx, CisoDashboard.tsx), and every ?model= chip elsewhere resolves its label from ai_models.",
          "The list row itself → detail passport.",
          "Interlink proof. The reverse-link cards prove total == resolves by counting source rows whose model_id resolves to an ai_models.id. A representative proof query (run per-tenant against the live DB; not executed in this doc-writing session — run before merge per Gate 1):",
          "_total must equal _resolve for the module to pass the interlink gate."
        ],
        "compliance": [
          "EU AI Act — Art. 11 / Annex IV (technical documentation): the detail Model Card exports an Annex IV package and a Model Card (JSON). Maps to docs/compliance/eu-ai-act-mapping.md (Art. 11 \"Technical documentation → Audit chain + evidence export\", Implemented).",
          "EU AI Act — Art. 12 (record-keeping): the registry is the anchor for traceability. Honest gap (TD-018): ai_models has no fn_audit_trigger and modelService.ts makes no logAction call, so registering, editing, or deleting a model writes no audit record with an actor. The near-miss is that the legacy model_inventory table is trigger-audited while ai_models — the table the product actually uses — is not. This is an open P1 (docs/reference/technical-debt.md TD-018); it must be closed to satisfy the mapping's Art. 12 \"Implemented\" claim and the repo's own Gate 4. Note: some detail-page actions (linking a document, saving an alert config, initiating a review, exporting a package) do log to model_activity with the real actor — but the core registry writes do not.",
          "EU AI Act — Art. 9 (risk management): the Drift Alerts banner surfaces the obligation when a model shows drift.",
          "EU AI Act — Art. 14 (human oversight): registration captures the human-oversight flag, forced on for Annex III high-risk systems.",
          "ISO/IEC 42001 — the registry is the AI-system lifecycle system of record, aligning with the AIMS lifecycle controls (A.6.2.x in docs/compliance/iso-42001-mapping.md). Honest gap: there is currently no dedicated ai_models / Model Registry row in the ISO mapping doc; this module should be added there rather than left implied.",
          "NIST AI RMF — MAP (inventory and context establishment) and GOVERN (accountable owners). Honest gap: not yet formally recorded in a compliance mapping doc; mark as to-be-mapped rather than claimed."
        ],
        "operations": [
          "Seeding / backfill. Demo models are seeded by the 202608xx demo migrations with fictional, labelled data; no personal data in fixtures. org_id is filled DB-side.",
          "Empty state. Honest — \"No models registered yet\" with a Register CTA; filtered-empty shows \"No models match your filters.\"",
          "Writes throw. upsertModel / deleteModel throw on config/RLS/CHECK/network failure; the UI shows a real error toast and the dialog stays open. Success toasts fire only after the promise resolves.",
          "Realtime. The list is not realtime — React Query with staleTime 30 s, invalidated on mutation. The detail Performance data is push-updated via a Supabase Realtime channel (useModelAnalytics).",
          "Known debt / gaps to track:",
          "TD-018 — ai_models writes are not audit-logged (P1, open). See docs/reference/technical-debt.md.",
          "Fairness — for unmeasured (FIXED) — recordToModel now preserves a null fairness_score as null, so an unmeasured model renders — (neutral) in the list, CSV export, and on the detail Model Card + KPI tile — no longer a red 0% BELOW THRESHOLD. Note accuracy/latencyMs still default to 0 when unmeasured — a smaller remaining deviation to close next.",
          "Unmeasured metrics — accuracy, latencyMs default to 0 and monthlyInferences to — on the list view; the detail page substitutes live analytics where telemetry exists. Do not read these list defaults as measured values."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "DEFAULT gen_random_uuid(); the canonical model id-space — every module stores this, never a name or MDL-xxx"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DEFAULT get_org_id(); made NOT NULL + RLS-scoped by the tenancy sweep — never set by the client"
          ],
          [
            "name",
            "text",
            "yes (UI)",
            "Display name; resolved at render, never shown as a uuid"
          ],
          [
            "slug",
            "text",
            "—",
            "Derived by modelToRecord (slugify(name-version))"
          ],
          [
            "description",
            "text",
            "—",
            "Intended-use / description; renders —/empty when null"
          ],
          [
            "model_type",
            "text",
            "—",
            "Enum {llm, classification, regression, nlp, vision, multimodal, rl, other} → human label"
          ],
          [
            "provider",
            "text",
            "—",
            "e.g. OpenAI, Internal"
          ],
          [
            "version",
            "text",
            "—",
            "— when null"
          ],
          [
            "lifecycle_stage",
            "text",
            "—",
            "Mapped to UI status; empty/unknown → development"
          ],
          [
            "risk_tier",
            "text",
            "—",
            "Enum {critical, high, medium, low, minimal} ⇄ UI {unacceptable, high, limited, minimal}"
          ],
          [
            "use_case",
            "text",
            "—",
            "Free-text use-case label on the row"
          ],
          [
            "business_owner",
            "text",
            "—",
            "Primary owner shown in the list (falls back to technical_owner)"
          ],
          [
            "technical_owner",
            "text",
            "—",
            "ML/eng lead"
          ],
          [
            "framework",
            "text",
            "—",
            "e.g. \"EU AI Act\"; — when null"
          ],
          [
            "eu_ai_act_category",
            "text",
            "—",
            "EU AI Act category label"
          ],
          [
            "is_regulated",
            "boolean",
            "—",
            "Regulated-system flag"
          ],
          [
            "risk_score",
            "numeric",
            "—",
            "Quantitative risk score"
          ],
          [
            "trust_score",
            "numeric",
            "—",
            "Trust score"
          ],
          [
            "fairness_score",
            "numeric",
            "—",
            "Shown as Fairness %; null is preserved as unmeasured and renders — (not 0)"
          ],
          [
            "drift_status",
            "text",
            "—",
            "DEFAULT 'stable'; UI maps unknown → stable"
          ],
          [
            "drift_score",
            "numeric",
            "—",
            "Numeric drift measure"
          ],
          [
            "paused_reason",
            "text",
            "—",
            "Set by the autonomous mesh when a model is paused"
          ],
          [
            "paused_at",
            "timestamptz",
            "—",
            "When the model was paused"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "DNA & Lineage",
        "route": "/models/dna",
        "parentLabel": "Model Registry",
        "hasDoc": true,
        "docPath": "docs/modules/model-inventory.md",
        "title": "Model Registry",
        "purpose": "The Model Registry is Sentinel's system of record for every AI model the organisation builds, fine-tunes, or buys. Each row is one governed model keyed by ai_models.id (a uuid) — the single, canonical id-space that every other module in the platform links to. The screen lets a governance owner register, search, filter, export, edit, and retire models, and open any model's full governance passport.",
        "why": "ai_models is the platform's canonical governed entity. Risk tiering, impact assessments (AIIA), Model Risk Committee reviews, HITL reviews, incidents, the prompt registry, the Trust Engine runtime, cost/telemetry and performance monitoring all reference a model by its ai_models.id and resolve the display name at render time. Without a registry there is no id to link to, and the \"one platform, one id-space\" invariant (CLAUDE.md First principle #2) collapses into name-matching. In compliance terms the registry discharges the provider's duty to maintain an inventory of AI systems and their techni",
        "how": [
          "Records. A model is a row in ai_models. The list is read by modelService.fetchAllModels (ordered by created_at desc) through the useModelsData React Query hook (staleTime 30 s; the cache invalidates on every mutation). The raw row is translated to the rich UI Model view-shape by recordToModel in dashboard/src/lib/modelMapping.ts; writes translate back via modelToRecord.",
          "Create. \"Register Model\" opens RegisterModelForm. On submit the page calls saveModel(modelToRecord(newModel)) with no id, so the database generates the uuid (gen_random_uuid()) and fills org_id from its get_org_id() default — the client never sends a scoping column. A new insert also fires the MODEL_REGISTERED governance event on governanceBus (source ai-inventory): the autonomous mesh opens the initial risk, maps controls, and raises a HITL review where the tier demands it. That cascade is deliberately fire-and-forget and never rethrown — an agent failure must not roll back the user's save; its outcomes are observable in Agent Control / governance_events, not in the save result.",
          "Edit / delete. \"Edit\" opens EditModelForm and calls saveModel({ ...modelToRecord(updated), id }) (id present ⇒ update). \"Delete\" opens a ConfirmDialog and calls deleteModel(id). All writes throw on failure; the dialog closes and a toast fires only after the promise resolves — a failed write shows a real error toast (\"Failed to register/update/remove model\") and no success.",
          "Lifecycle & status. The stored lifecycle_stage is mapped to a UI status of production | staging | development | retired (LIFECYCLE_TO_STATUS). An unknown or empty stage deliberately defaults to development, never production, so the Production KPI is not over-counted. Each row renders a five-step lifecycle stepper (Development → Staging → Production → Deprecated → Retired) with the active stage highlighted.",
          "Risk tier. The DB risk_tier enum {critical, high, medium, low, minimal} maps to the UI tier {unacceptable, high, limited, minimal} (DB_RISK_TO_UI / UI_RISK_TO_DB). Registering as \"High-Risk AI System (Annex III)\" forces the tier to high; an unknown tier defaults to limited.",
          "Derived vs. stored. The four metric tiles (Total, Production, Drift Alerts, High-Risk) and the filtered count are computed client-side from the loaded rows — they are not stored aggregates. Per-model fairnessScore, accuracy, latencyMs, monthlyInferences and driftStatus are not part of the registry list's stored telemetry: recordToModel preserves a null fairnessScore as unmeasured (renders —), and defaults accuracy/latencyMs to 0, monthlyInferences to —, and driftStatus to stable when the columns are null. On the detail page these are replaced by live analytics (useModelAnalytics, realtime) where telemetry exists. Treat a 0/stable on a freshly-registered model as unmeasured, not measured (see the gap in Operations)."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every interlink uses the ?model=<uuid> deep-link convention (a filtered list with a dismissible chip) or the /models/inventory/:id detail route; ids resolve to a display name, and an unresolvable id shows \"Unavailable\" (never a raw uuid).",
          "Outbound — from a model record (mostly on the detail page):",
          "Governance cards → /ai-risk-tiering?model=, /aiia?model=, /mrc?model=, /performance-monitoring?model=, /model-efficiency?model=, /genai-risks?model=, /trust-engine?model=.",
          "Runtime & Operations rows → /models/lifecycle?model=, /prompt-registry?model=, /trust-engine/costs?model=, /trust-engine/fallback?model=, /trust-engine/tools?model=, /ai-gateway/playground?model=.",
          "Risk & Security backlink cards (reverse interlinks read live via useModelBacklinks) → /risks?model=, /incidents?model=, plus HITL reviews, financial-risk quantifications, security threats, red-team findings and arena runs that reference the model.",
          "On insert, the MODEL_REGISTERED governance event (source ai-inventory) fans out to the autonomous mesh (initial risk, control mapping, HITL) — an outbound governance cascade rather than a UI link.",
          "Inbound — the registry is reachable from:",
          "Command palette entry \"Model Registry\" → /models/inventory.",
          "Any module that deep-links a specific model → /models/inventory/:id (e.g. KnowledgeGraph.tsx, CisoDashboard.tsx), and every ?model= chip elsewhere resolves its label from ai_models.",
          "The list row itself → detail passport.",
          "Interlink proof. The reverse-link cards prove total == resolves by counting source rows whose model_id resolves to an ai_models.id. A representative proof query (run per-tenant against the live DB; not executed in this doc-writing session — run before merge per Gate 1):",
          "_total must equal _resolve for the module to pass the interlink gate."
        ],
        "compliance": [
          "EU AI Act — Art. 11 / Annex IV (technical documentation): the detail Model Card exports an Annex IV package and a Model Card (JSON). Maps to docs/compliance/eu-ai-act-mapping.md (Art. 11 \"Technical documentation → Audit chain + evidence export\", Implemented).",
          "EU AI Act — Art. 12 (record-keeping): the registry is the anchor for traceability. Honest gap (TD-018): ai_models has no fn_audit_trigger and modelService.ts makes no logAction call, so registering, editing, or deleting a model writes no audit record with an actor. The near-miss is that the legacy model_inventory table is trigger-audited while ai_models — the table the product actually uses — is not. This is an open P1 (docs/reference/technical-debt.md TD-018); it must be closed to satisfy the mapping's Art. 12 \"Implemented\" claim and the repo's own Gate 4. Note: some detail-page actions (linking a document, saving an alert config, initiating a review, exporting a package) do log to model_activity with the real actor — but the core registry writes do not.",
          "EU AI Act — Art. 9 (risk management): the Drift Alerts banner surfaces the obligation when a model shows drift.",
          "EU AI Act — Art. 14 (human oversight): registration captures the human-oversight flag, forced on for Annex III high-risk systems.",
          "ISO/IEC 42001 — the registry is the AI-system lifecycle system of record, aligning with the AIMS lifecycle controls (A.6.2.x in docs/compliance/iso-42001-mapping.md). Honest gap: there is currently no dedicated ai_models / Model Registry row in the ISO mapping doc; this module should be added there rather than left implied.",
          "NIST AI RMF — MAP (inventory and context establishment) and GOVERN (accountable owners). Honest gap: not yet formally recorded in a compliance mapping doc; mark as to-be-mapped rather than claimed."
        ],
        "operations": [
          "Seeding / backfill. Demo models are seeded by the 202608xx demo migrations with fictional, labelled data; no personal data in fixtures. org_id is filled DB-side.",
          "Empty state. Honest — \"No models registered yet\" with a Register CTA; filtered-empty shows \"No models match your filters.\"",
          "Writes throw. upsertModel / deleteModel throw on config/RLS/CHECK/network failure; the UI shows a real error toast and the dialog stays open. Success toasts fire only after the promise resolves.",
          "Realtime. The list is not realtime — React Query with staleTime 30 s, invalidated on mutation. The detail Performance data is push-updated via a Supabase Realtime channel (useModelAnalytics).",
          "Known debt / gaps to track:",
          "TD-018 — ai_models writes are not audit-logged (P1, open). See docs/reference/technical-debt.md.",
          "Fairness — for unmeasured (FIXED) — recordToModel now preserves a null fairness_score as null, so an unmeasured model renders — (neutral) in the list, CSV export, and on the detail Model Card + KPI tile — no longer a red 0% BELOW THRESHOLD. Note accuracy/latencyMs still default to 0 when unmeasured — a smaller remaining deviation to close next.",
          "Unmeasured metrics — accuracy, latencyMs default to 0 and monthlyInferences to — on the list view; the detail page substitutes live analytics where telemetry exists. Do not read these list defaults as measured values."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "DEFAULT gen_random_uuid(); the canonical model id-space — every module stores this, never a name or MDL-xxx"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DEFAULT get_org_id(); made NOT NULL + RLS-scoped by the tenancy sweep — never set by the client"
          ],
          [
            "name",
            "text",
            "yes (UI)",
            "Display name; resolved at render, never shown as a uuid"
          ],
          [
            "slug",
            "text",
            "—",
            "Derived by modelToRecord (slugify(name-version))"
          ],
          [
            "description",
            "text",
            "—",
            "Intended-use / description; renders —/empty when null"
          ],
          [
            "model_type",
            "text",
            "—",
            "Enum {llm, classification, regression, nlp, vision, multimodal, rl, other} → human label"
          ],
          [
            "provider",
            "text",
            "—",
            "e.g. OpenAI, Internal"
          ],
          [
            "version",
            "text",
            "—",
            "— when null"
          ],
          [
            "lifecycle_stage",
            "text",
            "—",
            "Mapped to UI status; empty/unknown → development"
          ],
          [
            "risk_tier",
            "text",
            "—",
            "Enum {critical, high, medium, low, minimal} ⇄ UI {unacceptable, high, limited, minimal}"
          ],
          [
            "use_case",
            "text",
            "—",
            "Free-text use-case label on the row"
          ],
          [
            "business_owner",
            "text",
            "—",
            "Primary owner shown in the list (falls back to technical_owner)"
          ],
          [
            "technical_owner",
            "text",
            "—",
            "ML/eng lead"
          ],
          [
            "framework",
            "text",
            "—",
            "e.g. \"EU AI Act\"; — when null"
          ],
          [
            "eu_ai_act_category",
            "text",
            "—",
            "EU AI Act category label"
          ],
          [
            "is_regulated",
            "boolean",
            "—",
            "Regulated-system flag"
          ],
          [
            "risk_score",
            "numeric",
            "—",
            "Quantitative risk score"
          ],
          [
            "trust_score",
            "numeric",
            "—",
            "Trust score"
          ],
          [
            "fairness_score",
            "numeric",
            "—",
            "Shown as Fairness %; null is preserved as unmeasured and renders — (not 0)"
          ],
          [
            "drift_status",
            "text",
            "—",
            "DEFAULT 'stable'; UI maps unknown → stable"
          ],
          [
            "drift_score",
            "numeric",
            "—",
            "Numeric drift measure"
          ],
          [
            "paused_reason",
            "text",
            "—",
            "Set by the autonomous mesh when a model is paused"
          ],
          [
            "paused_at",
            "timestamptz",
            "—",
            "When the model was paused"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Use Cases",
        "route": "/use-cases",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/knowledge-and-marketplace.md",
        "title": "Knowledge Graph, Marketplace, Use Cases",
        "purpose": "Graph view of organisational entities (assets, risks, controls, vendors, models, regulations, policies) for contextual analytics; a curated Marketplace of vetted templates, integrations, and eval packs; and a Use-Case library mapping business outcomes to control bundles.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 6.1",
            "Actions to address risks and opportunities"
          ],
          [
            "NIST AI RMF GOVERN 2.1",
            "Policies, processes, procedures"
          ],
          [
            "COBIT 2019 APO01",
            "Managed I&T framework"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Agents",
        "route": "/agents",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/agent-platform.md",
        "title": "Agent Platform (Registry, Discovery, IAM, Choreography)",
        "purpose": "Govern autonomous and human-in-the-loop agents: registration, capability declaration, identity and entitlements (non-human identity), orchestration, and safety rails.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "OWASP LLM Top 10 (Agentic)",
            "Excessive agency, tool misuse"
          ],
          [
            "EU AI Act Art.14, 15",
            "Oversight, robustness"
          ],
          [
            "ISO/IEC 42001 A.9",
            "Use of the AI system and oversight"
          ],
          [
            "NIST AI RMF MANAGE 2.1",
            "Risk response tracked post-deployment"
          ],
          [
            "NIST SP 800-207",
            "Zero-trust applied to workload identities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Permissions",
        "route": "/agent-iam",
        "parentLabel": "Agents",
        "hasDoc": true,
        "docPath": "docs/modules/agent-platform.md",
        "title": "Agent Platform (Registry, Discovery, IAM, Choreography)",
        "purpose": "Govern autonomous and human-in-the-loop agents: registration, capability declaration, identity and entitlements (non-human identity), orchestration, and safety rails.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "OWASP LLM Top 10 (Agentic)",
            "Excessive agency, tool misuse"
          ],
          [
            "EU AI Act Art.14, 15",
            "Oversight, robustness"
          ],
          [
            "ISO/IEC 42001 A.9",
            "Use of the AI system and oversight"
          ],
          [
            "NIST AI RMF MANAGE 2.1",
            "Risk response tracked post-deployment"
          ],
          [
            "NIST SP 800-207",
            "Zero-trust applied to workload identities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Choreography",
        "route": "/multi-agent",
        "parentLabel": "Agents",
        "hasDoc": true,
        "docPath": "docs/modules/agent-platform.md",
        "title": "Agent Platform (Registry, Discovery, IAM, Choreography)",
        "purpose": "Govern autonomous and human-in-the-loop agents: registration, capability declaration, identity and entitlements (non-human identity), orchestration, and safety rails.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "OWASP LLM Top 10 (Agentic)",
            "Excessive agency, tool misuse"
          ],
          [
            "EU AI Act Art.14, 15",
            "Oversight, robustness"
          ],
          [
            "ISO/IEC 42001 A.9",
            "Use of the AI system and oversight"
          ],
          [
            "NIST AI RMF MANAGE 2.1",
            "Risk response tracked post-deployment"
          ],
          [
            "NIST SP 800-207",
            "Zero-trust applied to workload identities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Kill Switch",
        "route": "/kill-switch",
        "parentLabel": "Agents",
        "hasDoc": true,
        "docPath": "docs/modules/kill-switch.md",
        "title": "Kill-Switch & Emergency Controls",
        "purpose": "Emergency disablement of models, agents, prompts, policies, or entire features with full audit trail and post-event review.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.14(4)(e)",
            "Ability to intervene or interrupt"
          ],
          [
            "ISO/IEC 42001 A.9.3",
            "Human oversight including override"
          ],
          [
            "NIST AI RMF MANAGE 2.3",
            "Post-deployment override mechanisms"
          ],
          [
            "DORA Art.12",
            "ICT response and recovery"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Datasets",
        "route": "/datasets",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/data-governance.md",
        "title": "Data Governance (Datasets, Quality, Lineage)",
        "purpose": "Inventory training/evaluation/production datasets, track quality, lineage, and compliance constraints; enforce data-minimisation and purpose-limitation.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.10",
            "Data governance for training/validation/test"
          ],
          [
            "ISO/IEC 42001 A.7",
            "Data for AI systems"
          ],
          [
            "ISO/IEC 25012 / 5259",
            "Data quality for analytics and ML"
          ],
          [
            "GDPR Art.5(1)(c)(d)",
            "Data minimisation and accuracy"
          ],
          [
            "DAMA-DMBOK 2",
            "Data management body of knowledge"
          ],
          [
            "BCBS 239",
            "Risk data aggregation (FS)"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Data Governance",
        "route": "/data-governance",
        "parentLabel": "Datasets",
        "hasDoc": true,
        "docPath": "docs/modules/data-governance.md",
        "title": "Data Governance (Datasets, Quality, Lineage)",
        "purpose": "Inventory training/evaluation/production datasets, track quality, lineage, and compliance constraints; enforce data-minimisation and purpose-limitation.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.10",
            "Data governance for training/validation/test"
          ],
          [
            "ISO/IEC 42001 A.7",
            "Data for AI systems"
          ],
          [
            "ISO/IEC 25012 / 5259",
            "Data quality for analytics and ML"
          ],
          [
            "GDPR Art.5(1)(c)(d)",
            "Data minimisation and accuracy"
          ],
          [
            "DAMA-DMBOK 2",
            "Data management body of knowledge"
          ],
          [
            "BCBS 239",
            "Risk data aggregation (FS)"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Data Lineage",
        "route": "/data-lineage",
        "parentLabel": "Datasets",
        "hasDoc": true,
        "docPath": "docs/modules/data-governance.md",
        "title": "Data Governance (Datasets, Quality, Lineage)",
        "purpose": "Inventory training/evaluation/production datasets, track quality, lineage, and compliance constraints; enforce data-minimisation and purpose-limitation.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.10",
            "Data governance for training/validation/test"
          ],
          [
            "ISO/IEC 42001 A.7",
            "Data for AI systems"
          ],
          [
            "ISO/IEC 25012 / 5259",
            "Data quality for analytics and ML"
          ],
          [
            "GDPR Art.5(1)(c)(d)",
            "Data minimisation and accuracy"
          ],
          [
            "DAMA-DMBOK 2",
            "Data management body of knowledge"
          ],
          [
            "BCBS 239",
            "Risk data aggregation (FS)"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Data Quality",
        "route": "/data-quality",
        "parentLabel": "Datasets",
        "hasDoc": true,
        "docPath": "docs/modules/data-governance.md",
        "title": "Data Governance (Datasets, Quality, Lineage)",
        "purpose": "Inventory training/evaluation/production datasets, track quality, lineage, and compliance constraints; enforce data-minimisation and purpose-limitation.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.10",
            "Data governance for training/validation/test"
          ],
          [
            "ISO/IEC 42001 A.7",
            "Data for AI systems"
          ],
          [
            "ISO/IEC 25012 / 5259",
            "Data quality for analytics and ML"
          ],
          [
            "GDPR Art.5(1)(c)(d)",
            "Data minimisation and accuracy"
          ],
          [
            "DAMA-DMBOK 2",
            "Data management body of knowledge"
          ],
          [
            "BCBS 239",
            "Risk data aggregation (FS)"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Prompt Registry",
        "route": "/prompt-registry",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/policy-firewall.md",
        "title": "Policy Firewall & Guardrails",
        "purpose": "Runtime enforcement layer between applications and LLM providers. Applies input/output policies (PII, secrets, jailbreak, toxicity, grounding, topic scope) and records every decision as evidence.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "OWASP LLM Top 10",
            "LLM01 Prompt Injection, LLM02 Insecure Output, LLM06 Sensitive Info Disclosure"
          ],
          [
            "NIST AI RMF MEASURE 2.7",
            "Security and resilience testing"
          ],
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "ISO/IEC 42001 A.6.2.6",
            "System monitoring"
          ],
          [
            "SOC 2 CC7.1",
            "Detection of anomalies"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "AI Apps",
        "route": "/ai-apps",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/ai-apps.md",
        "title": "AI Apps",
        "purpose": "The inventory of third-party and internally-built AI applications in use across the organisation — including tools adopted by staff without a formal procurement decision (\"shadow AI\").",
        "why": "The AI Act obliges an organisation to know what AI it uses, not only what it builds. Most enterprises discover, late, that staff have adopted a dozen generative tools with corporate data flowing into them and no DPA in place. This module makes that estate visible and governable: 1. Discovery — the SSO connector's sign-in telemetry surfaces tools in use. (Art. 4 AI literacy; Art. 26 deployer obligations) 2. Vendor accountability — each app links to the vendor supplying it, so third-party risk assessment and DPAs attach to a real record. (ISO 42001 A.10.2 third parties) 3. Data exposure — what k",
        "how": [
          "Each row is one application, carrying its approval state, the categories of data",
          "it may receive, and a link to the supplying vendor. Apps discovered through SSO",
          "telemetry arrive as unreviewed and must be triaged — the module deliberately does",
          "not auto-approve anything it discovers."
        ],
        "dataProcess": [],
        "interlinks": [
          "AI Apps → Vendors — vendor_id; the app record links to its supplier.",
          "Vendors → AI Apps — the Vendor Registry carries the count of governed apps",
          "attributed to a vendor.",
          "Integrations → AI Apps — the SSO connector is the discovery source",
          "(config.discoveryFeedsModule = 'ai-apps')."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Triage cadence: review newly discovered apps weekly; an app left unreviewed",
          "is an ungoverned data path.",
          "Prohibiting an app: set the approval state and record the reason — staff",
          "guidance and the Trust Center both read from this record."
        ],
        "fields": [
          [
            "EU AI Act Art. 4",
            "Staff-facing AI inventory supports AI-literacy obligations"
          ],
          [
            "EU AI Act Art. 26",
            "Deployer obligations for AI systems put into service"
          ],
          [
            "EU AI Act Art. 12",
            "App lifecycle audit-logged"
          ],
          [
            "ISO/IEC 42001 A.10.2",
            "Third-party and supplier management"
          ],
          [
            "GDPR Art. 30",
            "Data categories per app support records of processing"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Knowledge Graph",
        "route": "/knowledge-graph",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/knowledge-and-marketplace.md",
        "title": "Knowledge Graph, Marketplace, Use Cases",
        "purpose": "Graph view of organisational entities (assets, risks, controls, vendors, models, regulations, policies) for contextual analytics; a curated Marketplace of vetted templates, integrations, and eval packs; and a Use-Case library mapping business outcomes to control bundles.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 6.1",
            "Actions to address risks and opportunities"
          ],
          [
            "NIST AI RMF GOVERN 2.1",
            "Policies, processes, procedures"
          ],
          [
            "COBIT 2019 APO01",
            "Managed I&T framework"
          ]
        ],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "assess-validate",
    "title": "ASSESS & VALIDATE",
    "entryCount": 13,
    "documentedCount": 13,
    "entries": [
      {
        "label": "Impact Assessments",
        "route": "/aiia",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/ai-impact-assessments.md",
        "title": "AI Impact Assessments (AIIA)",
        "purpose": "The register of impact assessments carried out on AI systems — FRIA, DPIA and AIIA alike. Each record ties a model or use case to an assessed risk level, the findings behind that judgement, the mitigations agreed, and the review date at which the judgement expires.",
        "why": "An AI system's risk classification is a claim, and a claim an auditor will ask you to evidence. The EU AI Act requires a fundamental-rights impact assessment for high-risk deployments (Art. 27) and GDPR requires a DPIA where processing is likely to be high risk (Art. 35). This module is where that assessment lives as a record with an owner, a reviewer and an expiry — rather than as a document somebody once wrote.",
        "how": [
          "The list reads ai_impact_assessments through useAiiaData, with filters for",
          "status, type and risk level, and CSV export via exportCsv.",
          "A record moves through draft → in_review → approved | rejected. progress_pct",
          "tracks completion; rag_status (green | amber | red) carries the assessor's",
          "headline judgement separately from risk_level.",
          "findings and mitigations are jsonb arrays edited on the record's",
          "Overview and Mitigations tabs.",
          "next_review is the date the assessment must be revisited. approved_at",
          "records when sign-off happened.",
          "Reads and writes throw on failure, so the page renders a real error state",
          "rather than an empty list that looks like \"no assessments\"."
        ],
        "dataProcess": [],
        "interlinks": [
          "→ Model Registry. model_id resolves against ai_models.id; the",
          "assessment deep-links to /models/inventory/<id>.",
          "→ Use Cases. use_case_id resolves against use_cases.id.",
          "← Risk Classification. A model's tier is evidenced by its assessments.",
          "/aiia/:id is a stable, shareable URL for a single record (RecordDeepLink)."
        ],
        "compliance": [
          "EU AI Act Art. 27 — fundamental-rights impact assessment for high-risk",
          "deployments: this is the register that holds them.",
          "EU AI Act Art. 9 — risk management as a continuous process; next_review",
          "is what makes it continuous rather than one-off.",
          "GDPR Art. 35 — DPIA, carried as an assessment_type.",
          "ISO/IEC 42001 §6.1.2 / §8.2 — AI risk assessment and impact assessment.",
          "### Known gap",
          "This module does not currently write to the audit log — logAction does not",
          "appear in its page or service. Approving or rejecting an assessment is a",
          "state-changing governance decision, so it should be traceable under EU AI Act",
          "Art. 12. Recorded here rather than left implicit; closing it means adding",
          "logAction on the status-transition and delete paths."
        ],
        "operations": [
          "Table is org-scoped. tenant_id is NOT NULL with a DB default, so the client",
          "must not send it (CLAUDE.md First principle #3).",
          "model_id is uuid and use_case_id is text — they are deliberately",
          "different types because the two parent tables key differently. Do not",
          "\"normalise\" one to the other without migrating the parent."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "text",
            "Primary key"
          ],
          [
            "assessment_id",
            "text",
            "Human-facing reference"
          ],
          [
            "title",
            "text",
            "Assessment name"
          ],
          [
            "assessment_type",
            "text",
            "FRIA / DPIA / AIIA"
          ],
          [
            "model_id",
            "uuid",
            "→ ai_models.id — the one model id-space"
          ],
          [
            "use_case_id",
            "text",
            "→ use_cases.id"
          ],
          [
            "risk_level",
            "text",
            "low \\",
            "medium \\",
            "high \\",
            "critical"
          ],
          [
            "status",
            "text",
            "draft \\",
            "in_review \\",
            "approved \\",
            "rejected"
          ],
          [
            "progress_pct",
            "numeric",
            "Completion, 0–100"
          ],
          [
            "assessor_id / reviewer_id",
            "text",
            "Who performed and who reviewed"
          ],
          [
            "summary",
            "text",
            "Narrative conclusion"
          ],
          [
            "affected_entities",
            "text[]",
            "Groups or systems in scope"
          ],
          [
            "rag_status",
            "text",
            "green \\",
            "amber \\",
            "red"
          ],
          [
            "findings",
            "jsonb",
            "Findings raised"
          ],
          [
            "mitigations",
            "jsonb",
            "Mitigations agreed"
          ],
          [
            "approved_at",
            "timestamptz",
            "Sign-off time"
          ],
          [
            "next_review",
            "date",
            "When the assessment expires"
          ],
          [
            "org_id",
            "uuid",
            "Tenant scoping"
          ],
          [
            "tenant_id",
            "text",
            "NOT NULL, DB default current_user_org_id()::text"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Risk Classification",
        "route": "/ai-risk-tiering",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/ai-risk-tiering.md",
        "title": "AI Risk Tiering",
        "purpose": "Classify every AI system against the EU AI Act's four-tier risk model — Unacceptable, High, Limited, Minimal — and record the basis for that decision, the obligations it triggers, and the person accountable for it. It is the gateway that routes each system to the correct governance pathway.",
        "why": "EU AI Act Article 6 (with Annex III) is the foundational obligation of the whole regulation: it decides *whether a system is regulated at all and how hard*. Everything downstream — the Article 9 risk-management system, Article 10 data governance, Article 11 technical documentation, Article 12 logging, Article 14 human oversight — is conditional on a system first being classified High-risk. Article 5 sits above this: a prohibited practice cannot be placed on the EU market at any price. Article 50 transparency duties attach to the Limited tier (chatbots, synthetic content, undisclosed GPAI). Mis",
        "how": [
          "A record is created through a three-step wizard (\"Classify System\"):",
          "1. System selection. Choose a registry model (ai_models.id) or enter a",
          "free-text system name, plus intended use case, an optional linked use case",
          "(use_cases.id), affected users, review-due date, the classifier/owner",
          "(required), and fundamental-rights notes.",
          "2. Classification questionnaire (the TieringInput). Article 5 prohibited",
          "practices (multi-select), Annex III high-risk categories (multi-select), and",
          "five yes/no questions: automated decision affecting fundamental rights,",
          "interacts with people, generates synthetic content, is GPAI, discloses AI",
          "use. The computed tier updates live as answers change.",
          "3. Review & confirm. Shows the final tier, resolved system name, basis",
          "sentence, and the applicable obligations before the write."
        ],
        "dataProcess": [],
        "interlinks": [
          "Both directions are wired through metadata ids, resolved to names at render.",
          "Outbound → Model Registry. Each classification stores metadata.model_id",
          "(an ai_models.id). The table's system pill and the Linked-Model tab's \"View",
          "Full Model Record\" navigate to /models/<uuid>. Unresolvable ids render",
          "\"Unavailable\", never a raw uuid.",
          "Outbound → Use Cases. Optional metadata.use_case_id (a use_cases.id)",
          "renders as a pill in the Linked-Model tab, navigating to /use-cases/<uuid>.",
          "Inbound ← Model Detail. The Governance card on /models/:id",
          "(ModelDetail.tsx line ~599) shows the model's current tier via",
          "useModelGovernance() and deep-links to /ai-risk-tiering?model=<uuid>,",
          "which pre-filters this list to that model with a dismissible chip.",
          "Inbound ← Overview / Command Palette / Setup checklist. The Overview"
        ],
        "compliance": [
          "EU AI Act — this module is the direct implementation of Article 5",
          "(prohibited practices → Unacceptable), Article 6 + Annex III (High-risk",
          "classification), and Article 50 (transparency → Limited). The obligations",
          "it attaches to a High-risk record cite Art. 9–15 verbatim.",
          "⚠️ Mapping gap (real, not invented). As of this writing the module is",
          "NOT yet mapped in docs/compliance/eu-ai-act-mapping.md. That document",
          "maps Art. 9, 10, 12, 13, 14, 15 to downstream modules but has **no row for",
          "Article 5, Article 6, or Annex III risk classification** and does not name",
          "this module. (The Art. 6 / 7 row at line 103 is GDPR Art. 6/7 consent, a",
          "different framework.) Likewise docs/compliance/iso-42001-mapping.md maps",
          "6.1.2 AI risk assessment to \"Trust score pipeline\" and **6.1.3 AI risk",
          "treatment to \"Circuit breaker cascade\" — not** to this tiering module,"
        ],
        "operations": [
          "Seeding / backfill. Demo rows are inserted by",
          "supabase/migrations/20260813000015_seed_aiia_modules.sql (six fictional",
          "systems across all tiers) with on conflict (id) do nothing; a further seed",
          "in 20260816000005_seed_nepal_assess_validate.sql also touches the table.",
          "All demo data is fictional and org-scoped.",
          "Empty state. With no rows the table shows \"No classifications yet —",
          "classify your first AI system.\"; with a non-matching search it shows \"No",
          "classifications match your search.\" Loading shows a spinner row; error shows"
        ],
        "fields": [
          [
            "1",
            "Any Article 5 prohibited practice selected",
            "Unacceptable",
            "1.0",
            "\"Prohibited under Article 5 — must not be placed on the EU market.\""
          ],
          [
            "2",
            "Any Annex III category or affects fundamental rights",
            "High",
            "0.8",
            "The 7 HIGH_RISK_OBLIGATIONS (Art. 9–15)"
          ],
          [
            "3",
            "Interacts with humans or generates synthetic content or (GPAI and not disclosed)",
            "Limited",
            "0.35",
            "\"Transparency / AI-use disclosure (Art. 50)\""
          ],
          [
            "4",
            "None of the above",
            "Minimal",
            "0.1",
            "none"
          ],
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "gen_random_uuid() default"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id() (set in 20260813000004_aiia_wiring_foundation.sql); never set client-side"
          ],
          [
            "system_id",
            "uuid",
            "—",
            "Registry model id when a model was picked; normalized '' → null on write"
          ],
          [
            "system_name",
            "text",
            "yes",
            "Resolved model name or free-text; the required \"system\" value in the wizard"
          ],
          [
            "risk_tier",
            "text",
            "yes",
            "unacceptable \\",
            "high \\",
            "limited \\",
            "minimal; defaults to limited in fromRow if absent"
          ],
          [
            "risk_score",
            "numeric",
            "—",
            "1.0 / 0.8 / 0.35 / 0.1 from the engine; renders — when null, .toFixed(2) otherwise"
          ],
          [
            "use_case",
            "text",
            "—",
            "Free-text intended purpose; — when empty"
          ],
          [
            "affected_users",
            "text",
            "—",
            "e.g. \"Loan applicants (EU)\"; — when empty"
          ],
          [
            "fundamental_rights_impact",
            "text",
            "—",
            "Notes; — when empty"
          ],
          [
            "classification_basis",
            "text",
            "—",
            "Engine-generated justification sentence; — when empty"
          ],
          [
            "classifier",
            "text",
            "yes",
            "Owner/classifier name (required in wizard)"
          ],
          [
            "classified_at",
            "timestamptz",
            "—",
            "Set to now() on create; list is ordered by this desc, nulls last"
          ],
          [
            "review_due_at",
            "timestamptz",
            "—",
            "Optional review date; — when null"
          ],
          [
            "status",
            "text",
            "—",
            "draft \\",
            "in_review \\",
            "approved; defaults to draft"
          ],
          [
            "metadata",
            "jsonb",
            "—",
            "Holds model_id, use_case_id, annexIII[], obligations[], gpai"
          ],
          [
            "created_at",
            "timestamptz",
            "auto",
            "now() default"
          ],
          [
            "updated_at",
            "timestamptz",
            "auto",
            "Set by toRow on every write (live column)"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Model Risk Committee",
        "route": "/mrc",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/model-risk-committee.md",
        "title": "Model Risk Committee (MRC)",
        "purpose": "The committee that approves models for production and records the vote. Meetings hold agenda items (model reviews); each item accrues votes and a recorded committee decision; quorum is counted from the committee roster.",
        "why": "SR 11-7 §IV.C and EU AI Act Art. 9 require documented model-approval governance with recorded, quorate decisions. The meetings, agenda items and votes were already on real org-scoped tables — but the committee roster lived in modelriskcommittee_table (id, doc jsonb): no tenant column, no RLS, seeded from seven hardcoded names in the page file. Quorum is the only thing that makes a vote binding, and it was being computed from fiction. The 2026-08-25 wave moves the roster to mrc_committee_members (real table, RLS, linked to the org directory). The model interlink was broken and invisible. On a f",
        "how": [
          "Real tables, org-scoped. mrcService reads/writes all four tables;",
          "org_id filled by the DB default current_user_org_id(). Writes throw;",
          "every create / decision / vote / member change calls logAction (Art. 12).",
          "Decision is derived from the record, quorum from the roster. tallyVotes",
          "sums the recorded votes; quorum counts mrc_committee_members rows with",
          "counts_toward_quorum = true. Neither is hand-authored.",
          "Model names resolve, never fall back to the stale label. An agenda item",
          "whose model_id does not resolve renders \"Unavailable\" — the denormalised",
          "model_name is display metadata only and is never shown in its place. The",
          "model pill links to /models/inventory/:id.",
          "A thrown query renders an ErrorState, never an empty agenda.",
          "?model=<ai_models.id> narrows the agenda to a model with a dismissible chip;"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound: agenda items and votes → the model detail page; committee",
          "members → the org directory (user_profiles).",
          "Inbound: a model's detail page reaches its committee reviews via",
          "/mrc?model=<id>; ?open=<id> opens an agenda item."
        ],
        "compliance": [
          "Federal Reserve SR 11-7 (model risk management, quorum, recorded dissent).",
          "EU AI Act Art. 9 (risk-management system), Art. 14 (human oversight — the",
          "committee is the oversight body). Art. 12 audit logging via logAction."
        ],
        "operations": [
          "Members are drawn from the org directory; account permissions remain governed in",
          "Access Control. A vote requires a rationale (audit trail). Quorum status is",
          "shown against the next upcoming (else most recent) meeting."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "Primary key"
          ],
          [
            "org_id",
            "uuid, default current_user_org_id()",
            "Tenant scope"
          ],
          [
            "meeting_id",
            "uuid → mrc_meetings(id)",
            ""
          ],
          [
            "title",
            "text NOT NULL",
            ""
          ],
          [
            "model_id",
            "uuid → ai_models(id) ON DELETE SET NULL",
            "The model link (converted from text + FK added 2026-08-25)"
          ],
          [
            "model_name",
            "text",
            "Denormalised display label only"
          ],
          [
            "review_type",
            "text",
            "Model Review / Go-Live / Incident / Periodic"
          ],
          [
            "decision",
            "text",
            "pending / approved / rejected / deferred / conditional"
          ],
          [
            "decided_at",
            "timestamptz",
            ""
          ],
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "Primary key"
          ],
          [
            "org_id",
            "uuid, default current_user_org_id()",
            "Tenant scope"
          ],
          [
            "user_id",
            "uuid → user_profiles(id)",
            "The real person"
          ],
          [
            "member_name",
            "text NOT NULL",
            "Display label"
          ],
          [
            "committee_role",
            "text",
            ""
          ],
          [
            "is_chair",
            "boolean",
            ""
          ],
          [
            "counts_toward_quorum",
            "boolean",
            "Quorum is counted from this"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Validation Lab",
        "route": "/model-validation",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Metric Studio",
        "route": "/evals/metric-studio",
        "parentLabel": "Validation Lab",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Dataset Wizard",
        "route": "/evals/dataset-create",
        "parentLabel": "Validation Lab",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Data Explorer",
        "route": "/evals/dataset-preview",
        "parentLabel": "Validation Lab",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Scenario Editor",
        "route": "/evals/multi-turn",
        "parentLabel": "Validation Lab",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Session Trace Viewer",
        "route": "/evals/conversation",
        "parentLabel": "Validation Lab",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Benchmarks",
        "route": "/evals/benchmark",
        "parentLabel": "Validation Lab",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Eval Techniques",
        "route": "/evals/techniques",
        "parentLabel": "Validation Lab",
        "hasDoc": true,
        "docPath": "docs/modules/eval-techniques.md",
        "title": "Eval Techniques",
        "purpose": "The catalogue of evaluation methods the organisation runs against its models — what each technique measures, how often it must run, who owns it, when it is next due, and which models it governs.",
        "why": "Validation runs answer \"how did this model score?\". This module answers the prior question: \"what are we obliged to test at all, and are we current?\" Regulators do not accept a validation report in isolation; they ask whether the testing regime is defined, risk-proportionate and actually followed. A model with a good accuracy score and an eighteen-month-overdue fairness audit is a finding, and without a catalogue that overdue state is invisible. Concretely this module provides: 1. A defined evaluation regime — the set of techniques, not ad-hoc runs. (EU AI Act Art. 9 risk management; ISO 42001",
        "how": [
          "Each row defines one technique. cadence (continuous → annual or ad_hoc)",
          "plus next_due_at drive the overdue calculation shown in the list and rolled up",
          "on the Validation Lab.",
          "Recording a run writes last_run_at, sets status to completed and rolls",
          "next_due_at forward by the cadence — so currency is maintained by the act of",
          "running the technique, not by someone remembering to update a date.",
          "linked_model_ids scopes a technique to specific models; those pills deep-link",
          "into the model record. An **empty array means the technique applies across the",
          "whole inventory**, which the UI states explicitly as \"all models\" rather than",
          "leaving it ambiguous.",
          "methodology and scoring_method capture how the technique is executed and",
          "what the resulting number means — the two things an auditor asks for after"
        ],
        "dataProcess": [],
        "interlinks": [
          "Techniques → Models — linked_model_ids; pills deep-link to",
          "/models/inventory/:id.",
          "Techniques → Validation Lab — header link; the Lab is where runs of these",
          "techniques are recorded.",
          "Validation Lab → Techniques — carries the live catalogue count and the",
          "overdue count, so the regime's currency is visible from the run list."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "A technique goes overdue: the list and the Validation Lab chip both flag it",
          "in the error tone. Run it, then use Record run so the due date rolls.",
          "Scoping to models: leave linked_model_ids empty only when the technique",
          "genuinely applies inventory-wide; otherwise scope it, so the model record shows",
          "what governs it.",
          "Retention: soft-deleted, because historical validation runs reference the",
          "technique that produced them."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "name",
            "text",
            "Technique name"
          ],
          [
            "description",
            "text",
            "What it measures, in plain language"
          ],
          [
            "category",
            "text",
            "performance · fairness · robustness · security · quality · explainability · privacy · other"
          ],
          [
            "methodology",
            "text",
            "How the technique is executed"
          ],
          [
            "scoring_method",
            "text",
            "What the resulting number means"
          ],
          [
            "example_prompt",
            "text",
            "For generative techniques, a representative probe"
          ],
          [
            "applicable_types",
            "text[]",
            "Model types the technique suits"
          ],
          [
            "cadence",
            "text",
            "continuous · monthly · quarterly · semiannual · annual · ad_hoc"
          ],
          [
            "status",
            "text",
            "planned · in_progress · completed · blocked"
          ],
          [
            "last_run_at / next_due_at",
            "date",
            "Currency; next_due_at in the past = overdue"
          ],
          [
            "owner",
            "text",
            "Accountable human"
          ],
          [
            "linked_model_ids",
            "uuid[] → ai_models.id",
            "Scope; empty = all models"
          ],
          [
            "icon_key",
            "text",
            "Stable icon key, so the choice survives a library change"
          ],
          [
            "reference_url",
            "text",
            "External standard or method reference"
          ],
          [
            "is_deleted",
            "boolean",
            "Soft delete — techniques are referenced by evidence"
          ],
          [
            "EU AI Act Art. 9",
            "A defined, risk-proportionate testing regime with owners and cadence"
          ],
          [
            "EU AI Act Art. 10",
            "Fairness and privacy techniques evidence data-governance testing"
          ],
          [
            "EU AI Act Art. 12",
            "All CRUD and run records audit-logged via logAction"
          ],
          [
            "EU AI Act Art. 15",
            "Robustness and accuracy techniques with recorded currency"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation planning"
          ],
          [
            "ISO/IEC 42001 A.6.2.2",
            "Objectives for the AI system, tested against"
          ],
          [
            "ISO/IEC 42001 A.3.2",
            "Documented roles and accountability"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Bias Audits",
        "route": "/bias-audits",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/bias-fairness.md",
        "title": "Bias & Fairness Audits",
        "purpose": "Detect, measure, and remediate unjust disparate impact of AI systems across protected classes and business-relevant cohorts — pre-deployment and continuously in production.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.10(2)(f)(g)",
            "Examination of datasets for bias"
          ],
          [
            "EU AI Act Art.15",
            "Accuracy and non-discrimination"
          ],
          [
            "NIST AI RMF MEASURE 2.11",
            "Fairness and bias evaluated"
          ],
          [
            "NIST SP 1270",
            "Towards a Standard for Identifying and Managing Bias"
          ],
          [
            "NYC LL 144",
            "Automated employment decision tools bias audit"
          ],
          [
            "EEOC UGESP",
            "Four-fifths rule"
          ],
          [
            "ISO/IEC TR 24027",
            "Bias in AI systems"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Explainability",
        "route": "/explainability",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/explainability.md",
        "title": "Explainability & Transparency",
        "purpose": "Produce model-level and decision-level explanations, transparency disclosures, and provenance evidence for every consequential AI decision.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.13, 50",
            "Transparency obligations, content labelling"
          ],
          [
            "EU AI Act Art.86",
            "Right to explanation of individual decisions"
          ],
          [
            "GDPR Art.13–15, 22",
            "Meaningful information about logic"
          ],
          [
            "NIST AI RMF MEASURE 2.8, 2.9",
            "Interpretability and explainability"
          ],
          [
            "ISO/IEC 42001 A.6.2.8",
            "System information for users"
          ],
          [
            "ISO/IEC TS 6254",
            "Objectives and approaches for explainability"
          ]
        ],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "trust-engine-gateways",
    "title": "TRUST ENGINE & GATEWAYS",
    "entryCount": 15,
    "documentedCount": 15,
    "entries": [
      {
        "label": "Runtime Trust",
        "route": "/trust-engine",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-engine.md",
        "title": "Trust Engine (Runtime Trust)",
        "purpose": "The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a data-plane gateway that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of dashboard screens that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, a",
        "why": "This is the product's core value proposition. A governance platform that only documents models after the fact cannot stop a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges: EU AI Act Art. 9 (risk management) — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked. EU AI Act Art. 10 (data governance) — the prompt sanitizer strips PII and detects prompt injection before anything is logged or sent to the provider (data minimisation, Art. 10.3). EU AI Act Art. 12 (re",
        "how": [
          "### Runtime data-plane — POST /v1/chat/completions (sentinel/proxy.py)",
          "The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see docs/architecture/deployment-topology.md). Each inference walks a fixed pipeline:",
          "1. Tenant resolve — the Bearer JWT is decoded and verified against SECRET_KEY; the tenant_id claim loads a TenantConfig from the tenants store. Any failure is a 401.",
          "2. Rate limit — a 60-second sliding window in Redis (sentinel:ratelimit:<tenant>, sorted-set + zcard), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway fails open (allow-all) rather than dropping traffic.",
          "3. Sanitize — sanitizer.sanitize(prompt, tenant) strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 INJECTION_DETECTED and a blocked audit entry is written (trust_score 0, intervention BLOCKED) before returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.",
          "4. Circuit breaker / provider routing — circuit_breaker.call(...) wraps the provider call (litellm.acompletion against tenant.primary_model, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.",
          "5. Audit — a hash-chained AuditEntryInput (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via auditor.log as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.",
          "6. Compliance evaluation — ComplianceEngine.evaluate(...) runs against the audit entry as a background task.",
          "7. Metrics + telemetry — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to model_performance_metrics (feeds the Model Detail \"Performance\" tab). Telemetry failures are swallowed so they can never affect request handling.",
          "Prompt and response are stored only as SHA-256 digests, never plaintext.",
          "### Dashboard control-plane",
          "The seven screens are React Query views over the real org-scoped tables, following the modelService conventions: direct Supabase calls, camelCase↔snake_case mapping, reads and writes throw on failure so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (Unavailable when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a \"Live\"/\"Not connected\" badge reflecting the actual channel state."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every relation is keyed by ai_models.id (uuid) and resolved to a name at render.",
          "Outbound",
          "Every screen → Model registry (/models/inventory/:id) via model uuid pills.",
          "Live Traces → Guardrails (/trust-engine/guardrails?policy=<uuid>) for the evaluated policy.",
          "Guardrails → Incident Response (incidents row created on escalate) and → Live Traces (/trust-engine/traces?model=<uuid>).",
          "Tool Monitor → Incident Response (incidents on escalate) and → Agent IAM (/agent-iam).",
          "Fallback Failovers → Live Traces by trace_id / trace_ref.",
          "Runtime gateway → model_performance_metrics (per-inference telemetry) → Model Detail → Performance tab.",
          "Config → Keys Vault (/security/keys) for secrets and Audit Log (/audit-trail) for every save.",
          "Inbound",
          "Model Detail deep-links into these screens with ?model=<uuid> (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.",
          "trust_policies are referenced by live_traces.policy_id and guardrail_events.policy_id; a policy referenced by recorded traces/events cannot be deleted (deactivate instead) — surfaced as a friendly service error."
        ],
        "compliance": [
          "The audit found this module \"mapped loosely,\" and that is accurate. Neither docs/compliance/eu-ai-act-mapping.md nor docs/compliance/iso-42001-mapping.md contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the runtime gateway's layers described generically, not the dashboard screens:",
          "EU AI Act — Art. 9 \"Trust score + circuit breaker\", Art. 10 \"PII sanitizer + verifier\", Art. 12 \"Immutable audit log\", Art. 14 \"HITL queue + review UI\", Art. 15 \"Fact-checker + NLI verifier\", Art. 62 \"Continuous audit logging\" — all marked Implemented, but attributed to sentinel/proxy.py layers, with no link back to /trust-engine/* or to live_traces / guardrail_events / trust_policies.",
          "ISO/IEC 42001 — 6.1.2 \"Trust score pipeline\", 6.1.3 \"Circuit breaker cascade\", 8.4 \"Proxy middleware\", 9.1 \"Audit hash chain\", A.8.3 \"PII sanitizer\", A.8.4 \"Immutable audit chain\" — again the gateway layers, not the module.",
          "NIST AI RMF — the previous thin doc asserted MEASURE 3.1–3.3; no NIST mapping document exists in docs/compliance/, so that citation is unbacked and should be treated as a claim, not a mapping.",
          "Real, defensible coverage today: the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via auditor.log), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real incidents record; the route_hitl policy action). Config saves and policy/rule CRUD write to the platform Audit Log via logAction (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.",
          "Gap to close (recommended): add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → trust_policies + circuit breaker; Art. 12 → live_traces + hash chain; Art. 14 → guardrail_events ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is implemented in code but under-documented in the mapping — mark it Partial on the mapping line, not Implemented."
        ],
        "operations": [
          "Seeding / backfill. 20260814000011_trust_runtime_seeds.sql provides coherent demo rows for the demo org (00000000-…-0001), all keyed to real ai_models uuids, idempotent. The agents table is empty (Agent Control not seeded), so agent_id is left null and only agent_name is populated on tool/trace/event rows.",
          "Empty states. Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render — (not 0) when there is nothing to measure.",
          "Realtime. Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.",
          "Common errors (writes throw). Deleting a referenced policy → \"This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.\" Ack without a session → \"Sign in required to acknowledge events.\" Invalid rule condition → \"Condition is not valid JSON: …\". Provider failure at the gateway → HTTP 502; injection → HTTP 400 INJECTION_DETECTED; over rate limit → HTTP 429.",
          "Fail-open rate limit. If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.",
          "Retention. live_traces shows most-recent 100 per query; cost_token_usage is a daily ledger; audit entries are append-only and never deleted.",
          "Known debt. Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. live_traces.policy_id / guardrail_events.policy_id are text, not uuid FKs. Three partially-overlapping Python surfaces (proxy:app, main:app, the connect edge function) can drift — TD-019 in docs/reference/technical-debt.md. The compliance-mapping gap above should be recorded there with an owner."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "the only key"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id()"
          ],
          [
            "policy_ref",
            "text",
            "—",
            "display ref (POL-… seeds, TP-### UI-created); never a key"
          ],
          [
            "name / type / action / severity",
            "text",
            "—",
            "action ∈ block/warn/redact/route_hitl/log"
          ],
          [
            "condition_json",
            "jsonb",
            "—",
            "policy condition; null → not shown"
          ],
          [
            "threshold",
            "numeric",
            "—",
            "null → —"
          ],
          [
            "is_active",
            "boolean",
            "—",
            "active policies evaluate live traffic"
          ],
          [
            "linked_models",
            "text[]",
            "—",
            "canonical ai_models.id uuids; resolved at render; \"Unavailable\" if unresolved"
          ],
          [
            "framework_ref",
            "text",
            "—",
            "e.g. \"GDPR Art. 5\"; null → —"
          ],
          [
            "triggers_7d / block_rate / avg_latency_ms",
            "numeric",
            "—",
            "telemetry aggregates; avg_latency_ms null → —"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Active Guardrails",
        "route": "/trust-engine/guardrails",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-engine.md",
        "title": "Trust Engine (Runtime Trust)",
        "purpose": "The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a data-plane gateway that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of dashboard screens that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, a",
        "why": "This is the product's core value proposition. A governance platform that only documents models after the fact cannot stop a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges: EU AI Act Art. 9 (risk management) — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked. EU AI Act Art. 10 (data governance) — the prompt sanitizer strips PII and detects prompt injection before anything is logged or sent to the provider (data minimisation, Art. 10.3). EU AI Act Art. 12 (re",
        "how": [
          "### Runtime data-plane — POST /v1/chat/completions (sentinel/proxy.py)",
          "The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see docs/architecture/deployment-topology.md). Each inference walks a fixed pipeline:",
          "1. Tenant resolve — the Bearer JWT is decoded and verified against SECRET_KEY; the tenant_id claim loads a TenantConfig from the tenants store. Any failure is a 401.",
          "2. Rate limit — a 60-second sliding window in Redis (sentinel:ratelimit:<tenant>, sorted-set + zcard), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway fails open (allow-all) rather than dropping traffic.",
          "3. Sanitize — sanitizer.sanitize(prompt, tenant) strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 INJECTION_DETECTED and a blocked audit entry is written (trust_score 0, intervention BLOCKED) before returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.",
          "4. Circuit breaker / provider routing — circuit_breaker.call(...) wraps the provider call (litellm.acompletion against tenant.primary_model, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.",
          "5. Audit — a hash-chained AuditEntryInput (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via auditor.log as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.",
          "6. Compliance evaluation — ComplianceEngine.evaluate(...) runs against the audit entry as a background task.",
          "7. Metrics + telemetry — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to model_performance_metrics (feeds the Model Detail \"Performance\" tab). Telemetry failures are swallowed so they can never affect request handling.",
          "Prompt and response are stored only as SHA-256 digests, never plaintext.",
          "### Dashboard control-plane",
          "The seven screens are React Query views over the real org-scoped tables, following the modelService conventions: direct Supabase calls, camelCase↔snake_case mapping, reads and writes throw on failure so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (Unavailable when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a \"Live\"/\"Not connected\" badge reflecting the actual channel state."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every relation is keyed by ai_models.id (uuid) and resolved to a name at render.",
          "Outbound",
          "Every screen → Model registry (/models/inventory/:id) via model uuid pills.",
          "Live Traces → Guardrails (/trust-engine/guardrails?policy=<uuid>) for the evaluated policy.",
          "Guardrails → Incident Response (incidents row created on escalate) and → Live Traces (/trust-engine/traces?model=<uuid>).",
          "Tool Monitor → Incident Response (incidents on escalate) and → Agent IAM (/agent-iam).",
          "Fallback Failovers → Live Traces by trace_id / trace_ref.",
          "Runtime gateway → model_performance_metrics (per-inference telemetry) → Model Detail → Performance tab.",
          "Config → Keys Vault (/security/keys) for secrets and Audit Log (/audit-trail) for every save.",
          "Inbound",
          "Model Detail deep-links into these screens with ?model=<uuid> (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.",
          "trust_policies are referenced by live_traces.policy_id and guardrail_events.policy_id; a policy referenced by recorded traces/events cannot be deleted (deactivate instead) — surfaced as a friendly service error."
        ],
        "compliance": [
          "The audit found this module \"mapped loosely,\" and that is accurate. Neither docs/compliance/eu-ai-act-mapping.md nor docs/compliance/iso-42001-mapping.md contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the runtime gateway's layers described generically, not the dashboard screens:",
          "EU AI Act — Art. 9 \"Trust score + circuit breaker\", Art. 10 \"PII sanitizer + verifier\", Art. 12 \"Immutable audit log\", Art. 14 \"HITL queue + review UI\", Art. 15 \"Fact-checker + NLI verifier\", Art. 62 \"Continuous audit logging\" — all marked Implemented, but attributed to sentinel/proxy.py layers, with no link back to /trust-engine/* or to live_traces / guardrail_events / trust_policies.",
          "ISO/IEC 42001 — 6.1.2 \"Trust score pipeline\", 6.1.3 \"Circuit breaker cascade\", 8.4 \"Proxy middleware\", 9.1 \"Audit hash chain\", A.8.3 \"PII sanitizer\", A.8.4 \"Immutable audit chain\" — again the gateway layers, not the module.",
          "NIST AI RMF — the previous thin doc asserted MEASURE 3.1–3.3; no NIST mapping document exists in docs/compliance/, so that citation is unbacked and should be treated as a claim, not a mapping.",
          "Real, defensible coverage today: the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via auditor.log), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real incidents record; the route_hitl policy action). Config saves and policy/rule CRUD write to the platform Audit Log via logAction (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.",
          "Gap to close (recommended): add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → trust_policies + circuit breaker; Art. 12 → live_traces + hash chain; Art. 14 → guardrail_events ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is implemented in code but under-documented in the mapping — mark it Partial on the mapping line, not Implemented."
        ],
        "operations": [
          "Seeding / backfill. 20260814000011_trust_runtime_seeds.sql provides coherent demo rows for the demo org (00000000-…-0001), all keyed to real ai_models uuids, idempotent. The agents table is empty (Agent Control not seeded), so agent_id is left null and only agent_name is populated on tool/trace/event rows.",
          "Empty states. Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render — (not 0) when there is nothing to measure.",
          "Realtime. Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.",
          "Common errors (writes throw). Deleting a referenced policy → \"This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.\" Ack without a session → \"Sign in required to acknowledge events.\" Invalid rule condition → \"Condition is not valid JSON: …\". Provider failure at the gateway → HTTP 502; injection → HTTP 400 INJECTION_DETECTED; over rate limit → HTTP 429.",
          "Fail-open rate limit. If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.",
          "Retention. live_traces shows most-recent 100 per query; cost_token_usage is a daily ledger; audit entries are append-only and never deleted.",
          "Known debt. Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. live_traces.policy_id / guardrail_events.policy_id are text, not uuid FKs. Three partially-overlapping Python surfaces (proxy:app, main:app, the connect edge function) can drift — TD-019 in docs/reference/technical-debt.md. The compliance-mapping gap above should be recorded there with an owner."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "the only key"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id()"
          ],
          [
            "policy_ref",
            "text",
            "—",
            "display ref (POL-… seeds, TP-### UI-created); never a key"
          ],
          [
            "name / type / action / severity",
            "text",
            "—",
            "action ∈ block/warn/redact/route_hitl/log"
          ],
          [
            "condition_json",
            "jsonb",
            "—",
            "policy condition; null → not shown"
          ],
          [
            "threshold",
            "numeric",
            "—",
            "null → —"
          ],
          [
            "is_active",
            "boolean",
            "—",
            "active policies evaluate live traffic"
          ],
          [
            "linked_models",
            "text[]",
            "—",
            "canonical ai_models.id uuids; resolved at render; \"Unavailable\" if unresolved"
          ],
          [
            "framework_ref",
            "text",
            "—",
            "e.g. \"GDPR Art. 5\"; null → —"
          ],
          [
            "triggers_7d / block_rate / avg_latency_ms",
            "numeric",
            "—",
            "telemetry aggregates; avg_latency_ms null → —"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Live Inference Traces",
        "route": "/trust-engine/traces",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-engine.md",
        "title": "Trust Engine (Runtime Trust)",
        "purpose": "The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a data-plane gateway that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of dashboard screens that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, a",
        "why": "This is the product's core value proposition. A governance platform that only documents models after the fact cannot stop a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges: EU AI Act Art. 9 (risk management) — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked. EU AI Act Art. 10 (data governance) — the prompt sanitizer strips PII and detects prompt injection before anything is logged or sent to the provider (data minimisation, Art. 10.3). EU AI Act Art. 12 (re",
        "how": [
          "### Runtime data-plane — POST /v1/chat/completions (sentinel/proxy.py)",
          "The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see docs/architecture/deployment-topology.md). Each inference walks a fixed pipeline:",
          "1. Tenant resolve — the Bearer JWT is decoded and verified against SECRET_KEY; the tenant_id claim loads a TenantConfig from the tenants store. Any failure is a 401.",
          "2. Rate limit — a 60-second sliding window in Redis (sentinel:ratelimit:<tenant>, sorted-set + zcard), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway fails open (allow-all) rather than dropping traffic.",
          "3. Sanitize — sanitizer.sanitize(prompt, tenant) strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 INJECTION_DETECTED and a blocked audit entry is written (trust_score 0, intervention BLOCKED) before returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.",
          "4. Circuit breaker / provider routing — circuit_breaker.call(...) wraps the provider call (litellm.acompletion against tenant.primary_model, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.",
          "5. Audit — a hash-chained AuditEntryInput (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via auditor.log as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.",
          "6. Compliance evaluation — ComplianceEngine.evaluate(...) runs against the audit entry as a background task.",
          "7. Metrics + telemetry — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to model_performance_metrics (feeds the Model Detail \"Performance\" tab). Telemetry failures are swallowed so they can never affect request handling.",
          "Prompt and response are stored only as SHA-256 digests, never plaintext.",
          "### Dashboard control-plane",
          "The seven screens are React Query views over the real org-scoped tables, following the modelService conventions: direct Supabase calls, camelCase↔snake_case mapping, reads and writes throw on failure so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (Unavailable when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a \"Live\"/\"Not connected\" badge reflecting the actual channel state."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every relation is keyed by ai_models.id (uuid) and resolved to a name at render.",
          "Outbound",
          "Every screen → Model registry (/models/inventory/:id) via model uuid pills.",
          "Live Traces → Guardrails (/trust-engine/guardrails?policy=<uuid>) for the evaluated policy.",
          "Guardrails → Incident Response (incidents row created on escalate) and → Live Traces (/trust-engine/traces?model=<uuid>).",
          "Tool Monitor → Incident Response (incidents on escalate) and → Agent IAM (/agent-iam).",
          "Fallback Failovers → Live Traces by trace_id / trace_ref.",
          "Runtime gateway → model_performance_metrics (per-inference telemetry) → Model Detail → Performance tab.",
          "Config → Keys Vault (/security/keys) for secrets and Audit Log (/audit-trail) for every save.",
          "Inbound",
          "Model Detail deep-links into these screens with ?model=<uuid> (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.",
          "trust_policies are referenced by live_traces.policy_id and guardrail_events.policy_id; a policy referenced by recorded traces/events cannot be deleted (deactivate instead) — surfaced as a friendly service error."
        ],
        "compliance": [
          "The audit found this module \"mapped loosely,\" and that is accurate. Neither docs/compliance/eu-ai-act-mapping.md nor docs/compliance/iso-42001-mapping.md contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the runtime gateway's layers described generically, not the dashboard screens:",
          "EU AI Act — Art. 9 \"Trust score + circuit breaker\", Art. 10 \"PII sanitizer + verifier\", Art. 12 \"Immutable audit log\", Art. 14 \"HITL queue + review UI\", Art. 15 \"Fact-checker + NLI verifier\", Art. 62 \"Continuous audit logging\" — all marked Implemented, but attributed to sentinel/proxy.py layers, with no link back to /trust-engine/* or to live_traces / guardrail_events / trust_policies.",
          "ISO/IEC 42001 — 6.1.2 \"Trust score pipeline\", 6.1.3 \"Circuit breaker cascade\", 8.4 \"Proxy middleware\", 9.1 \"Audit hash chain\", A.8.3 \"PII sanitizer\", A.8.4 \"Immutable audit chain\" — again the gateway layers, not the module.",
          "NIST AI RMF — the previous thin doc asserted MEASURE 3.1–3.3; no NIST mapping document exists in docs/compliance/, so that citation is unbacked and should be treated as a claim, not a mapping.",
          "Real, defensible coverage today: the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via auditor.log), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real incidents record; the route_hitl policy action). Config saves and policy/rule CRUD write to the platform Audit Log via logAction (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.",
          "Gap to close (recommended): add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → trust_policies + circuit breaker; Art. 12 → live_traces + hash chain; Art. 14 → guardrail_events ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is implemented in code but under-documented in the mapping — mark it Partial on the mapping line, not Implemented."
        ],
        "operations": [
          "Seeding / backfill. 20260814000011_trust_runtime_seeds.sql provides coherent demo rows for the demo org (00000000-…-0001), all keyed to real ai_models uuids, idempotent. The agents table is empty (Agent Control not seeded), so agent_id is left null and only agent_name is populated on tool/trace/event rows.",
          "Empty states. Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render — (not 0) when there is nothing to measure.",
          "Realtime. Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.",
          "Common errors (writes throw). Deleting a referenced policy → \"This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.\" Ack without a session → \"Sign in required to acknowledge events.\" Invalid rule condition → \"Condition is not valid JSON: …\". Provider failure at the gateway → HTTP 502; injection → HTTP 400 INJECTION_DETECTED; over rate limit → HTTP 429.",
          "Fail-open rate limit. If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.",
          "Retention. live_traces shows most-recent 100 per query; cost_token_usage is a daily ledger; audit entries are append-only and never deleted.",
          "Known debt. Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. live_traces.policy_id / guardrail_events.policy_id are text, not uuid FKs. Three partially-overlapping Python surfaces (proxy:app, main:app, the connect edge function) can drift — TD-019 in docs/reference/technical-debt.md. The compliance-mapping gap above should be recorded there with an owner."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "the only key"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id()"
          ],
          [
            "policy_ref",
            "text",
            "—",
            "display ref (POL-… seeds, TP-### UI-created); never a key"
          ],
          [
            "name / type / action / severity",
            "text",
            "—",
            "action ∈ block/warn/redact/route_hitl/log"
          ],
          [
            "condition_json",
            "jsonb",
            "—",
            "policy condition; null → not shown"
          ],
          [
            "threshold",
            "numeric",
            "—",
            "null → —"
          ],
          [
            "is_active",
            "boolean",
            "—",
            "active policies evaluate live traffic"
          ],
          [
            "linked_models",
            "text[]",
            "—",
            "canonical ai_models.id uuids; resolved at render; \"Unavailable\" if unresolved"
          ],
          [
            "framework_ref",
            "text",
            "—",
            "e.g. \"GDPR Art. 5\"; null → —"
          ],
          [
            "triggers_7d / block_rate / avg_latency_ms",
            "numeric",
            "—",
            "telemetry aggregates; avg_latency_ms null → —"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Trust Costs & Tokens",
        "route": "/trust-engine/costs",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-engine.md",
        "title": "Trust Engine (Runtime Trust)",
        "purpose": "The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a data-plane gateway that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of dashboard screens that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, a",
        "why": "This is the product's core value proposition. A governance platform that only documents models after the fact cannot stop a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges: EU AI Act Art. 9 (risk management) — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked. EU AI Act Art. 10 (data governance) — the prompt sanitizer strips PII and detects prompt injection before anything is logged or sent to the provider (data minimisation, Art. 10.3). EU AI Act Art. 12 (re",
        "how": [
          "### Runtime data-plane — POST /v1/chat/completions (sentinel/proxy.py)",
          "The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see docs/architecture/deployment-topology.md). Each inference walks a fixed pipeline:",
          "1. Tenant resolve — the Bearer JWT is decoded and verified against SECRET_KEY; the tenant_id claim loads a TenantConfig from the tenants store. Any failure is a 401.",
          "2. Rate limit — a 60-second sliding window in Redis (sentinel:ratelimit:<tenant>, sorted-set + zcard), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway fails open (allow-all) rather than dropping traffic.",
          "3. Sanitize — sanitizer.sanitize(prompt, tenant) strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 INJECTION_DETECTED and a blocked audit entry is written (trust_score 0, intervention BLOCKED) before returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.",
          "4. Circuit breaker / provider routing — circuit_breaker.call(...) wraps the provider call (litellm.acompletion against tenant.primary_model, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.",
          "5. Audit — a hash-chained AuditEntryInput (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via auditor.log as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.",
          "6. Compliance evaluation — ComplianceEngine.evaluate(...) runs against the audit entry as a background task.",
          "7. Metrics + telemetry — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to model_performance_metrics (feeds the Model Detail \"Performance\" tab). Telemetry failures are swallowed so they can never affect request handling.",
          "Prompt and response are stored only as SHA-256 digests, never plaintext.",
          "### Dashboard control-plane",
          "The seven screens are React Query views over the real org-scoped tables, following the modelService conventions: direct Supabase calls, camelCase↔snake_case mapping, reads and writes throw on failure so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (Unavailable when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a \"Live\"/\"Not connected\" badge reflecting the actual channel state."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every relation is keyed by ai_models.id (uuid) and resolved to a name at render.",
          "Outbound",
          "Every screen → Model registry (/models/inventory/:id) via model uuid pills.",
          "Live Traces → Guardrails (/trust-engine/guardrails?policy=<uuid>) for the evaluated policy.",
          "Guardrails → Incident Response (incidents row created on escalate) and → Live Traces (/trust-engine/traces?model=<uuid>).",
          "Tool Monitor → Incident Response (incidents on escalate) and → Agent IAM (/agent-iam).",
          "Fallback Failovers → Live Traces by trace_id / trace_ref.",
          "Runtime gateway → model_performance_metrics (per-inference telemetry) → Model Detail → Performance tab.",
          "Config → Keys Vault (/security/keys) for secrets and Audit Log (/audit-trail) for every save.",
          "Inbound",
          "Model Detail deep-links into these screens with ?model=<uuid> (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.",
          "trust_policies are referenced by live_traces.policy_id and guardrail_events.policy_id; a policy referenced by recorded traces/events cannot be deleted (deactivate instead) — surfaced as a friendly service error."
        ],
        "compliance": [
          "The audit found this module \"mapped loosely,\" and that is accurate. Neither docs/compliance/eu-ai-act-mapping.md nor docs/compliance/iso-42001-mapping.md contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the runtime gateway's layers described generically, not the dashboard screens:",
          "EU AI Act — Art. 9 \"Trust score + circuit breaker\", Art. 10 \"PII sanitizer + verifier\", Art. 12 \"Immutable audit log\", Art. 14 \"HITL queue + review UI\", Art. 15 \"Fact-checker + NLI verifier\", Art. 62 \"Continuous audit logging\" — all marked Implemented, but attributed to sentinel/proxy.py layers, with no link back to /trust-engine/* or to live_traces / guardrail_events / trust_policies.",
          "ISO/IEC 42001 — 6.1.2 \"Trust score pipeline\", 6.1.3 \"Circuit breaker cascade\", 8.4 \"Proxy middleware\", 9.1 \"Audit hash chain\", A.8.3 \"PII sanitizer\", A.8.4 \"Immutable audit chain\" — again the gateway layers, not the module.",
          "NIST AI RMF — the previous thin doc asserted MEASURE 3.1–3.3; no NIST mapping document exists in docs/compliance/, so that citation is unbacked and should be treated as a claim, not a mapping.",
          "Real, defensible coverage today: the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via auditor.log), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real incidents record; the route_hitl policy action). Config saves and policy/rule CRUD write to the platform Audit Log via logAction (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.",
          "Gap to close (recommended): add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → trust_policies + circuit breaker; Art. 12 → live_traces + hash chain; Art. 14 → guardrail_events ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is implemented in code but under-documented in the mapping — mark it Partial on the mapping line, not Implemented."
        ],
        "operations": [
          "Seeding / backfill. 20260814000011_trust_runtime_seeds.sql provides coherent demo rows for the demo org (00000000-…-0001), all keyed to real ai_models uuids, idempotent. The agents table is empty (Agent Control not seeded), so agent_id is left null and only agent_name is populated on tool/trace/event rows.",
          "Empty states. Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render — (not 0) when there is nothing to measure.",
          "Realtime. Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.",
          "Common errors (writes throw). Deleting a referenced policy → \"This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.\" Ack without a session → \"Sign in required to acknowledge events.\" Invalid rule condition → \"Condition is not valid JSON: …\". Provider failure at the gateway → HTTP 502; injection → HTTP 400 INJECTION_DETECTED; over rate limit → HTTP 429.",
          "Fail-open rate limit. If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.",
          "Retention. live_traces shows most-recent 100 per query; cost_token_usage is a daily ledger; audit entries are append-only and never deleted.",
          "Known debt. Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. live_traces.policy_id / guardrail_events.policy_id are text, not uuid FKs. Three partially-overlapping Python surfaces (proxy:app, main:app, the connect edge function) can drift — TD-019 in docs/reference/technical-debt.md. The compliance-mapping gap above should be recorded there with an owner."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "the only key"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id()"
          ],
          [
            "policy_ref",
            "text",
            "—",
            "display ref (POL-… seeds, TP-### UI-created); never a key"
          ],
          [
            "name / type / action / severity",
            "text",
            "—",
            "action ∈ block/warn/redact/route_hitl/log"
          ],
          [
            "condition_json",
            "jsonb",
            "—",
            "policy condition; null → not shown"
          ],
          [
            "threshold",
            "numeric",
            "—",
            "null → —"
          ],
          [
            "is_active",
            "boolean",
            "—",
            "active policies evaluate live traffic"
          ],
          [
            "linked_models",
            "text[]",
            "—",
            "canonical ai_models.id uuids; resolved at render; \"Unavailable\" if unresolved"
          ],
          [
            "framework_ref",
            "text",
            "—",
            "e.g. \"GDPR Art. 5\"; null → —"
          ],
          [
            "triggers_7d / block_rate / avg_latency_ms",
            "numeric",
            "—",
            "telemetry aggregates; avg_latency_ms null → —"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Fallback Failovers",
        "route": "/trust-engine/fallback",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-engine.md",
        "title": "Trust Engine (Runtime Trust)",
        "purpose": "The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a data-plane gateway that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of dashboard screens that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, a",
        "why": "This is the product's core value proposition. A governance platform that only documents models after the fact cannot stop a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges: EU AI Act Art. 9 (risk management) — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked. EU AI Act Art. 10 (data governance) — the prompt sanitizer strips PII and detects prompt injection before anything is logged or sent to the provider (data minimisation, Art. 10.3). EU AI Act Art. 12 (re",
        "how": [
          "### Runtime data-plane — POST /v1/chat/completions (sentinel/proxy.py)",
          "The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see docs/architecture/deployment-topology.md). Each inference walks a fixed pipeline:",
          "1. Tenant resolve — the Bearer JWT is decoded and verified against SECRET_KEY; the tenant_id claim loads a TenantConfig from the tenants store. Any failure is a 401.",
          "2. Rate limit — a 60-second sliding window in Redis (sentinel:ratelimit:<tenant>, sorted-set + zcard), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway fails open (allow-all) rather than dropping traffic.",
          "3. Sanitize — sanitizer.sanitize(prompt, tenant) strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 INJECTION_DETECTED and a blocked audit entry is written (trust_score 0, intervention BLOCKED) before returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.",
          "4. Circuit breaker / provider routing — circuit_breaker.call(...) wraps the provider call (litellm.acompletion against tenant.primary_model, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.",
          "5. Audit — a hash-chained AuditEntryInput (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via auditor.log as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.",
          "6. Compliance evaluation — ComplianceEngine.evaluate(...) runs against the audit entry as a background task.",
          "7. Metrics + telemetry — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to model_performance_metrics (feeds the Model Detail \"Performance\" tab). Telemetry failures are swallowed so they can never affect request handling.",
          "Prompt and response are stored only as SHA-256 digests, never plaintext.",
          "### Dashboard control-plane",
          "The seven screens are React Query views over the real org-scoped tables, following the modelService conventions: direct Supabase calls, camelCase↔snake_case mapping, reads and writes throw on failure so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (Unavailable when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a \"Live\"/\"Not connected\" badge reflecting the actual channel state."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every relation is keyed by ai_models.id (uuid) and resolved to a name at render.",
          "Outbound",
          "Every screen → Model registry (/models/inventory/:id) via model uuid pills.",
          "Live Traces → Guardrails (/trust-engine/guardrails?policy=<uuid>) for the evaluated policy.",
          "Guardrails → Incident Response (incidents row created on escalate) and → Live Traces (/trust-engine/traces?model=<uuid>).",
          "Tool Monitor → Incident Response (incidents on escalate) and → Agent IAM (/agent-iam).",
          "Fallback Failovers → Live Traces by trace_id / trace_ref.",
          "Runtime gateway → model_performance_metrics (per-inference telemetry) → Model Detail → Performance tab.",
          "Config → Keys Vault (/security/keys) for secrets and Audit Log (/audit-trail) for every save.",
          "Inbound",
          "Model Detail deep-links into these screens with ?model=<uuid> (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.",
          "trust_policies are referenced by live_traces.policy_id and guardrail_events.policy_id; a policy referenced by recorded traces/events cannot be deleted (deactivate instead) — surfaced as a friendly service error."
        ],
        "compliance": [
          "The audit found this module \"mapped loosely,\" and that is accurate. Neither docs/compliance/eu-ai-act-mapping.md nor docs/compliance/iso-42001-mapping.md contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the runtime gateway's layers described generically, not the dashboard screens:",
          "EU AI Act — Art. 9 \"Trust score + circuit breaker\", Art. 10 \"PII sanitizer + verifier\", Art. 12 \"Immutable audit log\", Art. 14 \"HITL queue + review UI\", Art. 15 \"Fact-checker + NLI verifier\", Art. 62 \"Continuous audit logging\" — all marked Implemented, but attributed to sentinel/proxy.py layers, with no link back to /trust-engine/* or to live_traces / guardrail_events / trust_policies.",
          "ISO/IEC 42001 — 6.1.2 \"Trust score pipeline\", 6.1.3 \"Circuit breaker cascade\", 8.4 \"Proxy middleware\", 9.1 \"Audit hash chain\", A.8.3 \"PII sanitizer\", A.8.4 \"Immutable audit chain\" — again the gateway layers, not the module.",
          "NIST AI RMF — the previous thin doc asserted MEASURE 3.1–3.3; no NIST mapping document exists in docs/compliance/, so that citation is unbacked and should be treated as a claim, not a mapping.",
          "Real, defensible coverage today: the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via auditor.log), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real incidents record; the route_hitl policy action). Config saves and policy/rule CRUD write to the platform Audit Log via logAction (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.",
          "Gap to close (recommended): add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → trust_policies + circuit breaker; Art. 12 → live_traces + hash chain; Art. 14 → guardrail_events ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is implemented in code but under-documented in the mapping — mark it Partial on the mapping line, not Implemented."
        ],
        "operations": [
          "Seeding / backfill. 20260814000011_trust_runtime_seeds.sql provides coherent demo rows for the demo org (00000000-…-0001), all keyed to real ai_models uuids, idempotent. The agents table is empty (Agent Control not seeded), so agent_id is left null and only agent_name is populated on tool/trace/event rows.",
          "Empty states. Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render — (not 0) when there is nothing to measure.",
          "Realtime. Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.",
          "Common errors (writes throw). Deleting a referenced policy → \"This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.\" Ack without a session → \"Sign in required to acknowledge events.\" Invalid rule condition → \"Condition is not valid JSON: …\". Provider failure at the gateway → HTTP 502; injection → HTTP 400 INJECTION_DETECTED; over rate limit → HTTP 429.",
          "Fail-open rate limit. If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.",
          "Retention. live_traces shows most-recent 100 per query; cost_token_usage is a daily ledger; audit entries are append-only and never deleted.",
          "Known debt. Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. live_traces.policy_id / guardrail_events.policy_id are text, not uuid FKs. Three partially-overlapping Python surfaces (proxy:app, main:app, the connect edge function) can drift — TD-019 in docs/reference/technical-debt.md. The compliance-mapping gap above should be recorded there with an owner."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "the only key"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id()"
          ],
          [
            "policy_ref",
            "text",
            "—",
            "display ref (POL-… seeds, TP-### UI-created); never a key"
          ],
          [
            "name / type / action / severity",
            "text",
            "—",
            "action ∈ block/warn/redact/route_hitl/log"
          ],
          [
            "condition_json",
            "jsonb",
            "—",
            "policy condition; null → not shown"
          ],
          [
            "threshold",
            "numeric",
            "—",
            "null → —"
          ],
          [
            "is_active",
            "boolean",
            "—",
            "active policies evaluate live traffic"
          ],
          [
            "linked_models",
            "text[]",
            "—",
            "canonical ai_models.id uuids; resolved at render; \"Unavailable\" if unresolved"
          ],
          [
            "framework_ref",
            "text",
            "—",
            "e.g. \"GDPR Art. 5\"; null → —"
          ],
          [
            "triggers_7d / block_rate / avg_latency_ms",
            "numeric",
            "—",
            "telemetry aggregates; avg_latency_ms null → —"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Tool Monitor",
        "route": "/trust-engine/tools",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-engine.md",
        "title": "Trust Engine (Runtime Trust)",
        "purpose": "The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a data-plane gateway that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of dashboard screens that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, a",
        "why": "This is the product's core value proposition. A governance platform that only documents models after the fact cannot stop a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges: EU AI Act Art. 9 (risk management) — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked. EU AI Act Art. 10 (data governance) — the prompt sanitizer strips PII and detects prompt injection before anything is logged or sent to the provider (data minimisation, Art. 10.3). EU AI Act Art. 12 (re",
        "how": [
          "### Runtime data-plane — POST /v1/chat/completions (sentinel/proxy.py)",
          "The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see docs/architecture/deployment-topology.md). Each inference walks a fixed pipeline:",
          "1. Tenant resolve — the Bearer JWT is decoded and verified against SECRET_KEY; the tenant_id claim loads a TenantConfig from the tenants store. Any failure is a 401.",
          "2. Rate limit — a 60-second sliding window in Redis (sentinel:ratelimit:<tenant>, sorted-set + zcard), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway fails open (allow-all) rather than dropping traffic.",
          "3. Sanitize — sanitizer.sanitize(prompt, tenant) strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 INJECTION_DETECTED and a blocked audit entry is written (trust_score 0, intervention BLOCKED) before returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.",
          "4. Circuit breaker / provider routing — circuit_breaker.call(...) wraps the provider call (litellm.acompletion against tenant.primary_model, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.",
          "5. Audit — a hash-chained AuditEntryInput (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via auditor.log as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.",
          "6. Compliance evaluation — ComplianceEngine.evaluate(...) runs against the audit entry as a background task.",
          "7. Metrics + telemetry — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to model_performance_metrics (feeds the Model Detail \"Performance\" tab). Telemetry failures are swallowed so they can never affect request handling.",
          "Prompt and response are stored only as SHA-256 digests, never plaintext.",
          "### Dashboard control-plane",
          "The seven screens are React Query views over the real org-scoped tables, following the modelService conventions: direct Supabase calls, camelCase↔snake_case mapping, reads and writes throw on failure so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (Unavailable when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a \"Live\"/\"Not connected\" badge reflecting the actual channel state."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every relation is keyed by ai_models.id (uuid) and resolved to a name at render.",
          "Outbound",
          "Every screen → Model registry (/models/inventory/:id) via model uuid pills.",
          "Live Traces → Guardrails (/trust-engine/guardrails?policy=<uuid>) for the evaluated policy.",
          "Guardrails → Incident Response (incidents row created on escalate) and → Live Traces (/trust-engine/traces?model=<uuid>).",
          "Tool Monitor → Incident Response (incidents on escalate) and → Agent IAM (/agent-iam).",
          "Fallback Failovers → Live Traces by trace_id / trace_ref.",
          "Runtime gateway → model_performance_metrics (per-inference telemetry) → Model Detail → Performance tab.",
          "Config → Keys Vault (/security/keys) for secrets and Audit Log (/audit-trail) for every save.",
          "Inbound",
          "Model Detail deep-links into these screens with ?model=<uuid> (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.",
          "trust_policies are referenced by live_traces.policy_id and guardrail_events.policy_id; a policy referenced by recorded traces/events cannot be deleted (deactivate instead) — surfaced as a friendly service error."
        ],
        "compliance": [
          "The audit found this module \"mapped loosely,\" and that is accurate. Neither docs/compliance/eu-ai-act-mapping.md nor docs/compliance/iso-42001-mapping.md contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the runtime gateway's layers described generically, not the dashboard screens:",
          "EU AI Act — Art. 9 \"Trust score + circuit breaker\", Art. 10 \"PII sanitizer + verifier\", Art. 12 \"Immutable audit log\", Art. 14 \"HITL queue + review UI\", Art. 15 \"Fact-checker + NLI verifier\", Art. 62 \"Continuous audit logging\" — all marked Implemented, but attributed to sentinel/proxy.py layers, with no link back to /trust-engine/* or to live_traces / guardrail_events / trust_policies.",
          "ISO/IEC 42001 — 6.1.2 \"Trust score pipeline\", 6.1.3 \"Circuit breaker cascade\", 8.4 \"Proxy middleware\", 9.1 \"Audit hash chain\", A.8.3 \"PII sanitizer\", A.8.4 \"Immutable audit chain\" — again the gateway layers, not the module.",
          "NIST AI RMF — the previous thin doc asserted MEASURE 3.1–3.3; no NIST mapping document exists in docs/compliance/, so that citation is unbacked and should be treated as a claim, not a mapping.",
          "Real, defensible coverage today: the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via auditor.log), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real incidents record; the route_hitl policy action). Config saves and policy/rule CRUD write to the platform Audit Log via logAction (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.",
          "Gap to close (recommended): add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → trust_policies + circuit breaker; Art. 12 → live_traces + hash chain; Art. 14 → guardrail_events ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is implemented in code but under-documented in the mapping — mark it Partial on the mapping line, not Implemented."
        ],
        "operations": [
          "Seeding / backfill. 20260814000011_trust_runtime_seeds.sql provides coherent demo rows for the demo org (00000000-…-0001), all keyed to real ai_models uuids, idempotent. The agents table is empty (Agent Control not seeded), so agent_id is left null and only agent_name is populated on tool/trace/event rows.",
          "Empty states. Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render — (not 0) when there is nothing to measure.",
          "Realtime. Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.",
          "Common errors (writes throw). Deleting a referenced policy → \"This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.\" Ack without a session → \"Sign in required to acknowledge events.\" Invalid rule condition → \"Condition is not valid JSON: …\". Provider failure at the gateway → HTTP 502; injection → HTTP 400 INJECTION_DETECTED; over rate limit → HTTP 429.",
          "Fail-open rate limit. If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.",
          "Retention. live_traces shows most-recent 100 per query; cost_token_usage is a daily ledger; audit entries are append-only and never deleted.",
          "Known debt. Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. live_traces.policy_id / guardrail_events.policy_id are text, not uuid FKs. Three partially-overlapping Python surfaces (proxy:app, main:app, the connect edge function) can drift — TD-019 in docs/reference/technical-debt.md. The compliance-mapping gap above should be recorded there with an owner."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "the only key"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id()"
          ],
          [
            "policy_ref",
            "text",
            "—",
            "display ref (POL-… seeds, TP-### UI-created); never a key"
          ],
          [
            "name / type / action / severity",
            "text",
            "—",
            "action ∈ block/warn/redact/route_hitl/log"
          ],
          [
            "condition_json",
            "jsonb",
            "—",
            "policy condition; null → not shown"
          ],
          [
            "threshold",
            "numeric",
            "—",
            "null → —"
          ],
          [
            "is_active",
            "boolean",
            "—",
            "active policies evaluate live traffic"
          ],
          [
            "linked_models",
            "text[]",
            "—",
            "canonical ai_models.id uuids; resolved at render; \"Unavailable\" if unresolved"
          ],
          [
            "framework_ref",
            "text",
            "—",
            "e.g. \"GDPR Art. 5\"; null → —"
          ],
          [
            "triggers_7d / block_rate / avg_latency_ms",
            "numeric",
            "—",
            "telemetry aggregates; avg_latency_ms null → —"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Performance Monitoring",
        "route": "/performance-monitoring",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/performance-monitoring.md",
        "title": "Performance Monitoring",
        "purpose": "The fleet-wide view of how registered models are actually behaving in production: latency, throughput, accuracy, error rate, drift and cost per inference, each as a recorded time series rather than a headline number.",
        "why": "Post-market monitoring is an obligation, not a nice-to-have: a provider of a high-risk AI system must monitor performance across its lifetime and act when it degrades. Drift and error-rate trends are also the earliest signal that a model needs re-validation or retirement, which is why this module sits next to the registry rather than inside an ops dashboard.",
        "how": [
          "One card per model in the registry, keyed by ai_models.id (uuid) — the same",
          "id-space as everything else, so a card always resolves to a real model.",
          "Each card shows the latest recorded metrics plus a trend series drawn from",
          "the real recorded_at timestamps, rendered with Recharts.",
          "A model with no telemetry renders an honest empty state. There are no",
          "fabricated endpoints, no invented history and no synthetic SLO targets — if a",
          "metric was never recorded, nothing is drawn for it.",
          "?model=<uuid> filters the page to a single model, with a dismissible chip,",
          "following the platform's deep-link convention.",
          "Refresh invalidates the React Query cache rather than mutating anything; this",
          "module is read-only."
        ],
        "dataProcess": [],
        "interlinks": [
          "→ Model Registry. Each card deep-links to /models/inventory/<model_id>.",
          "← Model Registry. A model's detail surfaces its recorded performance.",
          "→ Model Efficiency / Energy. Cost and throughput here pair with the",
          "efficiency modules, which read their own tables.",
          "Shares model_performance_metrics with the model analytics service, so the",
          "registry and this page never disagree about a number."
        ],
        "compliance": [
          "EU AI Act Art. 72 — post-market monitoring: this is the surface that",
          "evidences it.",
          "EU AI Act Art. 15 — accuracy, robustness and cybersecurity, measured over",
          "time rather than asserted once.",
          "EU AI Act Art. 12 — record-keeping: recorded_at gives every sample a",
          "timestamp that survives independent of the UI.",
          "ISO/IEC 42001 §9.1 — monitoring, measurement, analysis and evaluation."
        ],
        "operations": [
          "Read-only. There is no write path and therefore no logAction requirement.",
          "model_name is denormalised for display convenience only. Resolve names from",
          "ai_models at render time; never join on it.",
          "The page shows what has been recorded. If a card looks empty, the fix is in",
          "whatever populates model_performance_metrics, not here."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "Primary key"
          ],
          [
            "org_id",
            "uuid",
            "Tenant scoping, DB default current_user_org_id()"
          ],
          [
            "model_id",
            "uuid",
            "→ ai_models.id"
          ],
          [
            "model_name",
            "text",
            "Denormalised label; the id is authoritative"
          ],
          [
            "recorded_at",
            "timestamptz",
            "When the sample was taken — drives the trend axis"
          ],
          [
            "latency_p50 / latency_p99",
            "numeric",
            "Latency percentiles"
          ],
          [
            "throughput",
            "numeric",
            "Requests per unit time"
          ],
          [
            "accuracy",
            "numeric",
            "Model accuracy at the sample"
          ],
          [
            "error_rate",
            "numeric",
            "Error fraction"
          ],
          [
            "drift_score",
            "numeric",
            "Drift signal"
          ],
          [
            "cost_per_inference",
            "numeric",
            "Unit cost"
          ],
          [
            "request_count",
            "numeric",
            "Requests in the sample window"
          ],
          [
            "metadata",
            "jsonb",
            "Free-form sample context"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Model Efficiency",
        "route": "/model-efficiency",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "GenAI Risk Profiles",
        "route": "/genai-risks",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/benchmarking-maturity.md",
        "title": "Benchmarking & Examination Manager",
        "purpose": "External and internal benchmarking of AI systems' quality/safety and structured management of regulator examinations (onsite inspections, supervisory reviews, audits).",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.43, 70",
            "Conformity assessment, national supervisory authorities"
          ],
          [
            "SR 11-7 / OCC 2011-12",
            "Model validation, challenger models"
          ],
          [
            "ISO/IEC 42001 9.2",
            "Internal audit"
          ],
          [
            "SOC 2 CC4.1",
            "Monitoring activities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Playground",
        "route": "/ai-gateway/playground",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/playground.md",
        "title": "Playground",
        "purpose": "A rehearsal environment for guardrail, RBAC and trace behaviour. It lets a governance engineer see how a policy would treat a given prompt before the policy is changed in production.",
        "why": "Policy changes on a live gateway are risky: too strict and legitimate traffic is blocked, too loose and sensitive data escapes. The Playground lets the guardrail chain be exercised against a chosen governed model without touching production traffic.",
        "how": [],
        "dataProcess": [],
        "interlinks": [
          "Model record → Playground — \"Test in Playground\" carries ?model=<uuid>.",
          "Playground → Model record — \"Open model record\" links back.",
          "Playground → Live Inference Traces — the banner points to where real",
          "telemetry lives."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Do not cite Playground figures as evidence. They are rehearsal output. Use",
          "Live Inference Traces and Trust Costs & Tokens for measured values."
        ],
        "fields": [
          [
            "EU AI Act Art. 9",
            "Policy changes can be rehearsed before deployment, reducing risk"
          ],
          [
            "EU AI Act Art. 13",
            "Simulated output is explicitly distinguished from measured telemetry"
          ],
          [
            "EU AI Act Art. 15",
            "Guardrail behaviour is testable ahead of production change"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "Verification activity prior to change"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "MCP Servers",
        "route": "/mcp-gateway/servers",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/mcp-gateway.md",
        "title": "MCP Gateway",
        "purpose": "Governs the Model Context Protocol surface: the backend servers your AI agents connect to, and the individual tools those servers expose. Every tool carries a risk tier, an approval state, a human-review requirement and an explicit allow-list of the agents permitted to call it.",
        "why": "An agent is only as safe as the tools it can reach. A well-behaved model with access to a hold_transaction tool can move money; the same model with only read tools cannot. MCP made tool access easy to add and correspondingly easy to lose track of — which is precisely the gap regulators probe. This module exists so three questions have recorded answers: 1. What can our agents actually do? Not what the prompt says they should do — what the tool surface permits. (EU AI Act Art. 14 human oversight; ISO 42001 A.9.2 operational controls) 2. Which agent may call which tool, and who approved that? (Ar",
        "how": [
          "### Servers",
          "An mcp_servers row is a registered backend. Beyond connection details",
          "(url, transport, auth_method) it carries the two fields that matter for",
          "governance:",
          "approval_state — approved · under_review · restricted · blocked.",
          "A server that has not been approved is visible and flagged rather than quietly",
          "operational.",
          "data_sensitivity — the ceiling of what may be sent to it",
          "(public → restricted). A restricted server is one whose traffic is subject",
          "to additional logging and rate limits.",
          "status and last_error capture live health. A server can be healthy and",
          "unapproved at the same time — those are independent facts, and conflating them"
        ],
        "dataProcess": [],
        "interlinks": [
          "Servers → Integrations — integration_id; the server row links to the connector.",
          "Servers → Tool Catalog — ?server=<uuid> deep link with a dismissible filter chip.",
          "Tools → Agents — allowed_agent_ids; each pill links to the agent record.",
          "Overview → both lists — every attention row navigates to the records behind it."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Onboarding a server: register it as under_review with the correct data",
          "ceiling before granting any agent access. Approval is a deliberate act.",
          "Granting a tool to an agent: edit the tool and add the agent to the",
          "allow-list. The change is audit-logged and visible from the agent record.",
          "A degraded server: last_error carries the observed reason; open a task",
          "against the integration so remediation carries an SLA.",
          "Retention: servers and tools are soft-deleted; deleting a server cascades",
          "to its tools at the FK level, so orphan tools cannot exist."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "name / url / description",
            "text",
            "Identity and endpoint"
          ],
          [
            "transport",
            "text",
            "https · stdio · sse · websocket"
          ],
          [
            "auth_method",
            "text",
            "bearer_token · mtls · oauth2 · basic · none"
          ],
          [
            "status",
            "text",
            "healthy · degraded · offline · unknown"
          ],
          [
            "environment",
            "text",
            "production · staging · development"
          ],
          [
            "data_sensitivity",
            "text",
            "Ceiling: public · internal · confidential · restricted"
          ],
          [
            "approval_state",
            "text",
            "approved · under_review · restricted · blocked"
          ],
          [
            "integration_id",
            "uuid → integrations.id",
            "The connector this server fronts"
          ],
          [
            "last_ping_at / last_error",
            "timestamptz / text",
            "Live health"
          ],
          [
            "owner_name",
            "text",
            "Accountable owner"
          ],
          [
            "config",
            "jsonb",
            "Rate limits, region, audit flags"
          ],
          [
            "is_deleted",
            "boolean",
            "Soft delete"
          ],
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "server_id",
            "uuid → mcp_servers.id",
            "Owning server (cascade delete)"
          ],
          [
            "name / description",
            "text",
            "Tool identity"
          ],
          [
            "category",
            "text",
            "read · write · execute · admin"
          ],
          [
            "risk_tier",
            "text",
            "low · medium · high · critical"
          ],
          [
            "approval_state",
            "text",
            "As per servers"
          ],
          [
            "requires_hitl",
            "boolean",
            "Human approval required before the call proceeds"
          ],
          [
            "side_effects",
            "boolean",
            "Call is observable outside Sentinel"
          ],
          [
            "input_schema",
            "jsonb",
            "JSON Schema of accepted arguments"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "MCP Overview",
        "route": "/mcp-gateway",
        "parentLabel": "MCP Servers",
        "hasDoc": true,
        "docPath": "docs/modules/mcp-gateway.md",
        "title": "MCP Gateway",
        "purpose": "Governs the Model Context Protocol surface: the backend servers your AI agents connect to, and the individual tools those servers expose. Every tool carries a risk tier, an approval state, a human-review requirement and an explicit allow-list of the agents permitted to call it.",
        "why": "An agent is only as safe as the tools it can reach. A well-behaved model with access to a hold_transaction tool can move money; the same model with only read tools cannot. MCP made tool access easy to add and correspondingly easy to lose track of — which is precisely the gap regulators probe. This module exists so three questions have recorded answers: 1. What can our agents actually do? Not what the prompt says they should do — what the tool surface permits. (EU AI Act Art. 14 human oversight; ISO 42001 A.9.2 operational controls) 2. Which agent may call which tool, and who approved that? (Ar",
        "how": [
          "### Servers",
          "An mcp_servers row is a registered backend. Beyond connection details",
          "(url, transport, auth_method) it carries the two fields that matter for",
          "governance:",
          "approval_state — approved · under_review · restricted · blocked.",
          "A server that has not been approved is visible and flagged rather than quietly",
          "operational.",
          "data_sensitivity — the ceiling of what may be sent to it",
          "(public → restricted). A restricted server is one whose traffic is subject",
          "to additional logging and rate limits.",
          "status and last_error capture live health. A server can be healthy and",
          "unapproved at the same time — those are independent facts, and conflating them"
        ],
        "dataProcess": [],
        "interlinks": [
          "Servers → Integrations — integration_id; the server row links to the connector.",
          "Servers → Tool Catalog — ?server=<uuid> deep link with a dismissible filter chip.",
          "Tools → Agents — allowed_agent_ids; each pill links to the agent record.",
          "Overview → both lists — every attention row navigates to the records behind it."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Onboarding a server: register it as under_review with the correct data",
          "ceiling before granting any agent access. Approval is a deliberate act.",
          "Granting a tool to an agent: edit the tool and add the agent to the",
          "allow-list. The change is audit-logged and visible from the agent record.",
          "A degraded server: last_error carries the observed reason; open a task",
          "against the integration so remediation carries an SLA.",
          "Retention: servers and tools are soft-deleted; deleting a server cascades",
          "to its tools at the FK level, so orphan tools cannot exist."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "name / url / description",
            "text",
            "Identity and endpoint"
          ],
          [
            "transport",
            "text",
            "https · stdio · sse · websocket"
          ],
          [
            "auth_method",
            "text",
            "bearer_token · mtls · oauth2 · basic · none"
          ],
          [
            "status",
            "text",
            "healthy · degraded · offline · unknown"
          ],
          [
            "environment",
            "text",
            "production · staging · development"
          ],
          [
            "data_sensitivity",
            "text",
            "Ceiling: public · internal · confidential · restricted"
          ],
          [
            "approval_state",
            "text",
            "approved · under_review · restricted · blocked"
          ],
          [
            "integration_id",
            "uuid → integrations.id",
            "The connector this server fronts"
          ],
          [
            "last_ping_at / last_error",
            "timestamptz / text",
            "Live health"
          ],
          [
            "owner_name",
            "text",
            "Accountable owner"
          ],
          [
            "config",
            "jsonb",
            "Rate limits, region, audit flags"
          ],
          [
            "is_deleted",
            "boolean",
            "Soft delete"
          ],
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "server_id",
            "uuid → mcp_servers.id",
            "Owning server (cascade delete)"
          ],
          [
            "name / description",
            "text",
            "Tool identity"
          ],
          [
            "category",
            "text",
            "read · write · execute · admin"
          ],
          [
            "risk_tier",
            "text",
            "low · medium · high · critical"
          ],
          [
            "approval_state",
            "text",
            "As per servers"
          ],
          [
            "requires_hitl",
            "boolean",
            "Human approval required before the call proceeds"
          ],
          [
            "side_effects",
            "boolean",
            "Call is observable outside Sentinel"
          ],
          [
            "input_schema",
            "jsonb",
            "JSON Schema of accepted arguments"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Tool Catalog",
        "route": "/mcp-gateway/tools",
        "parentLabel": "MCP Servers",
        "hasDoc": true,
        "docPath": "docs/modules/mcp-gateway.md",
        "title": "MCP Gateway",
        "purpose": "Governs the Model Context Protocol surface: the backend servers your AI agents connect to, and the individual tools those servers expose. Every tool carries a risk tier, an approval state, a human-review requirement and an explicit allow-list of the agents permitted to call it.",
        "why": "An agent is only as safe as the tools it can reach. A well-behaved model with access to a hold_transaction tool can move money; the same model with only read tools cannot. MCP made tool access easy to add and correspondingly easy to lose track of — which is precisely the gap regulators probe. This module exists so three questions have recorded answers: 1. What can our agents actually do? Not what the prompt says they should do — what the tool surface permits. (EU AI Act Art. 14 human oversight; ISO 42001 A.9.2 operational controls) 2. Which agent may call which tool, and who approved that? (Ar",
        "how": [
          "### Servers",
          "An mcp_servers row is a registered backend. Beyond connection details",
          "(url, transport, auth_method) it carries the two fields that matter for",
          "governance:",
          "approval_state — approved · under_review · restricted · blocked.",
          "A server that has not been approved is visible and flagged rather than quietly",
          "operational.",
          "data_sensitivity — the ceiling of what may be sent to it",
          "(public → restricted). A restricted server is one whose traffic is subject",
          "to additional logging and rate limits.",
          "status and last_error capture live health. A server can be healthy and",
          "unapproved at the same time — those are independent facts, and conflating them"
        ],
        "dataProcess": [],
        "interlinks": [
          "Servers → Integrations — integration_id; the server row links to the connector.",
          "Servers → Tool Catalog — ?server=<uuid> deep link with a dismissible filter chip.",
          "Tools → Agents — allowed_agent_ids; each pill links to the agent record.",
          "Overview → both lists — every attention row navigates to the records behind it."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Onboarding a server: register it as under_review with the correct data",
          "ceiling before granting any agent access. Approval is a deliberate act.",
          "Granting a tool to an agent: edit the tool and add the agent to the",
          "allow-list. The change is audit-logged and visible from the agent record.",
          "A degraded server: last_error carries the observed reason; open a task",
          "against the integration so remediation carries an SLA.",
          "Retention: servers and tools are soft-deleted; deleting a server cascades",
          "to its tools at the FK level, so orphan tools cannot exist."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "name / url / description",
            "text",
            "Identity and endpoint"
          ],
          [
            "transport",
            "text",
            "https · stdio · sse · websocket"
          ],
          [
            "auth_method",
            "text",
            "bearer_token · mtls · oauth2 · basic · none"
          ],
          [
            "status",
            "text",
            "healthy · degraded · offline · unknown"
          ],
          [
            "environment",
            "text",
            "production · staging · development"
          ],
          [
            "data_sensitivity",
            "text",
            "Ceiling: public · internal · confidential · restricted"
          ],
          [
            "approval_state",
            "text",
            "approved · under_review · restricted · blocked"
          ],
          [
            "integration_id",
            "uuid → integrations.id",
            "The connector this server fronts"
          ],
          [
            "last_ping_at / last_error",
            "timestamptz / text",
            "Live health"
          ],
          [
            "owner_name",
            "text",
            "Accountable owner"
          ],
          [
            "config",
            "jsonb",
            "Rate limits, region, audit flags"
          ],
          [
            "is_deleted",
            "boolean",
            "Soft delete"
          ],
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "server_id",
            "uuid → mcp_servers.id",
            "Owning server (cascade delete)"
          ],
          [
            "name / description",
            "text",
            "Tool identity"
          ],
          [
            "category",
            "text",
            "read · write · execute · admin"
          ],
          [
            "risk_tier",
            "text",
            "low · medium · high · critical"
          ],
          [
            "approval_state",
            "text",
            "As per servers"
          ],
          [
            "requires_hitl",
            "boolean",
            "Human approval required before the call proceeds"
          ],
          [
            "side_effects",
            "boolean",
            "Call is observable outside Sentinel"
          ],
          [
            "input_schema",
            "jsonb",
            "JSON Schema of accepted arguments"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Policy Decisions",
        "route": "/mcp-gateway/decisions",
        "parentLabel": "MCP Servers",
        "hasDoc": true,
        "docPath": "docs/modules/mcp-gateway-enforcement.md",
        "title": "MCP Gateway — tool-call enforcement",
        "purpose": "Decide whether a given agent may invoke a given tool, refuse it when policy says no, pause it when a human must approve, and leave a durable record of every one of those decisions.",
        "why": "mcp_tools already carried a complete authorization policy — approval_state, requires_hitl, side_effects, risk_tier, scopes, allowed_agent_ids — and nothing read any of it at call time. Operators could set a tool to \"blocked\", grant it to two agents and mark it as requiring human review, and an agent could still call it, because those fields were captured, rendered and audited as intent with no runtime behind them. That was the widest gap in the platform between what it claims and what it enforces. This module closes it, and does so at the layer where agent traffic already arrives by design — n",
        "how": [
          "### The decision, in order",
          "sentinel/gateway/policy.py::evaluate is pure — no database, no clock, no I/O",
          "— so the rules can be tested exhaustively and read in one sitting. Checks run",
          "cheapest-and-most-absolute first, first failure wins:",
          "| # | Check | Refusal | HTTP |",
          "Three orderings in that table are deliberate and worth keeping:",
          "Authorization precedes rate limiting. An agent with no grant must be told",
          "that, not told to slow down — a 429 on a call that would never be permitted",
          "invites a retry loop against a wall.",
          "Human approval is evaluated last. There is no point queueing a reviewer",
          "for something policy would refuse anyway; their attention is the scarcest",
          "resource in the loop."
        ],
        "dataProcess": [],
        "interlinks": [
          "Decision → tool. /mcp-gateway/tools?open=<id>, resolved by id.",
          "Decision → agent. /agents?open=<id>; an unregistered caller renders",
          "\"Unregistered\", never a raw identifier.",
          "Decision → human review. A pending decision links to /hitl.",
          "Tool → decisions. The tool catalogue carries an Enforcement column",
          "with live counts, linking to the filtered feed. \"No calls yet\" is rendered",
          "distinctly from zero refusals — never asked is not the same as never refused.",
          "Overview → decisions. The posture card counts real decisions rather than",
          "mcp_tools.invocations_30d, a stored column nothing maintains.",
          "Before this module, /mcp-gateway, /mcp-gateway/servers and",
          "/mcp-gateway/tools had no cross-module link in or out (recorded in the",
          "2026-08-18 audit, §F7). They now reach agents, HITL and each other."
        ],
        "compliance": [
          "EU AI Act Art. 12 (record-keeping). Every decision is a dated row with",
          "its cause; refusals are retained precisely because they leave no other trace.",
          "EU AI Act Art. 14 (human oversight). requires_hitl produces a real,",
          "queued review with the decision linked to it — oversight as a path, not a",
          "checkbox.",
          "ISO/IEC 42001 §8.1 (operational control), §9.1 (monitoring). Agent",
          "autonomy is bounded by a policy that is evaluated, not merely declared, and",
          "its operation is measured from its own records.",
          "Data minimisation. Arguments are hashed, never stored. The decisions",
          "table has no client insert policy: a browser able to write a decision would",
          "make the evidence worthless."
        ],
        "operations": [
          "The endpoint is POST /v1/gateway/authorize, called by an agent runtime",
          "before the tool call. It requires the same bearer token as the rest of",
          "the API, and the organisation comes from that token — never from the body.",
          "Without SUPABASE_DB_URL / DATABASE_URL the endpoint returns a clear 503",
          "rather than allowing calls it cannot record.",
          "A tool from another tenant reads as unknown_tool: the same answer as one",
          "that does not exist, which is the answer that leaks the least.",
          "Rate limits count allowed decisions only. Counting denials would let a"
        ],
        "fields": [
          [
            "1",
            "the agent is registered in this org",
            "unknown_agent",
            "401"
          ],
          [
            "2",
            "the tool exists in this org",
            "unknown_tool",
            "404"
          ],
          [
            "3",
            "the tool's server is not blocked",
            "server_blocked",
            "403"
          ],
          [
            "4",
            "the tool is approved",
            "tool_blocked / tool_not_approved",
            "403"
          ],
          [
            "5",
            "the agent holds a grant",
            "agent_not_granted",
            "403"
          ],
          [
            "5b",
            "the server state is approved or restricted",
            "server_restricted",
            "403"
          ],
          [
            "6",
            "the agent is inside the tool's rate limit",
            "rate_limited",
            "429"
          ],
          [
            "7",
            "the tool does not require a human",
            "approval_required → pending",
            "202"
          ],
          [
            "8",
            "—",
            "allowed",
            "200"
          ],
          [
            "Field",
            "Column",
            "Notes"
          ],
          [
            "agentId",
            "agent_id",
            "FK to agents; NULL when the caller was unknown"
          ],
          [
            "agentRef",
            "agent_ref",
            "What the caller presented, kept verbatim so an unknown agent stays traceable"
          ],
          [
            "toolId / serverId",
            "same",
            "FK; NULL when the tool was unknown"
          ],
          [
            "toolRef",
            "tool_ref",
            "Tool name at decision time, or the raw id when unknown"
          ],
          [
            "decision",
            "decision",
            "allowed \\",
            "denied \\",
            "pending_approval"
          ],
          [
            "reasonCode",
            "reason_code",
            "Stable machine code — the UI groups on this"
          ],
          [
            "reason",
            "reason",
            "Operator-facing prose; may be reworded freely"
          ],
          [
            "hitlItemId",
            "hitl_item_id",
            "The human review this decision raised"
          ],
          [
            "invocationId",
            "invocation_id",
            "Correlates an allowed decision to the call it produced"
          ],
          [
            "—",
            "request_fingerprint",
            "SHA-256 of arguments. Never surfaced in the UI"
          ],
          [
            "Field",
            "Column",
            "Notes"
          ],
          [
            "—",
            "rate_limit_per_hour",
            "Per agent, rolling hour. NULL = unlimited, 0 = never"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Configuration",
        "route": "/trust-engine/config",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-engine.md",
        "title": "Trust Engine (Runtime Trust)",
        "purpose": "The Trust Engine is Sentinel's runtime trust layer: the inline enforcement point that sits between an application's LLM calls and the model provider, plus the dashboard that visualises what that enforcement did. It exists in two halves that share one id-space — a data-plane gateway that rate-limits, sanitizes, circuit-breaks, proxies and audits every inference in real time, and a set of dashboard screens that render the tables the gateway (and its batch/telemetry feeds) write: trust policies, live inference traces, guardrail events, cost and token usage, fallback failovers, agent tool calls, a",
        "why": "This is the product's core value proposition. A governance platform that only documents models after the fact cannot stop a bad inference; the Trust Engine is the control that acts while the request is in flight. The runtime obligations it discharges: EU AI Act Art. 9 (risk management) — the circuit breaker and trust-scoring cascade keep a failing or unsafe model from serving traffic unchecked. EU AI Act Art. 10 (data governance) — the prompt sanitizer strips PII and detects prompt injection before anything is logged or sent to the provider (data minimisation, Art. 10.3). EU AI Act Art. 12 (re",
        "how": [
          "### Runtime data-plane — POST /v1/chat/completions (sentinel/proxy.py)",
          "The gateway is an always-on FastAPI process (it cannot be serverless — it holds a warm Redis pool, runs a Python policy stack, streams responses, and calls providers; see docs/architecture/deployment-topology.md). Each inference walks a fixed pipeline:",
          "1. Tenant resolve — the Bearer JWT is decoded and verified against SECRET_KEY; the tenant_id claim loads a TenantConfig from the tenants store. Any failure is a 401.",
          "2. Rate limit — a 60-second sliding window in Redis (sentinel:ratelimit:<tenant>, sorted-set + zcard), default 1000 req/min. Over the limit is a 429. If Redis is unreachable the gateway fails open (allow-all) rather than dropping traffic.",
          "3. Sanitize — sanitizer.sanitize(prompt, tenant) strips PII and runs embedding-based prompt-injection detection against seeded injection vectors. If it blocks, the request returns HTTP 400 INJECTION_DETECTED and a blocked audit entry is written (trust_score 0, intervention BLOCKED) before returning. Otherwise the last user message is replaced with the sanitized text — so raw PII never reaches the provider or the logs.",
          "4. Circuit breaker / provider routing — circuit_breaker.call(...) wraps the provider call (litellm.acompletion against tenant.primary_model, so OpenAI / Anthropic / local models share one code path). A provider exception returns HTTP 502 and writes an error audit entry.",
          "5. Audit — a hash-chained AuditEntryInput (prompt hash, response hash, trust_score, intervention_level, cost_usd, latency_ms) is appended via auditor.log as a background task. The chain is append-only by design; this is the Art. 12 / ISO 9.1 record.",
          "6. Compliance evaluation — ComplianceEngine.evaluate(...) runs against the audit entry as a background task.",
          "7. Metrics + telemetry — Prometheus counters increment, and a best-effort background task writes per-inference telemetry to model_performance_metrics (feeds the Model Detail \"Performance\" tab). Telemetry failures are swallowed so they can never affect request handling.",
          "Prompt and response are stored only as SHA-256 digests, never plaintext.",
          "### Dashboard control-plane",
          "The seven screens are React Query views over the real org-scoped tables, following the modelService conventions: direct Supabase calls, camelCase↔snake_case mapping, reads and writes throw on failure so the UI renders a real error state and a success toast fires only after the write resolves. Models, policies and agents are keyed by uuid and resolved to display names at render time (Unavailable when a name cannot be resolved, never a raw uuid). The Live Traces screen additionally opens a Supabase Realtime INSERT subscription and shows a \"Live\"/\"Not connected\" badge reflecting the actual channel state."
        ],
        "dataProcess": [],
        "interlinks": [
          "Every relation is keyed by ai_models.id (uuid) and resolved to a name at render.",
          "Outbound",
          "Every screen → Model registry (/models/inventory/:id) via model uuid pills.",
          "Live Traces → Guardrails (/trust-engine/guardrails?policy=<uuid>) for the evaluated policy.",
          "Guardrails → Incident Response (incidents row created on escalate) and → Live Traces (/trust-engine/traces?model=<uuid>).",
          "Tool Monitor → Incident Response (incidents on escalate) and → Agent IAM (/agent-iam).",
          "Fallback Failovers → Live Traces by trace_id / trace_ref.",
          "Runtime gateway → model_performance_metrics (per-inference telemetry) → Model Detail → Performance tab.",
          "Config → Keys Vault (/security/keys) for secrets and Audit Log (/audit-trail) for every save.",
          "Inbound",
          "Model Detail deep-links into these screens with ?model=<uuid> (traces, guardrails, costs, fallback, tools, policies), each rendering a dismissible filter chip.",
          "trust_policies are referenced by live_traces.policy_id and guardrail_events.policy_id; a policy referenced by recorded traces/events cannot be deleted (deactivate instead) — surfaced as a friendly service error."
        ],
        "compliance": [
          "The audit found this module \"mapped loosely,\" and that is accurate. Neither docs/compliance/eu-ai-act-mapping.md nor docs/compliance/iso-42001-mapping.md contains a row naming the Trust Engine / Runtime Trust module or its tables. What the mapping tables cite are the runtime gateway's layers described generically, not the dashboard screens:",
          "EU AI Act — Art. 9 \"Trust score + circuit breaker\", Art. 10 \"PII sanitizer + verifier\", Art. 12 \"Immutable audit log\", Art. 14 \"HITL queue + review UI\", Art. 15 \"Fact-checker + NLI verifier\", Art. 62 \"Continuous audit logging\" — all marked Implemented, but attributed to sentinel/proxy.py layers, with no link back to /trust-engine/* or to live_traces / guardrail_events / trust_policies.",
          "ISO/IEC 42001 — 6.1.2 \"Trust score pipeline\", 6.1.3 \"Circuit breaker cascade\", 8.4 \"Proxy middleware\", 9.1 \"Audit hash chain\", A.8.3 \"PII sanitizer\", A.8.4 \"Immutable audit chain\" — again the gateway layers, not the module.",
          "NIST AI RMF — the previous thin doc asserted MEASURE 3.1–3.3; no NIST mapping document exists in docs/compliance/, so that citation is unbacked and should be treated as a claim, not a mapping.",
          "Real, defensible coverage today: the runtime pipeline genuinely implements Art. 10 (sanitize before log/provider), Art. 12 / ISO 9.1 (SHA-256 hash-chained append-only audit via auditor.log), Art. 9 (rate-limit + circuit breaker), and the dashboard genuinely implements the Art. 14 human-oversight path (guardrail ack by a named user; escalation to a real incidents record; the route_hitl policy action). Config saves and policy/rule CRUD write to the platform Audit Log via logAction (Art. 12 attributability). Secrets are stored as digests (Art. 15 / GDPR Art. 32), never plaintext.",
          "Gap to close (recommended): add explicit rows to both mapping documents that name this module and its tables — e.g. Art. 9 → trust_policies + circuit breaker; Art. 12 → live_traces + hash chain; Art. 14 → guardrail_events ack/escalate; ISO A.6.2.6 (operation monitoring) → the Live Traces / Cost / Fallback screens — and either add a NIST AI RMF mapping doc or drop the MEASURE 3.x claim. Until then the module's compliance posture is implemented in code but under-documented in the mapping — mark it Partial on the mapping line, not Implemented."
        ],
        "operations": [
          "Seeding / backfill. 20260814000011_trust_runtime_seeds.sql provides coherent demo rows for the demo org (00000000-…-0001), all keyed to real ai_models uuids, idempotent. The agents table is empty (Agent Control not seeded), so agent_id is left null and only agent_name is populated on tool/trace/event rows.",
          "Empty states. Every screen has an honest empty state (no traces, no events, no usage, no policies, no fallbacks, no tool calls). Trust Index and all rate/latency KPIs render — (not 0) when there is nothing to measure.",
          "Realtime. Only Live Traces subscribes (Supabase Realtime INSERT); the badge reflects the true channel state. The other screens are React Query reads that invalidate on mutation.",
          "Common errors (writes throw). Deleting a referenced policy → \"This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.\" Ack without a session → \"Sign in required to acknowledge events.\" Invalid rule condition → \"Condition is not valid JSON: …\". Provider failure at the gateway → HTTP 502; injection → HTTP 400 INJECTION_DETECTED; over rate limit → HTTP 429.",
          "Fail-open rate limit. If Redis is down the gateway allows all traffic (availability over throttling) — a deliberate posture worth noting for a threat model.",
          "Retention. live_traces shows most-recent 100 per query; cost_token_usage is a daily ledger; audit entries are append-only and never deleted.",
          "Known debt. Span-level trace instrumentation is not yet ingested (labelled in the trace sheet). Fallback → HITL review is disabled pending a backend. live_traces.policy_id / guardrail_events.policy_id are text, not uuid FKs. Three partially-overlapping Python surfaces (proxy:app, main:app, the connect edge function) can drift — TD-019 in docs/reference/technical-debt.md. The compliance-mapping gap above should be recorded there with an owner."
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "pk",
            "the only key"
          ],
          [
            "org_id",
            "uuid",
            "auto",
            "DB default current_user_org_id()"
          ],
          [
            "policy_ref",
            "text",
            "—",
            "display ref (POL-… seeds, TP-### UI-created); never a key"
          ],
          [
            "name / type / action / severity",
            "text",
            "—",
            "action ∈ block/warn/redact/route_hitl/log"
          ],
          [
            "condition_json",
            "jsonb",
            "—",
            "policy condition; null → not shown"
          ],
          [
            "threshold",
            "numeric",
            "—",
            "null → —"
          ],
          [
            "is_active",
            "boolean",
            "—",
            "active policies evaluate live traffic"
          ],
          [
            "linked_models",
            "text[]",
            "—",
            "canonical ai_models.id uuids; resolved at render; \"Unavailable\" if unresolved"
          ],
          [
            "framework_ref",
            "text",
            "—",
            "e.g. \"GDPR Art. 5\"; null → —"
          ],
          [
            "triggers_7d / block_rate / avg_latency_ms",
            "numeric",
            "—",
            "telemetry aggregates; avg_latency_ms null → —"
          ]
        ],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "security",
    "title": "SECURITY",
    "entryCount": 15,
    "documentedCount": 15,
    "entries": [
      {
        "label": "Threats & Scans",
        "route": "/security/scans",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Threat Feed",
        "route": "/security/threats",
        "parentLabel": "Threats & Scans",
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Scan Center",
        "route": "/security/scans",
        "parentLabel": "Threats & Scans",
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Attack Surface",
        "route": "/security/attack-surface",
        "parentLabel": "Threats & Scans",
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Vulnerabilities",
        "route": "/security/vuln-tracker",
        "parentLabel": "Threats & Scans",
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Red Teaming",
        "route": "/security/red-team",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Red Team Lab",
        "route": "/security/red-team",
        "parentLabel": "Red Teaming",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Red Team Findings",
        "route": "/red-team-findings",
        "parentLabel": "Red Teaming",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Model Arena",
        "route": "/security/model-arena",
        "parentLabel": "Red Teaming",
        "hasDoc": true,
        "docPath": "docs/modules/red-team-evals.md",
        "title": "Red Team & Evaluations",
        "purpose": "Structured adversarial testing and offline/online evaluation of models, prompts, and end-to-end applications covering safety, security, quality, fairness, and robustness.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.15",
            "Accuracy, robustness, cybersecurity"
          ],
          [
            "EU AI Act Art.55",
            "Systemic-risk GPAI model evaluation and red-teaming"
          ],
          [
            "NIST AI RMF MEASURE 2.1–2.11",
            "Test, evaluation, verification, validation"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation"
          ],
          [
            "OWASP LLM Top 10",
            "Full coverage"
          ],
          [
            "MITRE ATLAS",
            "Adversarial ML TTPs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Defense & Policies",
        "route": "/security/policies",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Policy Firewall",
        "route": "/security/policies",
        "parentLabel": "Defense & Policies",
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Keys Vault",
        "route": "/security/keys",
        "parentLabel": "Defense & Policies",
        "hasDoc": true,
        "docPath": "docs/modules/security-intelligence.md",
        "title": "Security Intelligence",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8",
            "Technological controls"
          ],
          [
            "NIST CSF DETECT + RESPOND",
            "Detection and response"
          ],
          [
            "MITRE ATT&CK + ATLAS",
            "Coverage mapping"
          ],
          [
            "CIS Controls v8",
            "Baseline cyber hygiene"
          ],
          [
            "EU AI Act Art.15",
            "AI cybersecurity"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "JIT Elevation",
        "route": "/security/jit",
        "parentLabel": "Defense & Policies",
        "hasDoc": true,
        "docPath": "docs/modules/rbac-organization.md",
        "title": "RBAC, Admin, Departments, Committees, Settings, Notifications, Tasks",
        "purpose": "Foundational organisational modules: roles and permissions, multi-tenant admin, departmental scoping, governance committees, task queue, and notification routing.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.2, A.5.3, A.5.15–18",
            "Roles, SoD, access control"
          ],
          [
            "SOC 2 CC1.3, CC6.1–3",
            "Authority and responsibility; logical access"
          ],
          [
            "NIST SP 800-53 AC-2, AC-3, AC-5, AC-6",
            "Access, SoD, least privilege"
          ],
          [
            "ISO/IEC 42001 5.3",
            "Roles and responsibilities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "MFA Enrollment",
        "route": "/security/mfa",
        "parentLabel": "Defense & Policies",
        "hasDoc": true,
        "docPath": "docs/modules/rbac-organization.md",
        "title": "RBAC, Admin, Departments, Committees, Settings, Notifications, Tasks",
        "purpose": "Foundational organisational modules: roles and permissions, multi-tenant admin, departmental scoping, governance committees, task queue, and notification routing.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.2, A.5.3, A.5.15–18",
            "Roles, SoD, access control"
          ],
          [
            "SOC 2 CC1.3, CC6.1–3",
            "Authority and responsibility; logical access"
          ],
          [
            "NIST SP 800-53 AC-2, AC-3, AC-5, AC-6",
            "Access, SoD, least privilege"
          ],
          [
            "ISO/IEC 42001 5.3",
            "Roles and responsibilities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Security Reports",
        "route": "/security/reports",
        "parentLabel": "Defense & Policies",
        "hasDoc": true,
        "docPath": "docs/modules/reporting.md",
        "title": "Reporting",
        "purpose": "Report definitions that snapshot the platform's real registers on demand. Each generation reads the named tables, persists the result as a run, and hands the viewer that exact artifact to download — a real document, not a rendered mock.",
        "why": "Before the 2026-08-25 rebuild /reporting was one of the most fabrication-dense pages in the product. It read reporting_table (id, doc jsonb) for its \"scheduled reports\" and rendered everything else from hardcoded arrays: REPORT_TEMPLATES — eight cards with invented \"Last generated\" dates; GENERATION_HISTORY — eight fake runs signed by named people (\"Sarah Chen\", \"System (Scheduled)\") with invented durations (\"3.8s\"); SCHEDULED_REPORTS — three fake schedules with invented recipients; the Preview tab's COMPLIANCE_DATA / RISK_TREND / PIE_DATA — charts drawn from arrays typed into the file, captio",
        "how": [
          "Real tables, org-scoped. Report definitions live in security_reports;",
          "each generation writes a security_report_runs row whose content is a",
          "data-driven snapshot of the security tables the definition names. org_id",
          "filled by the DB default current_user_org_id(). Writes throw; save /",
          "delete / generate call logAction (Art. 12).",
          "Generation is real. generateReport fetches each selected section from",
          "its tenant-scoped table, assembles the snapshot, sizes it, persists the run",
          "and bumps the definition's generation_count / last_generated_at. The UI",
          "downloads that persisted content — the artifact and the stored run are the",
          "same bytes.",
          "A never-generated report is not faked. last_generated_at is null until a",
          "real run; the list renders — and the \"Never generated\" KPI counts them."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound: linked_model_id → the model detail page; the run content",
          "references the security records it covers.",
          "Inbound: a model's detail page reaches its reports via",
          "/reporting?model=<id>; ?open=<id> opens a definition."
        ],
        "compliance": [
          "EU AI Act Art. 12 (record-keeping) — generation and definition changes are",
          "audit-logged; each run is an immutable persisted artifact.",
          "The removed \"digital signature\" tab claimed eIDAS / RSA-SHA256 signing the",
          "product does not perform; it is not represented as shipped."
        ],
        "operations": [
          "Generate from the list row or the detail drawer; the run downloads immediately",
          "and is retained in run history for re-download. Deleting a definition retains",
          "its persisted run artifacts."
        ],
        "fields": [],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "risk-incidents",
    "title": "RISK & INCIDENTS",
    "entryCount": 13,
    "documentedCount": 13,
    "entries": [
      {
        "label": "Risk Register",
        "route": "/risks",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/risk-register.md",
        "title": "Risk Register",
        "purpose": "The Risk Register is the central inventory of AI, model, data, operational, compliance, security and third-party risks for one organisation. It is the platform's primary risk artefact: every risk carries a likelihood, an impact, a derived score with a band, a treatment/mitigation state, an owner and a review cadence, and links out to the models, controls, incidents, remediation plans, human-oversight reviews and financial quantifications that surround it.",
        "why": "This module discharges EU AI Act Article 9 — the risk management system: the obligation to establish, document, and maintain over the lifecycle a continuous process that identifies, analyses, evaluates and treats the risks a high-risk AI system poses, with the results kept as an auditable record. It also supports **ISO/IEC 42001 clauses 6.1.2 (AI risk assessment) and 6.1.3 (AI risk treatment) and the NIST AI RMF MAP / MEASURE / MANAGE** functions. Without a live register there is no evidence that risks were ever identified, scored, assigned to an owner, or driven to closure — the first thing a",
        "how": [
          "A risk enters the register two ways.",
          "1. Manually. A user clicks Add Risk, fills the dialog (title, category,",
          "owner, likelihood, impact, description are required), and saves. The write",
          "goes through useRisksData.saveRisk → riskService.upsertRisk, which upserts",
          "the risks table. The service dual-writes canonical + legacy column pairs",
          "(title/name, category/categories, impact/severity,",
          "status/mitigation_status, owner/action_owner, mitigation/",
          "mitigation_plan) so every reader era sees the same value, and mints a",
          "business code RSK-<year>-<nnnnn> for new rows so the register never shows a",
          "raw id as identity. tenant_id is never set by the client — the DB",
          "default current_user_org_id()::text scopes the row",
          "(20260814000008_risks_tenant_default.sql)."
        ],
        "dataProcess": [],
        "interlinks": [
          "Both directions, resolved to names at render (raw ids never shown; \"Unavailable\"",
          "when unresolved).",
          "Outbound (from a risk):",
          "Models — linked_model_ids → /models/inventory/:id pills (table + Overview tab).",
          "Incidents — linked_incident_ids → /risk/incidents?open=<id>, merged",
          "with incidents.linked_risk_ids so the seam works whichever side wrote it.",
          "Controls — linked_control_ids → /controls/:id (Controls tab).",
          "Remediation — remediation_plans.risk_id = this → /remediation-tracker?open=<id> (Remediation tab).",
          "HITL — hitl_reviews.linked_risk_id = this → /hitl/:id (HITL tab).",
          "Financial — financial_risks.linked_risk_id = this (text key) → /financial-risk?open=<id> (Financial tab).",
          "Audit — History tab links to /audit-trail.",
          "Inbound (reaching the register):"
        ],
        "compliance": [
          "EU AI Act — Article 9 (risk management system): this is the primary Art. 9",
          "artefact. Honest gap: in docs/compliance/eu-ai-act-mapping.md the Art. 9",
          "rows point to Tasks, Eval Techniques, MCP Gateway and DPIA — the Risk",
          "Register is not yet its own mapped module row. The 2026-08 compliance audit",
          "recorded it as \"mapped loosely\" only. This doc should be added as the",
          "explicit Art. 9 register row; until then the mapping under-represents the",
          "register's role.",
          "EU AI Act — Article 14 (human oversight): satisfied at the data layer —",
          "auto_generated, source, related_entity_* and source_event_id let a human",
          "identify and override an agent decision; the HITL tab exposes the review path.",
          "EU AI Act — Article 12 (record-keeping / audit logging): gap. The",
          "register does not call logAction on create/edit/delete — no logAction"
        ],
        "operations": [
          "Empty state: honest — \"No risks recorded yet\" with an Add-Risk prompt;",
          "filtered-empty is a distinct \"No risks match your filters\".",
          "Seeding: demo risks are seeded canonically",
          "(20260820000006_seed_risk_register_canonical.sql) and carry a",
          "metadata.demo_seed marker; earlier seeds that populated org_id but not",
          "tenant_id are healed in the canonical migration.",
          "Errors (writes throw): Supabase misconfig → `\"Supabase is not configured —",
          "risk data is unavailable\"` (a hard error state, never a fake-empty register);"
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "text",
            "pk",
            "DB default gen_random_uuid()::text; not a uuid id-space"
          ],
          [
            "tenant_id",
            "text",
            "auto",
            "Org scope; DB default current_user_org_id()::text — never set client-side; RLS risks_org_scoped"
          ],
          [
            "risk_id",
            "text",
            "—",
            "Business code (e.g. RSK-2026-00042); display identity, mapped to RiskItem.riskId"
          ],
          [
            "title / name",
            "text",
            "yes",
            "title is NOT NULL; service dual-writes both"
          ],
          [
            "description",
            "text",
            "yes (UI)",
            "UI requires; column nullable"
          ],
          [
            "category / categories",
            "text · text[]",
            "—",
            "Service writes both; read prefers category, falls back to categories[0]"
          ],
          [
            "likelihood",
            "int 1–5",
            "—",
            "CHECK 1–5, base default 1"
          ],
          [
            "impact",
            "int 1–5",
            "—",
            "Canonical column; base table default 1"
          ],
          [
            "severity",
            "int 1–5",
            "—",
            "Legacy alias of impact; agents write severity, service dual-writes"
          ],
          [
            "score",
            "int",
            "generated",
            "likelihood * GREATEST(impact, severity) STORED (base table)"
          ],
          [
            "risk_score",
            "int",
            "—",
            "Canonical stored score written by the UI (likelihood × impact)"
          ],
          [
            "risk_level",
            "text",
            "—",
            "`critical",
            "high",
            "medium",
            "low`; agents set from severity band"
          ],
          [
            "status / mitigation_status",
            "text",
            "—",
            "`open",
            "assessed",
            "in_progress",
            "mitigated",
            "accepted",
            "closed`"
          ],
          [
            "treatment",
            "text",
            "—",
            "`accept",
            "mitigate",
            "transfer",
            "avoid`; null = \"Not decided\""
          ],
          [
            "owner / action_owner",
            "text",
            "yes (UI)",
            "Dual-written; \"Unassigned\" when blank"
          ],
          [
            "mitigation_plan",
            "text",
            "—",
            "Treatment plan free text (UI mitigation)"
          ],
          [
            "applicable_frameworks",
            "text[]",
            "—",
            "Framework references; renders — when empty"
          ],
          [
            "residual_likelihood / residual_impact",
            "int 1–5",
            "—",
            "Nullable; residual score derived as their product"
          ],
          [
            "deadline",
            "date",
            "—",
            "Treatment deadline; drives Overdue"
          ],
          [
            "next_review_date",
            "date",
            "—",
            "Drives Review overdue"
          ],
          [
            "review_frequency",
            "text",
            "—",
            "`monthly",
            "quarterly",
            "semiannual",
            "annual`"
          ],
          [
            "is_escalated",
            "bool",
            "—",
            "Default false; red flag + escalated filter"
          ],
          [
            "escalation_reason",
            "text",
            "—",
            "Shown only when escalated"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Risk Matrix",
        "route": "/risk/matrix",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/risk-register.md",
        "title": "Risk Register",
        "purpose": "The Risk Register is the central inventory of AI, model, data, operational, compliance, security and third-party risks for one organisation. It is the platform's primary risk artefact: every risk carries a likelihood, an impact, a derived score with a band, a treatment/mitigation state, an owner and a review cadence, and links out to the models, controls, incidents, remediation plans, human-oversight reviews and financial quantifications that surround it.",
        "why": "This module discharges EU AI Act Article 9 — the risk management system: the obligation to establish, document, and maintain over the lifecycle a continuous process that identifies, analyses, evaluates and treats the risks a high-risk AI system poses, with the results kept as an auditable record. It also supports **ISO/IEC 42001 clauses 6.1.2 (AI risk assessment) and 6.1.3 (AI risk treatment) and the NIST AI RMF MAP / MEASURE / MANAGE** functions. Without a live register there is no evidence that risks were ever identified, scored, assigned to an owner, or driven to closure — the first thing a",
        "how": [
          "A risk enters the register two ways.",
          "1. Manually. A user clicks Add Risk, fills the dialog (title, category,",
          "owner, likelihood, impact, description are required), and saves. The write",
          "goes through useRisksData.saveRisk → riskService.upsertRisk, which upserts",
          "the risks table. The service dual-writes canonical + legacy column pairs",
          "(title/name, category/categories, impact/severity,",
          "status/mitigation_status, owner/action_owner, mitigation/",
          "mitigation_plan) so every reader era sees the same value, and mints a",
          "business code RSK-<year>-<nnnnn> for new rows so the register never shows a",
          "raw id as identity. tenant_id is never set by the client — the DB",
          "default current_user_org_id()::text scopes the row",
          "(20260814000008_risks_tenant_default.sql)."
        ],
        "dataProcess": [],
        "interlinks": [
          "Both directions, resolved to names at render (raw ids never shown; \"Unavailable\"",
          "when unresolved).",
          "Outbound (from a risk):",
          "Models — linked_model_ids → /models/inventory/:id pills (table + Overview tab).",
          "Incidents — linked_incident_ids → /risk/incidents?open=<id>, merged",
          "with incidents.linked_risk_ids so the seam works whichever side wrote it.",
          "Controls — linked_control_ids → /controls/:id (Controls tab).",
          "Remediation — remediation_plans.risk_id = this → /remediation-tracker?open=<id> (Remediation tab).",
          "HITL — hitl_reviews.linked_risk_id = this → /hitl/:id (HITL tab).",
          "Financial — financial_risks.linked_risk_id = this (text key) → /financial-risk?open=<id> (Financial tab).",
          "Audit — History tab links to /audit-trail.",
          "Inbound (reaching the register):"
        ],
        "compliance": [
          "EU AI Act — Article 9 (risk management system): this is the primary Art. 9",
          "artefact. Honest gap: in docs/compliance/eu-ai-act-mapping.md the Art. 9",
          "rows point to Tasks, Eval Techniques, MCP Gateway and DPIA — the Risk",
          "Register is not yet its own mapped module row. The 2026-08 compliance audit",
          "recorded it as \"mapped loosely\" only. This doc should be added as the",
          "explicit Art. 9 register row; until then the mapping under-represents the",
          "register's role.",
          "EU AI Act — Article 14 (human oversight): satisfied at the data layer —",
          "auto_generated, source, related_entity_* and source_event_id let a human",
          "identify and override an agent decision; the HITL tab exposes the review path.",
          "EU AI Act — Article 12 (record-keeping / audit logging): gap. The",
          "register does not call logAction on create/edit/delete — no logAction"
        ],
        "operations": [
          "Empty state: honest — \"No risks recorded yet\" with an Add-Risk prompt;",
          "filtered-empty is a distinct \"No risks match your filters\".",
          "Seeding: demo risks are seeded canonically",
          "(20260820000006_seed_risk_register_canonical.sql) and carry a",
          "metadata.demo_seed marker; earlier seeds that populated org_id but not",
          "tenant_id are healed in the canonical migration.",
          "Errors (writes throw): Supabase misconfig → `\"Supabase is not configured —",
          "risk data is unavailable\"` (a hard error state, never a fake-empty register);"
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "text",
            "pk",
            "DB default gen_random_uuid()::text; not a uuid id-space"
          ],
          [
            "tenant_id",
            "text",
            "auto",
            "Org scope; DB default current_user_org_id()::text — never set client-side; RLS risks_org_scoped"
          ],
          [
            "risk_id",
            "text",
            "—",
            "Business code (e.g. RSK-2026-00042); display identity, mapped to RiskItem.riskId"
          ],
          [
            "title / name",
            "text",
            "yes",
            "title is NOT NULL; service dual-writes both"
          ],
          [
            "description",
            "text",
            "yes (UI)",
            "UI requires; column nullable"
          ],
          [
            "category / categories",
            "text · text[]",
            "—",
            "Service writes both; read prefers category, falls back to categories[0]"
          ],
          [
            "likelihood",
            "int 1–5",
            "—",
            "CHECK 1–5, base default 1"
          ],
          [
            "impact",
            "int 1–5",
            "—",
            "Canonical column; base table default 1"
          ],
          [
            "severity",
            "int 1–5",
            "—",
            "Legacy alias of impact; agents write severity, service dual-writes"
          ],
          [
            "score",
            "int",
            "generated",
            "likelihood * GREATEST(impact, severity) STORED (base table)"
          ],
          [
            "risk_score",
            "int",
            "—",
            "Canonical stored score written by the UI (likelihood × impact)"
          ],
          [
            "risk_level",
            "text",
            "—",
            "`critical",
            "high",
            "medium",
            "low`; agents set from severity band"
          ],
          [
            "status / mitigation_status",
            "text",
            "—",
            "`open",
            "assessed",
            "in_progress",
            "mitigated",
            "accepted",
            "closed`"
          ],
          [
            "treatment",
            "text",
            "—",
            "`accept",
            "mitigate",
            "transfer",
            "avoid`; null = \"Not decided\""
          ],
          [
            "owner / action_owner",
            "text",
            "yes (UI)",
            "Dual-written; \"Unassigned\" when blank"
          ],
          [
            "mitigation_plan",
            "text",
            "—",
            "Treatment plan free text (UI mitigation)"
          ],
          [
            "applicable_frameworks",
            "text[]",
            "—",
            "Framework references; renders — when empty"
          ],
          [
            "residual_likelihood / residual_impact",
            "int 1–5",
            "—",
            "Nullable; residual score derived as their product"
          ],
          [
            "deadline",
            "date",
            "—",
            "Treatment deadline; drives Overdue"
          ],
          [
            "next_review_date",
            "date",
            "—",
            "Drives Review overdue"
          ],
          [
            "review_frequency",
            "text",
            "—",
            "`monthly",
            "quarterly",
            "semiannual",
            "annual`"
          ],
          [
            "is_escalated",
            "bool",
            "—",
            "Default false; red flag + escalated filter"
          ],
          [
            "escalation_reason",
            "text",
            "—",
            "Shown only when escalated"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Risk Intelligence",
        "route": "/risk-intelligence",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/risk-register.md",
        "title": "Risk Register",
        "purpose": "The Risk Register is the central inventory of AI, model, data, operational, compliance, security and third-party risks for one organisation. It is the platform's primary risk artefact: every risk carries a likelihood, an impact, a derived score with a band, a treatment/mitigation state, an owner and a review cadence, and links out to the models, controls, incidents, remediation plans, human-oversight reviews and financial quantifications that surround it.",
        "why": "This module discharges EU AI Act Article 9 — the risk management system: the obligation to establish, document, and maintain over the lifecycle a continuous process that identifies, analyses, evaluates and treats the risks a high-risk AI system poses, with the results kept as an auditable record. It also supports **ISO/IEC 42001 clauses 6.1.2 (AI risk assessment) and 6.1.3 (AI risk treatment) and the NIST AI RMF MAP / MEASURE / MANAGE** functions. Without a live register there is no evidence that risks were ever identified, scored, assigned to an owner, or driven to closure — the first thing a",
        "how": [
          "A risk enters the register two ways.",
          "1. Manually. A user clicks Add Risk, fills the dialog (title, category,",
          "owner, likelihood, impact, description are required), and saves. The write",
          "goes through useRisksData.saveRisk → riskService.upsertRisk, which upserts",
          "the risks table. The service dual-writes canonical + legacy column pairs",
          "(title/name, category/categories, impact/severity,",
          "status/mitigation_status, owner/action_owner, mitigation/",
          "mitigation_plan) so every reader era sees the same value, and mints a",
          "business code RSK-<year>-<nnnnn> for new rows so the register never shows a",
          "raw id as identity. tenant_id is never set by the client — the DB",
          "default current_user_org_id()::text scopes the row",
          "(20260814000008_risks_tenant_default.sql)."
        ],
        "dataProcess": [],
        "interlinks": [
          "Both directions, resolved to names at render (raw ids never shown; \"Unavailable\"",
          "when unresolved).",
          "Outbound (from a risk):",
          "Models — linked_model_ids → /models/inventory/:id pills (table + Overview tab).",
          "Incidents — linked_incident_ids → /risk/incidents?open=<id>, merged",
          "with incidents.linked_risk_ids so the seam works whichever side wrote it.",
          "Controls — linked_control_ids → /controls/:id (Controls tab).",
          "Remediation — remediation_plans.risk_id = this → /remediation-tracker?open=<id> (Remediation tab).",
          "HITL — hitl_reviews.linked_risk_id = this → /hitl/:id (HITL tab).",
          "Financial — financial_risks.linked_risk_id = this (text key) → /financial-risk?open=<id> (Financial tab).",
          "Audit — History tab links to /audit-trail.",
          "Inbound (reaching the register):"
        ],
        "compliance": [
          "EU AI Act — Article 9 (risk management system): this is the primary Art. 9",
          "artefact. Honest gap: in docs/compliance/eu-ai-act-mapping.md the Art. 9",
          "rows point to Tasks, Eval Techniques, MCP Gateway and DPIA — the Risk",
          "Register is not yet its own mapped module row. The 2026-08 compliance audit",
          "recorded it as \"mapped loosely\" only. This doc should be added as the",
          "explicit Art. 9 register row; until then the mapping under-represents the",
          "register's role.",
          "EU AI Act — Article 14 (human oversight): satisfied at the data layer —",
          "auto_generated, source, related_entity_* and source_event_id let a human",
          "identify and override an agent decision; the HITL tab exposes the review path.",
          "EU AI Act — Article 12 (record-keeping / audit logging): gap. The",
          "register does not call logAction on create/edit/delete — no logAction"
        ],
        "operations": [
          "Empty state: honest — \"No risks recorded yet\" with an Add-Risk prompt;",
          "filtered-empty is a distinct \"No risks match your filters\".",
          "Seeding: demo risks are seeded canonically",
          "(20260820000006_seed_risk_register_canonical.sql) and carry a",
          "metadata.demo_seed marker; earlier seeds that populated org_id but not",
          "tenant_id are healed in the canonical migration.",
          "Errors (writes throw): Supabase misconfig → `\"Supabase is not configured —",
          "risk data is unavailable\"` (a hard error state, never a fake-empty register);"
        ],
        "fields": [
          [
            "Field",
            "Type",
            "Req.",
            "Notes"
          ],
          [
            "id",
            "text",
            "pk",
            "DB default gen_random_uuid()::text; not a uuid id-space"
          ],
          [
            "tenant_id",
            "text",
            "auto",
            "Org scope; DB default current_user_org_id()::text — never set client-side; RLS risks_org_scoped"
          ],
          [
            "risk_id",
            "text",
            "—",
            "Business code (e.g. RSK-2026-00042); display identity, mapped to RiskItem.riskId"
          ],
          [
            "title / name",
            "text",
            "yes",
            "title is NOT NULL; service dual-writes both"
          ],
          [
            "description",
            "text",
            "yes (UI)",
            "UI requires; column nullable"
          ],
          [
            "category / categories",
            "text · text[]",
            "—",
            "Service writes both; read prefers category, falls back to categories[0]"
          ],
          [
            "likelihood",
            "int 1–5",
            "—",
            "CHECK 1–5, base default 1"
          ],
          [
            "impact",
            "int 1–5",
            "—",
            "Canonical column; base table default 1"
          ],
          [
            "severity",
            "int 1–5",
            "—",
            "Legacy alias of impact; agents write severity, service dual-writes"
          ],
          [
            "score",
            "int",
            "generated",
            "likelihood * GREATEST(impact, severity) STORED (base table)"
          ],
          [
            "risk_score",
            "int",
            "—",
            "Canonical stored score written by the UI (likelihood × impact)"
          ],
          [
            "risk_level",
            "text",
            "—",
            "`critical",
            "high",
            "medium",
            "low`; agents set from severity band"
          ],
          [
            "status / mitigation_status",
            "text",
            "—",
            "`open",
            "assessed",
            "in_progress",
            "mitigated",
            "accepted",
            "closed`"
          ],
          [
            "treatment",
            "text",
            "—",
            "`accept",
            "mitigate",
            "transfer",
            "avoid`; null = \"Not decided\""
          ],
          [
            "owner / action_owner",
            "text",
            "yes (UI)",
            "Dual-written; \"Unassigned\" when blank"
          ],
          [
            "mitigation_plan",
            "text",
            "—",
            "Treatment plan free text (UI mitigation)"
          ],
          [
            "applicable_frameworks",
            "text[]",
            "—",
            "Framework references; renders — when empty"
          ],
          [
            "residual_likelihood / residual_impact",
            "int 1–5",
            "—",
            "Nullable; residual score derived as their product"
          ],
          [
            "deadline",
            "date",
            "—",
            "Treatment deadline; drives Overdue"
          ],
          [
            "next_review_date",
            "date",
            "—",
            "Drives Review overdue"
          ],
          [
            "review_frequency",
            "text",
            "—",
            "`monthly",
            "quarterly",
            "semiannual",
            "annual`"
          ],
          [
            "is_escalated",
            "bool",
            "—",
            "Default false; red flag + escalated filter"
          ],
          [
            "escalation_reason",
            "text",
            "—",
            "Shown only when escalated"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Financial Risk",
        "route": "/financial-risk",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/financial-risk.md",
        "title": "Financial Risk Quantification",
        "purpose": "FAIR-style quantification of AI risk scenarios: loss event frequency × loss magnitude → annualized loss expectancy (ALE), with per-scenario controls (cost vs. risk-reduction) and insurance mapping.",
        "why": "",
        "how": [],
        "dataProcess": [
          "public.financial_risks (uuid PK, org-scoped RLS financial_risks_org_all): FAIR primitives as real columns; ALE is computed (computeFair), never typed in; model_id → ai_models.id, linked_risk_id → risks.id.",
          "No simulated Monte Carlo output is displayed — only quantities derived from stored records."
        ],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "Open FAIR O-RT / O-RA",
            "Loss-event frequency and magnitude taxonomy"
          ],
          [
            "ISO/IEC 42001 6.1.4",
            "AI system impact assessment (financial dimension)"
          ],
          [
            "BCBS 239",
            "Risk data aggregation for model-driven exposures"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Incidents",
        "route": "/risk/incidents",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/incident-management.md",
        "title": "Incident Management",
        "purpose": "Detect, triage, contain, remediate, and learn from security, privacy, operational, and AI-specific incidents (hallucination harm, model misuse, data leakage, safety event).",
        "why": "",
        "how": [
          "Detect (alert, HITL, user complaint, eval regression, red-team) → Triage & classify (severity, category, regulator scope) → Contain → Eradicate → Recover → Post-incident review → Corrective actions."
        ],
        "dataProcess": [
          "public.incidents (uuid PK, tenant-scoped RLS incidents_org_scoped); services incidentResponseService.ts (canonical) and incidentService.ts (legacy snake_case consumers); hooks useIncidents, useIncidentTransitions, useWorkflowSteps.",
          "Declaring an incident emits INCIDENT_CREATED on the governance bus — the mesh's incident cascade (triage, containment, regulator-notify, evidence collection, …) fires from this emitter.",
          "Workflow transitions persist to public.incident_workflow_steps (from/to status, actor, notes, timestamp) — EU AI Act Art. 73 traceability.",
          "Playbooks: public.incident_playbooks + activations in public.playbook_runs (linked to real incidents; the \"active incident\" banner is driven by open runs only)."
        ],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.24–A.5.28",
            "IR planning, assessment, response, learning"
          ],
          [
            "NIST SP 800-61 r2",
            "Computer security IR handling"
          ],
          [
            "ISO/IEC 27035",
            "Information security incident management"
          ],
          [
            "EU AI Act Art. 72–73",
            "Post-market monitoring + serious incident reporting"
          ],
          [
            "DORA Art.17–23",
            "ICT incident management and classification"
          ],
          [
            "NIS2 Art.21(2)(b)",
            "Incident handling"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Workflow",
        "route": "/incident-workflow",
        "parentLabel": "Incidents",
        "hasDoc": true,
        "docPath": "docs/modules/incident-management.md",
        "title": "Incident Management",
        "purpose": "Detect, triage, contain, remediate, and learn from security, privacy, operational, and AI-specific incidents (hallucination harm, model misuse, data leakage, safety event).",
        "why": "",
        "how": [
          "Detect (alert, HITL, user complaint, eval regression, red-team) → Triage & classify (severity, category, regulator scope) → Contain → Eradicate → Recover → Post-incident review → Corrective actions."
        ],
        "dataProcess": [
          "public.incidents (uuid PK, tenant-scoped RLS incidents_org_scoped); services incidentResponseService.ts (canonical) and incidentService.ts (legacy snake_case consumers); hooks useIncidents, useIncidentTransitions, useWorkflowSteps.",
          "Declaring an incident emits INCIDENT_CREATED on the governance bus — the mesh's incident cascade (triage, containment, regulator-notify, evidence collection, …) fires from this emitter.",
          "Workflow transitions persist to public.incident_workflow_steps (from/to status, actor, notes, timestamp) — EU AI Act Art. 73 traceability.",
          "Playbooks: public.incident_playbooks + activations in public.playbook_runs (linked to real incidents; the \"active incident\" banner is driven by open runs only)."
        ],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.24–A.5.28",
            "IR planning, assessment, response, learning"
          ],
          [
            "NIST SP 800-61 r2",
            "Computer security IR handling"
          ],
          [
            "ISO/IEC 27035",
            "Information security incident management"
          ],
          [
            "EU AI Act Art. 72–73",
            "Post-market monitoring + serious incident reporting"
          ],
          [
            "DORA Art.17–23",
            "ICT incident management and classification"
          ],
          [
            "NIS2 Art.21(2)(b)",
            "Incident handling"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Playbooks",
        "route": "/incidents/playbooks",
        "parentLabel": "Incidents",
        "hasDoc": true,
        "docPath": "docs/modules/incident-management.md",
        "title": "Incident Management",
        "purpose": "Detect, triage, contain, remediate, and learn from security, privacy, operational, and AI-specific incidents (hallucination harm, model misuse, data leakage, safety event).",
        "why": "",
        "how": [
          "Detect (alert, HITL, user complaint, eval regression, red-team) → Triage & classify (severity, category, regulator scope) → Contain → Eradicate → Recover → Post-incident review → Corrective actions."
        ],
        "dataProcess": [
          "public.incidents (uuid PK, tenant-scoped RLS incidents_org_scoped); services incidentResponseService.ts (canonical) and incidentService.ts (legacy snake_case consumers); hooks useIncidents, useIncidentTransitions, useWorkflowSteps.",
          "Declaring an incident emits INCIDENT_CREATED on the governance bus — the mesh's incident cascade (triage, containment, regulator-notify, evidence collection, …) fires from this emitter.",
          "Workflow transitions persist to public.incident_workflow_steps (from/to status, actor, notes, timestamp) — EU AI Act Art. 73 traceability.",
          "Playbooks: public.incident_playbooks + activations in public.playbook_runs (linked to real incidents; the \"active incident\" banner is driven by open runs only)."
        ],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.24–A.5.28",
            "IR planning, assessment, response, learning"
          ],
          [
            "NIST SP 800-61 r2",
            "Computer security IR handling"
          ],
          [
            "ISO/IEC 27035",
            "Information security incident management"
          ],
          [
            "EU AI Act Art. 72–73",
            "Post-market monitoring + serious incident reporting"
          ],
          [
            "DORA Art.17–23",
            "ICT incident management and classification"
          ],
          [
            "NIS2 Art.21(2)(b)",
            "Incident handling"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Tabletop",
        "route": "/tabletop",
        "parentLabel": "Incidents",
        "hasDoc": true,
        "docPath": "docs/modules/tabletop-exercises.md",
        "title": "Tabletop Exercises",
        "purpose": "Structured scenario simulations for Incident Response, Business Continuity, Disaster Recovery, and AI-specific failure modes (model incident, hallucination cascade, prompt-injection breach, biased decisioning complaint).",
        "why": "",
        "how": [],
        "dataProcess": [
          "public.tabletop_exercises (org-scoped RLS tte_org) — the real table, now consumed by the page (useTabletops): CHECK-constrained type/status, findings + action items jsonb, readiness_score, linked_playbook_id → incident_playbooks."
        ],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.24–A.5.30",
            "IR planning, lessons learned, ICT continuity"
          ],
          [
            "ISO 22301 8.5",
            "Exercising and testing"
          ],
          [
            "NIST SP 800-84",
            "Test, Training, and Exercise Programs"
          ],
          [
            "EU AI Act Art.9, Art.15",
            "Risk management throughout lifecycle, accuracy/robustness"
          ],
          [
            "DORA Art.25–26",
            "TLPT and scenario testing"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Remediation",
        "route": "/remediation-tracker",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/remediation-tasks.md",
        "title": "Remediation & Tasks",
        "purpose": "Track corrective and preventive actions (CAPA) linked to gaps, findings, incidents, and exceptions; enforce SLA and evidence-of-closure.",
        "why": "",
        "how": [
          "Open → Owner → Plan → Execute → Evidence attached → Independent verification → Close. Overdue items escalate and degrade Trust Score."
        ],
        "dataProcess": [
          "public.remediation_plans (uuid PK, org-scoped RLS): progress_pct, milestones jsonb, incident_id → incidents, risk_id → risks, linked_model_ids → models; full CRUD via useRemediations (writes throw — no fake success)."
        ],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 10.1–10.2",
            "Nonconformity and corrective action"
          ],
          [
            "ISO 9001 10",
            "Improvement"
          ],
          [
            "SOC 2 CC4.2",
            "Remediation of deficiencies"
          ],
          [
            "NIST AI RMF MANAGE 2, 4",
            "Risk treatment and continual improvement"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Exceptions",
        "route": "/exceptions",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/incident-management.md",
        "title": "Incident Management",
        "purpose": "Detect, triage, contain, remediate, and learn from security, privacy, operational, and AI-specific incidents (hallucination harm, model misuse, data leakage, safety event).",
        "why": "",
        "how": [
          "Detect (alert, HITL, user complaint, eval regression, red-team) → Triage & classify (severity, category, regulator scope) → Contain → Eradicate → Recover → Post-incident review → Corrective actions."
        ],
        "dataProcess": [
          "public.incidents (uuid PK, tenant-scoped RLS incidents_org_scoped); services incidentResponseService.ts (canonical) and incidentService.ts (legacy snake_case consumers); hooks useIncidents, useIncidentTransitions, useWorkflowSteps.",
          "Declaring an incident emits INCIDENT_CREATED on the governance bus — the mesh's incident cascade (triage, containment, regulator-notify, evidence collection, …) fires from this emitter.",
          "Workflow transitions persist to public.incident_workflow_steps (from/to status, actor, notes, timestamp) — EU AI Act Art. 73 traceability.",
          "Playbooks: public.incident_playbooks + activations in public.playbook_runs (linked to real incidents; the \"active incident\" banner is driven by open runs only)."
        ],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.24–A.5.28",
            "IR planning, assessment, response, learning"
          ],
          [
            "NIST SP 800-61 r2",
            "Computer security IR handling"
          ],
          [
            "ISO/IEC 27035",
            "Information security incident management"
          ],
          [
            "EU AI Act Art. 72–73",
            "Post-market monitoring + serious incident reporting"
          ],
          [
            "DORA Art.17–23",
            "ICT incident management and classification"
          ],
          [
            "NIS2 Art.21(2)(b)",
            "Incident handling"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "HITL",
        "route": "/hitl",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/hitl-review.md",
        "title": "Human-in-the-Loop (HITL) Review",
        "purpose": "Route AI outputs flagged by policy, risk, or user challenge to qualified human reviewers; capture decisions as auditable, reason-coded evidence; feed corrections back to policy and evals.",
        "why": "",
        "how": [],
        "dataProcess": [
          "public.hitl_reviews (uuid PK, org + tenant scoped) is ONE queue shared by the UI and the agent mesh: hitlAgent.ts and the governance-dispatcher edge function write the same table the Review Center reads (oversightService.ts, useHitlReviews).",
          "Decisions (approve / reject / request info) persist with decider + timestamp and append an audit event to the hash-chained audit_log via withAudit → the audit_client_event RPC (SECURITY DEFINER; org and actor resolved server-side). The audit metadata carries entity_name (the review title) so the Audit Trail renders a real label. This satisfies EU AI Act Art. 14 human-oversight evidence. (Decisions are not written to evidence_chain — evidence artifacts are a separate module.)",
          "blocks_deployment marks reviews that gate a release; SLA fields (sla_hours, sla_deadline) drive real overdue computation.",
          "Realtime: hitl_reviews inserts/updates invalidate the ri-hitl query namespace (useRealtimeInvalidation), so mesh-queued reviews appear without a reload."
        ],
        "interlinks": [
          "Outbound: model (/models/inventory/:id), incident (/risk/incidents?open=), risk (/risks?open=), linked risk chip.",
          "Inbound: Audit Trail (hitl_review → /hitl/:id), CISO Dashboard tile (/hitl), Overview digest, notifications (url_path)."
        ],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.14",
            "Human oversight"
          ],
          [
            "EU AI Act Art.26(2)",
            "Deployer oversight duties"
          ],
          [
            "ISO/IEC 42001:2023 A.9.3",
            "Human oversight"
          ],
          [
            "NIST AI RMF MANAGE 2.3",
            "Post-deployment override mechanisms"
          ],
          [
            "GDPR Art.22",
            "Right not to be subject to solely automated decision"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Approval Workflows",
        "route": "/workflows",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/approval-workflows.md",
        "title": "Approval Workflows",
        "purpose": "Configurable multi-stage approvals for high-impact actions: model deployment, exceptions, incident reports, policy changes.",
        "why": "",
        "how": [],
        "dataProcess": [
          "Definitions: public.approval_workflows (steps jsonb — {name, approver_role, required, sla_hours} — MFA + escalation config).",
          "Requests: public.approvals — entity-linked (entity_type + entity_id), org-scoped, with step_index, decisions jsonb ledger and due_at (migration 20260820000005_risk_criticality.sql).",
          "Entity types: model (→ /models/inventory/:id), exception (→ /exceptions?open=), incident (→ /risk/incidents?open=), policy (→ /policies?open=, name resolved from the policies register).",
          "Decisions are audited via withAudit → audit_client_event RPC into the hash-chained audit_log, with entity_name in the audit metadata so the Audit Trail shows a readable label; the trail links approval entities back to /workflows?open=<id>.",
          "Realtime: approvals and approval_workflows changes invalidate the ri-approvals / ri-approval-workflows query namespaces (useRealtimeInvalidation)."
        ],
        "interlinks": [
          "Outbound: model / exception / incident / policy chips per request.",
          "Inbound: Audit Trail (approval → /workflows?open=), CISO Dashboard \"Pending approvals\" tile, Exception Management (shared decision state)."
        ],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "SOC 2 CC5.2, CC8.1",
            "Policy and change management"
          ],
          [
            "ISO/IEC 27001:2022 A.8.32",
            "Change management"
          ],
          [
            "NIST SP 800-53 CM-3",
            "Configuration change control"
          ],
          [
            "ISO/IEC 42001 A.6.2.7",
            "Deployment"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Automation Studio",
        "route": "/automation-studio",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/automation-studio.md",
        "title": "Automation Studio",
        "purpose": "Governance automation rules: a trigger (incident created, model drift, approval required, schedule) plus an ordered action list (create HITL review, hold deployments, create approval, notify). Rules are definitions; every run is a recorded fact.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 42001 8.2",
            "Operational planning and control"
          ],
          [
            "EU AI Act Art. 14",
            "Human oversight gates in automated flows"
          ]
        ],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "compliance-regulatory",
    "title": "COMPLIANCE & REGULATORY",
    "entryCount": 23,
    "documentedCount": 23,
    "entries": [
      {
        "label": "Overview",
        "route": "/compliance",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/compliance-overview.md",
        "title": "Compliance Overview",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Frameworks",
        "route": "/frameworks",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/frameworks.md",
        "title": "Frameworks",
        "purpose": "The single frameworks surface for the platform: the org's adopted framework portfolio (real rows, real scores, real control coverage), the bundled reference catalog, and the static cross-framework reference crosswalk.",
        "why": "Every compliance view ultimately keys off \"which frameworks do we govern against, and how far along are we?\". Keeping one governed frameworks table — instead of per-page framework lists — lets scores, controls, conformity assessments and the executive Overview all read the same portfolio.",
        "how": [
          "Three tabs:",
          "Portfolio — org-scoped frameworks rows with full CRUD",
          "(writes throw; toasts only after the write resolves). Each card shows:",
          "Compliance Score: the recorded score. A **null score renders \"—\"",
          "with \"No score recorded yet\"** and neutral styling — never 0% and never",
          "the red <65% treatment.",
          "Controls: implemented/total **derived live from the org controls",
          "table** (statuses implemented/effective count as implemented). A",
          "control belongs to a framework when its framework_id matches or its",
          "free-text framework label equals the framework's name/code (allowing a",
          "versioned suffix, e.g. \"ISO/IEC 42001\" ↔ \"ISO/IEC 42001:2023\"). When no",
          "controls reference the framework the line reads \"— no controls linked"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound:",
          "Framework detail Requirements tab → each published catalog control",
          "(framework_controls) surfaces the org controls implementing it, as pill",
          "links to /compliance/controls?open=<controls.id>.",
          "Framework detail Implemented tab → each matched control opens in",
          "/compliance/controls?open=<controls.id>.",
          "Catalog (bundled reference) entries → issuing-authority URLs.",
          "Inbound:",
          "Control → catalog backlink: ControlDetail (/compliance/controls/:id,",
          "Interlinks tab) resolves the published catalog entry a control satisfies via",
          "useControlCatalogEntry and deep-links back to /frameworks?open=<framework_id>.",
          "This is the reverse of the Requirements-tab edge, so the catalog ↔ register"
        ],
        "compliance": [
          "ISO/IEC 42001: Clause 4.1/6.1 (determining applicable requirements and",
          "planning against them); the portfolio is the AIMS statement of applicability",
          "anchor. The framework_controls catalog + the Requirements↔register interlink",
          "make the Statement of Applicability auditable — for each published control",
          "it is now visible whether an org control implements it, or it is explicitly",
          "outstanding.",
          "EU AI Act: the adopted-framework record underpins Art. 43 conformity",
          "routes and Annex IV documentation; EU AI Act appears both as catalog",
          "reference and as an adoptable portfolio row. The published EU AI Act catalog",
          "(Art. 5–73) with its implementation backlinks supports Art. 11/Annex IV",
          "technical-documentation traceability of which requirements are met.",
          "Honesty rules enforced here: null scores are never rendered as measured"
        ],
        "operations": [
          "CRUD via frameworkService (throw-on-failure) and useFrameworksData",
          "(React Query; invalidates ['frameworks'] on mutation).",
          "Deleting a framework leaves its controls without a framework reference",
          "(warned in the confirm dialog).",
          "Seeded portfolio rows (10 frameworks) currently carry score = null —",
          "the UI shows the unscored state until scores are actually recorded."
        ],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Conformity",
        "route": "/conformity",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/conformity-assessment.md",
        "title": "Conformity Assessment",
        "purpose": "Manage formal conformity assessments of AI systems against adopted frameworks — the EU AI Act Annex IV / Art. 43 assessment record and the ISO/IEC 42001 Clause 9 performance-evaluation record for each governed model.",
        "why": "High-risk AI systems must carry a demonstrable conformity assessment before (and while) they operate. Scattering that proof across documents makes it unauditable; this module keeps one governed record per assessment, linked to the model it covers, the framework it asserts conformity with, and the evidence that substantiates the conclusion.",
        "how": [
          "The page lists all org assessments (cards) with status",
          "(Not Started / In Progress / Completed) and compliance level",
          "(Conformant / Substantially conformant / Partial / Non-conformant / Pending).",
          "Create captures title, framework, model, assessment body and validity",
          "date; id, org_id and tenant_id are filled by DB defaults",
          "(current_user_org_id()) — the client never supplies the scoping column.",
          "Status updates are real writes through conformityService",
          "(writes throw; the success toast fires only after the write resolves).",
          "Findings are rendered straight from the record's findings jsonb —",
          "nothing is scored or simulated client-side.",
          "?open=<id> (record id or assessment_id) deep-links straight into the",
          "detail sheet — the platform's standard record-addressing pattern."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound:",
          "Model → /models/inventory/<ai_models.id> (pill link; name resolved from",
          "the registry, \"Unavailable\" when the ref does not resolve).",
          "Framework → resolved name from frameworks.id (shown as a labelled pill).",
          "Evidence → each evidence_ids entry links to",
          "/evidence-vault?open=<id> with the evidence title as the label.",
          "Inbound:",
          "?open=<id> deep links from any module (e.g. audit-trail entity routes,",
          "reports); legacy /governance-framework redirects here.",
          "Overview quick action \"Run Assessment\" lands here.",
          "The Compliance Calendar derives deadline events from valid_until",
          "(see complianceOpsService.fetchCalendarEvents); realtime changes to this"
        ],
        "compliance": [
          "EU AI Act: Art. 43 conformity assessment; Annex IV technical",
          "documentation record; Art. 47 declaration support via certificate_url.",
          "ISO/IEC 42001: Clause 9 (performance evaluation), A.6.1.2 lifecycle",
          "gates (assessment before production).",
          "Org isolation: RLS on tenant_id/org_id, both filled by DB defaults.",
          "Known gap: conformityService writes do not yet emit logAction",
          "audit-trail entries (EU AI Act Art. 12). Needs an entry with an owner in",
          "docs/reference/technical-debt.md."
        ],
        "operations": [
          "Reads/writes go through conformityService (throw-on-failure) and",
          "useConformityData (React Query, invalidates ['conformity-assessments']",
          "on mutation). Realtime invalidation is table-level via",
          "useRealtimeInvalidation.",
          "Seeds (ca-001…ca-004) carry real ai_models.id uuids and framework ids;",
          "no business-code refs remain.",
          "Deleting an assessment is a hard delete behind a ConfirmDialog."
        ],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Controls",
        "route": "/compliance/controls",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/controls-control-testing.md",
        "title": "Controls & Control Testing",
        "purpose": "Library of implemented controls mapped to multiple frameworks, with scheduled operational-effectiveness testing, evidence collection, and exception handling.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Framework | Coverage |"
        ],
        "operations": [],
        "fields": [
          [
            "SOC 2 TSC 2017 (2022 points of focus)",
            "CC + trust service criteria"
          ],
          [
            "ISO/IEC 27001:2022 Annex A",
            "93 controls"
          ],
          [
            "ISO/IEC 42001:2023 Annex A",
            "AI management controls"
          ],
          [
            "NIST SP 800-53 Rev.5",
            "Security and privacy controls"
          ],
          [
            "CIS Controls v8",
            "Cyber hygiene"
          ],
          [
            "PCI DSS v4.0",
            "Where scoped"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Control Drift",
        "route": "/compliance/drift",
        "parentLabel": "Controls",
        "hasDoc": true,
        "docPath": "docs/modules/control-drift.md",
        "title": "Control Drift",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Gap Analysis",
        "route": "/compliance/gap-analysis",
        "parentLabel": "Controls",
        "hasDoc": true,
        "docPath": "docs/modules/gap-analysis.md",
        "title": "Gap Analysis",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Control Testing",
        "route": "/control-testing",
        "parentLabel": "Controls",
        "hasDoc": true,
        "docPath": "docs/modules/controls-control-testing.md",
        "title": "Controls & Control Testing",
        "purpose": "Library of implemented controls mapped to multiple frameworks, with scheduled operational-effectiveness testing, evidence collection, and exception handling.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Framework | Coverage |"
        ],
        "operations": [],
        "fields": [
          [
            "SOC 2 TSC 2017 (2022 points of focus)",
            "CC + trust service criteria"
          ],
          [
            "ISO/IEC 27001:2022 Annex A",
            "93 controls"
          ],
          [
            "ISO/IEC 42001:2023 Annex A",
            "AI management controls"
          ],
          [
            "NIST SP 800-53 Rev.5",
            "Security and privacy controls"
          ],
          [
            "CIS Controls v8",
            "Cyber hygiene"
          ],
          [
            "PCI DSS v4.0",
            "Where scoped"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Evidence",
        "route": "/evidence-vault",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/evidence-management.md",
        "title": "Evidence Management (Vault, Chain, Sync, Export)",
        "purpose": "End-to-end evidence management: ingestion, classification, freshness tracking, cryptographic chaining, retrieval, and export for audits and regulator requests.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.33",
            "Protection of records"
          ],
          [
            "SOC 2 CC4.1, CC4.2",
            "Monitoring, reporting deficiencies"
          ],
          [
            "eIDAS / US E-SIGN",
            "Electronic records integrity"
          ],
          [
            "ISO/IEC 27037",
            "Digital evidence handling"
          ],
          [
            "GDPR Art.5(2)",
            "Accountability"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Audit Trail",
        "route": "/audit-trail",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/audit-log-trail.md",
        "title": "Audit Log & Audit Trail",
        "purpose": "Tamper-evident system-of-record for every state change, decision, access, and export across Sentinel.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8.15",
            "Logging"
          ],
          [
            "SOC 2 CC7.2, CC7.3",
            "Monitoring activities, evaluation"
          ],
          [
            "NIST SP 800-53 AU-2, AU-6, AU-12",
            "Event logging, review, generation"
          ],
          [
            "HIPAA §164.312(b)",
            "Audit controls"
          ],
          [
            "PCI DSS 10",
            "Track and monitor access"
          ],
          [
            "EU AI Act Art.12",
            "Record-keeping / logs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Audit Management",
        "route": "/audits",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/audit-log-trail.md",
        "title": "Audit Log & Audit Trail",
        "purpose": "Tamper-evident system-of-record for every state change, decision, access, and export across Sentinel.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.8.15",
            "Logging"
          ],
          [
            "SOC 2 CC7.2, CC7.3",
            "Monitoring activities, evaluation"
          ],
          [
            "NIST SP 800-53 AU-2, AU-6, AU-12",
            "Event logging, review, generation"
          ],
          [
            "HIPAA §164.312(b)",
            "Audit controls"
          ],
          [
            "PCI DSS 10",
            "Track and monitor access"
          ],
          [
            "EU AI Act Art.12",
            "Record-keeping / logs"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Compliance Calendar",
        "route": "/calendar",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/compliance-calendar.md",
        "title": "Compliance Calendar",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Policies",
        "route": "/policies",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/policy-management.md",
        "title": "Policy Management",
        "purpose": "Author, review, approve, publish, acknowledge and retire organisational AI governance policies, with version history, an approval workflow, readership evidence per person, and interlinks to the controls, trainings, AI apps and documents that operationalise each policy.",
        "why": "A policy that only exists as a PDF proves nothing. Regulators and auditors ask three questions this module answers with data: 1. Is the policy current and approved? — versioned content with an auditable approval chain (who requested, who decided, when). 2. Do the people it governs know it? — per-person acknowledgment rows, fed manually or synced from training completions (EU AI Act Art. 4). 3. Does it actually govern anything? — inbound links from controls, trainings, AI apps and documents make \"coverage\" a queryable fact rather than a claim.",
        "how": [
          "### Lifecycle (approval-only publication)",
          "Submit (submitPolicyForApproval) creates a pending row in the shared",
          "approvals queue (entity_type='policy', requested_action='approve_policy'),",
          "bound to the active approval_workflows definition with",
          "applies_to='policy_change' (its steps[0].sla_hours sets due_at), and",
          "moves the policy to in_review. A second submission while one is pending is",
          "refused.",
          "Decision happens in Approval Workflows (oversightService.decideApproval).",
          "The final approval syncs the policy row to published (approver +",
          "approved_at/approval_date); a rejection returns it to draft. If that",
          "sync write fails the decision call throws — the two surfaces are never",
          "allowed to disagree silently."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (from a policy):",
          "Policies → Controls — policies.linked_control_ids[] → controls.id;",
          "chips on the Controls tab of /policies/:id, edited in the Policies edit",
          "dialog.",
          "Policies → Approvals — approvals.entity_type='policy',",
          "entity_id = policies.id; Approvals tab.",
          "Inbound (Linked-records tab on /policies/:id, each resolved by id with",
          "\"Unavailable\" fallback):",
          "Trainings → Policy — ai_trainings.linked_policy_id (AI Literacy).",
          "AI apps → Policy — ai_apps.linked_policy_id (AI Apps inventory).",
          "Documents → Policy — documents.linked_entity_type='policy' +",
          "linked_entity_id; document chips link to /policies/:id."
        ],
        "compliance": [
          "| Control | How this module satisfies it |",
          "Approval decisions carry a real actor (approver, per-step decisions",
          "ledger) and the decision→policy sync throws on failure, so the audit chain",
          "can never show an approval the entity does not reflect."
        ],
        "operations": [
          "Migrations: supabase/migrations/ (content jsonb conversion, org_id",
          "defaults, status normalisation approved→published,",
          "policy_acknowledgments creation + seed). Verify replay with",
          "python3 scripts/check_migration_replay.py.",
          "Duplicate submissions are rejected client-side by the pending-approval",
          "guard; clearing a stuck request happens in Approval Workflows.",
          "Restore never deletes history — it appends a new version, so the audit",
          "trail stays monotonic."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            "canonical key everywhere (never the ref)"
          ],
          [
            "policy_ref / policy_id",
            "text",
            "display/business code"
          ],
          [
            "name / title",
            "text",
            "display name (name ?? title on read)"
          ],
          [
            "description",
            "text",
            ""
          ],
          [
            "type, category, scope, audience",
            "text / text[]",
            "classification"
          ],
          [
            "status",
            "text",
            "draft \\",
            "in_review \\",
            "published \\",
            "archived"
          ],
          [
            "version",
            "text",
            "current label, e.g. 1.2 (legacy single ints exist)"
          ],
          [
            "content",
            "jsonb",
            "{summary, sections:[{heading, html?, text?, body?}]}"
          ],
          [
            "effective_date/effective_at, expiry_date, review_date, next_review_date/next_review_at, last_review, next_review",
            "date/timestamptz/text",
            "schedule"
          ],
          [
            "owner, owner_name, approver, approver_id",
            "text",
            "people"
          ],
          [
            "approved_at, approval_date",
            "timestamptz",
            "set by the approval sync"
          ],
          [
            "framework, linked_frameworks",
            "text / text[]",
            "framework tags"
          ],
          [
            "linked_control_ids",
            "text[]",
            "→ controls.id (edited via the controls multi-select)"
          ],
          [
            "acknowledgment_required",
            "boolean",
            ""
          ],
          [
            "compliance_score",
            "numeric",
            ""
          ],
          [
            "tags, metadata, remarks",
            "text[]/jsonb/text",
            ""
          ],
          [
            "is_deleted, deleted_at",
            "boolean/timestamptz",
            "soft delete"
          ],
          [
            "org_id, tenant_id",
            "uuid/text",
            "DB default current_user_org_id() — never sent by the client; RLS enforced"
          ],
          [
            "created_at, updated_at, created_by, updated_by",
            "",
            ""
          ],
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            ""
          ],
          [
            "policy_id",
            "uuid FK → policies.id (CASCADE)",
            ""
          ],
          [
            "version",
            "text",
            "label recorded at save time"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Templates",
        "route": "/compliance/policy-templates",
        "parentLabel": "Policies",
        "hasDoc": true,
        "docPath": "docs/modules/policy-management.md",
        "title": "Policy Management",
        "purpose": "Author, review, approve, publish, acknowledge and retire organisational AI governance policies, with version history, an approval workflow, readership evidence per person, and interlinks to the controls, trainings, AI apps and documents that operationalise each policy.",
        "why": "A policy that only exists as a PDF proves nothing. Regulators and auditors ask three questions this module answers with data: 1. Is the policy current and approved? — versioned content with an auditable approval chain (who requested, who decided, when). 2. Do the people it governs know it? — per-person acknowledgment rows, fed manually or synced from training completions (EU AI Act Art. 4). 3. Does it actually govern anything? — inbound links from controls, trainings, AI apps and documents make \"coverage\" a queryable fact rather than a claim.",
        "how": [
          "### Lifecycle (approval-only publication)",
          "Submit (submitPolicyForApproval) creates a pending row in the shared",
          "approvals queue (entity_type='policy', requested_action='approve_policy'),",
          "bound to the active approval_workflows definition with",
          "applies_to='policy_change' (its steps[0].sla_hours sets due_at), and",
          "moves the policy to in_review. A second submission while one is pending is",
          "refused.",
          "Decision happens in Approval Workflows (oversightService.decideApproval).",
          "The final approval syncs the policy row to published (approver +",
          "approved_at/approval_date); a rejection returns it to draft. If that",
          "sync write fails the decision call throws — the two surfaces are never",
          "allowed to disagree silently."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (from a policy):",
          "Policies → Controls — policies.linked_control_ids[] → controls.id;",
          "chips on the Controls tab of /policies/:id, edited in the Policies edit",
          "dialog.",
          "Policies → Approvals — approvals.entity_type='policy',",
          "entity_id = policies.id; Approvals tab.",
          "Inbound (Linked-records tab on /policies/:id, each resolved by id with",
          "\"Unavailable\" fallback):",
          "Trainings → Policy — ai_trainings.linked_policy_id (AI Literacy).",
          "AI apps → Policy — ai_apps.linked_policy_id (AI Apps inventory).",
          "Documents → Policy — documents.linked_entity_type='policy' +",
          "linked_entity_id; document chips link to /policies/:id."
        ],
        "compliance": [
          "| Control | How this module satisfies it |",
          "Approval decisions carry a real actor (approver, per-step decisions",
          "ledger) and the decision→policy sync throws on failure, so the audit chain",
          "can never show an approval the entity does not reflect."
        ],
        "operations": [
          "Migrations: supabase/migrations/ (content jsonb conversion, org_id",
          "defaults, status normalisation approved→published,",
          "policy_acknowledgments creation + seed). Verify replay with",
          "python3 scripts/check_migration_replay.py.",
          "Duplicate submissions are rejected client-side by the pending-approval",
          "guard; clearing a stuck request happens in Approval Workflows.",
          "Restore never deletes history — it appends a new version, so the audit",
          "trail stays monotonic."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            "canonical key everywhere (never the ref)"
          ],
          [
            "policy_ref / policy_id",
            "text",
            "display/business code"
          ],
          [
            "name / title",
            "text",
            "display name (name ?? title on read)"
          ],
          [
            "description",
            "text",
            ""
          ],
          [
            "type, category, scope, audience",
            "text / text[]",
            "classification"
          ],
          [
            "status",
            "text",
            "draft \\",
            "in_review \\",
            "published \\",
            "archived"
          ],
          [
            "version",
            "text",
            "current label, e.g. 1.2 (legacy single ints exist)"
          ],
          [
            "content",
            "jsonb",
            "{summary, sections:[{heading, html?, text?, body?}]}"
          ],
          [
            "effective_date/effective_at, expiry_date, review_date, next_review_date/next_review_at, last_review, next_review",
            "date/timestamptz/text",
            "schedule"
          ],
          [
            "owner, owner_name, approver, approver_id",
            "text",
            "people"
          ],
          [
            "approved_at, approval_date",
            "timestamptz",
            "set by the approval sync"
          ],
          [
            "framework, linked_frameworks",
            "text / text[]",
            "framework tags"
          ],
          [
            "linked_control_ids",
            "text[]",
            "→ controls.id (edited via the controls multi-select)"
          ],
          [
            "acknowledgment_required",
            "boolean",
            ""
          ],
          [
            "compliance_score",
            "numeric",
            ""
          ],
          [
            "tags, metadata, remarks",
            "text[]/jsonb/text",
            ""
          ],
          [
            "is_deleted, deleted_at",
            "boolean/timestamptz",
            "soft delete"
          ],
          [
            "org_id, tenant_id",
            "uuid/text",
            "DB default current_user_org_id() — never sent by the client; RLS enforced"
          ],
          [
            "created_at, updated_at, created_by, updated_by",
            "",
            ""
          ],
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            ""
          ],
          [
            "policy_id",
            "uuid FK → policies.id (CASCADE)",
            ""
          ],
          [
            "version",
            "text",
            "label recorded at save time"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Editor",
        "route": "/policy-editor",
        "parentLabel": "Policies",
        "hasDoc": true,
        "docPath": "docs/modules/policy-management.md",
        "title": "Policy Management",
        "purpose": "Author, review, approve, publish, acknowledge and retire organisational AI governance policies, with version history, an approval workflow, readership evidence per person, and interlinks to the controls, trainings, AI apps and documents that operationalise each policy.",
        "why": "A policy that only exists as a PDF proves nothing. Regulators and auditors ask three questions this module answers with data: 1. Is the policy current and approved? — versioned content with an auditable approval chain (who requested, who decided, when). 2. Do the people it governs know it? — per-person acknowledgment rows, fed manually or synced from training completions (EU AI Act Art. 4). 3. Does it actually govern anything? — inbound links from controls, trainings, AI apps and documents make \"coverage\" a queryable fact rather than a claim.",
        "how": [
          "### Lifecycle (approval-only publication)",
          "Submit (submitPolicyForApproval) creates a pending row in the shared",
          "approvals queue (entity_type='policy', requested_action='approve_policy'),",
          "bound to the active approval_workflows definition with",
          "applies_to='policy_change' (its steps[0].sla_hours sets due_at), and",
          "moves the policy to in_review. A second submission while one is pending is",
          "refused.",
          "Decision happens in Approval Workflows (oversightService.decideApproval).",
          "The final approval syncs the policy row to published (approver +",
          "approved_at/approval_date); a rejection returns it to draft. If that",
          "sync write fails the decision call throws — the two surfaces are never",
          "allowed to disagree silently."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (from a policy):",
          "Policies → Controls — policies.linked_control_ids[] → controls.id;",
          "chips on the Controls tab of /policies/:id, edited in the Policies edit",
          "dialog.",
          "Policies → Approvals — approvals.entity_type='policy',",
          "entity_id = policies.id; Approvals tab.",
          "Inbound (Linked-records tab on /policies/:id, each resolved by id with",
          "\"Unavailable\" fallback):",
          "Trainings → Policy — ai_trainings.linked_policy_id (AI Literacy).",
          "AI apps → Policy — ai_apps.linked_policy_id (AI Apps inventory).",
          "Documents → Policy — documents.linked_entity_type='policy' +",
          "linked_entity_id; document chips link to /policies/:id."
        ],
        "compliance": [
          "| Control | How this module satisfies it |",
          "Approval decisions carry a real actor (approver, per-step decisions",
          "ledger) and the decision→policy sync throws on failure, so the audit chain",
          "can never show an approval the entity does not reflect."
        ],
        "operations": [
          "Migrations: supabase/migrations/ (content jsonb conversion, org_id",
          "defaults, status normalisation approved→published,",
          "policy_acknowledgments creation + seed). Verify replay with",
          "python3 scripts/check_migration_replay.py.",
          "Duplicate submissions are rejected client-side by the pending-approval",
          "guard; clearing a stuck request happens in Approval Workflows.",
          "Restore never deletes history — it appends a new version, so the audit",
          "trail stays monotonic."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            "canonical key everywhere (never the ref)"
          ],
          [
            "policy_ref / policy_id",
            "text",
            "display/business code"
          ],
          [
            "name / title",
            "text",
            "display name (name ?? title on read)"
          ],
          [
            "description",
            "text",
            ""
          ],
          [
            "type, category, scope, audience",
            "text / text[]",
            "classification"
          ],
          [
            "status",
            "text",
            "draft \\",
            "in_review \\",
            "published \\",
            "archived"
          ],
          [
            "version",
            "text",
            "current label, e.g. 1.2 (legacy single ints exist)"
          ],
          [
            "content",
            "jsonb",
            "{summary, sections:[{heading, html?, text?, body?}]}"
          ],
          [
            "effective_date/effective_at, expiry_date, review_date, next_review_date/next_review_at, last_review, next_review",
            "date/timestamptz/text",
            "schedule"
          ],
          [
            "owner, owner_name, approver, approver_id",
            "text",
            "people"
          ],
          [
            "approved_at, approval_date",
            "timestamptz",
            "set by the approval sync"
          ],
          [
            "framework, linked_frameworks",
            "text / text[]",
            "framework tags"
          ],
          [
            "linked_control_ids",
            "text[]",
            "→ controls.id (edited via the controls multi-select)"
          ],
          [
            "acknowledgment_required",
            "boolean",
            ""
          ],
          [
            "compliance_score",
            "numeric",
            ""
          ],
          [
            "tags, metadata, remarks",
            "text[]/jsonb/text",
            ""
          ],
          [
            "is_deleted, deleted_at",
            "boolean/timestamptz",
            "soft delete"
          ],
          [
            "org_id, tenant_id",
            "uuid/text",
            "DB default current_user_org_id() — never sent by the client; RLS enforced"
          ],
          [
            "created_at, updated_at, created_by, updated_by",
            "",
            ""
          ],
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            ""
          ],
          [
            "policy_id",
            "uuid FK → policies.id (CASCADE)",
            ""
          ],
          [
            "version",
            "text",
            "label recorded at save time"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Documents",
        "route": "/documents",
        "parentLabel": "Policies",
        "hasDoc": true,
        "docPath": "docs/modules/evidence-management.md",
        "title": "Evidence Management (Vault, Chain, Sync, Export)",
        "purpose": "End-to-end evidence management: ingestion, classification, freshness tracking, cryptographic chaining, retrieval, and export for audits and regulator requests.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.33",
            "Protection of records"
          ],
          [
            "SOC 2 CC4.1, CC4.2",
            "Monitoring, reporting deficiencies"
          ],
          [
            "eIDAS / US E-SIGN",
            "Electronic records integrity"
          ],
          [
            "ISO/IEC 27037",
            "Digital evidence handling"
          ],
          [
            "GDPR Art.5(2)",
            "Accountability"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Reg Radar",
        "route": "/reg-radar",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/reg-radar.md",
        "title": "Reg Radar",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Reg Velocity",
        "route": "/reg-velocity",
        "parentLabel": "Reg Radar",
        "hasDoc": true,
        "docPath": "docs/modules/reg-velocity.md",
        "title": "Reg Velocity",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Regulator Filings",
        "route": "/regulator-filings",
        "parentLabel": "Reg Radar",
        "hasDoc": true,
        "docPath": "docs/modules/regulator-filings.md",
        "title": "Regulator Filing Workspace",
        "purpose": "Manage regulator-facing notifications (incidents, breaches, serious AI incidents, material operational events) with jurisdiction-specific SLA countdowns, drafting, approval, and acknowledgement tracking.",
        "why": "",
        "how": [
          "Detect (from Incident Module) → Classify jurisdiction and obligations → Auto-start SLA timer → Draft with template → Internal approval (Legal, DPO, CISO) → Submit → Track acknowledgement → Close with evidence."
        ],
        "dataProcess": [
          "Real regulator_filings table (CHECK-constrained regulation/type/status); filings link incidents via linked_incident_id → /risk/incidents?open=.",
          "filing_ref (FIL-YYYY-NNNN) is minted by a DB trigger on insert — the UI shows it read-only and the create form notes it is assigned on save.",
          "Statutory deadlines derive from dashboard/src/lib/statutoryWindows.ts (one source of truth keyed by the FILING_REGULATIONS vocabulary): picking a regulation on a new filing defaults the deadline from that window; the Incident Log Art. 73 prompt counts the same window from the incident's detected_at; the mesh's RegulatorNotify agent uses the same clocks. Staged regimes (Art. 73's 15d/10d/2d, NIS2 24h/72h, DORA 4h/24h/72h) document the chosen default stage in that file.",
          "The mesh's RegulatorNotify agent drafts filings into the same table via a strict insert (throws on failure); REGULATOR_NOTIFIED carries only the ids of rows that really persisted, and any shortfall returns a failed agent result — a statutory draft can never claim success it didn't have.",
          "Transitioning a filing to acknowledged requires the regulator-issued reference_number (enforced in the form) — the acknowledgment is evidence, not a checkbox.",
          "Art. 12 audit logging: every save/delete writes to audit_log via logAction (module regulator-filings), with dedicated submit / acknowledge actions for the legally significant transitions.",
          "The previously documented four-eyes/WORM workflow is NOT implemented — approvals go through the platform approvals backend when required.",
          "Known debt: regulator_filings.deleted_at exists but is unused (deletes are hard)."
        ],
        "interlinks": [],
        "compliance": [
          "| Obligation | SLA |"
        ],
        "operations": [],
        "fields": [
          [
            "GDPR Art. 33 personal data breach",
            "72 hours to supervisory authority"
          ],
          [
            "EU AI Act Art. 73 serious incident",
            "15 days (2 days for widespread, 10 days for fatality)"
          ],
          [
            "NIS2 Art. 23 significant incident",
            "Early warning 24h, notification 72h, final report 1 month"
          ],
          [
            "DORA Art. 19 major ICT incident",
            "Initial, intermediate, final reports per RTS"
          ],
          [
            "SEC Item 1.05 (Form 8-K)",
            "4 business days after materiality determination"
          ],
          [
            "HIPAA Breach Notification Rule",
            "60 days"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Transparency Reports",
        "route": "/transparency-reports",
        "parentLabel": "Reg Radar",
        "hasDoc": true,
        "docPath": "docs/modules/transparency-reports.md",
        "title": "Transparency Reports",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Post-Market",
        "route": "/post-market",
        "parentLabel": "Reg Radar",
        "hasDoc": true,
        "docPath": "docs/modules/post-market.md",
        "title": "Post-Market Monitoring",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "AI Literacy",
        "route": "/ai-literacy",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/ai-literacy.md",
        "title": "AI Literacy",
        "purpose": "Training programmes that build AI competence across the organisation, with enrolment, completion tracking and a link to the policy each programme teaches.",
        "why": "EU AI Act Article 4 is a direct, enforceable obligation: providers and deployers must ensure a sufficient level of AI literacy among staff dealing with AI systems. It applies from February 2025 and is not risk-tiered — it covers everyone touching AI, not just high-risk systems. Satisfying it requires evidence: who was trained, on what, when, and whether they completed. A slide deck on a shared drive is not evidence. This module provides: 1. Programme definition — audience, competency, delivery mode, duration. 2. Completion evidence — enrolment and completion per programme. (Art. 4; ISO 42001 A",
        "how": [],
        "dataProcess": [],
        "interlinks": [
          "Trainings → Policies — linked_policy_id; the programme teaches that policy.",
          "Trainings → Tasks — incomplete training generates remediation work",
          "(linked_entity_type = 'training').",
          "TrainingUpdateAgent → Trainings — on INCIDENT_CREATED, lessons learned",
          "become refresher assignments."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Completion below target is surfaced on the programme and should carry a",
          "task with a due date before the next audit window.",
          "Retention: completion records are evidence — retain for the audit period,",
          "do not hard-delete."
        ],
        "fields": [
          [
            "EU AI Act Art. 4",
            "The primary evidence artefact for the AI-literacy obligation"
          ],
          [
            "EU AI Act Art. 12",
            "Enrolment and completion records retained"
          ],
          [
            "EU AI Act Art. 14",
            "Oversight staff are demonstrably competent to intervene"
          ],
          [
            "ISO/IEC 42001 A.4.2",
            "Competence"
          ],
          [
            "ISO/IEC 42001 A.4.3",
            "Awareness"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Trust Center",
        "route": "/trust-center",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/trust-center.md",
        "title": "Trust Center",
        "purpose": "The outward-facing transparency surface: what the organisation publishes about its AI governance posture to customers, partners and regulators.",
        "why": "Transparency obligations are increasingly external. Customers performing their own third-party risk assessment ask for the same artefacts repeatedly; a published trust page turns a recurring bilateral exercise into a maintained public record. 1. Transparency — a stated, versioned account of governance posture. (Art. 13 transparency; Art. 50 transparency for certain systems) 2. Subprocessor disclosure — the AI subprocessors in the chain, disclosed. (GDPR Art. 28; ISO 42001 A.10.2) 3. Consistency — what is published derives from the same records the platform governs, so the public statement cann",
        "how": [
          "Editor + live preview, plus a read-only \"View as visitor\" mode that",
          "renders only the persisted published document (unsaved editor changes and",
          "unpublished drafts are never shown to that view).",
          "Badges come from a curated catalog (ISO/IEC 42001, EU AI Act Conformity,",
          "SOC 2, ISO 27001). A badge renders with a verification seal only when an",
          "active framework record matches the claim; otherwise the public page",
          "labels it self-declared — the page never implies attestation it lacks.",
          "Resources are either plain URLs (link/page/pdf) or bound to a real",
          "record — documents.id or a published transparency_reports.id — stored",
          "as { kind, refId } and resolved to title/link at render time",
          "(\"Unavailable\" when the record is gone).",
          "Published policies section (toggle) lists the org's published policies"
        ],
        "dataProcess": [],
        "interlinks": [
          "Trust Center → Vendors — published subprocessors resolve to vendor",
          "records (vendors.id; soft-deleted vendors — deleted_at set — are",
          "excluded from the picker).",
          "Trust Center → Frameworks — badge verification derives from active",
          "framework records rather than being typed in freehand.",
          "Trust Center → Documents / Transparency Reports — bound resources",
          "resolve from documents.id / published transparency_reports.id.",
          "Trust Center → Policies — the policies section reads published",
          "policies rows live."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Publishing is a deliberate act. Review the derived content before it goes",
          "live; the page is an external representation and carries the same weight as any",
          "other published statement."
        ],
        "fields": [
          [
            "EU AI Act Art. 13",
            "Transparency toward deployers and affected persons"
          ],
          [
            "EU AI Act Art. 50",
            "Transparency obligations for certain AI systems"
          ],
          [
            "ISO/IEC 42001 A.10.2",
            "Third-party disclosure"
          ],
          [
            "GDPR Art. 28",
            "Subprocessor transparency"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Autopilot",
        "route": "/autopilot",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/autopilot.md",
        "title": "Compliance Autopilot",
        "purpose": "",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [],
        "operations": [],
        "fields": [],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "privacy",
    "title": "PRIVACY",
    "entryCount": 5,
    "documentedCount": 5,
    "entries": [
      {
        "label": "DSR",
        "route": "/dsr",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/dsr-consent.md",
        "title": "Data Subject Requests & Consent Management",
        "purpose": "Operationalise individual rights under privacy law: intake, identity verification, fulfilment, and evidence of DSRs (access, erasure, rectification, portability, restriction, objection, Art.22 challenges); maintain lawful-basis and consent records.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "GDPR Art.12–22",
            "Data subject rights, 1-month SLA (extendable)"
          ],
          [
            "GDPR Art.7",
            "Consent conditions"
          ],
          [
            "CCPA/CPRA",
            "Consumer rights and opt-out signals (GPC)"
          ],
          [
            "LGPD Art.18",
            "Brazilian data-subject rights"
          ],
          [
            "ISO/IEC 27701 7.3 / 8.3",
            "PII principal rights; consent records"
          ],
          [
            "EU AI Act Art.22(3)",
            "Right to explanation for high-risk decisions"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Consent",
        "route": "/consent-management",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/dsr-consent.md",
        "title": "Data Subject Requests & Consent Management",
        "purpose": "Operationalise individual rights under privacy law: intake, identity verification, fulfilment, and evidence of DSRs (access, erasure, rectification, portability, restriction, objection, Art.22 challenges); maintain lawful-basis and consent records.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "GDPR Art.12–22",
            "Data subject rights, 1-month SLA (extendable)"
          ],
          [
            "GDPR Art.7",
            "Consent conditions"
          ],
          [
            "CCPA/CPRA",
            "Consumer rights and opt-out signals (GPC)"
          ],
          [
            "LGPD Art.18",
            "Brazilian data-subject rights"
          ],
          [
            "ISO/IEC 27701 7.3 / 8.3",
            "PII principal rights; consent records"
          ],
          [
            "EU AI Act Art.22(3)",
            "Right to explanation for high-risk decisions"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "DPIA",
        "route": "/dpia",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/dpia.md",
        "title": "DPIA — Data Protection Impact Assessments",
        "purpose": "The GDPR Article 35 register: assessments carried out before processing that is likely to result in a high risk to individuals, plus the Article 36 prior-consultation trigger when residual risk stays high after mitigation.",
        "why": "Article 35 is a precondition, not a report. Processing that requires a DPIA and does not have one is unlawful from the first record processed — the defect is not discovered at audit, it exists from day one. Most AI in a bank triggers it: Art. 35(3)(a) names systematic and extensive automated evaluation producing legal effects, which is exactly what a credit scoring model does. This module answers: 1. Was an assessment done before processing began? (Art. 35(1)) 2. Is the processing necessary and proportionate? — recorded as an explicit justification, not assumed. (Art. 35(7)(b)) 3. What risks w",
        "how": [
          "Each row is one assessment. The governance-bearing distinction is between",
          "inherent risk (risk_level) and residual risk (residual_risk_level,",
          "nullable, meaning \"not yet assessed\").",
          "The Art. 36 trigger is computed, not asserted: an assessment whose residual",
          "risk is high or critical with no consultation_date is flagged as",
          "\"consultation due\" in the list and counted on the header. That is the condition",
          "Art. 36(1) actually states, so the register cannot quietly disagree with the law.",
          "linked_ropa_id ties the assessment to the processing activity it covers, and",
          "linked_model_ids to the AI systems in scope — so a model record, a RoPA entry",
          "and its DPIA are one chain rather than three disconnected documents.",
          "Deletion is a soft delete: a superseded assessment is evidence of what was",
          "known and decided at the time."
        ],
        "dataProcess": [],
        "interlinks": [
          "DPIA → RoPA — linked_ropa_id; the activity this assessment covers.",
          "RoPA → DPIA — a record with dpia_required && !dpia_completed links here",
          "and is counted as \"DPIA outstanding\".",
          "DPIA → Models — linked_model_ids; pills deep-link to the model record.",
          "DPIA → AI Impact Assessments — header link; the AI Act assessment is the",
          "sibling artefact to the GDPR one."
        ],
        "compliance": [
          "| Control | How this module satisfies it |"
        ],
        "operations": [
          "Residual risk high with no consultation date is the flag that matters.",
          "Either reduce the risk or consult the supervisory authority — the register",
          "will keep showing it until one of those happens.",
          "Review cadence: set next_review_at on approval. Overdue reviews are",
          "flagged in the list.",
          "Retention: never hard-delete. A superseded DPIA evidences the decision",
          "made at the time."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Meaning"
          ],
          [
            "id / org_id",
            "uuid",
            "Canonical id; tenant defaulted DB-side"
          ],
          [
            "reference",
            "text",
            "Human reference (DPIA-2026-001)"
          ],
          [
            "title / description",
            "text",
            "What is being assessed"
          ],
          [
            "processing_purpose",
            "text",
            "Why the processing happens"
          ],
          [
            "necessity_justification",
            "text",
            "Art. 35(7)(b) necessity and proportionality"
          ],
          [
            "data_categories",
            "text[]",
            "Categories of personal data in scope"
          ],
          [
            "data_subjects",
            "text",
            "Who is affected"
          ],
          [
            "risk_level",
            "text",
            "Inherent risk: low·medium·high·critical"
          ],
          [
            "identified_risks",
            "text",
            "Art. 35(7)(c) risks to rights and freedoms"
          ],
          [
            "mitigation_measures",
            "text",
            "Art. 35(7)(d) measures addressing those risks"
          ],
          [
            "residual_risk_level",
            "text",
            "After mitigation; null = not yet assessed"
          ],
          [
            "consultation_required / consultation_date",
            "bool / date",
            "Art. 36"
          ],
          [
            "status",
            "text",
            "draft·in_progress·pending_review·approved·rejected"
          ],
          [
            "dpo_opinion / dpo_reviewed_at",
            "text / date",
            "Art. 35(2) DPO advice"
          ],
          [
            "approved_by / approved_at",
            "text / date",
            "Sign-off"
          ],
          [
            "next_review_at",
            "date",
            "Re-assessment date; overdue is flagged"
          ],
          [
            "owner_name",
            "text",
            "Accountable owner"
          ],
          [
            "linked_model_ids",
            "uuid[] → ai_models.id",
            "AI systems covered"
          ],
          [
            "linked_ropa_id",
            "uuid → ropa_records.id",
            "The processing activity assessed"
          ],
          [
            "is_deleted",
            "boolean",
            "Soft delete — assessments are evidence"
          ],
          [
            "GDPR Art. 35",
            "The register itself, with necessity, risks and mitigations recorded"
          ],
          [
            "GDPR Art. 35(2)",
            "DPO opinion and review date captured"
          ],
          [
            "GDPR Art. 36",
            "Consultation trigger computed from residual risk, not asserted"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "TIA",
        "route": "/tia",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/transfer-impact-assessment.md",
        "title": "Transfer Impact Assessment (TIA)",
        "purpose": "Assess the lawfulness and risk of cross-border personal data transfers following Schrems II and EDPB Recommendations 01/2020, producing a documented decision with mitigating measures.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "GDPR Art. 44–49",
            "Transfers to third countries"
          ],
          [
            "GDPR Art. 46",
            "Appropriate safeguards (SCC, BCR, codes of conduct)"
          ],
          [
            "GDPR Art. 49",
            "Derogations"
          ],
          [
            "EDPB Recommendations 01/2020",
            "Six-step TIA methodology"
          ],
          [
            "Schrems II (C-311/18)",
            "Essential equivalence test"
          ],
          [
            "UK IDTA / Addendum",
            "UK transfer mechanism"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "RoPA",
        "route": "/ropa",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/ropa.md",
        "title": "Records of Processing Activities (RoPA)",
        "purpose": "Maintain the GDPR Article 30 register of processing activities for controllers and processors, extended to cover AI-specific processing (training, inference, fine-tuning, evaluation) and cross-border transfers.",
        "why": "",
        "how": [
          "Draft → DPO review → Publish → Scheduled revalidation (annual or on change). State transitions are audit-logged and the published snapshot is hashed into evidence_chain."
        ],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "GDPR Art. 30(1)/(2)",
            "Controller and processor RoPA content"
          ],
          [
            "GDPR Art. 35",
            "DPIA linkage for high-risk processing"
          ],
          [
            "UK GDPR / Swiss FADP",
            "Equivalent RoPA obligations"
          ],
          [
            "EU AI Act Art.10",
            "Data governance for training/validation/test sets"
          ],
          [
            "ISO/IEC 27701 6.15",
            "Records of PII processing"
          ]
        ],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "vendors-supply-chain",
    "title": "VENDORS & SUPPLY CHAIN",
    "entryCount": 13,
    "documentedCount": 13,
    "entries": [
      {
        "label": "Vendor Registry",
        "route": "/vendors",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/vendor-registry.md",
        "title": "Vendor Registry",
        "purpose": "The governed inventory of third parties — model providers, cloud and hosting platforms, data processors and sub-processors — and the single record each vendor assessment, SLA, questionnaire, document and attestation hangs off.",
        "why": "Third-party risk is the largest uncontrolled surface in most AI estates: the organisation is accountable under EU AI Act Art. 25 and GDPR Art. 28 for what its suppliers do with its data and models, and can only demonstrate that with a record per vendor carrying inherent vs residual risk, the state of the DPA, the certification expiries and the exit plan. Before the 2026-08-16 rebuild this module was structurally incapable of that. vendors.org_id was NOT NULL with no DB default, so every client insert died on 23502; five columns the service wrote (criticality, score, dpa_status, services, ai_us",
        "how": [
          "The list reads vendors through vendorService.fetchAllVendors; rows carry",
          "criticality, inherent/residual risk, DPA state and reassessment due date.",
          "Reads and writes throw on failure; success toasts fire only after the",
          "write resolves.",
          "org_id is filled by the DB default current_user_org_id(). The client never",
          "sends a scoping column.",
          "Row click and the view action navigate to /vendors/<vendors.id> — the uuid,",
          "never a business code. VendorDetail loads that uuid from the table.",
          "Concentration comes from vendorService.fetchVendorConcentration, computed",
          "over real annual_spend and vendor counts. The previous hardcoded",
          "\"OpenAI 45% / Anthropic 30%\" chart and its threshold warning are gone.",
          "Risk tier: risk_tier is the legacy integer column (1/2/3). The service"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid, display name resolved at render time):",
          "Vendor detail → /vendors/<vendors.id>.",
          "Assessments → /vendors/assessments?vendor=<vendors.id> (and",
          "&open=<vendor_assessments.id> for a specific record).",
          "SLAs → /vendors/sla?vendor=<vendors.id> (&open=<vendor_slas.id>).",
          "Documents → /vendor-upload?vendor=<vendors.id> (&open=<vendor_documents.id>).",
          "Questionnaire → /vendors/<vendors.id>/questionnaire.",
          "Models → linked_models entries resolve to /models/inventory/<uuid>.",
          "Backlink panels (Linked tab) → /aibom?vendor=<id> and",
          "/supply-chain?vendor=<id> (both pages filter by vendor with a dismissible",
          "chip), plus per-record deep links /aibom?open=<id>,",
          "/supply-chain?open=<id>, /risks?open=<id>, /risk/incidents?open=<id>"
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Org isolation: RLS on org_id, filled by the DB default. Demo vendors belong to",
          "the fictional \"Acme Financial Services\" tenant; owners and managers are role",
          "labels (\"Head of AI Platform\", \"Procurement Lead\"), never named individuals."
        ],
        "operations": [
          "Service: vendorService.ts (fetchAllVendors, fetchVendorById,",
          "fetchVendorOptions, fetchVendorConcentration, createVendor,",
          "updateVendor, upsertVendor, deleteVendor) — all throw on error.",
          "Hook: useVendorsData.ts, invalidating ['vendors'], ['vendor-options']",
          "and ['vendor-concentration'] on mutation.",
          "Migration: supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql",
          "(scoping default + the TPRM field model);",
          "20260822000003_seed_tprm_supply_esg.sql (demo enrichment)."
        ],
        "fields": [
          [
            "EU AI Act Art. 25",
            "Responsibilities along the value chain — inherent/residual risk, sub-processor count, fourth-party exposure, exit plan"
          ],
          [
            "EU AI Act Art. 12",
            "Vendor create/update/delete audit-logged via logAction"
          ],
          [
            "ISO/IEC 42001 A.10.2",
            "Third parties and suppliers"
          ],
          [
            "GDPR Art. 28",
            "DPA status with execution and expiry dates; transfer mechanism"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Assessments",
        "route": "/vendors/assessments",
        "parentLabel": "Vendor Registry",
        "hasDoc": true,
        "docPath": "docs/modules/vendor-assessments.md",
        "title": "Vendor Assessments",
        "purpose": "The due-diligence record for a third party: what was assessed, against which framework, what was found, who approved it and on what evidence.",
        "why": "A vendor tier without an assessment behind it is an opinion. This module holds the assessment as a governed record so the tier, the residual risk and the approval can each be traced to a decision with an actor and a date. Before the rebuild the page sat on vendorassessments_table, a generic (id, doc jsonb) demo table whose RLS predicate was true for authenticated — any user in any org could read and write every other tenant's vendor assessments. Writes were fire-and-forget with toasts driven by local state, the mock array was auto-persisted into Postgres on first load, and one click walked a r",
        "how": [
          "Reads and writes go through vendorAssessmentService against the real",
          "org-scoped table; org_id is filled by the DB default",
          "current_user_org_id().",
          "Status vocabulary: draft → in_progress → submitted → under_review →",
          "approved / approved_with_conditions / rejected. A decision is made",
          "through decideVendorAssessment, which records approver, approved_by",
          "(the authenticated user), approved_at and — for",
          "approved_with_conditions — the required conditions text.",
          "evidence_ids holds real evidence.id uuids, rendered as resolved evidence",
          "titles linking to the Evidence Vault; unresolvable ids show \"Unavailable\".",
          "Findings are four explicit counts (critical/high/medium/low). A never-scored",
          "assessment has score = NULL and renders —, not 0."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound:",
          "Vendor → /vendors/<vendor_id> (pill link, name resolved; \"Unavailable\"",
          "when the id does not resolve).",
          "Questionnaire → questionnaire_id opens",
          "/vendors/<vendor_id>/questionnaire?open=<questionnaire_id>.",
          "Evidence → each evidence_ids entry links to /evidence-vault?open=<id>",
          "with the evidence title as the label.",
          "Inbound:",
          "?vendor=<vendors.id> from Vendor Registry and",
          "Vendor Detail with a dismissible chip.",
          "?open=<vendor_assessments.id> from the vendor detail assessments tab and",
          "from TPRM Workspace."
        ],
        "compliance": [
          "Mapped in ../compliance/iso-42001-mapping.md",
          "and ../compliance/eu-ai-act-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Org isolation: RLS policy vendor_assessments_org_all on org_id, filled by",
          "the DB default. Seeded assessments are fictional; owner and approver are",
          "role labels (\"Third-Party Risk Analyst\", \"Head of Compliance\")."
        ],
        "operations": [
          "Service: vendorAssessmentService.ts — fetchVendorAssessments,",
          "fetchVendorAssessmentById, createVendorAssessment,",
          "updateVendorAssessment, decideVendorAssessment, deleteVendorAssessment.",
          "All throw on error.",
          "Hook: useVendorAssessments.ts, invalidating ['vendor-assessments'].",
          "Migration: supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql",
          "creates the table and replaces vendorassessments_table."
        ],
        "fields": [
          [
            "ISO/IEC 42001 A.5.2",
            "AI risk assessment — third-party contribution, with approver distinct from owner and real evidence_ids"
          ],
          [
            "ISO/IEC 42001 A.10.2",
            "Third parties and suppliers"
          ],
          [
            "EU AI Act Art. 25",
            "Value-chain responsibilities evidenced per vendor"
          ],
          [
            "EU AI Act Art. 12",
            "Assessment lifecycle audit-logged via logAction"
          ],
          [
            "EU AI Act Art. 14",
            "Approval is a human decision with a recorded actor (approved_by)"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "SLA",
        "route": "/vendors/sla",
        "parentLabel": "Vendor Registry",
        "hasDoc": true,
        "docPath": "docs/modules/vendor-sla.md",
        "title": "Vendor SLA",
        "purpose": "Service-level commitments for each vendor, expressed as numeric thresholds with a unit and a direction, so breach can be evaluated rather than asserted.",
        "why": "Supplier performance is a post-market monitoring obligation (EU AI Act Art. 72) and an ISO/IEC 42001 A.10.4 control. Neither is satisfiable if the target is a free-text string. Before the rebuild the page sat on vendorsla_table, an anon-open (id, doc jsonb) demo table, and stored targets as prose (`'P1: 1h / P2: 4h / P3: 24h') alongside a hand-authored status` literal. A record could — and did — report healthy while its own current value breached its own target. New SLAs were created with status: 'healthy' and lastMeasuredAt stamped to today, so an SLA that had never been measured counted towa",
        "how": [
          "Status is derived, never stored. The page reads",
          "public.vendor_sla_status, a view over vendor_slas that computes",
          "derived_status:",
          "| derived_status | Condition |",
          "An SLA that has never been measured reports unmeasured and renders —. It",
          "is never reported as healthy.",
          "higher_is_better carries the direction, so uptime (higher is better) and",
          "latency (lower is better) are both evaluated correctly against the same",
          "columns.",
          "recordSlaMeasurement is the only path that sets current_value and",
          "last_measured_at; creating an SLA leaves both NULL.",
          "Writes go to the base table (vendor_slas); derived_status is a view"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound:",
          "Vendor → /vendors/<vendor_id> (pill link; \"Unavailable\" when the id does",
          "not resolve).",
          "Incidents → each linked_incident_ids entry links to",
          "/incidents?open=<id>, so a supplier-caused incident is reachable from the",
          "SLA it breached.",
          "Inbound:",
          "?vendor=<vendors.id> from Vendor Registry and vendor",
          "detail, with a dismissible chip.",
          "?open=<vendor_slas.id> from the vendor detail SLA tab and from",
          "TPRM Workspace.",
          "vendorCascadeAgent writes vendors.sla_breach_flag and"
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Org isolation: RLS policy vendor_slas_org_all on org_id, filled by the DB",
          "default; GRANT SELECT on the view only. Demo SLA VSLA-003 is deliberately",
          "seeded with current_value = NULL so the unmeasured path is exercised."
        ],
        "operations": [
          "Service: vendorSlaService.ts — fetchVendorSlas and fetchVendorSlaById",
          "read the view; createVendorSla, updateVendorSla,",
          "recordSlaMeasurement and deleteVendorSla write the base table. All",
          "throw on error.",
          "Hook: useVendorSlas.ts, invalidating ['vendor-slas'].",
          "Migration: supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql",
          "creates vendor_slas and vendor_sla_status and replaces vendorsla_table."
        ],
        "fields": [
          [
            "unmeasured",
            "current_value IS NULL or target_value IS NULL"
          ],
          [
            "breached",
            "past breach_value (falling back to target_value) in the direction set by higher_is_better"
          ],
          [
            "at_risk",
            "past target_value but not yet past breach_value"
          ],
          [
            "healthy",
            "otherwise"
          ],
          [
            "EU AI Act Art. 72",
            "Post-market monitoring of supplier performance; status derived from measurement, unmeasured never reported as healthy"
          ],
          [
            "EU AI Act Art. 73",
            "Serious-incident linkage via linked_incident_ids → incidents.id"
          ],
          [
            "EU AI Act Art. 12",
            "SLA lifecycle and measurements audit-logged via logAction"
          ],
          [
            "ISO/IEC 42001 A.10.3",
            "Supplier agreements — contract clause reference, service credits, claim status"
          ],
          [
            "ISO/IEC 42001 A.10.4",
            "Supplier performance monitoring — consecutive_breaches, last_breach_at"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "TPRM Workspace",
        "route": "/vendors/tprm",
        "parentLabel": "Vendor Registry",
        "hasDoc": true,
        "docPath": "docs/modules/tprm-workspace.md",
        "title": "TPRM Workspace",
        "purpose": "The programme-level view of third-party risk: portfolio concentration, tiering, reassessments falling due, open assessment findings, document gaps and SLA breaches — in one place, over the same records the individual modules govern.",
        "why": "A third-party programme is judged on coverage, not on individual records: how much of the estate is unassessed, how many reassessments are overdue, where spend is concentrated. Those questions cross four tables, so they need a view that joins them. Before the rebuild this page made zero backend calls — it imported the seed arrays directly. All six executive KPIs and all three red alert cards were counts over mock data, the reassessment calendar ran on fields that had no persisted home, and its four navigations went to /vendors/<seed-code>, every one a dead end.",
        "how": [
          "Every figure is a count or aggregate over rows fetched from the real",
          "org-scoped tables through the module hooks. Nothing on this page is a literal.",
          "Concentration comes from vendorService.fetchVendorConcentration over",
          "real annual_spend, not the previous hardcoded 45/30/25 split.",
          "Reassessments due derive from vendors.reassessment_due_at against the",
          "current date; document gaps from vendor_documents.expires_at and",
          "missing doc_type coverage; SLA breaches from derived_status in",
          "vendor_sla_status — the workspace never re-implements the derivation, it",
          "reads the view.",
          "A missing value is —, not 0, and an unknown criticality is shown as",
          "unknown rather than silently downgraded to moderate.",
          "Loading renders skeletons per panel; a failed source renders a real error for"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid):",
          "Vendor → /vendors/<vendors.id> from every portfolio and alert row.",
          "Assessment → /vendors/assessments?open=<vendor_assessments.id>.",
          "SLA → /vendors/sla?open=<vendor_slas.id>.",
          "Documents → /vendor-upload?vendor=<vendors.id>.",
          "Questionnaire → /vendors/<vendors.id>/questionnaire.",
          "Inbound:",
          "Reached from the Vendors area navigation and from",
          "Vendor Registry.",
          "Because it deep-links with ?vendor= / ?open=, every module it aggregates",
          "is reachable from it and links back to the vendor record, closing the loop."
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "The workspace is read-only: it changes no state, so it emits no logAction",
          "entries of its own — the modules it links into do. Org isolation is inherited",
          "from the RLS on each source table."
        ],
        "operations": [
          "No service of its own. Every read goes through the module hooks listed above,",
          "so a fix to a derivation lands here automatically.",
          "Because it holds no table, there is no migration for this module; its inputs",
          "are created by",
          "supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql."
        ],
        "fields": [
          [
            "Source table",
            "Used for",
            "Module doc"
          ],
          [
            "vendors",
            "Portfolio, criticality tiering, concentration, reassessment calendar, exit-plan readiness",
            "Vendor Registry"
          ],
          [
            "vendor_assessments",
            "Open findings, assessments in flight, overdue reviews",
            "Vendor Assessments"
          ],
          [
            "vendor_slas (via vendor_sla_status)",
            "Breach and at-risk counts, unmeasured coverage gap",
            "Vendor SLA"
          ],
          [
            "vendor_documents",
            "Document gaps and expiring evidence",
            "Vendor Upload"
          ],
          [
            "vendor_questionnaires",
            "Questionnaire coverage and outstanding responses",
            "Vendor Questionnaire"
          ],
          [
            "EU AI Act Art. 27",
            "Fundamental-rights impact of third-party dependencies — criticality tiering and reassessment cadence over real vendor records"
          ],
          [
            "EU AI Act Art. 25",
            "Programme-level view of value-chain responsibilities"
          ],
          [
            "ISO/IEC 42001 A.10.2",
            "Third parties and suppliers — coverage and gaps"
          ],
          [
            "ISO/IEC 42001 A.10.4",
            "Supplier performance monitoring, read from the derived SLA view"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Vendor Upload",
        "route": "/vendor-upload",
        "parentLabel": "Vendor Registry",
        "hasDoc": true,
        "docPath": "docs/modules/vendor-upload.md",
        "title": "Vendor Upload (Vendor Documents)",
        "purpose": "The evidence locker for third parties: SOC 2 reports, ISO certificates, DPAs, pen-test summaries and insurance certificates, each with an integrity digest, a version chain, an expiry and a recorded review decision.",
        "why": "Vendor assurance is only as good as the artefact behind it. A \"SOC 2: accepted\" badge with no file, no reviewer and no expiry is a claim, not evidence. Before the rebuild this page uploaded nothing. The toast was the feature — no storage call, no table write — while the UI promised the document would be \"reviewed within 5 business days\". Accept and reject both stamped a hardcoded reviewer name, the \"Expiring < 90 days\" tile was the literal 2 while the real expiry dates sat unread in the same array, and the demo data used real-looking corporate contact addresses with fabricated verdicts.",
        "how": [
          "uploadVendorDocument uploads the file to Supabase Storage, computes a",
          "SHA-256 digest of the stored object into file_digest, and writes the row —",
          "in that order. If any step fails the write throws and the UI shows a real",
          "error; there is no success toast on a failed upload.",
          "Download uses a signed URL from getVendorDocumentUrl(storage_path). A row",
          "with no storage_path offers no download rather than a dead link.",
          "Review is recorded, not asserted. reviewVendorDocument writes",
          "status (accepted / rejected), reviewed_by (the authenticated",
          "reviewer's uuid, resolved to a display name at render time), reviewed_at",
          "and review_notes. No reviewer name is hardcoded anywhere.",
          "Versioning: a replacement carries version and supersedes_id, so the",
          "chain of accepted evidence is traceable rather than overwritten."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound:",
          "Vendor → /vendors/<vendor_id> (pill link; \"Unavailable\" when",
          "unresolvable).",
          "Assessment → assessment_id links to",
          "/vendors/assessments?open=<assessment_id>.",
          "Controls → each satisfies_control_ids entry links to the control it",
          "evidences, so the document is part of the control's evidence chain.",
          "Inbound:",
          "?vendor=<vendors.id> from Vendor Registry and the",
          "vendor detail Documents tab, with a dismissible chip — the two views of the",
          "same artefact are now one record set rather than two unconnected screens.",
          "?open=<vendor_documents.id> from the vendor detail documents list."
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "file_digest is computed over the stored object by the upload path — it is an",
          "integrity value for the file, not an attestation about its contents, and the UI",
          "does not present it as verification of the vendor's claims. Org isolation: RLS",
          "policy vendor_documents_org_all on org_id, filled by the DB default. Seeded",
          "documents deliberately leave storage_path and file_digest NULL because no",
          "file was ever uploaded for them; inventing a digest is exactly the defect this",
          "rollout removed."
        ],
        "operations": [
          "Service: vendorDocumentService.ts — fetchVendorDocuments,",
          "fetchVendorDocumentById, getVendorDocumentUrl, uploadVendorDocument,",
          "reviewVendorDocument, updateVendorDocument, deleteVendorDocument,",
          "documentsExpiringWithin. All writes throw on error.",
          "Hook: useVendorDocuments.ts, invalidating ['vendor-documents'].",
          "Migration: supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql",
          "creates the table."
        ],
        "fields": [
          [
            "EU AI Act Art. 25",
            "Value-chain evidence held as artefacts, not claims"
          ],
          [
            "EU AI Act Art. 12",
            "Upload and review audit-logged with a real actor via logAction"
          ],
          [
            "EU AI Act Art. 14",
            "Accept/reject is a human decision recorded in reviewed_by"
          ],
          [
            "ISO/IEC 42001 A.10.2",
            "Third-party assurance evidence with expiry and retention"
          ],
          [
            "GDPR Art. 28",
            "DPAs held as versioned, dated artefacts"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Supply Chain",
        "route": "/supply-chain",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/supply-chain-attestations.md",
        "title": "Supply Chain Attestations",
        "purpose": "The register of attestations made about a governed subject — bias audits, model integrity statements, vendor security reviews — with the attestor's identity, the validity window, the revocation state and the evidence behind each one.",
        "why": "This is the evidence register that bias audits, DPIAs and vendor reliance decisions point at. If an attestation cannot be found from the model it describes, or reports itself valid after it has expired, the modules that cite it inherit that defect. Before the rebuild the page used supplychainattestations_table, an anon-writable (id, doc jsonb) demo table, while the real org-scoped table sat unread. Under a heading reading Cryptographic Verification, \"Signature Valid\" was implemented as sigHash !== 'PENDING' && sigHash !== 'sha256:STALE' over a free-text input. \"Within Validity Period: PASS\" wa",
        "how": [
          "Validity is derived, never stored. The page reads",
          "public.supply_chain_attestation_status, a view over the table that computes",
          "derived_validity from revoked_at and valid_until:",
          "| derived_validity | Condition |",
          "Writes go to the base table; derived_validity is a view expression and is",
          "never written.",
          "Declared is not verified. declared_digest holds whatever the producer",
          "supplied and is evidence of nothing. verification_status, verified_at,",
          "verified_by and verification_method are written only by a verifier. **No",
          "verification is performed yet**, so every record reads unverified — see",
          "TD-011. The signature (DSSE),",
          "signer_identity and rekor_log_index columns exist so real signing has"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid; \"Unavailable\" when an id does not resolve):",
          "Model → /models/inventory/<model_id>.",
          "Vendor → /vendors/<vendor_id>.",
          "AIBOM → /aibom?model=<model_id>.",
          "Provenance → /provenance?model=<model_id>.",
          "Supply chain graph → /supply-chain/graph?model=<model_id>.",
          "Evidence → each evidence_ids entry links to /evidence-vault?open=<id>",
          "with the evidence title as the label — the previous unlinked filename strings",
          "are gone.",
          "Controls → each framework_control_ids entry links to the control it",
          "supports.",
          "Renewal task → renewal_task_id links to /tasks?open=<id>."
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Not implemented: signature verification. Every record reads unverified,",
          "and no view claims otherwise. Tracked as TD-011 in",
          "../reference/technical-debt.md.",
          "Org isolation: the table's RLS is org-scoped and org_id is filled by the DB",
          "default; GRANT SELECT on the status view only. Demo attestations are",
          "fictional; attestors are role labels (\"Independent Assurance Partner\",",
          "\"Third-Party Risk Analyst\"), never named individuals. ATT-002 is deliberately",
          "seeded past its valid_until so the expired path is exercised."
        ],
        "operations": [
          "Service: attestationService.ts — fetchAttestations and fetchAttestation",
          "read the view; createAttestation, updateAttestation,",
          "revokeAttestation, renewAttestation, deleteAttestation write the",
          "base table. All throw on error.",
          "Hook: useAttestationsData.ts, invalidating the attestation query key on",
          "mutation and providing the evidence and control option lists.",
          "Migration:",
          "supabase/migrations/20260822000002_supply_chain_esg_canonical.sql extends"
        ],
        "fields": [
          [
            "revoked",
            "revoked_at IS NOT NULL"
          ],
          [
            "unknown",
            "valid_until IS NULL"
          ],
          [
            "expired",
            "valid_until < CURRENT_DATE"
          ],
          [
            "expiring_soon",
            "valid_until < CURRENT_DATE + 30"
          ],
          [
            "valid",
            "otherwise"
          ],
          [
            "EU AI Act Art. 25",
            "Value-chain attestations resolving to a subject_id on the one id-space"
          ],
          [
            "EU AI Act Art. 12",
            "Create, update, revoke, renew and delete audit-logged via logAction"
          ],
          [
            "ISO/IEC 42001 A.6.2.4",
            "AI system verification and validation — attestor identity, independence, accreditation, revocation and supersession. Partial: the attestation is recorded; cryptographic verification is not performed (TD-011)"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "AIBOM",
        "route": "/aibom",
        "parentLabel": "Supply Chain",
        "hasDoc": true,
        "docPath": "docs/modules/aibom.md",
        "title": "AI Bill of Materials (AIBOM)",
        "purpose": "The component manifest for each governed model: the libraries, frameworks, datasets and services it is built from, their licences, the known vulnerabilities against them, and the provenance of the model weights themselves.",
        "why": "EU AI Act Art. 13 and Annex IV require a provider to describe what a system is made of; Art. 15 requires known weaknesses to be identified. Neither is possible without a component inventory keyed to the model. Before the 2026-08-16 rebuild this module asserted assurance nothing performed. The record's \"SHA-256\" was generated with Math.random() and then consumed as an integrity PASS. \"Known CVEs\" was a tally of the value a user picked in a dropdown, displayed beside the caption *Scanner: Sentinel CVE Scanner + OSV.dev* — no scan had ever run. The attestation signer was the hardcoded string 'Jam",
        "how": [
          "Records, components and CVEs are three tables. A vulnerability is a row",
          "with a CVE id, CVSS score, affected range, fixed version, source feed and",
          "scanned_at — not a count derived from a dropdown.",
          "Never scanned is not zero. openCveCount returns null when",
          "last_scanned_at IS NULL, and the UI renders —. A record that has never",
          "been scanned is never presented as \"0 CVEs\".",
          "Declared is not verified. declared_digest holds whatever the producer",
          "asserted and is evidence of nothing. verification_status, verified_at,",
          "verified_by and verification_method are written only by a verifier.",
          "No verification is performed yet, so every record reads unverified — see",
          "TD-011. The signing columns (signature",
          "DSSE envelope, signer_identity, rekor_log_index, signed_by,"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid, names resolved through useSupplyChainEntities):",
          "Model → /models/inventory/<model_id>; \"Unavailable\" when the id does not",
          "resolve.",
          "Fine-tune parent → /models/inventory/<fine_tune_parent_id>.",
          "Vendor → /vendors/<vendor_id> (record- and component-level).",
          "Provenance → /provenance?model=<model_id>.",
          "Attestations → /supply-chain?model=<model_id>.",
          "Supply chain graph → /supply-chain/graph?model=<model_id>.",
          "Annex IV document → annex_iv_doc_id → documents.id.",
          "Inbound:",
          "?model=<ai_models.id> with a dismissible chip, from",
          "Attestations,"
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Not implemented: cryptographic verification. verification_status is",
          "unverified for every record, and the UI must never present an unverified",
          "record as verified. Tracked as TD-011 in",
          "../reference/technical-debt.md.",
          "Org isolation: RLS policies aibom_records_org_all, aibom_components_org_all",
          "and aibom_vulnerabilities_org_all on org_id, filled by the DB default. Demo",
          "records belong to the fictional demo tenant; AIBOM-002 is deliberately seeded",
          "with last_scanned_at NULL so the never-scanned path is exercised."
        ],
        "operations": [
          "Service: aibomService.ts — fetchAibomRecords, fetchAibomRecord,",
          "fetchAibomComponents, fetchAibomVulnerabilities, createAibomRecord,",
          "updateAibomRecord, deleteAibomRecord, createAibomComponent,",
          "deleteAibomComponent, publishAibomRecord, buildAibomExport,",
          "openCveCount. All writes throw on error.",
          "Hook: useAibomData.ts, invalidating the record, component and vulnerability",
          "query keys together on mutation.",
          "Migration:"
        ],
        "fields": [
          [
            "EU AI Act Art. 13 + Annex IV",
            "Provider information about the system — components, licences, model-card and Annex IV document reference"
          ],
          [
            "EU AI Act Art. 15",
            "Known weaknesses recorded as CVE rows with source and scan date"
          ],
          [
            "EU AI Act Art. 12",
            "Record and component lifecycle audit-logged via logAction"
          ],
          [
            "ISO/IEC 42001 A.7.3",
            "Acquisition of AI components — PURL/CPE, SPDX licence id, licence-risk class"
          ],
          [
            "CycloneDX 1.5 / SPDX",
            "Machine-readable export; non-CycloneDX formats are exported as a labelled envelope, not a pretend SPDX document"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Provenance",
        "route": "/provenance",
        "parentLabel": "Supply Chain",
        "hasDoc": true,
        "docPath": "docs/modules/provenance.md",
        "title": "Provenance Graph",
        "purpose": "A typed, directed graph of where a model came from: the datasets it was trained on, the components it was built from, the pipelines that fed it, and the cross-border transfers along the way.",
        "why": "EU AI Act Art. 10 requires data governance over training and operational data, and incident forensics requires a specific question to be answerable: *what fed this model on the date of the incident?* That needs typed edges with temporal validity, not a picture. Before the rebuild the page had no backend at all — two in-file literals keyed by the business code 'MDL-001', which collided with a different MDL-001 in the Supply Chain Graph. The renderer discarded the declared children edges and drew a flat root-plus-children list, so a depth-3 lineage was unrenderable and the drawing misrepresented",
        "how": [
          "Nodes and edges are real rows. Edges are typed (derived_from, trained_on,",
          "built_by, deployed_as, feeds, uses, produces) and carry",
          "valid_from / valid_to, so the graph can be read as of a date.",
          "provenanceService builds the adjacency from the edge rows",
          "(buildAdjacency), finds roots (rootNodeIds), walks both directions",
          "(descendantIds, ancestorIds) and computes ranks (computeRanks) for",
          "layout. The renderer follows the real edges — arbitrary depth, no flattening.",
          "A CHECK constraint (provenance_edges_no_self_loop) prevents an edge from",
          "pointing at its own source.",
          "Cross-border facts are recorded, not concluded. source_jurisdiction,",
          "target_jurisdiction, transfer_mechanism, legal_basis, pii_categories",
          "and retention_period live on the edge. isCrossBorder and"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid):",
          "Model → /models/inventory/<model_id> for any node carrying one.",
          "Vendor → /vendors/<vendor_id>.",
          "AIBOM → /aibom?model=<model_id>.",
          "Attestations → /supply-chain?model=<model_id>.",
          "Supply chain graph → /supply-chain/graph?model=<model_id>.",
          "Inbound:",
          "?model=<ai_models.id> with a dismissible chip, from",
          "AIBOM, Attestations and the",
          "Supply Chain Graph.",
          "?open=<provenance_nodes.id> selects a node directly.",
          "The Supply Chain Graph derives its edges from"
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Not implemented: attestation/signature verification. Every node reads",
          "unverified; see TD-011 in",
          "../reference/technical-debt.md. The page",
          "does not render a \"Provenance Verified\" badge.",
          "Org isolation: RLS policies provenance_nodes_org_all and",
          "provenance_edges_org_all on org_id, filled by the DB default. The demo graph",
          "is depth 3 by design so the recursive edge-following is genuinely exercised."
        ],
        "operations": [
          "Service: provenanceService.ts — fetchProvenanceNodes,",
          "fetchProvenanceEdges, createProvenanceNode, updateProvenanceNode,",
          "deleteProvenanceNode, createProvenanceEdge, deleteProvenanceEdge, plus",
          "the graph helpers buildAdjacency, rootNodeIds, descendantIds,",
          "ancestorIds, computeRanks, isCrossBorder, transferMechanismLabel.",
          "All writes throw on error.",
          "Hook: useProvenanceData.ts, invalidating the node and edge query keys",
          "together."
        ],
        "fields": [
          [
            "EU AI Act Art. 10",
            "Data governance — typed trained_on / derived_from edges with temporal validity"
          ],
          [
            "EU AI Act Art. 12",
            "Node and edge lifecycle audit-logged via logAction"
          ],
          [
            "EU AI Act Art. 13",
            "Traceability of the components and data behind a system"
          ],
          [
            "ISO/IEC 42001 A.7.2",
            "Data for AI systems — provenance with artifact digests, build/source refs and SLSA level fields"
          ],
          [
            "GDPR Chapter V",
            "Transfer facts (source_jurisdiction, target_jurisdiction, transfer_mechanism, legal_basis) recorded on the edge"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Graph",
        "route": "/supply-chain/graph",
        "parentLabel": "Supply Chain",
        "hasDoc": true,
        "docPath": "docs/modules/supply-chain-graph.md",
        "title": "AI Supply Chain Graph",
        "purpose": "The interactive canvas over the AI supply chain: data sources, datasets, models, pipelines, vendors and use cases as one connected picture, with downstream blast-radius analysis for incident response.",
        "why": "When a dataset is withdrawn or a vendor suffers a breach, the first question is what does this touch? That is a graph traversal over the same entities the platform already governs — it should not be a separate drawing. Before the rebuild the canvas was frozen NODES/EDGES literals with no backend. The headline \"Supply Chain Risk Score /100\" was mean(riskLevel label) × 25, which could neither fall below 25 nor reach 100. Throughput figures ('890K/day', '50K decisions/mo') were invented, both export buttons only fired toasts, \"SCCs required\" came from a hardcoded boolean with no jurisdiction inpu",
        "how": [
          "Nodes are built from provenance_nodes joined to the canonical registers",
          "through useSupplyChainEntities, which resolves ai_models.id,",
          "vendors.id, dataset ids and use_cases.id to display names. Inventory",
          "entities that have no lineage recorded yet are shown honestly behind a",
          "toggle, rather than omitted or invented.",
          "Edges come from provenance_edges — the same rows the",
          "Provenance Graph renders, so the two views cannot disagree.",
          "Layout is computed from the graph's longest-path ranks. There are no",
          "hardcoded coordinates.",
          "Risk is read, not synthesised. Each node shows the classification its own",
          "register records; a node whose register records none says so. There is no",
          "composite \"/100\" score."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid; unresolvable ids render \"Unavailable\", never a raw uuid):",
          "Model → /models/inventory/<ai_models.id>.",
          "Vendor → /vendors/<vendors.id>.",
          "AIBOM → /aibom?model=<ai_models.id>.",
          "Attestations → /supply-chain?model=<ai_models.id>.",
          "Provenance → /provenance?model=<ai_models.id>.",
          "Inbound:",
          "?model=<ai_models.id> with a dismissible chip, from",
          "AIBOM, Attestations and",
          "Provenance.",
          "Reached from the AI Supply Chain area navigation. Note the sibling route:",
          "/supply-chain is the"
        ],
        "compliance": [
          "Mapped in ../compliance/eu-ai-act-mapping.md",
          "and ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\", through the",
          "provenance rows it renders.",
          "| Control | How this module satisfies it |",
          "Org isolation is inherited from the RLS on provenance_nodes,",
          "provenance_edges and the registers it joins to."
        ],
        "operations": [
          "No service of its own; reads go through useProvenanceGraph and",
          "useSupplyChainEntities, so any fix to provenance or name resolution lands",
          "here automatically.",
          "Loading renders a skeleton, failure a real error state, an org with no lineage",
          "an honest empty state.",
          "Migration: its inputs are created by",
          "supabase/migrations/20260822000002_supply_chain_esg_canonical.sql."
        ],
        "fields": [
          [
            "Source",
            "Used for",
            "Module doc"
          ],
          [
            "provenance_nodes",
            "Node set, node type, verification state, artifact refs",
            "Provenance"
          ],
          [
            "provenance_edges",
            "Edges, edge type, jurisdictions, transfer mechanism, temporal validity",
            "Provenance"
          ],
          [
            "ai_models",
            "Model node names and classification (ai_models.id)",
            "Model Inventory"
          ],
          [
            "vendors",
            "Vendor node names and criticality (vendors.id)",
            "Vendor Registry"
          ],
          [
            "Dataset catalog",
            "Dataset node names",
            "Data Governance"
          ],
          [
            "use_cases",
            "Use-case node names (use_cases.id)",
            "Knowledge Graph & Use Cases"
          ],
          [
            "EU AI Act Art. 10",
            "Visual traversal of the data lineage recorded in provenance_edges"
          ],
          [
            "EU AI Act Art. 25",
            "Value-chain view spanning vendors, models and datasets"
          ],
          [
            "EU AI Act Art. 73",
            "Blast-radius analysis for supplier- or data-caused incidents"
          ],
          [
            "ISO/IEC 42001 A.7.2",
            "Data provenance made inspectable"
          ],
          [
            "GDPR Chapter V",
            "Cross-border edges reported with the jurisdictions and mechanism actually recorded — no asserted conclusion"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Sustainability & ESG",
        "route": "/esg-reports",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/esg-reports.md",
        "title": "ESG Reports",
        "purpose": "Periodic sustainability disclosures for the AI estate: the framework and its version, the reporting boundary and consolidation basis, the assurance status, the approver, and — critically — the carbon records, energy readings and models the report is built from.",
        "why": "A disclosure is distinguished from a draft by three things: an approver, an assurance position, and a citation trail to the records it reports on. Without those it is a document, not a disclosure. Before the rebuild esgService held three hardcoded published reports with invented author names, scores of 88/92/95 and factual claims (\"Reduced average LLM inference power usage by 18%\"), and returned them whenever a tenant's own query came back empty — so a brand-new tenant saw fabricated published disclosures as if they were its own. The page already had an honest empty state; it could never be re",
        "how": [
          "The service reads only the tenant's own rows. There is no seed fallback —",
          "an empty org renders the honest empty state.",
          "Status is a single lowercase vocabulary: draft → in_review →",
          "approved → published, normalised by normalizeStatus on read so legacy",
          "Published / DRAFT rows land in the right bucket. The migration lowercased",
          "the stored values.",
          "Transitions are governed writes. transitionEsgReport stamps",
          "approved_by and approver from the signed-in user (never a hardcoded",
          "name) plus approved_at, and published_at on publish. It throws on failure,",
          "so the drawer stays open and shows the real error.",
          "The evidence chain is explicit. carbon_record_ids, energy_metric_ids",
          "and model_ids hold real uuids, rendered as resolved names linking to the"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid; unresolvable ids render \"Unavailable\"):",
          "Carbon records → each carbon_record_ids entry links to",
          "/carbon-ledger?model=<model_id>, labelled with the record's resolved name.",
          "Energy readings → each energy_metric_ids entry links to",
          "/energy-efficiency?model=<model_id>.",
          "Models → each model_ids entry links to /models/inventory/<uuid>.",
          "Document → document_id → documents.id.",
          "Inbound:",
          "?model=<ai_models.id> with a dismissible chip; the page also offers chips",
          "through to that model's carbon records and energy readings.",
          "useModelBacklinks queries esg_reports by model_ids, so the disclosures",
          "covering a model are reachable from the model."
        ],
        "compliance": [
          "Mapped in ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Out of scope for the EU AI Act.",
          "../compliance/eu-ai-act-mapping.md",
          "records sustainability disclosure as out of scope with the reason stated. Only",
          "Art. 12 record-keeping and Art. 14 human oversight of the approval apply.",
          "Org isolation: RLS on org_id, filled by the DB default. Demo reports belong to",
          "the fictional demo tenant; authors and approvers in seeds are role labels, never",
          "named individuals."
        ],
        "operations": [
          "Service: esgService.ts — fetchEsgReports, upsertEsgReport,",
          "transitionEsgReport, deleteEsgReport, plus ESG_STATUSES,",
          "ESG_STATUS_LABEL, normalizeStatus, ASSURANCE_STATUSES. All writes throw",
          "on error.",
          "Hook: useEsgData.ts, invalidating ['esg-reports'].",
          "Migrations:",
          "supabase/migrations/20260822000002_supply_chain_esg_canonical.sql adds the",
          "assurance/approver/boundary columns, the citation arrays, the"
        ],
        "fields": [
          [
            "ISO/IEC 42001 A.2.4",
            "Objectives and reporting — framework version, boundary, consolidation basis, assurance, approver, restatement flag and the records cited"
          ],
          [
            "EU AI Act Art. 12",
            "Report lifecycle and status transitions audit-logged via logAction"
          ],
          [
            "EU AI Act Art. 14",
            "Approval and publication stamp the signed-in actor, replacing a toast that recorded nothing"
          ],
          [
            "CSRD / ESRS E1, GRI, TCFD-ISSB, SASB",
            "The record carries the fields these frameworks require of a disclosure. Sentinel stores and evidences the disclosure; it does not itself certify conformity with any of them"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Carbon",
        "route": "/carbon-ledger",
        "parentLabel": "Sustainability & ESG",
        "hasDoc": true,
        "docPath": "docs/modules/carbon-ledger.md",
        "title": "Carbon Ledger",
        "purpose": "Per-model greenhouse-gas accounting for AI workloads: training and inference emissions for a reporting period, the energy behind them, the GHG Protocol scope they belong to, and the offset and assurance detail that a disclosure needs.",
        "why": "CSRD/ESRS E1, the GHG Protocol and ISO 14064-1 all require a figure to carry its basis: the emission factor used, its source and year, the scope it falls under, and whether the number was measured, calculated or estimated. A bare tonnage is not a disclosure. Before the 2026-08-16 rebuild the ledger could not persist anything. The carbon_records table had only the generic 18-column shell — none of the 13 domain columns the page wrote existed, so PostgREST rejected every insert and the service swallowed the error and reported success. The service also wrote a client-supplied tenant_id, a column ",
        "how": [
          "Writes go through carbonRecordsService, which throws on failure; the",
          "success toast fires only after the write resolves. org_id is filled by the",
          "DB default current_user_org_id() — the client never sends a scoping column",
          "and never sends tenant_id.",
          "Nothing is coalesced to zero. Numbers are stored as given and read back as",
          "given; NULL means \"not reported\" and renders as an em-dash. An unmeasured",
          "carbon figure is not \"0.0 tCO₂e\".",
          "Every figure declares its basis. measurement_method is one of",
          "measured / calculated / estimated and is declared by the recorder, never",
          "inferred. emission_factor_id cites a row in emission_factors, which",
          "carries the factor value, unit, region, source, source URL, published year and",
          "version. emissionFactorService.citeFactor renders that citation next to the"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound:",
          "Model → /models/inventory/<model_id> (pill link; \"Unavailable\" when the",
          "id does not resolve).",
          "Energy readings → /energy-efficiency?model=<model_id>, so the kWh behind",
          "the tonnage is one click away.",
          "Emission factor → the cited factor's source, year, version and region are",
          "rendered inline with the figure.",
          "Inbound:",
          "?model=<ai_models.id> with a dismissible chip, from",
          "Energy Efficiency and ESG Reports.",
          "esg_reports.carbon_record_ids cites the records a disclosure reports on, so",
          "a published report reaches its underlying ledger rows."
        ],
        "compliance": [
          "Mapped in ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Out of scope for the EU AI Act.",
          "../compliance/eu-ai-act-mapping.md",
          "records sustainability disclosure as out of scope with the reason stated —",
          "the AI Act imposes no emissions-disclosure obligation. The only AI Act row that",
          "applies here is Art. 12 record-keeping. No article is invented for it.",
          "Org isolation: RLS on org_id, filled by the DB default. Demo records belong to",
          "the fictional demo tenant; CR-2026-Q2 is deliberately seeded as estimated so",
          "the estimate labelling is exercised."
        ],
        "operations": [
          "Service: carbonRecordsService.ts — fetchCarbonRecords,",
          "fetchCarbonRecord, upsertCarbonRecord, deleteCarbonRecord; all throw on",
          "error. emissionFactorService.ts — fetchEmissionFactors, citeFactor,",
          "factorIndex.",
          "Hooks: useCarbonRecordsData.ts (invalidates ['carbon-records']),",
          "useEmissionFactors.ts (['emission-factors']).",
          "Migrations:",
          "supabase/migrations/20260822000002_supply_chain_esg_canonical.sql adds the"
        ],
        "fields": [
          [
            "ISO/IEC 42001 A.4.6",
            "Environmental impact of AI systems — GHG scope, cited emission factor, measurement method, PUE, accelerator type, water usage"
          ],
          [
            "EU AI Act Art. 12",
            "Record lifecycle audit-logged via logAction"
          ],
          [
            "GHG Protocol / ISO 14064-1 / CSRD ESRS E1",
            "Scope tagging, factor citation and offset retirement detail support these disclosures. The platform records the data; it does not itself assert conformity with them"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Energy",
        "route": "/energy-efficiency",
        "parentLabel": "Sustainability & ESG",
        "hasDoc": true,
        "docPath": "docs/modules/energy-efficiency.md",
        "title": "Energy Efficiency",
        "purpose": "Per-model electricity, accelerator and water draw for a period, with the provenance of each reading attached: whether it came from a smart meter, a cloud console, an API usage report, a third-party audit, or is a self-declared estimate.",
        "why": "kWh is the input the carbon figure is built on. If metered and estimated readings are averaged together with nothing to tell them apart, the tonnage downstream inherits an unstated uncertainty — and the efficiency conclusions drawn from it are not defensible. Before the rebuild the page wrote a model column that does not exist (the real one is model_name), so every insert failed — and the service returned null on error, so the page toasted a success anyway. The real pue column was never read while a literal 1.3 was injected into the charts, and a REGIONS array of invented PUE, renewable and sc",
        "how": [
          "Writes go through energyService and throw on failure; the success toast",
          "fires only after the write resolves. org_id is filled by the DB default",
          "current_user_org_id().",
          "model_id is ai_models.id. model_name is kept only as the legacy display",
          "label and is never a uuid; a row with no model_id renders \"Unavailable\".",
          "PUE is read from the column. pue is the only PUE the UI may show. The",
          "injected literal and the invented per-region table are gone.",
          "Measurement provenance travels with the reading. measurement_source is",
          "one of Smart Meter, Cloud Console, API Usage Report,",
          "Third-party Audit, Estimated; ESTIMATED_SOURCES marks which are",
          "self-declared. The source is shown in the table, in the KPIs and in CSV",
          "export, so a metered aggregate is never silently mixed with estimates."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound:",
          "Model → /models/inventory/<model_id> (pill link; \"Unavailable\" when the",
          "id does not resolve).",
          "Carbon records → /carbon-ledger?model=<model_id>, so a reading reaches",
          "the emissions figure it feeds.",
          "Emission factor → the cited factor's source, year, version and region are",
          "rendered inline.",
          "Inbound:",
          "?model=<ai_models.id> with a dismissible chip, from",
          "Carbon Ledger and ESG Reports.",
          "esg_reports.energy_metric_ids cites the readings a disclosure reports on.",
          "useModelBacklinks queries energy_metrics by model_id, so a model's"
        ],
        "compliance": [
          "Mapped in ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Out of scope for the EU AI Act.",
          "../compliance/eu-ai-act-mapping.md",
          "records sustainability disclosure as out of scope with the reason stated; the AI",
          "Act imposes no energy-reporting obligation. Only Art. 12 record-keeping applies.",
          "Org isolation: RLS on org_id, filled by the DB default. Demo readings belong",
          "to the fictional demo tenant."
        ],
        "operations": [
          "Service: energyService.ts — fetchEnergyMetrics, upsertEnergyMetric,",
          "deleteEnergyMetric, plus MEASUREMENT_SOURCES / ESTIMATED_SOURCES. All",
          "writes throw on error.",
          "Hook: useEnergyData.ts, invalidating ['energy-metrics'].",
          "Migrations:",
          "supabase/migrations/20260822000002_supply_chain_esg_canonical.sql adds",
          "model_id, the accelerator/region/water columns, the emission-factor",
          "reference, the current_user_org_id() default and the efficiency-scale"
        ],
        "fields": [
          [
            "ISO/IEC 42001 A.4.6",
            "Environmental impact of AI systems — energy, accelerator, PUE, water and grid intensity per model"
          ],
          [
            "EU AI Act Art. 12",
            "Reading lifecycle audit-logged via logAction"
          ],
          [
            "GHG Protocol scope 2",
            "Provides the activity data (kWh, region, grid intensity) the Carbon Ledger converts, with the factor cited"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "ESG Reports",
        "route": "/esg-reports",
        "parentLabel": "Sustainability & ESG",
        "hasDoc": true,
        "docPath": "docs/modules/esg-reports.md",
        "title": "ESG Reports",
        "purpose": "Periodic sustainability disclosures for the AI estate: the framework and its version, the reporting boundary and consolidation basis, the assurance status, the approver, and — critically — the carbon records, energy readings and models the report is built from.",
        "why": "A disclosure is distinguished from a draft by three things: an approver, an assurance position, and a citation trail to the records it reports on. Without those it is a document, not a disclosure. Before the rebuild esgService held three hardcoded published reports with invented author names, scores of 88/92/95 and factual claims (\"Reduced average LLM inference power usage by 18%\"), and returned them whenever a tenant's own query came back empty — so a brand-new tenant saw fabricated published disclosures as if they were its own. The page already had an honest empty state; it could never be re",
        "how": [
          "The service reads only the tenant's own rows. There is no seed fallback —",
          "an empty org renders the honest empty state.",
          "Status is a single lowercase vocabulary: draft → in_review →",
          "approved → published, normalised by normalizeStatus on read so legacy",
          "Published / DRAFT rows land in the right bucket. The migration lowercased",
          "the stored values.",
          "Transitions are governed writes. transitionEsgReport stamps",
          "approved_by and approver from the signed-in user (never a hardcoded",
          "name) plus approved_at, and published_at on publish. It throws on failure,",
          "so the drawer stays open and shows the real error.",
          "The evidence chain is explicit. carbon_record_ids, energy_metric_ids",
          "and model_ids hold real uuids, rendered as resolved names linking to the"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound (all by uuid; unresolvable ids render \"Unavailable\"):",
          "Carbon records → each carbon_record_ids entry links to",
          "/carbon-ledger?model=<model_id>, labelled with the record's resolved name.",
          "Energy readings → each energy_metric_ids entry links to",
          "/energy-efficiency?model=<model_id>.",
          "Models → each model_ids entry links to /models/inventory/<uuid>.",
          "Document → document_id → documents.id.",
          "Inbound:",
          "?model=<ai_models.id> with a dismissible chip; the page also offers chips",
          "through to that model's carbon records and energy readings.",
          "useModelBacklinks queries esg_reports by model_ids, so the disclosures",
          "covering a model are reachable from the model."
        ],
        "compliance": [
          "Mapped in ../compliance/iso-42001-mapping.md,",
          "\"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability\".",
          "| Control | How this module satisfies it |",
          "Out of scope for the EU AI Act.",
          "../compliance/eu-ai-act-mapping.md",
          "records sustainability disclosure as out of scope with the reason stated. Only",
          "Art. 12 record-keeping and Art. 14 human oversight of the approval apply.",
          "Org isolation: RLS on org_id, filled by the DB default. Demo reports belong to",
          "the fictional demo tenant; authors and approvers in seeds are role labels, never",
          "named individuals."
        ],
        "operations": [
          "Service: esgService.ts — fetchEsgReports, upsertEsgReport,",
          "transitionEsgReport, deleteEsgReport, plus ESG_STATUSES,",
          "ESG_STATUS_LABEL, normalizeStatus, ASSURANCE_STATUSES. All writes throw",
          "on error.",
          "Hook: useEsgData.ts, invalidating ['esg-reports'].",
          "Migrations:",
          "supabase/migrations/20260822000002_supply_chain_esg_canonical.sql adds the",
          "assurance/approver/boundary columns, the citation arrays, the"
        ],
        "fields": [
          [
            "ISO/IEC 42001 A.2.4",
            "Objectives and reporting — framework version, boundary, consolidation basis, assurance, approver, restatement flag and the records cited"
          ],
          [
            "EU AI Act Art. 12",
            "Report lifecycle and status transitions audit-logged via logAction"
          ],
          [
            "EU AI Act Art. 14",
            "Approval and publication stamp the signed-in actor, replacing a toast that recorded nothing"
          ],
          [
            "CSRD / ESRS E1, GRI, TCFD-ISSB, SASB",
            "The record carries the fields these frameworks require of a disclosure. Sentinel stores and evidences the disclosure; it does not itself certify conformity with any of them"
          ]
        ],
        "noDocReason": null
      }
    ]
  },
  {
    "id": "admin",
    "title": "ADMIN",
    "entryCount": 18,
    "documentedCount": 18,
    "entries": [
      {
        "label": "IAM & Roles",
        "route": "/access-control",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/rbac-organization.md",
        "title": "RBAC, Admin, Departments, Committees, Settings, Notifications, Tasks",
        "purpose": "Foundational organisational modules: roles and permissions, multi-tenant admin, departmental scoping, governance committees, task queue, and notification routing.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.2, A.5.3, A.5.15–18",
            "Roles, SoD, access control"
          ],
          [
            "SOC 2 CC1.3, CC6.1–3",
            "Authority and responsibility; logical access"
          ],
          [
            "NIST SP 800-53 AC-2, AC-3, AC-5, AC-6",
            "Access, SoD, least privilege"
          ],
          [
            "ISO/IEC 42001 5.3",
            "Roles and responsibilities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Users Registry",
        "route": "/access-control/users",
        "parentLabel": "IAM & Roles",
        "hasDoc": true,
        "docPath": "docs/modules/rbac-organization.md",
        "title": "RBAC, Admin, Departments, Committees, Settings, Notifications, Tasks",
        "purpose": "Foundational organisational modules: roles and permissions, multi-tenant admin, departmental scoping, governance committees, task queue, and notification routing.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.2, A.5.3, A.5.15–18",
            "Roles, SoD, access control"
          ],
          [
            "SOC 2 CC1.3, CC6.1–3",
            "Authority and responsibility; logical access"
          ],
          [
            "NIST SP 800-53 AC-2, AC-3, AC-5, AC-6",
            "Access, SoD, least privilege"
          ],
          [
            "ISO/IEC 42001 5.3",
            "Roles and responsibilities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Roles Management",
        "route": "/access-control/roles",
        "parentLabel": "IAM & Roles",
        "hasDoc": true,
        "docPath": "docs/modules/rbac-organization.md",
        "title": "RBAC, Admin, Departments, Committees, Settings, Notifications, Tasks",
        "purpose": "Foundational organisational modules: roles and permissions, multi-tenant admin, departmental scoping, governance committees, task queue, and notification routing.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.2, A.5.3, A.5.15–18",
            "Roles, SoD, access control"
          ],
          [
            "SOC 2 CC1.3, CC6.1–3",
            "Authority and responsibility; logical access"
          ],
          [
            "NIST SP 800-53 AC-2, AC-3, AC-5, AC-6",
            "Access, SoD, least privilege"
          ],
          [
            "ISO/IEC 42001 5.3",
            "Roles and responsibilities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Departments",
        "route": "/access-control/departments",
        "parentLabel": "IAM & Roles",
        "hasDoc": true,
        "docPath": "docs/modules/rbac-organization.md",
        "title": "RBAC, Admin, Departments, Committees, Settings, Notifications, Tasks",
        "purpose": "Foundational organisational modules: roles and permissions, multi-tenant admin, departmental scoping, governance committees, task queue, and notification routing.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.5.2, A.5.3, A.5.15–18",
            "Roles, SoD, access control"
          ],
          [
            "SOC 2 CC1.3, CC6.1–3",
            "Authority and responsibility; logical access"
          ],
          [
            "NIST SP 800-53 AC-2, AC-3, AC-5, AC-6",
            "Access, SoD, least privilege"
          ],
          [
            "ISO/IEC 42001 5.3",
            "Roles and responsibilities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Identity Governance",
        "route": "/iga",
        "parentLabel": "IAM & Roles",
        "hasDoc": true,
        "docPath": "docs/modules/identity-governance.md",
        "title": "Identity Governance",
        "purpose": "Who — human, service account, or AI agent — can reach which registered AI system, at what privilege, and when that access was last reviewed. Also the segregation-of-duties rules and their violations, and access-review campaigns.",
        "why": "ISO 27001 A.5.15–A.5.18 (access control, access review), SOC 2 CC6.1-CC6.3, and the EU AI Act's Art. 14 expectation that human oversight roles are identifiable. An identity register whose \"AI systems: 7\" figure cannot name one system is unverifiable.",
        "how": [
          "The page (pages/IGA.tsx) reads the four org-scoped tables through",
          "resilienceService; identity CRUD writes throw and audit via logAction.",
          "Until 2026-08-23 it read the iga_table demo table with ten fictional",
          "identities whose \"AI systems access\" strings resolved to nothing.",
          "ai_systems_access (integer) is now kept in step with linked_model_ids",
          "(uuid[]), which is derived from privilege level by",
          "20260823000005: admin → every registered model, operator → production",
          "models, viewer → none. This is a stated demo-tenant seeding rule — labelled",
          "as such on the page — not an entitlement scan; what matters is the figure is",
          "reproducible and every id resolves to a registry record.",
          "Vocabularies are CHECK-constrained lowercase (identity_type: human / service /",
          "agent; privilege_level: admin / operator / viewer; review_status: current /"
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound: linked_model_ids → ai_models.id, proven 104/104 resolving",
          "(2026-08-23); chips navigate to /models/inventory/:id.",
          "Inbound: none yet — an identity is not referenced by other modules.",
          "Candidate: HITL review assignments naming a reviewer identity (roadmap)."
        ],
        "compliance": [
          "ISO 27001 A.5.15–A.5.18; SOC 2 CC6; EU AI Act Art. 14 (oversight roles).",
          "sod_rules.org_id previously had no default, which rejected every insert",
          "(fail-closed but unusable); fixed by 20260823000005 with get_org_id()."
        ],
        "operations": [
          "identities is part of the live baseline gap — migration statements touching",
          "it are guarded with to_regclass. Access derivation reruns only when the",
          "migration is re-applied; a real entitlement sync is roadmap."
        ],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Resilience",
        "route": "/continuity",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/business-continuity.md",
        "title": "Business Continuity & Resilience",
        "purpose": "The register of business continuity plans: what each plan covers, its current standby/active state, which incident activated it, and when.",
        "why": "When an AI system that a business depends on fails, the question is not whether somebody wrote a continuity plan but whether the current one can be produced, shows an owner, and has been tested. Holding plans as records — rather than as documents in a drive — is what makes activation auditable after the fact.",
        "how": [
          "The list reads bcp_plans through useBcpPlansData, with search and filters",
          "by status and type, and renders skeleton / empty / error states.",
          "A plan's detail opens in a sheet with Overview, Recovery,",
          "Dependencies, Contacts and Tests tabs.",
          "status defaults to STANDBY at the database. activated_by_incident and",
          "activated_at record an activation against the incident that caused it.",
          "Reads and writes throw on failure; an empty table renders an honest empty",
          "state rather than seeded example plans. (An earlier version returned",
          "fabricated MDL-00x plans whenever the table was empty or the query failed —",
          "removed.)"
        ],
        "dataProcess": [],
        "interlinks": [
          "→ Incidents. activated_by_incident names the incident that triggered",
          "activation.",
          "→ Business Impact Analysis. BIA (/bia, bia_records) establishes the",
          "impact and recovery targets that a plan exists to meet.",
          "→ Tabletop Exercises. Tabletops are how a plan gets tested."
        ],
        "compliance": [
          "ISO/IEC 42001 §8.1 — operational planning and control for AI systems the",
          "business depends on.",
          "ISO/IEC 27001:2022 A.5.29 / A.5.30 — information security during",
          "disruption, and ICT readiness for business continuity.",
          "EU AI Act Art. 15 — robustness, including resilience to failure.",
          "### Known gaps",
          "Two, recorded rather than papered over:",
          "1. No audit logging. logAction does not appear in this module's page or",
          "service, so activating a plan is not written to the audit trail. Activation",
          "is a material governance event and should be traceable (EU AI Act Art. 12).",
          "2. RTO/RPO are not backed by the schema. The page reads plan.rto /",
          "plan.rto_hours (and the RPO equivalents), and bcp_plans has none of those"
        ],
        "operations": [
          "org_id is filled by the database. The client must never send a scoping",
          "column (CLAUDE.md First principle #3).",
          "Historical note: upsertBcpPlans used to send tenant_id, a column",
          "bcp_plans does not have. PostgREST rejects a row containing an unknown",
          "column, so every save failed until this was removed",
          "(20260827000001_org_scoping_defaults_repair.sql and the service fix).",
          "ux_bcp_plans_org_code makes plan_code unique per org — an upsert with a",
          "duplicate code updates rather than inserts."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "Primary key"
          ],
          [
            "org_id",
            "uuid",
            "NOT NULL, DB default current_user_org_id()"
          ],
          [
            "plan_code",
            "text",
            "Human-facing reference; unique per org with org_id"
          ],
          [
            "name",
            "text",
            "Plan name"
          ],
          [
            "status",
            "text",
            "NOT NULL, DB default 'STANDBY'"
          ],
          [
            "activated_by_incident",
            "text",
            "Incident reference that activated the plan"
          ],
          [
            "activated_at",
            "timestamptz",
            "Activation time"
          ],
          [
            "created_at / updated_at",
            "timestamptz",
            "NOT NULL, default now()"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Business Continuity",
        "route": "/continuity",
        "parentLabel": "Resilience",
        "hasDoc": true,
        "docPath": "docs/modules/business-continuity.md",
        "title": "Business Continuity & Resilience",
        "purpose": "The register of business continuity plans: what each plan covers, its current standby/active state, which incident activated it, and when.",
        "why": "When an AI system that a business depends on fails, the question is not whether somebody wrote a continuity plan but whether the current one can be produced, shows an owner, and has been tested. Holding plans as records — rather than as documents in a drive — is what makes activation auditable after the fact.",
        "how": [
          "The list reads bcp_plans through useBcpPlansData, with search and filters",
          "by status and type, and renders skeleton / empty / error states.",
          "A plan's detail opens in a sheet with Overview, Recovery,",
          "Dependencies, Contacts and Tests tabs.",
          "status defaults to STANDBY at the database. activated_by_incident and",
          "activated_at record an activation against the incident that caused it.",
          "Reads and writes throw on failure; an empty table renders an honest empty",
          "state rather than seeded example plans. (An earlier version returned",
          "fabricated MDL-00x plans whenever the table was empty or the query failed —",
          "removed.)"
        ],
        "dataProcess": [],
        "interlinks": [
          "→ Incidents. activated_by_incident names the incident that triggered",
          "activation.",
          "→ Business Impact Analysis. BIA (/bia, bia_records) establishes the",
          "impact and recovery targets that a plan exists to meet.",
          "→ Tabletop Exercises. Tabletops are how a plan gets tested."
        ],
        "compliance": [
          "ISO/IEC 42001 §8.1 — operational planning and control for AI systems the",
          "business depends on.",
          "ISO/IEC 27001:2022 A.5.29 / A.5.30 — information security during",
          "disruption, and ICT readiness for business continuity.",
          "EU AI Act Art. 15 — robustness, including resilience to failure.",
          "### Known gaps",
          "Two, recorded rather than papered over:",
          "1. No audit logging. logAction does not appear in this module's page or",
          "service, so activating a plan is not written to the audit trail. Activation",
          "is a material governance event and should be traceable (EU AI Act Art. 12).",
          "2. RTO/RPO are not backed by the schema. The page reads plan.rto /",
          "plan.rto_hours (and the RPO equivalents), and bcp_plans has none of those"
        ],
        "operations": [
          "org_id is filled by the database. The client must never send a scoping",
          "column (CLAUDE.md First principle #3).",
          "Historical note: upsertBcpPlans used to send tenant_id, a column",
          "bcp_plans does not have. PostgREST rejects a row containing an unknown",
          "column, so every save failed until this was removed",
          "(20260827000001_org_scoping_defaults_repair.sql and the service fix).",
          "ux_bcp_plans_org_code makes plan_code unique per org — an upsert with a",
          "duplicate code updates rather than inserts."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid",
            "Primary key"
          ],
          [
            "org_id",
            "uuid",
            "NOT NULL, DB default current_user_org_id()"
          ],
          [
            "plan_code",
            "text",
            "Human-facing reference; unique per org with org_id"
          ],
          [
            "name",
            "text",
            "Plan name"
          ],
          [
            "status",
            "text",
            "NOT NULL, DB default 'STANDBY'"
          ],
          [
            "activated_by_incident",
            "text",
            "Incident reference that activated the plan"
          ],
          [
            "activated_at",
            "timestamptz",
            "Activation time"
          ],
          [
            "created_at / updated_at",
            "timestamptz",
            "NOT NULL, default now()"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Business Impact (BIA)",
        "route": "/bia",
        "parentLabel": "Resilience",
        "hasDoc": true,
        "docPath": "docs/modules/business-impact-analysis.md",
        "title": "Business Impact Analysis",
        "purpose": "The recovery objectives the business has agreed per process: RTO (how long it can be down), RPO (how much data loss is tolerable), MTPD (maximum tolerable period of disruption), plus the criticality that justifies them. This register is the source of recovery objectives — the Asset Registry displays RTO/RPO copied from here by department and does not edit them.",
        "why": "ISO 22301 / ISO 27001 A.5.29-A.5.30 continuity planning, and ISO/IEC 42001's expectation that the availability impact of AI systems is understood. A BIA that cannot name what actually stops working is prose, not analysis.",
        "how": [
          "The page (pages/BIA.tsx) reads and writes the org-scoped bia_processes",
          "table through resilienceService (writes throw; logAction on every",
          "mutation). Until 2026-08-23 it read the bia_table demo table with eight",
          "fictional processes and invented \"financial impact / 24h\" dollar figures;",
          "those fabricated metrics were removed entirely rather than relabelled —",
          "the platform does not display invented numbers as measured.",
          "criticality uses the lowercase vocabulary enforced by CHECK constraint",
          "(20260823000005). tenant_id is filled by the DB default",
          "current_user_org_id()."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound: linked_asset_ids → assets.id (proven 8/8, 2026-08-23);",
          "linked_model_ids → ai_models.id (proven 3/3). Chips navigate to the",
          "Asset Registry and /models/inventory/:id.",
          "Inbound: assets.bia_rto_hours/bia_rpo_hours are copied from this",
          "table by department (20260817000001), so every asset displaying a recovery",
          "objective traces back here."
        ],
        "compliance": [
          "ISO 27001 A.5.29–A.5.30; ISO/IEC 42001 6.1 (impact of AI system unavailability).",
          "Mutations audit via logAction (module bia)."
        ],
        "operations": [
          "No scheduled jobs. Note for reviewers: bia_processes is part of the live",
          "baseline gap (created on the live project before the repo's migration",
          "discipline); statements touching it in migrations are guarded with",
          "to_regclass per supabase/migrations/README.md."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            "gen_random_uuid()"
          ],
          [
            "tenant_id",
            "uuid NOT NULL",
            "DB default current_user_org_id()"
          ],
          [
            "ref_code",
            "text",
            "Citable reference (BIA-NNN)"
          ],
          [
            "business_process",
            "text NOT NULL",
            ""
          ],
          [
            "department",
            "text",
            "Join key used to source assets' RTO/RPO"
          ],
          [
            "criticality",
            "text",
            "CHECK: critical / high / medium / low"
          ],
          [
            "rto_hours, rpo_hours, mtpd_hours",
            "numeric",
            ""
          ],
          [
            "linked_asset_ids",
            "uuid[]",
            "Assets this process runs on (GIN indexed)"
          ],
          [
            "linked_model_ids",
            "uuid[]",
            "Registry models reached through those assets"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Asset Registry",
        "route": "/assets",
        "parentLabel": "Resilience",
        "hasDoc": true,
        "docPath": "docs/modules/asset-management.md",
        "title": "Asset Registry",
        "purpose": "The authoritative inventory of the AI estate — models, datasets, infrastructure, applications, APIs, devices — with ownership, classification, criticality and lifecycle state. The register's distinguishing capability is that an asset can say which governed record it represents: an ai_model asset resolves to a row in ai_models, a dataset asset to datasets. That link is what lets an impact question (\"what breaks?\") land on a real registry entity.",
        "why": "ISO/IEC 27001 A.5.9 requires an inventory of information and associated assets; ISO/IEC 42001 6.1.2/A.4.3 extends that to AI system resources; EU AI Act Annex IV §1(a) wants the system's components documented. An inventory that cannot connect an entry to the model registry is a list, not a control.",
        "how": [
          "The page (pages/AssetManagement.tsx) reads and writes the org-scoped",
          "assets table through assetService (writes throw; logAction on every",
          "mutation). Until 2026-08-23 it read the assetmanagement_table demo table and",
          "faked all persistence (TD-001); the rewrite removed the fabricated seed data,",
          "the setTimeout fake-success saves, and a decorative \"Import Assets\" dialog.",
          "criticality is derived from risk_level at write time (service) and was",
          "backfilled by 20260817000001; the two columns cannot disagree again.",
          "tenant_id is filled by the DB default current_user_org_id()",
          "(20260823000001) — the client never sends it."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound: entity_id → ai_models.id / datasets.id (chip navigates to",
          "/models/inventory/:id or the dataset record). Proven 6/6 resolving",
          "(2026-08-23).",
          "Inbound: risks.linked_asset_ids references assets.id (proven 6/6);",
          "bia_processes.linked_asset_ids references assets.id (proven 8/8).",
          "Deep link: /asset-management?model=<uuid> filters to assets representing",
          "that model, with a dismissible chip."
        ],
        "compliance": [
          "ISO 27001 A.5.9/A.5.12; ISO 42001 6.1.2, A.4.3; NIST AI RMF MAP 1.1; EU AI Act",
          "Annex IV §1(a). Mapped in docs/compliance/iso-42001-mapping.md and",
          "eu-ai-act-mapping.md. Mutations write to the audit log via logAction",
          "(module asset-registry)."
        ],
        "operations": [
          "No scheduled jobs. Auto-discovery connectors remain roadmap (see",
          "docs/reference/technical-debt.md for the registry's open items)."
        ],
        "fields": [
          [
            "Column",
            "Type",
            "Notes"
          ],
          [
            "id",
            "uuid PK",
            "gen_random_uuid()"
          ],
          [
            "org_id / tenant_id",
            "uuid",
            "DB default current_user_org_id(); never client-supplied"
          ],
          [
            "asset_ref",
            "text",
            "Citable reference (AST-NNN); the uuid is never shown"
          ],
          [
            "name, type",
            "text",
            "type ∈ ai_model, dataset, infrastructure, application, api, device"
          ],
          [
            "criticality",
            "text",
            "Derived from risk_level; lowercase vocabulary"
          ],
          [
            "risk_level, data_classification, lifecycle_stage",
            "text",
            ""
          ],
          [
            "department, location, hostname, version, tags[]",
            "",
            ""
          ],
          [
            "entity_type, entity_id",
            "text, uuid",
            "The registry record this asset represents; null for infrastructure (honest state, not an omission)"
          ],
          [
            "bia_rto_hours, bia_rpo_hours",
            "numeric",
            "Sourced from bia_processes by department; edited in the BIA, displayed here"
          ],
          [
            "auto_discovered, last_scanned_at",
            "",
            ""
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "People & Ethics",
        "route": "/ethics-reporting",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/ethics-reporting.md",
        "title": "Ethics Reporting & Whistleblowing",
        "purpose": "Confidential channel for employees and external parties to raise ethics, AI-safety, or compliance concerns, with triage, investigation, and non-retaliation evidence.",
        "why": "",
        "how": [
          "Intake (anonymous option) → Ack within 7 days → Triage → Investigation with SoD from subject → Outcome → Feedback within 3 months → Evidence retention."
        ],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU Directive 2019/1937",
            "Whistleblower protection"
          ],
          [
            "US SOX §806",
            "Whistleblower provisions"
          ],
          [
            "ISO 37002:2021",
            "Whistleblowing management"
          ],
          [
            "ISO/IEC 42001 A.5.3",
            "AI ethics and accountability"
          ],
          [
            "UN Guiding Principles",
            "Remedy mechanism"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Ethics Reporting",
        "route": "/ethics-reporting",
        "parentLabel": "People & Ethics",
        "hasDoc": true,
        "docPath": "docs/modules/ethics-reporting.md",
        "title": "Ethics Reporting & Whistleblowing",
        "purpose": "Confidential channel for employees and external parties to raise ethics, AI-safety, or compliance concerns, with triage, investigation, and non-retaliation evidence.",
        "why": "",
        "how": [
          "Intake (anonymous option) → Ack within 7 days → Triage → Investigation with SoD from subject → Outcome → Feedback within 3 months → Evidence retention."
        ],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU Directive 2019/1937",
            "Whistleblower protection"
          ],
          [
            "US SOX §806",
            "Whistleblower provisions"
          ],
          [
            "ISO 37002:2021",
            "Whistleblowing management"
          ],
          [
            "ISO/IEC 42001 A.5.3",
            "AI ethics and accountability"
          ],
          [
            "UN Guiding Principles",
            "Remedy mechanism"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Training & Awareness",
        "route": "/training",
        "parentLabel": "People & Ethics",
        "hasDoc": true,
        "docPath": "docs/modules/training-awareness.md",
        "title": "Training & Awareness",
        "purpose": "Deliver, track, and evidence mandatory training (security, privacy, AI ethics, role-based) with completion attestations.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "ISO/IEC 27001:2022 A.6.3",
            "Information security awareness, education, training"
          ],
          [
            "SOC 2 CC1.4",
            "Attracts, develops, retains competent individuals"
          ],
          [
            "ISO/IEC 42001 7.2–7.3",
            "Competence and awareness"
          ],
          [
            "NIST SP 800-50 / 800-181 NICE",
            "Security awareness"
          ],
          [
            "GDPR Art.39(1)(b)",
            "DPO training oversight"
          ],
          [
            "HIPAA §164.530(b)",
            "Workforce training"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "GRC Maturity",
        "route": "/maturity",
        "parentLabel": "People & Ethics",
        "hasDoc": true,
        "docPath": "docs/modules/benchmarking-maturity.md",
        "title": "Benchmarking & Examination Manager",
        "purpose": "External and internal benchmarking of AI systems' quality/safety and structured management of regulator examinations (onsite inspections, supervisory reviews, audits).",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.43, 70",
            "Conformity assessment, national supervisory authorities"
          ],
          [
            "SR 11-7 / OCC 2011-12",
            "Model validation, challenger models"
          ],
          [
            "ISO/IEC 42001 9.2",
            "Internal audit"
          ],
          [
            "SOC 2 CC4.1",
            "Monitoring activities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Governance Mesh",
        "route": "/governance-mesh",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/agent-platform.md",
        "title": "Agent Platform (Registry, Discovery, IAM, Choreography)",
        "purpose": "Govern autonomous and human-in-the-loop agents: registration, capability declaration, identity and entitlements (non-human identity), orchestration, and safety rails.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "OWASP LLM Top 10 (Agentic)",
            "Excessive agency, tool misuse"
          ],
          [
            "EU AI Act Art.14, 15",
            "Oversight, robustness"
          ],
          [
            "ISO/IEC 42001 A.9",
            "Use of the AI system and oversight"
          ],
          [
            "NIST AI RMF MANAGE 2.1",
            "Risk response tracked post-deployment"
          ],
          [
            "NIST SP 800-207",
            "Zero-trust applied to workload identities"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Narrative Engine",
        "route": "/narrative-engine",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/ai-advisor-narrative.md",
        "title": "AI Advisor & Narrative Engine",
        "purpose": "Retrieval-augmented assistant that answers GRC questions from only the tenant's own evidence, policies, and controls; Narrative Engine composes regulator- and executive-ready prose from structured data.",
        "why": "",
        "how": [],
        "dataProcess": [],
        "interlinks": [],
        "compliance": [
          "| Control | Requirement |"
        ],
        "operations": [],
        "fields": [
          [
            "EU AI Act Art.13, 15",
            "Transparency, robustness"
          ],
          [
            "ISO/IEC 42001 A.6.2.5–6",
            "Design, operation"
          ],
          [
            "NIST AI RMF MEASURE 2.8, 2.9",
            "Interpretability"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Integrations",
        "route": "/integrations",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/integration-catalog.md",
        "title": "Integration Catalog & Collected Evidence",
        "purpose": "Browse the published catalogue of evidence sources, enable the ones that can actually collect, and see the evidence they produce mapped onto the org's controls.",
        "why": "The catalogue held 219 products and nothing in the product read it. The evidence tables behind it — integration_findings, control_finding_evidence, background_jobs — had zero readers too. So the platform had a real collection pipeline, a real control-mapping engine, and no way for a user to reach any of it. This module closes that gap. It also carries an honesty obligation. Of the 217 catalogued products, three ship an adapter today — github, aws and microsoft_azure. Rendering a Connect button on all 217 would promise evidence collection that cannot happen — the same class of defect as an unea",
        "how": [
          "### Three states, stated plainly",
          "| adapter_status | Meaning | UI |",
          "isConnectable() is the single gate, unit-tested, and it mirrors the server:",
          "the Python worker refuses a slug absent from its registry",
          "(sentinel/integrations/registry.py), so client and server agree by",
          "construction rather than by comment.",
          "The server is the tiebreaker. adapter_status is set by a migration and the",
          "registry lives in Python; the two deploy separately, so they drift.",
          "reconcileWithServer() folds GET /v1/integrations/available over the",
          "catalogue before it renders: a product the server ships but the catalogue calls",
          "catalogued becomes connectable (as beta, never available — the registry",
          "proves an adapter exists, not that it is production-ready), and a product the"
        ],
        "dataProcess": [],
        "interlinks": [
          "Catalog → org instance. Joined on catalog_slug, never on name, with a",
          "real foreign key (integrations_catalog_slug_fkey) behind it. Verified on a",
          "from-zero replay: total = 2, resolves = 2 for every row carrying a slug.",
          "Monitored source → its owner. A manual registration cannot be saved",
          "without an accountable owner and a review cadence, so it is never a record",
          "nobody is answerable for.",
          "Integration → findings. The detail sheet shows what the source has",
          "actually collected, worst-first, or an honest \"nothing collected yet\".",
          "Control → evidence. ControlDetail gains an Automated Evidence tab",
          "listing the findings mapped to that control, with posture, counts and",
          "remediation.",
          "Control → Integrations. A control with no automated evidence links to"
        ],
        "compliance": [
          "EU AI Act Art. 12 (record-keeping). Connect, register and disconnect are",
          "audit-logged with a real actor; findings survive disconnection. The audit",
          "entry for a connect records **which credential fields were supplied, never",
          "their values**.",
          "EU AI Act Art. 14 (human oversight). Automated evidence is presented as a",
          "signal for a person to act on, never as an automatic control state change.",
          "ISO/IEC 42001 §9.1 / §9.2. Continuous monitoring evidence feeding the",
          "control register, with provenance (which source, which check, when). A source",
          "the platform cannot pull from is not left out of the AIMS: it is registered",
          "with an owner and a documented review interval, and is counted separately",
          "from automated coverage so the two are never added together.",
          "Data minimisation. Credentials never reach the browser; raw provider"
        ],
        "operations": [
          "The catalogue is seeded by migration",
          "(20260825000002_seed_integration_catalog.sql) and is global reference data:",
          "readable by any signed-in user, writable only by the service role. **If the",
          "Catalog tab shows \"Catalogue not available\", migrations have not been applied",
          "to that database. Apply them with the Deploy Migrations** workflow",
          "(.github/workflows/deploy-migrations.yml) — run it manually with dry run",
          "first to see what is pending — or locally with supabase db push.",
          "Tabs are URL-addressable: /integrations (catalogue),"
        ],
        "fields": [
          [
            "available",
            "Adapter ships; connecting starts real collection",
            "Green badge, Connect"
          ],
          [
            "beta",
            "Adapter exists, not production-ready",
            "Amber badge, Connect"
          ],
          [
            "catalogued",
            "Reference only — no adapter, collects nothing",
            "Neutral badge, Monitor this source"
          ],
          [
            "When",
            "adapter_status is available or beta",
            "anything else"
          ],
          [
            "Fields",
            "the adapter's own credential contract",
            "the source's identity, owner, cadence, evidence location"
          ],
          [
            "Secrets",
            "AES-256-GCM encrypted server-side",
            "none asked for, none stored"
          ],
          [
            "On save",
            "first sync queued",
            "nothing queued"
          ],
          [
            "Row",
            "status='configuring', connection_mode='automated'",
            "status='monitored', connection_mode='manual'"
          ],
          [
            "Card",
            "green Connected",
            "neutral Monitored"
          ],
          [
            "github",
            "available",
            "PAT / GitHub App",
            "read:org, repo metadata read, security_events read"
          ],
          [
            "aws",
            "beta",
            "IAM keys, optionally sts:AssumeRole",
            "AWS-managed SecurityAudit policy"
          ],
          [
            "microsoft_azure",
            "beta",
            "Entra ID app registration (client credentials)",
            "Reader on the subscription; Policy.Read.All on Graph for the MFA check"
          ],
          [
            "aws.iam.root_mfa",
            "mfa_enforcement",
            "Root user has an MFA device"
          ],
          [
            "aws.iam.user_mfa",
            "mfa_enforcement",
            "Console users without MFA (programmatic-only users excluded)"
          ],
          [
            "aws.iam.password_policy",
            "access_control",
            "Length, complexity, reuse prevention"
          ],
          [
            "aws.iam.access_key_age",
            "access_control",
            "Active keys older than 90 days (CIS threshold)"
          ],
          [
            "aws.iam.admin_policy_attachments",
            "least_privilege",
            "AdministratorAccess attached directly to users"
          ],
          [
            "aws.cloudtrail.multi_region",
            "audit_logging",
            "A multi-region trail that is actually logging"
          ],
          [
            "aws.s3.public_access_block",
            "access_control",
            "Account-level block, else per bucket"
          ],
          [
            "aws.s3.default_encryption",
            "encryption_at_rest",
            "Default SSE per bucket"
          ],
          [
            "aws.ec2.ebs_encryption_default",
            "encryption_at_rest",
            "Encrypt-new-volumes, per region"
          ],
          [
            "aws.rds.storage_encrypted",
            "encryption_at_rest",
            "Instance storage encryption"
          ],
          [
            "aws.ec2.security_group_ingress",
            "network_security",
            "Admin/database ports open to 0.0.0.0/0 or ::/0"
          ],
          [
            "aws.kms.key_rotation",
            "secret_management",
            "Automatic rotation on customer-managed symmetric keys"
          ]
        ],
        "noDocReason": null
      },
      {
        "label": "Export Center",
        "route": "/export",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/reporting.md",
        "title": "Reporting",
        "purpose": "Report definitions that snapshot the platform's real registers on demand. Each generation reads the named tables, persists the result as a run, and hands the viewer that exact artifact to download — a real document, not a rendered mock.",
        "why": "Before the 2026-08-25 rebuild /reporting was one of the most fabrication-dense pages in the product. It read reporting_table (id, doc jsonb) for its \"scheduled reports\" and rendered everything else from hardcoded arrays: REPORT_TEMPLATES — eight cards with invented \"Last generated\" dates; GENERATION_HISTORY — eight fake runs signed by named people (\"Sarah Chen\", \"System (Scheduled)\") with invented durations (\"3.8s\"); SCHEDULED_REPORTS — three fake schedules with invented recipients; the Preview tab's COMPLIANCE_DATA / RISK_TREND / PIE_DATA — charts drawn from arrays typed into the file, captio",
        "how": [
          "Real tables, org-scoped. Report definitions live in security_reports;",
          "each generation writes a security_report_runs row whose content is a",
          "data-driven snapshot of the security tables the definition names. org_id",
          "filled by the DB default current_user_org_id(). Writes throw; save /",
          "delete / generate call logAction (Art. 12).",
          "Generation is real. generateReport fetches each selected section from",
          "its tenant-scoped table, assembles the snapshot, sizes it, persists the run",
          "and bumps the definition's generation_count / last_generated_at. The UI",
          "downloads that persisted content — the artifact and the stored run are the",
          "same bytes.",
          "A never-generated report is not faked. last_generated_at is null until a",
          "real run; the list renders — and the \"Never generated\" KPI counts them."
        ],
        "dataProcess": [],
        "interlinks": [
          "Outbound: linked_model_id → the model detail page; the run content",
          "references the security records it covers.",
          "Inbound: a model's detail page reaches its reports via",
          "/reporting?model=<id>; ?open=<id> opens a definition."
        ],
        "compliance": [
          "EU AI Act Art. 12 (record-keeping) — generation and definition changes are",
          "audit-logged; each run is an immutable persisted artifact.",
          "The removed \"digital signature\" tab claimed eIDAS / RSA-SHA256 signing the",
          "product does not perform; it is not represented as shipped."
        ],
        "operations": [
          "Generate from the list row or the detail drawer; the run downloads immediately",
          "and is retained in run history for re-download. Deleting a definition retains",
          "its persisted run artifacts."
        ],
        "fields": [],
        "noDocReason": null
      },
      {
        "label": "Settings",
        "route": "/settings",
        "parentLabel": null,
        "hasDoc": true,
        "docPath": "docs/modules/demo-import.md",
        "title": "Demo Data Import",
        "purpose": "A one-button way to seed the current organization with a small, coherent, clearly-fictional demo dataset so that every module shows live, interlinked data — and a matching one-button removal that deletes exactly what the import created and nothing else.",
        "why": "The retired /import-data page (pages/ImportSampleData.tsx) upserted raw data/seed.ts mock arrays straight into tables, with hardcoded ids and business codes (MDL-001, V-001) — the exact pattern the platform has spent three remediation waves removing. Records imported that way violated the one id-space, bypassed the service layer's error handling and audit logging, and could not be told apart from real customer data afterwards. The demo importer replaces that page. It exists so a new tenant can see the platform working as one product — interlinks resolving, deep links landing, dashboards popula",
        "how": [
          "Real service layer, real errors. Every write goes through the module's",
          "own service (modelService.upsertModel, vendorService.createVendor,",
          "riskService.upsertRisk, incidentService.upsertIncident,",
          "vendorAssessmentService, vendorSlaService, vendorDocumentService,",
          "aibomService, attestationService, provenanceService,",
          "carbonRecordsService, energyService, esgService, taskService), so",
          "writes THROW on failure and org scoping is filled DB-side",
          "(current_user_org_id() / tenant defaults) — the importer never sends an",
          "org id.",
          "No hardcoded uuids. Import order follows the dependency graph, and the",
          "id returned by each insert is threaded into the records that reference it,",
          "so every interlink resolves by construction:"
        ],
        "dataProcess": [],
        "interlinks": [
          "Everything the importer writes joins the one id-space — models by",
          "ai_models.id, vendors by vendors.id, risks by risks.id — never by name",
          "or business code:",
          "vendors → models (linked_models), models ← vendors via backlinks",
          "risks → models (linked_model_ids), vendors (linked_vendor_ids),",
          "incidents (linked_incident_ids), controls (linked_control_ids)",
          "incident → vendor (vendor_id), risk (linked_risk_ids), model (model_id)",
          "assessments / SLAs / documents → vendor (vendor_id)",
          "AIBOM record → model + vendor; components → AIBOM + vendor",
          "attestations → subject (subject_type/subject_id) + model / vendor",
          "provenance nodes → model / vendor; edges → nodes",
          "carbon / energy → model + emission_factor_id (citable catalog row)"
        ],
        "compliance": [
          "Demo data is fictional and labelled (gate 4): role labels instead of",
          "named people, .example domains, \"(Demo)\" names, and the removable",
          "demo_seed marker. No personal data is seeded.",
          "No fabricated assurance or measurements: attestations stay pending,",
          "the AIBOM stays draft/unscanned/unverified, SLA status is derived by the",
          "DB view from a recorded value, carbon/energy figures are estimated and",
          "cite a real emission factor (or the step is skipped), and the ESG report",
          "stays draft with no scores and no approver.",
          "Art. 12 traceability: every underlying service write logs itself, and",
          "the importer additionally writes a settings / demo_import audit entry",
          "for the overall import and remove outcomes — including failed attempts.",
          "Org isolation: all writes rely on DB-side defaults and RLS; the importer"
        ],
        "operations": [
          "Import: Settings → Demo data → Import demo data (confirm). Watch the",
          "step list; a failure names the failing step and shows the service error",
          "verbatim.",
          "Remove: Settings → Demo data → Remove demo data (confirm). Deletes",
          "only rows whose metadata contains demo_seed: true, children before",
          "parents (tasks → ESG → energy/carbon → provenance → attestations → AIBOM →",
          "vendor documents (including the stored files, via the service) → SLAs →",
          "assessments → incidents → risks → vendors → models), and reports the row"
        ],
        "fields": [],
        "noDocReason": "Workspace settings — documented in docs/getting-started/dashboard-setup.md."
      }
    ]
  }
]

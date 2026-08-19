// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// GENERATED FILE — DO NOT EDIT BY HAND.
// Source: CHANGELOG.md · Generator: scripts/gen_release_notes.py
// Regenerate with:  python3 scripts/gen_release_notes.py
//
// This is the real release history parsed from the repo's changelog. The
// "What's new" panel renders it directly, so the version a user sees is the
// version that actually shipped — not a hand-typed string.

/** One changelog entry, split from its conventional-commit prefix. */
export interface ReleaseEntry {
  /** feat | fix | docs | chore | … — null when the entry is not conventional. */
  type: string | null
  /** The scope in `feat(scope):`, when present. */
  scope: string | null
  summary: string
  breaking: boolean
  /** Short commit sha the changelog linked, when present. */
  sha: string | null
  /** `###` sub-heading this entry appeared under, when present. */
  section: string | null
}

export interface Release {
  version: string
  /** ISO-ish date exactly as the changelog recorded it; null if it had none. */
  date: string | null
  /** Number of entries in the changelog for this release. */
  entryCount: number
  /** Entry text — populated only for the most recent releases (see `DETAILED_RELEASE_COUNT`). */
  entries: ReleaseEntry[]
  /** False when entry text was omitted to keep the bundle small. */
  detailed: boolean
}

/** Work merged but not yet cut into a release. */
export interface UnreleasedChanges {
  entryCount: number
  entries: ReleaseEntry[]
}

/** The most recent released version, or null if the changelog has none. */
export const LATEST_VERSION: string | null = "1.66.0"

/**
 * Releases carrying full entry text. Older releases are listed with their
 * version, date and entry count only — the count is still real, so the UI can
 * say how many changes it is not showing rather than implying there were none.
 */
export const DETAILED_RELEASE_COUNT = 12

/** Total releases recorded in CHANGELOG.md. */
export const TOTAL_RELEASE_COUNT = 67

export const RELEASES: Release[] = [
  {
    "version": "1.66.0",
    "date": "2026-08-17",
    "entryCount": 6,
    "entries": [
      {
        "type": null,
        "scope": null,
        "summary": "Merge remote-tracking branch 'origin/main' into claude/modules-audit-akm64k",
        "breaking": false,
        "sha": "0428705",
        "section": null
      },
      {
        "type": "docs",
        "scope": "privacy",
        "summary": "module doc, compliance mapping, four-role review record",
        "breaking": false,
        "sha": "32f5c83",
        "section": null
      },
      {
        "type": "feat",
        "scope": "privacy",
        "summary": "autonomous GRC — agents that create real linked records",
        "breaking": false,
        "sha": "2b55da8",
        "section": null
      },
      {
        "type": "feat",
        "scope": "privacy",
        "summary": "rebuild DSR and Consent on platform primitives",
        "breaking": false,
        "sha": "0e1ccee",
        "section": null
      },
      {
        "type": "feat",
        "scope": "privacy",
        "summary": "surface RoPA/TIA/DPIA interlinks in the UI",
        "breaking": false,
        "sha": "0741448",
        "section": null
      },
      {
        "type": "fix",
        "scope": "privacy",
        "summary": "canonical vocabularies, tenant orphans, full interlink graph",
        "breaking": false,
        "sha": "d91afd6",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.65.0",
    "date": "2026-08-17",
    "entryCount": 8,
    "entries": [
      {
        "type": "feat",
        "scope": null,
        "summary": "rebuild Vendors/TPRM, AI Supply Chain & Sustainability on the platform contract (#75)",
        "breaking": false,
        "sha": "16f6a8c",
        "section": null
      },
      {
        "type": "feat",
        "scope": "interlinks",
        "summary": "surface the sustainability footprint on models; deep-link vendor records",
        "breaking": false,
        "sha": "d2bf761",
        "section": null
      },
      {
        "type": "feat",
        "scope": "supply-chain",
        "summary": "rebuild AIBOM, Provenance and Attestations; add module docs",
        "breaking": false,
        "sha": "1f0ce05",
        "section": null
      },
      {
        "type": "feat",
        "scope": "tprm,esg",
        "summary": "rebuild Vendors/TPRM and Sustainability clusters on real backends",
        "breaking": false,
        "sha": "1351b95",
        "section": null
      },
      {
        "type": "feat",
        "scope": "tprm,supply-chain,esg",
        "summary": "canonical schema, org-scoped RLS, and seeds on the one id-space",
        "breaking": false,
        "sha": "053ad49",
        "section": null
      },
      {
        "type": "docs",
        "scope": "compliance",
        "summary": "map TPRM, supply-chain and ESG modules to EU AI Act and ISO 42001",
        "breaking": false,
        "sha": "86be49b",
        "section": null
      },
      {
        "type": "docs",
        "scope": "technical-debt",
        "summary": "register the demo-table exposure, the grant gap, and unperformed verification",
        "breaking": false,
        "sha": "299e3d2",
        "section": null
      },
      {
        "type": "fix",
        "scope": "policies",
        "summary": "heal live framework/interlink column drift; supersede stale CI runs",
        "breaking": false,
        "sha": "be50387",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.64.0",
    "date": "2026-08-16",
    "entryCount": 54,
    "entries": [
      {
        "type": "feat",
        "scope": null,
        "summary": "agentic mesh + go-public + Security/Risk/Compliance groups on the platform contract (#74)",
        "breaking": false,
        "sha": "49b15da",
        "section": null
      },
      {
        "type": "feat",
        "scope": "ci",
        "summary": "static duplicate-version guard in the replay checker",
        "breaking": false,
        "sha": "5b543c8",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance-critical",
        "summary": "Autopilot tenancy gate + audit-trail consolidation + honest Overview",
        "breaking": false,
        "sha": "63f6434",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance-critical",
        "summary": "controls/evidence interlink graph, testing cadence, Art. 12 logging",
        "breaking": false,
        "sha": "9a7dbf6",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance-critical",
        "summary": "full policy lifecycle — rich text, versions, approval, sign-off, acknowle",
        "breaking": false,
        "sha": "6bb9b58",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance-critical",
        "summary": "regulatory honesty, statutory windows, Trust Center made real",
        "breaking": false,
        "sha": "7f38d57",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance",
        "summary": "Audit Management, Calendar, Evidence + Audit Trail wiring",
        "breaking": false,
        "sha": "7a66005",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance",
        "summary": "canonical org-scoped schema + cross-linked seeds (22 modules)",
        "breaking": false,
        "sha": "32c24ff",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance",
        "summary": "frameworks & controls cluster on real backends (7 pages)",
        "breaking": false,
        "sha": "127d0d5",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance",
        "summary": "one real policy module — Policies/Templates/Editor/Documents",
        "breaking": false,
        "sha": "f86a343",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance",
        "summary": "regulatory cluster on real backends (7 pages)",
        "breaking": false,
        "sha": "ae9d85a",
        "section": null
      },
      {
        "type": "feat",
        "scope": "compliance",
        "summary": "service + hooks layer for the 22-module group",
        "breaking": false,
        "sha": "6538fa0",
        "section": null
      },
      {
        "type": "feat",
        "scope": "interlinks",
        "summary": "model detail becomes a back-link hub (Risk & Security tab)",
        "breaking": false,
        "sha": "0475eee",
        "section": null
      },
      {
        "type": "feat",
        "scope": "mesh",
        "summary": "agentic mesh — 10 always-on sentinel fleet on the shared event bus",
        "breaking": false,
        "sha": "8aede88",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-critical",
        "summary": "canonical Risk Register seeds with full interlinks",
        "breaking": false,
        "sha": "ad44891",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-critical",
        "summary": "incident cluster elevation — editable incidents, Art. 73 prompt, unified except",
        "breaking": false,
        "sha": "d23f5a5",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-critical",
        "summary": "oversight + executive elevation — real notifications, multi-step approval UI, h",
        "breaking": false,
        "sha": "a6bb9ad",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-critical",
        "summary": "the Risk Register becomes the platform's operable center of gravity",
        "breaking": false,
        "sha": "49f9636",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-incidents",
        "summary": "canonical org-scoped schema + fictional demo seeds",
        "breaking": false,
        "sha": "c63d91f",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-incidents",
        "summary": "HITL, Approvals, Automation on the real oversight backend",
        "breaking": false,
        "sha": "d0b6d4a",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-incidents",
        "summary": "Incident Log + Workflow on the real incidents backend",
        "breaking": false,
        "sha": "aeda3a7",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-incidents",
        "summary": "Playbooks, Tabletop, Remediation, Exceptions on real backend",
        "breaking": false,
        "sha": "41b3ce5",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-incidents",
        "summary": "Risk Register interlinks + Matrix/Intelligence/Financial on real backend",
        "breaking": false,
        "sha": "d4c8c95",
        "section": null
      },
      {
        "type": "feat",
        "scope": "risk-incidents",
        "summary": "service + hooks layer on the throws-on-failure contract",
        "breaking": false,
        "sha": "7aaa2a1",
        "section": null
      },
      {
        "type": "feat",
        "scope": "security",
        "summary": "canonical backend + seeds for the Security group (13 modules)",
        "breaking": false,
        "sha": "072f453",
        "section": null
      },
      {
        "type": "feat",
        "scope": "security",
        "summary": "repoint Defense & Policies pages to real backend (13/13 done)",
        "breaking": false,
        "sha": "a09832e",
        "section": null
      },
      {
        "type": "feat",
        "scope": "security",
        "summary": "repoint Threats&Scans + Red Teaming pages to real backend",
        "breaking": false,
        "sha": "1dcd9bf",
        "section": null
      },
      {
        "type": "feat",
        "scope": "security",
        "summary": "service + hooks layer for the Security group",
        "breaking": false,
        "sha": "81fb15a",
        "section": null
      },
      {
        "type": "fix",
        "scope": "audit",
        "summary": "client-side audit writes actually land in audit_log",
        "breaking": false,
        "sha": "d974207",
        "section": null
      },
      {
        "type": "fix",
        "scope": "ci",
        "summary": "replay-checker array-cast bug, pinned actions, eval spacy dep",
        "breaking": false,
        "sha": "c109ea1",
        "section": null
      },
      {
        "type": "fix",
        "scope": "compliance-critical",
        "summary": "write-path repair, RLS hardening, canonical controls, id-space seed heals",
        "breaking": false,
        "sha": "c558081",
        "section": null
      },
      {
        "type": "fix",
        "scope": "db",
        "summary": "baseline eval_techniques — live-only table extended by main's new canonical migration",
        "breaking": false,
        "sha": "852bc58",
        "section": null
      },
      {
        "type": "fix",
        "scope": "db",
        "summary": "from-zero replay executes end-to-end — verified on real Postgres 16",
        "breaking": false,
        "sha": "a736c63",
        "section": null
      },
      {
        "type": "fix",
        "scope": "db",
        "summary": "replay-heal main's cross-tenant RLS migration",
        "breaking": false,
        "sha": "b0c7b42",
        "section": null
      },
      {
        "type": "fix",
        "scope": "db",
        "summary": "replay-heal main's privacy-group migration (consent_records.tenant_id)",
        "breaking": false,
        "sha": "6340985",
        "section": null
      },
      {
        "type": "fix",
        "scope": "db",
        "summary": "tolerate pgcrypto install in shadow DB — CLI role lacks pg_read_file",
        "breaking": false,
        "sha": "32614b7",
        "section": null
      },
      {
        "type": "fix",
        "scope": "db",
        "summary": "unique migration versions — same-date files collided in schema_migrations",
        "breaking": false,
        "sha": "0aec4f9",
        "section": null
      },
      {
        "type": "fix",
        "scope": "db",
        "summary": "unique versions for the two bare-20260816 migrations — CI drift collision",
        "breaking": false,
        "sha": "fa1b3ed",
        "section": null
      },
      {
        "type": "fix",
        "scope": "fabric",
        "summary": "telemetry plane + incident cascade actually work end-to-end",
        "breaking": false,
        "sha": "81cb599",
        "section": null
      },
      {
        "type": "fix",
        "scope": "readiness",
        "summary": "repair migration replay, security CI, broken SQL — go-public blockers",
        "breaking": false,
        "sha": "5b394fd",
        "section": null
      },
      {
        "type": "fix",
        "scope": "risk-critical",
        "summary": "core data-contract and cascade fixes from the criticality re-audit",
        "breaking": false,
        "sha": "b18fb7f",
        "section": null
      },
      {
        "type": "fix",
        "scope": "security",
        "summary": "constant console.error format strings (semgrep unsafe-formatstring)",
        "breaking": false,
        "sha": "884b1cf",
        "section": null
      },
      {
        "type": "fix",
        "scope": "security",
        "summary": "constant console.warn format strings (semgrep unsafe-formatstring)",
        "breaking": false,
        "sha": "c716bb3",
        "section": null
      },
      {
        "type": "fix",
        "scope": "security",
        "summary": "SecurityHome on real data + canonical vocabulary across the group",
        "breaking": false,
        "sha": "2c5d3f1",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "docs(mesh)+fix(db): honest always-on activation path",
        "breaking": false,
        "sha": "40c3f63",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main: autonomous-grc provenance — agent writes reconciled against replayed schema",
        "breaking": false,
        "sha": "6d69ab2",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main: interlink rollout + privacy seeds — conflicts resolved, replay healed",
        "breaking": false,
        "sha": "2e42956",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re",
        "breaking": false,
        "sha": "66bd1d9",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re",
        "breaking": false,
        "sha": "f028ff7",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re",
        "breaking": false,
        "sha": "d4374ef",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge remote-tracking branch 'origin/main' into claude/agentic-mesh-architecture-d6y5re",
        "breaking": false,
        "sha": "22bea9b",
        "section": null
      },
      {
        "type": "docs",
        "scope": "compliance",
        "summary": "module docs for all 22 modules — new pages + corrected claims",
        "breaking": false,
        "sha": "b4fe42a",
        "section": null
      },
      {
        "type": "docs",
        "scope": "risk-incidents",
        "summary": "data-backing sections for all 13 wired modules",
        "breaking": false,
        "sha": "9b9a878",
        "section": null
      },
      {
        "type": "chore",
        "scope": "risk-incidents",
        "summary": "QA pass — fix Button variant, drop orphaned remediation layer",
        "breaking": false,
        "sha": "b0935ef",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.63.0",
    "date": "2026-08-16",
    "entryCount": 3,
    "entries": [
      {
        "type": "feat",
        "scope": "autonomous-grc",
        "summary": "make the governance mesh actually fire and write",
        "breaking": false,
        "sha": "918a08e",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "ca2966c",
        "section": null
      },
      {
        "type": "docs",
        "scope": "completion",
        "summary": "version live-only seeds, close compliance mapping gaps",
        "breaking": false,
        "sha": "eb3c7fb",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.62.0",
    "date": "2026-08-16",
    "entryCount": 9,
    "entries": [
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "51ce891",
        "section": null
      },
      {
        "type": "feat",
        "scope": "interlinks",
        "summary": "platform-wide interlink audit, rollout and map",
        "breaking": false,
        "sha": "ec10ad8",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "8e936c2",
        "section": null
      },
      {
        "type": "fix",
        "scope": "privacy",
        "summary": "repair DSR silent write failure, wire Consent, migrate DPIA",
        "breaking": false,
        "sha": "4efdf67",
        "section": null
      },
      {
        "type": "fix",
        "scope": "compliance",
        "summary": "migrate RoPA, TIA and Compliance Controls off demo tables",
        "breaking": false,
        "sha": "ab8db91",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "228114f",
        "section": null
      },
      {
        "type": "security",
        "scope": "rls",
        "summary": "fix cross-tenant holes; docs: mandatory 4-role review process",
        "breaking": false,
        "sha": "e14a2b3",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "3b3a94c",
        "section": null
      },
      {
        "type": "fix",
        "scope": "evals",
        "summary": "real backend for Eval Techniques; docs: agentic mesh architecture",
        "breaking": false,
        "sha": "b2341e8",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.61.0",
    "date": "2026-08-16",
    "entryCount": 5,
    "entries": [
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "ce5c959",
        "section": null
      },
      {
        "type": "feat",
        "scope": "interlinks",
        "summary": "embed real cross-module figures instead of bare links",
        "breaking": false,
        "sha": "d324610",
        "section": null
      },
      {
        "type": "fix",
        "scope": "ia",
        "summary": "connect isolated modules across AI Assets, Assess and Trust groups",
        "breaking": false,
        "sha": "7501c8a",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "29070b8",
        "section": null
      },
      {
        "type": "refactor",
        "scope": "ia",
        "summary": "retire Model Catalog into the canonical Model Registry",
        "breaking": false,
        "sha": "78dd342",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.60.0",
    "date": "2026-08-16",
    "entryCount": 4,
    "entries": [
      {
        "type": "feat",
        "scope": "gateways",
        "summary": "real backend for MCP group, Model Catalog and Playground",
        "breaking": false,
        "sha": "d5748e9",
        "section": null
      },
      {
        "type": "fix",
        "scope": "integrations,tasks",
        "summary": "move both modules onto real org-scoped backends",
        "breaking": false,
        "sha": "b12bae9",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge release v1.59.0 from main",
        "breaking": false,
        "sha": "ce1c47a",
        "section": null
      },
      {
        "type": "chore",
        "scope": "migrations",
        "summary": "consolidate task seeds into the canonical migration path",
        "breaking": false,
        "sha": "b7d5614",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.59.0",
    "date": "2026-08-16",
    "entryCount": 2,
    "entries": [
      {
        "type": null,
        "scope": null,
        "summary": "Merge release v1.58.0 from main",
        "breaking": false,
        "sha": "6b1aadd",
        "section": null
      },
      {
        "type": "feat",
        "scope": "govern",
        "summary": "AI Literacy, AI Apps inventory, and Trust Center modules",
        "breaking": false,
        "sha": "8f2f2d9",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.58.0",
    "date": "2026-08-16",
    "entryCount": 6,
    "entries": [
      {
        "type": "chore",
        "scope": "bias-audits",
        "summary": "delete retired legacy pages and orphan services",
        "breaking": false,
        "sha": "6ceb5a1",
        "section": null
      },
      {
        "type": "chore",
        "scope": "db",
        "summary": "drop legacy datasets cluster per consolidation plan (F-8 complete)",
        "breaking": false,
        "sha": "876f447",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "ASSESS & VALIDATE: enhance, interlink, and seed Nepal-context data",
        "breaking": false,
        "sha": "5578889",
        "section": null
      },
      {
        "type": "feat",
        "scope": "ai-assets",
        "summary": "datasets family on real org-scoped backend + group audit",
        "breaking": false,
        "sha": "8d5a8d0",
        "section": null
      },
      {
        "type": "feat",
        "scope": "seed",
        "summary": "Nepal-grounded seed data for the datasets family",
        "breaking": false,
        "sha": "ac77f52",
        "section": null
      },
      {
        "type": "fix",
        "scope": "ai-assets",
        "summary": "close remaining audit findings F-6, F-7, F-8 (code)",
        "breaking": false,
        "sha": "acf4635",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.57.0",
    "date": "2026-08-14",
    "entryCount": 9,
    "entries": [
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "10a79a0",
        "section": null
      },
      {
        "type": "feat",
        "scope": "ia",
        "summary": "9-group navigation, 42 redirects, shims retired",
        "breaking": false,
        "sha": "419d04c",
        "section": null
      },
      {
        "type": "feat",
        "scope": "ia",
        "summary": "merge Agents inventory, fold Executive Center + ROI into CISO, retire legacy pages",
        "breaking": false,
        "sha": "4723cc5",
        "section": null
      },
      {
        "type": "feat",
        "scope": "ia",
        "summary": "one Evidence surface, Frameworks 5-to-2, Conformity on real data",
        "breaking": false,
        "sha": "ddf7ec9",
        "section": null
      },
      {
        "type": "feat",
        "scope": "ia",
        "summary": "one real Risk Register and one real Audit Trail",
        "breaking": false,
        "sha": "2feb1d9",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "c375d18",
        "section": null
      },
      {
        "type": "fix",
        "scope": "nav",
        "summary": "broken Vulnerabilities link, dead palette, fabricated badges",
        "breaking": false,
        "sha": "93c3ea0",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "Merge main",
        "breaking": false,
        "sha": "fa4ee43",
        "section": null
      },
      {
        "type": "fix",
        "scope": "trust-engine",
        "summary": "remove tab strip duplicating the sidebar",
        "breaking": false,
        "sha": "882e568",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.56.0",
    "date": "2026-08-14",
    "entryCount": 2,
    "entries": [
      {
        "type": null,
        "scope": null,
        "summary": "Merge release v1.55.0 from main",
        "breaking": false,
        "sha": "d7c9546",
        "section": null
      },
      {
        "type": "feat",
        "scope": "trust-engine",
        "summary": "Live Inference Traces + Active Guardrails on real data; retire demo tables",
        "breaking": false,
        "sha": "20d1082",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.55.0",
    "date": "2026-08-14",
    "entryCount": 9,
    "entries": [
      {
        "type": "feat",
        "scope": "runtime-trust",
        "summary": "rebuild Performance Monitoring, Model Efficiency, GenAI Risk Profiles on real d",
        "breaking": false,
        "sha": "bbf33a3",
        "section": null
      },
      {
        "type": "feat",
        "scope": "trust-engine",
        "summary": "Costs & Tokens, Fallback Failovers, Tool Monitor on real data",
        "breaking": false,
        "sha": "c0afd17",
        "section": null
      },
      {
        "type": "feat",
        "scope": "trust-engine",
        "summary": "Runtime Trust dashboard + Configuration on real backends",
        "breaking": false,
        "sha": "8fbc1f6",
        "section": null
      },
      {
        "type": "db",
        "scope": null,
        "summary": "model_efficiency joinable to registry (model_id uuid) + org defaults",
        "breaking": false,
        "sha": "ea830e9",
        "section": null
      },
      {
        "type": "db",
        "scope": "trust",
        "summary": "runtime-trust foundation + coherent 14-day seeds",
        "breaking": false,
        "sha": "6cc3850",
        "section": null
      },
      {
        "type": "cleanup",
        "scope": "dashboard",
        "summary": "remove unreferenced legacy api/ layer",
        "breaking": false,
        "sha": "c8ecb74",
        "section": null
      },
      {
        "type": "security",
        "scope": "backend+infra",
        "summary": "authenticate the API, security headers, honest CI gates, replayable migrati",
        "breaking": false,
        "sha": "314cbf7",
        "section": null
      },
      {
        "type": null,
        "scope": null,
        "summary": "security(rls)+docs: close all 64 anon-open policies + rewrite README",
        "breaking": false,
        "sha": "da08778",
        "section": null
      },
      {
        "type": "security",
        "scope": "frontend",
        "summary": "server-side roles, gated demo auth, live logging, honest audit writes",
        "breaking": false,
        "sha": "133d871",
        "section": null
      }
    ],
    "detailed": true
  },
  {
    "version": "1.54.0",
    "date": "2026-08-13",
    "entryCount": 5,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.53.0",
    "date": "2026-08-13",
    "entryCount": 7,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.52.0",
    "date": "2026-08-13",
    "entryCount": 5,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.51.0",
    "date": "2026-08-13",
    "entryCount": 9,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.50.0",
    "date": "2026-08-13",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.49.0",
    "date": "2026-08-13",
    "entryCount": 6,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.48.0",
    "date": "2026-08-13",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.47.0",
    "date": "2026-08-13",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.46.0",
    "date": "2026-08-13",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.45.0",
    "date": "2026-08-13",
    "entryCount": 14,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.44.0",
    "date": "2026-08-09",
    "entryCount": 6,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.43.0",
    "date": "2026-08-09",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.42.0",
    "date": "2026-08-09",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.41.0",
    "date": "2026-08-09",
    "entryCount": 4,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.40.0",
    "date": "2026-07-17",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.39.0",
    "date": "2026-07-17",
    "entryCount": 3,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.38.0",
    "date": "2026-07-15",
    "entryCount": 10,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.37.0",
    "date": "2026-07-11",
    "entryCount": 18,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.36.0",
    "date": "2026-07-10",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.35.0",
    "date": "2026-07-10",
    "entryCount": 12,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.34.0",
    "date": "2026-07-02",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.33.0",
    "date": "2026-07-02",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.32.0",
    "date": "2026-07-02",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.31.0",
    "date": "2026-07-02",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.30.0",
    "date": "2026-07-02",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.29.0",
    "date": "2026-07-02",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.28.0",
    "date": "2026-07-02",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.27.0",
    "date": "2026-07-02",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.26.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.25.0",
    "date": "2026-07-01",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.24.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.23.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.22.0",
    "date": "2026-07-01",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.21.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.20.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.19.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.18.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.17.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.16.0",
    "date": "2026-07-01",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.15.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.14.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.13.0",
    "date": "2026-07-01",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.12.0",
    "date": "2026-07-01",
    "entryCount": 2,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.11.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.10.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.9.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.8.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.7.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.6.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.5.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.4.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.3.0",
    "date": "2026-06-30",
    "entryCount": 9,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.2.0",
    "date": "2026-06-30",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.1.0",
    "date": "2026-06-29",
    "entryCount": 1,
    "entries": [],
    "detailed": false
  },
  {
    "version": "1.0.0",
    "date": "2026-06-29",
    "entryCount": 728,
    "entries": [],
    "detailed": false
  }
]

export const UNRELEASED: UnreleasedChanges = {
  "entryCount": 56,
  "entries": [
    {
      "type": "fix",
      "scope": "ux",
      "summary": "**a missing database table now renders as a calm \"not set up yet\" state, never a raw PostgREST error.** A screen whose backing table has not been provisioned in an environment showed the operator `Could not find the table 'public.vendor_assessments' in the schema cache` — a precise message for an engineer, a crash for a CISO. New `dashboard/src/lib/supabaseError.ts` recognises the PostgREST schema-cache error (`PGRST205`) and the raw Postgres `42P01`, and `ErrorState` now renders those as a neutral, reassuring setup state (wrench icon, \"this module is not set up yet — a pending migration hasn't been applied; nothing is broken and no data has been lost\") with no retry-into-a-wall button, instead of the red alarm with the raw string. Real faults are unchanged. Applied automatically everywhere `ErrorState` is used, so the whole vendor/TPRM and supply-chain cluster degrades gracefully while its backend catches up. 7 new tests pinning that the raw \"schema cache\" phrasing never reaches the screen.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "ui",
      "summary": "**enterprise table capabilities** — opt-in row selection with a floating bulk-action bar on `DataTable`, dismissible faceted `FilterChips`, and a staggered `fade-in-up` entrance on KPI cards (Tailwind keyframes, no Framer Motion; zeroed under `prefers-reduced-motion` per WCAG 2.3.3). All four are opt-in, so the 36 existing `DataTable` pages are untouched until they pass the new props. Selection is keyed by a stable `getRowId`, never row index (which reshuffles under sort/filter), and the header checkbox acts on the current page only — selecting rows the operator cannot see is how a bulk action hits the wrong records. A page owns its bulk actions, so a mutating one is its own real throwing service call; the reference wiring (`VendorRegistry`) ships the safe **Export selected to CSV**. The Phase-1 \"dead-end\" interlinks the brief named were already in place (Incident → model via `InterlinkChip`, Risk → controls via `/controls/:id`, Agent → detail via a `?open=` Sheet), so those were left alone rather than re-done.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "security",
      "summary": "**close CSV formula injection (CWE-1236) in data exports.** New `dashboard/src/lib/csv.ts` (`toCsv`/`downloadCsv`) prefixes any cell beginning with `= + - @`/tab/CR with `'`, so a spreadsheet renders `=WEBSERVICE(\"http://attacker\")` as text instead of executing it when an auditor opens the file — and quotes every field per RFC 4180, which the hand-rolled exporters did not (a comma in a category broke the row; a `JSON.stringify`'d name still executed). Many exported fields are attacker-influenceable (a vendor name, an owner, a resource tag synced from a connected integration), so this is a real exposure in an export-heavy GRC product, not a theoretical one. `ModelRegistry` and `VendorRegistry` migrated onto the safe util; the remaining ~22 hand-rolled exporters are tracked as **TD-021** with the full list, being migrated incrementally rather than in one unreviewed overnight sweep that could silently regress audit-export columns. 14 new tests (CSV injection/quoting, faceted-filter derivation).",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "settings",
      "summary": "**AI Brain configuration tab.** New Settings > AI Brain tab lets administrators connect an AI provider (OpenAI, Anthropic, Google AI, Azure OpenAI), supply an API key (AES-256-GCM encrypted server-side via the `ai-brain-config` Edge Function), choose judge and embedding models, set the auto-action confidence threshold, and enable/disable the AI Brain engine. The tab explains what AI Brain activates: automated compliance evaluation, semantic search, auto-triage, trust-engine scoring, and intelligent evidence mapping. Key prefix (first 8 chars) is the only credential state returned to the browser. Backend: `ai_brain_config` table with RLS, Edge Function with JWT auth + org resolution. Module doc: `docs/modules/ai-brain-config.md`.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "honesty",
      "summary": "**null-guard KPI metrics in 4 more pages.** TrustEngineDashboard: traces/violations show '—' when analytics is null (consistent with trust index tile). GovernanceMesh: error rate '—' when no executions. BenchmarkingMaturity: overall level, gap score, trajectory '—' when empty; hardcoded `industryPercentile = 68` labeled as simulated. PolicyFirewall: block rate '—' when no evaluations.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "honesty",
      "summary": "**null-guard doc-jsonb and derived fields across 5 pages.** Agents.tsx: `trustScore`, `dailyCallCount`, `totalCallsLifetime`, `avgLatencyMs`, `maxBudget` wrapped in null checks with '—' fallback; `avgTrust` stat returns null (not 0) when no agents have declared trust scores. ModelDetail: drift score renders '—' instead of '0%' when no telemetry exists. AIImpactAssessments: `progressPct` null guard prevents 'undefined%' crash. IncidentLog: remediation `progressPct` null guard with '—' fallback and safe bar width.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "docs",
      "scope": "modules",
      "summary": "**100% guide coverage (135/135).** GenAI Risk Profiles doc written (`genai-risk-profiles.md`), completing the last undocumented sidebar destination. Compliance mappings updated (EU AI Act Art. 9, ISO 42001 6.1.2/A.5.4). 23 additional stub module docs expanded to full template format in the same pass.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "docs",
      "scope": "modules",
      "summary": "**autopilot.md rewritten from stub to full template** — Purpose, Why it exists, How it works, Features table, Interlinks, Compliance mapping (EU AI Act Art. 14, ISO/IEC 42001 A.9.2), Operations.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "compliance",
      "summary": "**DB-side audit trail for ai_models (TD-018 closed, EU AI Act Art. 12).** New `fn_audit_governed()` trigger function writes append-only rows to `audit_log` on every INSERT/UPDATE/DELETE against `ai_models`, capturing the actor (from `auth.uid()` / JWT email), org, before/after JSON, and action. Fires in the database so it also captures direct-SQL and service-role writes the app layer would miss. EXECUTE revoked from anon/authenticated to prevent PostgREST RPC exposure. Migration: `20260902000001_audit_trigger_ai_models_art12.sql`.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "rls",
      "summary": "**admin-gate organisation edits on live; lineage-agnostic migration.** Any authenticated user could rename the organisation via the Supabase client — the base `organizations_isolation` policy is FOR ALL. A new RESTRICTIVE FOR UPDATE policy gates writes on `is_org_admin()` (owner/admin role). The migration detects which auth primitives exist and does the right thing on either lineage (repo's `auth.has_permission` or live's `get_user_org_id`), avoiding the TD-000 defect where permissive policies OR-combine. Also fixed a latent bug in `is_org_admin()`: it was SECURITY DEFINER with `search_path=''` but referenced `user_profiles` unqualified, so every call errored. Migration: `20260901000003_organization_settings_writable.sql`.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "models",
      "summary": "**unmeasured accuracy/latency renders \"—\", never a fabricated 0.** `accuracy` and `latencyMs` in `seed.ts` and `modelMapping.ts` are now `null` (not `0`), and both KPI tile rows in ModelDetail guard null with a `—` in neutral colour. Same pattern as the fairness fix. Register dialog starts new models with null metrics.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "docs",
      "scope": "debt",
      "summary": "**TD-020 — live DB diverged from repo migration lineage.** Documents the four drifted primitives, the four migrations applied live via MCP, and the decision needed before `supabase db push` becomes safe again.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "integrations",
      "summary": "**monitored sources stop asking every product the same question.** All 216 catalogue products with no adapter were asked \"tenant, workspace or account\", an owner and a cadence — a field set true of nothing in particular, which produced a record nobody could act on because whoever eventually built the connection had to go and find out the real identifiers anyway. New `productProfiles.ts` carries **34 verified product profiles**: AWS is identified by a 12-digit account number and regions in scope and reached with a cross-account IAM role and external id; Zoom by an Account ID from a **Server-to-Server** OAuth app (not a user-level one, which does not survive an admin changing); Okta by an org URL and an SSWS token; Datadog by a **site**, because keys are not portable between `datadoghq.com`, `.eu` and the US3/US5 sites; Notion records *which pages are shared to the integration*, because a Notion integration sees only those and the evidence scope is otherwise unknowable later. Every slug is verified to exist in the seeded catalogue — a profile for a phantom slug is dead code that never runs and never fails, so it would rot silently. Products without a verified profile keep the category shape and the UI labels that as *\"this product's catalogue entry names…\"* rather than asserting it about the product: being honestly generic beats being specifically wrong, and the long tail gets no invented documentation. **The specificity does not weaken the secrets rule** — a monitored product still has no adapter, so profiles collect identifiers and scope only, with `authMethod` recording what the eventual adapter will need so the contract is captured without taking the secret early; a test asserts no `password` field and no secret-shaped id across every profile",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "ai-brain",
      "summary": "**retrieval-augmented compliance evaluation** — `policy_knowledge_base` (pgvector, HNSW on `vector_cosine_ops`), a `match_policy_chunks` RPC, an ingestion service that chunks and embeds policy text, and an LLM judge that decides whether raw integration evidence satisfies a control *against the org's own written policy* rather than a generic notion of the framework. The platform already had keyword search over policies (`20260421000006`); what it lacked was retrieval by meaning, which is what matching a provider JSON payload to a prose clause needs. **Three departures from the obvious design.** (1) `org_id`, not `tenant_id`: the platform has one tenancy id-space and a vector store keyed on the legacy `tenant_id text` could not join to the evidence it judges without a lossy bridge. (2) A verdict is evidence, so it is stored — `ai_compliance_verdicts` keeps the model, the prompt version and the ids of the chunks the model was shown, because \"why did the platform say this control passed?\" cannot be answered by a row holding only the answer; the raw evidence is **never** stored, only a SHA-256 fingerprint. (3) **A `fail` does not go straight to the mesh.** `RISK_DETECTED` already has seven subscribers, one of which — AutoPauseAgent — pauses production models; wiring a probabilistic judge to that means an inference nobody read can take a model offline. Fails below `SENTINEL_AI_AUTO_ACTION_CONFIDENCE` (0.85) raise a `hitl_items` review instead, and an unreachable judge records `inconclusive` and queues a human — an API outage marking controls satisfied is the worst failure this module could have. The judge runs at `temperature=0` with a provider-enforced `response_format`, so a compliance decision is never regex-parsed out of prose, and the prompt fences the evidence as untrusted data because an S3 object key or a resource tag is user-controlled text that ends up in a finding. Verified against a real PostgreSQL 16 with pgvector: retrieval ranks correctly, the similarity threshold excludes unrelated chunks, `match_count` is clamped server-side, and an org-A query returns **zero** org-B rows despite an identical vector. 15 tests",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "settings",
      "summary": "**the organisation's name is the organisation's, not a constant we shipped.** It is the most-shown string in the product — 28 pages put it in their subtitle, the board report prints it on every page and in its provenance table, and the narrative engine writes it into prose an auditor reads — and it came from a **hardcoded default in a browser localStorage store** (`settingsStore.ts`: `orgName: 'Sentinel Financial Corp'`, `domain: 'sentinel-grc.com'`, `primaryContact: 'admin@sentinel-grc.com'`). Three compounding faults: every tenant saw the same demo company until somebody typed over it; the value never left that one browser, so a second device or a cleared cache restored it; and **Settings → General was a mock-up** — `defaultValue=\"CertifyI\"`, a made-up `tenant_certifyi_prod` id, and a Save button wired to nothing. Meanwhile `organizations` already carried every one of those columns (`006_core`, `20260421000003`) with **no reader**, and the demo tenant was seeded as *Demo Tenant*, so the name shown was never the name stored. `organizations` is now the single source of truth: `settingsStore.ts` is **deleted** and its 28 consumers read `useOrgName()` off one shared query key, so a rename lands everywhere at once. An unset name renders as \"Your organisation\" — never a blank subtitle, never a placeholder company. `20260901000003` adds the UPDATE policy that made saving possible at all (`ws02_org_self_read` granted SELECT only, so the old Save would have failed at the database): scoped to `id = auth.current_org_id()` **and** `auth.has_permission('org.update')`, both repeated in `USING` and `WITH CHECK` — without the second an admin could move their organisation onto another tenant's id, which the two-org probe confirms is now refused outright. A PostgREST update that RLS refuses returns **no error and no row**, so `updateOrganization` throws on an empty result rather than toasting over a change that never happened",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "settings",
      "summary": "**give `notification_prefs` its first reader, and retire three tabs that were pretending.** The Notifications tab rendered six toggles whose on/off state was a literal in the JSX and whose clicks went nowhere, while the real org-scoped table sat unused since April; every switch now writes, with `org_id` filled DB-side by `get_org_id()`. The event types offered are the ones **this organisation has actually emitted**, read from `governance_events` — shipping a menu of events the platform might one day raise would put rules in front of an operator for things that never fire. No rules means nothing is being sent, and the empty state says exactly that instead of implying a hidden default set. **Team**, **API Keys** and **Compliance** each rendered a hardcoded array with buttons that did nothing, duplicating a module that already exists and works — a second, fake copy of a real screen is worse than no copy, because it splits where people look and invents state. They now point at IAM & Roles (`/access-control/*`), the Keys Vault (`/security/keys`) and Controls / Evidence Vault / evidence sources / Autopilot respectively. Not deleted outright: `?tab=team`, `?tab=api-keys` and `?tab=compliance` still resolve to a card naming where the subject went, because a tab people have used should not silently vanish. Worth stating plainly — \"Audit trail immutability\" had been a **switch**; the chain is append-only by construction, and offering it as a toggle implied it could be turned off",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "chore",
      "scope": "demo",
      "summary": "demo and seed identities move to `certifyi.ai` (`admin@certifyi.ai`, personas under `demo.certifyi.ai`). Demo **attack-surface hostnames** deliberately do not follow: those rows carry fabricated \"critical\" and \"high\" exposure findings, and hanging invented vulnerabilities on a domain somebody actually operates is a worse outcome than the string it replaces — they move to `example.com`, reserved by RFC 2606 for exactly this",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "integrations",
      "summary": "**every catalogue product now opens a real connection modal.** The catalogue published 219 evidence sources; three of them (`github`, `aws`, `microsoft_azure`) had a connect form and the other 216 had prose and no way to record anything — browsable and unusable. Clicking any entry now opens `ConnectDialog` with fields appropriate to that product, chosen by `buildConnectionProfile`. **The obvious fix was the wrong one**: rendering a credential form on all 219 would take a token for a product with no adapter — a stored secret nothing can ever use, supplied by an operator who would reasonably believe collection had started. So a connection has a **mode**. `automated` is unchanged: the adapter's own credential contract, AES-256-GCM encrypted server-side, first sync queued. `monitored` is new and takes **no credential at all** — it records which tenant is in scope, who is accountable for it, how often its evidence is refreshed by hand, and where that evidence lives, then says plainly on the card, in the dialog and in the record that nothing is pulling from it. Owner and cadence are **required on both sides**, because a registered source with neither is a list entry pretending to be a control. The monitored fields are derived from the catalogue row's own `category` and `evidence_pull` prose, so no product gets invented documentation. Three guards keep the modes from blurring: a CHECK constraint (`integrations_manual_holds_no_credentials`) that refuses a manual row carrying a credential blob at the database rather than in a code path; a `connection_mode = 'automated'` predicate on the daily `pg_cron` sync enqueue — verified on a from-zero replay to be load-bearing, since the same predicate without it returns a manual row marked `connected` and with it returns none, and every such job can only fail its five attempts; and promotion to `automated` when `connect` runs over a previously monitored row, so a source that gains an adapter is relabelled rather than left misdescribed. `/integrations` counts **Collecting** and **Monitored manually** separately, because summing them would overstate automated coverage. Also closes 2026-08-18 re-audit finding **N3**: `sync` gated only on `catalog_slug` being non-null while `connect` gated on `adapter_status`, so a product later withdrawn could still queue work the worker must refuse — it now gates on both the adapter status and the mode",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "deploy",
      "summary": "serve the dashboard at **`1shield-oss.certifyi.ai`**. Declared as a `custom_domain` route in `dashboard/wrangler.toml` — the manual `wrangler deploy` path — alongside the same declaration in the root `wrangler.jsonc` that the Cloudflare Git build reads (see the `chore(hosting)` entry below); the hostname is stated in both so neither deploy path can drop it. Reviewable and diffable rather than clicked once in a dashboard, so the hostname is reviewable and a fresh account can be stood up from the tree. **Additive, not a cutover** — the workers.dev subdomain keeps serving unless disabled separately, so existing links do not break the moment this lands. Also fixes the two places that would have quietly kept pointing at the old origin: the Playwright `baseURL` (E2E would have gone on testing workers.dev) and the DR runbook's `/healthz` check, which is worse than useless if it probes the wrong host mid-incident. Ticks the \"move to custom domain\" item that had been sitting unchecked in `dashboard/docs/DEPLOYMENT.md`. **Prerequisite: `certifyi.ai` must be a zone on the same Cloudflare account** — Cloudflare mints the DNS record and certificate itself for a custom domain and cannot do so for a zone it does not hold; if it is absent `wrangler deploy` fails on the hostname, and deleting the `[[routes]]` block restores the previous behaviour with nothing else depending on it",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "docs",
      "scope": "audit",
      "summary": "**re-audit** (`docs/reference/platform-audit-2026-08-18b.md`) — checks which of the morning's ten findings actually closed, by re-running every measurement rather than reading commit messages. **F1 is closed properly**: a from-zero replay now applies **150 of 150** migrations against a real PostgreSQL 16, where this morning it halted at 97 of 146. **F0 is closed.** **F2 is 4 of 13** — `e67e519` added defaults \"on the live org_id-bearing tables\", so nine remain and the two the original finding reproduced, `use_cases` and `datasets`, still fail byte-identically. **F3 is untouched**: still 23 write-capable destinations with neither `logAction` nor a DB audit trigger, and still zero of both on `ai_models`, `use_cases` and `datasets`. F4 improved 11 → 9 but gained `knowledge_graph`, which **two agents** now read and no migration creates. F6 went 40 → 41. Also audits the new $0-infra surface: the edge function is well built, but the evidence pipeline's clock now depends on GitHub Actions — the one piece of infrastructure that has been unable to allocate a runner all day — credential-shape validation moved from an immediate 400 to an hours-later `last_run_error`, `sync` does not gate on `adapter_status` where `connect` does, and \"continuous\" is a 24-hour batch that the UI does not say is a 24-hour batch",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "gateway",
      "summary": "**`mcp_tools` now decides instead of documenting.** The table has carried a complete authorization policy since August — `approval_state`, `requires_hitl`, `side_effects`, `risk_tier`, `scopes`, `allowed_agent_ids` — and **nothing read any of it at call time**: an operator could block a tool, grant it to two agents and mark it as needing human review, and an agent could still call it. This is the runtime. `sentinel/gateway/policy.py` is a pure decision function (no DB, no clock, no I/O) evaluating, in order: agent known → tool known → server not blocked → tool approved → **agent holds a grant** → within rate limit → no human required → allowed. `POST /v1/gateway/authorize` binds it to the database and records the outcome. Three orderings are deliberate: **authorization precedes rate limiting** (an ungranted agent is told so, not told to slow down — a 429 on a call that would never be permitted invites a retry loop); **human approval is evaluated last** (no point queueing a reviewer for what policy already refuses); and **identity precedes existence** (an unknown caller learns nothing about whether a tool exists). Fail closed throughout — an empty `allowed_agent_ids` means **nobody**, not everybody, which is the reading that does not silently open every tool when someone clears the field. New `rate_limit_per_hour` on `mcp_tools`: NULL unlimited, **0 suspends a tool without disturbing its approval history**. 30 backend tests cover the decision table exhaustively, including that every `reason_code` the rules emit is one the database CHECK constraint accepts — and that every code the constraint allows is reachable, so the vocabulary cannot drift",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "gateway",
      "summary": "**make enforcement visible.** New `/mcp-gateway/decisions` renders every decision the gateway made, defaulting to the ones that need attention rather than the allowed ones nobody opens the page for. **A pending approval is never folded into \"denied\"** — policy permitted that call and paused it for a person (EU AI Act Art. 14), it gets its own tone, its own filter and a link to the queued review; counting it as a refusal would misreport what the platform did and hide the queue from whoever must clear it. The tool catalogue gains an **Enforcement** column with live counts where \"No calls yet\" renders distinctly from zero refusals (never asked ≠ never refused), and the Overview posture card now counts real decisions instead of `mcp_tools.invocations_30d`, a stored column nothing maintains. Realtime rather than polling: a denial seen five minutes late is a denial nobody can act on. This also ends the isolation the 2026-08-18 audit recorded — `/mcp-gateway/*` had **no cross-module link in or out** and now reaches agents, HITL and the tool registry both ways",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "gateway",
      "summary": "`mcp_policy_decisions` — the durable record, with **no client insert policy**, because a decision a browser can write is not evidence. Denials matter most: a refused call never reaches `tool_call_logs`, so this is the only proof the control operated. `request_fingerprint` is a SHA-256 of the arguments and **never the arguments** — tool arguments routinely carry customer data, and the hash answers the one question an auditor asks of them. Org scoping filled DB-side; the migration asserts its own postconditions and re-runs the TD-000 permissive-policy test over the table it adds",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "chore",
      "scope": "hosting",
      "summary": "declare the dashboard custom domain `1shield-oss.certifyi.ai` in the root `wrangler.jsonc` (`routes` with `custom_domain: true`). On the next `wrangler deploy` Cloudflare provisions the DNS record + TLS cert automatically, provided `certifyi.ai` is a zone in the deploying Cloudflare account; the `*.workers.dev` URL keeps working alongside it. If the zone is not in the account, add the domain via the Cloudflare dashboard (Workers & Pages → sentinel → Settings → Domains & Routes → Add → Custom Domain) instead. Config only — provisioning needs the account's Cloudflare credentials, which are not present in this environment.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "nav",
      "summary": "the **Narrative Engine** menu item no longer silently redirects to Board Report. `/narrative-engine` had been \"parked\" as a supposed duplicate and routed to `/ciso/report`, but `pages/NarrativeEngine.tsx` is a distinct, functional page — an audience-shaped governance narrative composed from the real registers via `governanceFactsService` (null-not-0, with the source query shown behind each figure). Restored the lazy import and route. A cross-reference of every `navigation.ts` `to:` against the app's `<Navigate>` routes confirmed this was the **only** menu entry redirecting to a different module.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "gateway",
      "summary": "**give the enforcement gateway a home — an always-on free VM, not an edge function.** Removing the FastAPI deploy path left `POST /v1/chat/completions` (the inline LLM proxy in `sentinel/proxy.py`) with no host. It is data-plane — on the path of every LLM call, holds a Redis rate-limit connection, sanitizes prompts, circuit-breaks to the provider via litellm, streams responses, writes the audit chain — so it **cannot** be serverless (no warm Redis pool, CPU-time limits blow on streaming, cold starts hit enforcement latency, and the Python policy stack would need a full rewrite). New [`docker-compose.gateway.yml`](docker-compose.gateway.yml) runs it as `sentinel.proxy:app` + Redis off the existing image, `SENTINEL_DATABASE_URL` → Supabase, no local Postgres; ingress via an optional **Cloudflare Tunnel** service (no open inbound ports, free TLS, reusing the Cloudflare you already run). New [`.env.gateway.example`](.env.gateway.example) documents the real env contract (verified against `config.py`/`proxy.py`: `SENTINEL_SECRET_KEY`, `SENTINEL_DATABASE_URL`, `SENTINEL_REDIS_URL`, and provider keys litellm reads directly — `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`). Footprint is light — spaCy/torch are not dependencies, the sanitizer runs in regex fallback — so it fits ~512 MB and a free **Oracle Cloud Always Free** (or GCP `e2-micro`) VM; scale-to-zero platforms are explicitly ruled out. New runbook [`docs/operations/gateway-deployment.md`](docs/operations/gateway-deployment.md) and architecture doc [`docs/architecture/deployment-topology.md`](docs/architecture/deployment-topology.md) record the control-plane (serverless, $0) vs data-plane (hosted gateway) split — including the measured fact that of ~597 dashboard files, 106 talk to Supabase directly and the frontend's only tie to a hosted FastAPI was one gracefully-degrading events WebSocket plus one unreferenced config default, so dropping the FastAPI host changed almost nothing for the app. `backend-deployment.md` scoped to control-plane and cross-linked; TD-019 updated with where each of the three surfaces is hosted.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "integrations",
      "summary": "**run the evidence pipeline on $0 infrastructure, and fix a fifth break.** The earlier deploy plan used Fly.io; a continuous worker there costs a few USD/month, so with no budget that was the wrong default — this pass reimplements the deployable pieces on free tiers and **removes `fly.toml` and `deploy-backend.yml`.** connect/sync/available is now a **Supabase Edge Function** (`supabase/functions/integrations-connect/`, Deno) — free, already the project's serverless runtime — that encrypts credentials with **AES-256-GCM byte-compatible with the Python worker** (`crypto.py`'s `{v,nonce,ciphertext}` blob) and enqueues the sync; the frontend now calls it through `supabase.functions.invoke` (session token attached automatically), so `VITE_SENTINEL_API_URL` and the separate API host are gone entirely. The crypto interop is pinned by a Deno test against a fixed vector the Python `cryptography` library produced — if the two ever disagree, CI fails rather than silently storing blobs the worker can't decrypt. The Python **sync worker** stays (its adapters are Python) but gains a **drain-once mode** (`run(drain=True)`, `SENTINEL_WORKER_DRAIN`) and runs as a **daily GitHub Actions job** (`evidence-worker.yml`, secrets-guarded, ~60 free minutes/month) that drains what `pg_cron` enqueued and exits — no 24/7 process. Both write paths were grounded in the **live** schema of project `vhparvughsygyknblkzt` (verified: `integrations.org_id` defaults to `current_user_org_id()`, which is NULL under the service role, so the function sets it explicitly from `user_profiles`). **Fifth break, found while building this:** `process_job` read `payload[\"org_id\"]`/`[\"integration_slug\"]`, but both connect surfaces enqueue only `{integration_id, catalog_slug}` — the worker would `KeyError` on every real job. Fixed by making the `integrations` row the authority (derive `org_id` and slug from it, keyed by `integration_id`), which also keeps the org boundary intact. Runbook rewritten for the free-tier path (`docs/operations/backend-deployment.md`); roadmap updated (`docs/reference/continuous-evidence-roadmap.md`).",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "integrations",
      "summary": "**close the evidence-collection loop, which broke in four places.** The platform has all the parts of continuous evidence collection — an event bus, the sync worker, `pg_cron` schedules, the job queue, the control mapper — but the loop never closed, and this pass fixes the two breaks that are code (the other two are deployment, addressed below). **③** `connect()` writes an integration row with `status='configuring'` and enqueues one immediate sync, but the worker updated `last_sync_at`/`last_run_status`/`health` and **never `status`**, while both cron schedules re-enqueue only `where i.status='connected'` — so nothing promoted `configuring → connected` and collection ran **exactly once** at connect time, never again. `worker.py` now promotes the row to `connected` on first successful sync (guarded so it never overwrites a terminal state a human or another path set), so the daily schedule picks it up. **④** the connect/sync router (`/v1/integrations/*`) was mounted on **only** `sentinel/proxy.py`'s app, but the container runs `sentinel.api.main:app`, which never mounted it — so a deployed API would answer every `POST /v1/integrations/connect` with 404. The router is now also mounted in `main.py`, ahead of the catch-all frontend proxy that only exempts `api`/`ws`/`favicon` paths and would otherwise swallow its GET routes; verified via the app's own OpenAPI schema. Residual two-app fork recorded as **TD-019**.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "deploy",
      "summary": "_**[superseded by the free-tier entry above — `fly.toml` and `deploy-backend.yml` were removed; connect runs as a Supabase Edge Function and the worker as a scheduled GitHub Actions job. Retained here for history.]**_ **the Python backend is now deployable** (Fly.io), closing breaks **①** (nothing deployed the API) and **②** (nothing ran the sync worker). New [`fly.toml`](fly.toml) defines one app with two processes off a single image — `web` (`uvicorn sentinel.api.main:app`) and `worker` (`python -m sentinel.integrations.worker`) — the `web` machine suspending when idle, the `worker` running continuously to poll the job queue. The `Dockerfile` now installs the `[integrations]` extra so the worker carries its provider SDKs (`boto3`, `PyGithub`). New [`deploy-backend.yml`](.github/workflows/deploy-backend.yml) redeploys on push to `main` touching the backend, guarded on a `FLY_API_TOKEN` secret so it **skips with a notice** (never reds `main`) until Fly is wired up. Full runbook — secrets, one-time setup, verification, and an honest note that a 24/7 worker is a few USD/month, not free, with a cheaper scheduled-worker alternative — in [`docs/operations/backend-deployment.md`](docs/operations/backend-deployment.md). The phased plan for what deploys unblocks (continuous evidence → autonomous mesh, both gated on TD-017/TD-018) is in [`docs/reference/continuous-evidence-roadmap.md`](docs/reference/continuous-evidence-roadmap.md).",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "chore",
      "scope": "cleanup",
      "summary": "delete two provably-dead frontend files — `useCommitteesData.ts` and the `ViewAsRole` component (zero consumers, verified by grep). Two more flagged as unnecessary (`ContextualAlert`, `EvidenceAttachments`) are **kept**, not deleted: `EvidenceAttachments` implements the platform's evidence-chain principle and is the right thing to *wire in*, not remove — the wire-or-remove decision for both is recorded in the roadmap rather than made by deleting built capability.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "security",
      "summary": "**close a cross-tenant read on seven tables.** `20260421000014_ws02_tenancy_sweep` classified eleven tables as \"tables [that] serve every tenant\" and gave each `FOR SELECT TO authenticated USING (true)`. Three genuinely are global reference data; eight are not. One of the eight (`audit_findings`) was caught in `20260821000001` — \"every tenant could read every other tenant's audit findings\" — and **the other seven were never revisited**: `document_versions`, `event_cascade_links`, `incident_workflow_steps`, `observability_metrics`, `vendor_questionnaires`, `workflow_step_actions`, `module_health`. Each holds tenant data, each also carries a correct org-scoped policy, and that does not help, because **Postgres OR-combines permissive policies** — `USING (true)` widens access straight past the org predicate beside it. This is **TD-000 recurring**, the register entry written to preserve exactly this lesson. Reproduced on a from-zero replay before the fix (a user in Org A read Org B's `document_versions`) and again after (own rows only). `20260830000003` drops the two `ws02_catalog_*` policies on all seven and narrows `event_cascade_links.cascade_org_insert` — which was `WITH CHECK (true)`, allowing a cross-tenant **write** — to the caller's own org rather than dropping it, since the governance event bus writes through it. Self-verifying: it refuses to run if any of the seven would be left without an org-scoped read or without its service-role policy, and it re-runs TD-000's regression query before finishing. Whole-schema recheck leaves only `emission_factors`, `integration_catalog` and `policy_templates` permissive — all three have no `org_id` column at all",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "docs",
      "scope": "audit",
      "summary": "**platform audit — modules, features, database, interlinks** (`docs/reference/platform-audit-2026-08-18.md`). Every migration was applied to a **real PostgreSQL 16**, so all 253 tables are verifiable rather than the 187 the static checker can parse (TD-015's blind spot), and the code side was measured over 468 files, 157 route bindings and the 134 menu destinations. Ten findings with reproduction for each. The three that matter beyond the fix above: **(1)** a from-zero replay **halts at migration 97 of 146** — eight migrations fail, five of them the same `incidents/risks/vendors/frameworks` text-vs-uuid split, and because the first failure is `replay_repair.sql` — whose entire purpose is re-applying the guarded early migrations — one type mismatch silently strips the rest of that file and cascades into three more failures. TD-014 recorded two of the eight and assumed the rest unreachable; under `supabase db push` that assumption costs **50 migrations that never run**. **(2)** **Thirteen create paths are rejected by their own RLS policy** — `org_id` has no DB default, no trigger fills it, the INSERT policy requires it, and the service never sends it; `insert into use_cases (name)` was reproduced returning *\"new row violates row-level security policy\"*, and the same insert with `org_id` supplied succeeds. **(3)** `ai_models`, `use_cases` and `datasets` — including the canonical model id-space — are covered by **neither** `logAction` nor `fn_audit_trigger`, so registering or deleting an AI model leaves no audit record with an actor (note the near-miss: `model_inventory` **is** trigger-audited, `ai_models` is not). Also: 11 tables the dashboard reads that no migration creates (two of them behind live RBAC admin screens), 3 tables with RLS off, **40 `<entity>_id` columns with no foreign key** — the mechanism behind the 2026-08-17 audit's \"98 references resolve to nothing\" — 12 modules with no cross-module link in or out, and error states missing on 64 of 120 destinations. Recorded as **TD-016/017/018**, and TD-014's scope note corrected against the evidence",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "integrations",
      "summary": "**AWS and Microsoft Azure are connectable.** They were the two most-asked-for evidence sources and both said \"Catalogued for reference only — no adapter ships for this product yet\", which was accurate and is now fixed at the root rather than reworded. New `sentinel/integrations/aws/adapter.py` runs **14 read-only checks** (root and user MFA, password policy, 90-day access-key age, direct `AdministratorAccess`, multi-region CloudTrail actually logging, S3 public-access block and default encryption, EBS default encryption, RDS storage encryption, security groups exposing admin ports to `0.0.0.0/0` or `::/0`, KMS rotation on customer keys, an *enabled* GuardDuty detector, AWS Backup plans) via `boto3`, imported lazily and declared as a new `[integrations]` extra so the API server does not carry it. New `sentinel/integrations/azure/adapter.py` runs **9 read-only checks** (enabled Conditional Access MFA policy, Owner-assignment sprawl, storage anonymous access and TLS floor, managed-disk encryption, NSG ingress from Internet, Key Vault purge protection, activity-log export, Defender for Cloud plans) over the ARM and Microsoft Graph REST APIs using the `httpx` already in the tree — **no new dependency**. Both support cross-account/tenant auth the way the provider recommends (AWS `sts:AssumeRole` with an external id; Azure an Entra ID app registration with Reader), and both ship as **`beta`, not `available`**: every check is implemented and unit-tested, neither has been run against a production tenant, and claiming otherwise is the fabricated-capability failure this catalogue exists to prevent. The UI states it on the connect screen. Migration `20260830000001` flips the two catalogue rows and asserts the catalogue and the Python registry agree. 51 new tests (`tests/test_aws_adapter.py`, `tests/test_azure_adapter.py`) drive both adapters offline against stubbed provider payloads and assert the judgement calls, not the plumbing: a programmatic-only IAM user is not flagged for missing MFA, `443` open to the world is not a finding while `22` is, a `1000-4000` port range is parsed as a range covering `3389`, an inactive access key is not \"stale\", platform-managed Azure disk keys count as encryption, and a missing read permission renders **NOT_AVAILABLE** rather than a pass or a fail",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "integrations",
      "summary": "a stale `adapter_status` can no longer hide a Connect button the server would accept. `adapter_status` is set by a migration while the adapter registry lives in Python, and the two deploy separately — so a database that had not received migrations showed AWS as unconnectable no matter how many times the frontend shipped. `reconcileWithServer()` now folds `GET /v1/integrations/available` (the server's own answer to \"what will I accept?\") over the catalogue before it renders, in both directions: a product the server ships is offered as `beta`, and a product the catalogue advertises but the server does not know has its Connect withdrawn. An unreachable backend leaves the catalogue untouched, because \"no answer\" is not evidence that nothing is connectable. Cross-checked by a test asserting the connect forms, the Python registry and the migration all name the same three slugs — and that Azure is keyed by its catalogue slug `microsoft_azure`, never `azure`",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "catalog",
      "summary": "the competitor's help-centre text now disappears with the frontend, not with the database. `20260829000002` clears every `docs_hint` naming a third-party GRC platform, but nothing had applied it, so \"Provider docs: Vanta Help Center → …\" was still on screen. `sanitizeDocsHint()` applies the same rule at render time and `fetchIntegrationCatalog` drops the competitor slugs, so the two halves agree regardless of deploy order. Dropped rather than rewritten, for the same reason as the migration: we hold no verified documentation URL for 217 products and inventing them would be fabricated data",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "catalog",
      "summary": "verifying that scrub against a real Postgres found three rows it had missed, because it only looked at `docs_hint`. The **`connect_steps`** on `openai_azure_openai`, `anthropic_claude_api` and `langsmith_langfuse` — the walkthrough rendered in-product as \"Connection steps\" — told the reader to add the API key *in a competitor's product*. That is worse than a docs pointer: it is not a reference but an instruction someone may actually follow. `20260830000002` rewrites the three phrases and `sanitizeConnectSteps()` mirrors it client-side. A rewrite rather than a clear this time, because the sentence is our own walkthrough describing where a credential is entered and that place is Sentinel; every provider-specific fact in the step (which key, which role, which scope) is left exactly as the source workbook had it. Bounded to literal phrases — a blanket name substitution would corrupt any row using the word in another sense — and the migration now verifies **every** operator-facing text column, not just the one that prompted it",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "integrations",
      "summary": "a real connect flow — this is where you fill in credentials. Connect now opens a form built from the provider's own `credentialFields` (GitHub: access token, organization, optional Enterprise base URL) and posts to the new **`POST /v1/integrations/connect`** (`sentinel/integrations/api.py`), which refuses any slug with no registered adapter, validates the credential shape against the adapter's own model, **encrypts with AES-256-GCM** and stores only ciphertext, upserts on `(org_id, catalog_slug)` so reconnecting updates in place, and enqueues the first `background_jobs` sync — a privileged write with no client insert policy, which is why it belongs on the server. The org comes from the caller's verified token, never the request body. The browser holds credential values only for the life of the form, sends them once over TLS and clears them on resolve; nothing reaches localStorage, the query cache or the URL, and error paths never echo submitted input. Adds `POST /v1/integrations/{id}/sync` and a **Sync now** action. 11 new backend tests assert the security invariants — one of which **caught a real bug before merge**: the registry raises `LookupError` and the handler caught `KeyError` (its subclass), so an unknown slug would have surfaced as a 500 instead of a clean 400",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "catalog",
      "summary": "remove third-party GRC vendor references from the integration catalogue. 163 rows' `docs_hint` sent operators to a **competitor's help centre** — rendered in-product as \"Provider docs: Vanta Help Center → … help.vanta.com/…\" — which is not the provider's documentation, advertises another GRC vendor inside our own product, and makes our catalogue look derived from theirs. `20260829000002` clears every such pointer (cleared, not rewritten: we hold no verified per-product doc URLs for 219 products and inventing 163 would be fabricated data) and removes `drata`/`secureframe` as catalogue entries, guarded so a product any tenant has actually connected is never deleted. The genuinely useful operator prose — `why_needed`, `evidence_pull`, `connect_steps`, `evidence_mapping` — is untouched. Catalogue is now 217 products, verified clean and idempotent. Also replaces a competitor name used as an evidence `source` in demo seed data",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "write-paths",
      "summary": "close the last three instances of the broken-scoping bug class. `attackSurfaceService`, `ethicsReportsService` and `policyFirewallService` each sent `tenant_id` on upsert to tables that have no such column — the three TD-015 named as most likely, all confirmed against a real Postgres. Every save on Attack Surface, Ethics Reports and Policy Firewall failed at the API boundary. All three tables already carry an `org_id` DB default, so no migration was needed: the services now send only the record. Proven both ways against the real schema — the old shape is rejected for the missing column, the new one inserts with `org_id` filled server-side",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "demo-data",
      "summary": "the eight seeded connector rows named individual people as accountable owners of production-sounding systems — the core banking feed, the credit bureau extract, the Nepal Rastra Bank supervisory return — with **no marker saying they were demonstration data**, making them indistinguishable on screen from real records. That failed the platform's own compliance gate twice: \"no personal data in seeds or fixtures\", and \"demo data stays fictional and labeled as such\". `20260829000001` replaces every owner with a ROLE label, suffixes each name \"(Demo)\", and marks `config.demo_seed = true` so they are identifiable and removable like every other demo record. Scoped to the eight seeded ids in the demo org — a tenant's own connectors are never rewritten, verified against a real Postgres alongside a control row that must stay untouched. Idempotent (no double suffix on re-run) and self-verifying: it raises if any seeded row still names a person or lacks the marker",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "ci",
      "summary": "add the **Deploy Migrations** workflow — the missing half of the deploy pipeline. `deploy-dashboard.yml` shipped the frontend on every push to main while **nothing applied the schema**, so merged work that depended on a migration was live in the bundle and absent from the database; empty catalogues and \"column does not exist\" errors all traced back to this one gap. The new workflow runs the static replay check first (catching an ordering mistake before touching the live database), then `supabase db push`, guarded by a concurrency group so two pushes cannot race mid-apply, with a *dry run* option that lists what is pending and changes nothing. It stops with a clear message listing exactly which of the three required secrets is missing rather than failing obscurely part-way through",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "integrations",
      "summary": "tabs on `/integrations` are URL-addressable (`?tab=connectors`, `?tab=webhooks`), matching the repo's deep-link convention, so a link can point at a specific tab and a reload lands where the reader expects. The catalogue is the default and stays clean in the URL",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "integrations",
      "summary": "surface the 219-product evidence catalogue and wire the evidence chain to controls. `integration_catalog` (219 rows), `integration_findings`, `control_finding_evidence` and `background_jobs` had **zero readers** anywhere in the app or edge functions — the platform had a real collection pipeline, a real control-mapping engine, and no way for a user to reach any of it; `/integrations` showed only hand-created connector records from a separate, older table. Adds a **Catalog** tab: all 219 sources with category filters and search across the operator prose (so \"which of these evidences MFA?\" is answerable), each stating its adapter status honestly. **Connect is rendered only for a product that ships an adapter** — exactly one (`github`) today — and a catalogued-only entry says why it cannot be connected while still showing what it would evidence, how it is pulled and what it maps to. `isConnectable()` is the single gate and mirrors the server, which refuses slugs absent from its registry. Connect creates the org `integrations` row carrying `catalog_slug` (status `configuring` — linked, not yet collecting; credentials stay server-side, AES-256-GCM, never in the browser); disconnect soft-deletes but **retains findings**, since disconnecting a source must not erase the evidence trail (Art. 12). Both audit-logged. New **Automated Evidence** tab on `ControlDetail` lists the findings mapped to that control with posture, counts and remediation — deliberately separate from `controls.status`, because a machine finding is a signal about a control, not the owner's assertion about it. Reverse view on each connected source shows what it has actually collected, worst-first, or an honest \"nothing collected yet\". New `docs/modules/integration-catalog.md`; 21 new unit tests (322 total) including the capability gate that stops a catalogued-only product ever offering Connect",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "chore",
      "scope": "replay-check",
      "summary": "report the migration checker's own blind spot instead of implying it away. `check_migration_replay.py` verifies column references only against tables whose literal `CREATE TABLE` it parsed; tables born inside a dynamic `execute format('create table …')` loop are learned only from later `ALTER`s and cannot be column-checked. It now prints the full list — **81 of 268 tracked tables (30%)** — so \"replay check clean\" reads honestly as \"clean for the tables it can see\". This is not theoretical: **all four broken write paths repaired in `20260827000001` were on dynamically-created tables**, which is exactly why a client sending a non-existent column passed this gate for six audit waves. Recorded as **TD-015**, which also names the three most likely next instances (`attack_surface_assets`, `ethics_reports`, `policy_firewall_rules` — all dynamic, all still injecting `tenant_id`)",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "notifications",
      "summary": "repair the Notifications inbox, which failed outright with `column notifications.notification_type does not exist`. Root cause: `public.notifications` is created **twice** — `20260418000002_core_grc_tables` (`tenant_id`/`notification_type`/`message`/`entity_*`) and `20260421000006_phase4_foundation` (`org_id`/`type`/`body`/`resource_*`/`url_path`) — and the second `CREATE TABLE` is `IF NOT EXISTS`, so whichever era reached a database first silently won. Phase-4 heals an era-1 database forward but nothing healed an era-2 database back, and the app reads era-1 names, so on an era-2 database every read threw. The application was split the same way: the drawer and two of three writers used era-1 names while `governance-dispatcher` wrote era-2 names **plus a `severity` column that has never existed in either era** — and did not check its insert, so those notifications were discarded in silence. `20260828000001_notifications_schema_convergence.sql` converges the table on one canonical column set; it is **additive only** (never drops a column, since a deployment's starting shape cannot be observed from the repo) and carries data across the naming split (`type`→`notification_type`, `body`→`message`, `resource_*`→`entity_*`) so no notification is lost, then asserts every column the drawer selects exists. `governance-dispatcher` now writes canonical columns and fails loudly on error — a dropped governance notification is a missed escalation (EU AI Act Art. 14). Verified against a real Postgres in **both** starting states, each converging with its existing row preserved and re-running cleanly. New `docs/modules/notifications.md` documents the two-era history and the residual debt (era-2 columns left in place, empty, pending a confirm-then-drop follow-up)",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "legal",
      "summary": "author the Terms of Service and Privacy Policy and wire them into the product. Canonical text lives in `docs/legal/` and is published at certifyi.ai; `dashboard/src/lib/legal.ts` holds the URLs and the operating entity (Dignep Group Pvt. Ltd., Pulchowk Lalitpur, reg. no. 200505/2075/76) in one place. The Login and Signup pages previously linked both documents with `href=\"#\"` — and Signup **blocked registration behind an \"I agree\" checkbox for documents the user had no way to open**. Both now resolve. The Help panel gains a Legal card linking the same documents from inside the product. The Privacy Policy is written against what the platform actually does: the five fields registration collects, Supabase Auth, the audit trail's attributed actor, DB-enforced tenant isolation, the real sub-processor list (Supabase, Cloudflare, optional Sentry), and explicit statements that we do not sell data, carry no advertising trackers, and do not train models on customer data",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "trust-claims",
      "summary": "remove fabricated assurance from the authentication pages. **\"SOC 2 Type II certified\" was displayed on Login, Signup and Forgot Password with no such audit ever completed** — confirmed with the platform owner. Also removed: \"ISO 27001\" and \"GDPR Compliant\" badges (the latter is not a certification anyone issues), and **two fabricated customer testimonials** — \"CISO, Fortune 500 Financial Services Firm\" claiming an 18-months-to-6-weeks result, and \"Head of AI Risk, Tier-1 European Bank\". No such customers said these things. Replaced with claims that are true and checkable: TLS in transit, encryption at rest, and tenant isolation enforced by row-level security in the database. `docs/legal/README.md` records that no certification claim may be reintroduced until a report exists",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "write-paths",
      "summary": "repair four broken create/edit paths. `bcpPlansService`, `departmentsService`, `redTeamFindingsService` and `trainingService` each sent `tenant_id` on upsert to tables that have **no such column** (`bcp_plans`, `departments`, `red_team_findings`, `training_courses` are scoped by `org_id`). PostgREST rejects a row carrying an unknown column, so **every save on Business Continuity, Departments, Red Team Findings and Training Courses failed** at the API boundary. The services now send only the record and let the database fill the scoping column (CLAUDE.md First principle #3). `20260827000001_org_scoping_defaults_repair.sql` supplies the `DEFAULT current_user_org_id()` those columns needed for that to work — `departments.org_id` was `NOT NULL` with no default at all, so dropping the client value alone would have traded one write failure for a NOT NULL violation. Idempotent, self-verifying (raises if any of the four still lacks a default), and confirmed against a real Postgres replay",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "docs",
      "scope": "modules",
      "summary": "document the last four undocumented menu destinations — `ai-impact-assessments.md` (`/aiia`), `performance-monitoring.md` (`/performance-monitoring`) and `business-continuity.md` (`/continuity`, reached as both Resilience and Business Continuity). Written from the real schema, services and pages, with two honest gaps recorded rather than smoothed over: neither AIIA nor Business Continuity writes to the audit log (EU AI Act Art. 12), and the continuity page's RTO/RPO cells read columns `bcp_plans` does not have, so they always render `N/A`. **User guide coverage reaches 134/134 menu destinations (100%)**",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "fix",
      "scope": "compliance",
      "summary": "framework cards on `/compliance` deep-link to `/frameworks?open=<framework_id>` instead of the generic list, so a card opens that framework's own Requirements tab — its published control catalog — rather than making the reader find it again",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "side-panels",
      "summary": "rebuild the four right-hand panels — Get started, User guide, What's new, Help — on real, derived data. `NAV` moves out of `Sidebar.tsx` into `dashboard/src/data/navigation.ts` as the platform's ONE navigation structure, consumed by both the sidebar and the guide, so the two can no longer drift. The **User guide is regenerated from that menu plus the authored module docs** (`scripts/gen_module_guides.py` → `moduleGuides.generated.ts`): 10 sections mirroring the menu exactly, **130 of 134 menu destinations documented (97%)** from 66 of the 86 files in `docs/modules/`, each entry carrying purpose, how it works, **where the data comes from** (the real tables/services behind the screen), fields, interlinks and compliance, plus deep links to the module and to its source doc. A destination with no module doc renders \"Not documented yet\" with **no body at all** — never invented prose — and the 4 real gaps (`/aiia`, `/performance-monitoring`, `/continuity` ×2) are printed by the generator and surfaced in Help. **What's new** now renders the real changelog (`scripts/gen_release_notes.py` → `releases.generated.ts`): 67 releases, latest v1.66.0, unreleased work carried separately so it cannot read as shipped — replacing a hard-coded \"Sentinel v1.43.0 · 2 hours ago · Release 57\" that linked to a tag which was never cut. **Help** gains real build diagnostics (version, release count, guide coverage). Full-text entries are kept for the 12 most recent releases and the trim is stated in the UI rather than implied away. Both generators run with `--check` in CI so the panels cannot fall behind their sources. Guide search, keyboard-visible focus and honest empty states throughout. Deletes the superseded implementation — `moduleGuides.tsx`, `guides/guides1-3.tsx` and the never-mounted `UserGuideDrawer.tsx` (~2,860 lines of hand-written prose describing 11 collections against 10 real sections). New `docs/modules/side-panels.md`; 30 new unit tests (301 total) including a structural assertion that the guide covers every menu destination exactly once",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "frameworks",
      "summary": "author the real, published control catalog for all 15 frameworks into `framework_controls` — **936 controls**, every advertised `control_count` now backed by actual rows (previously every framework advertised a count with zero catalog rows behind it). Adds five NEW frameworks with full catalogs: **SOC 2** (61 TSC criteria), **ISO/IEC 27001:2022** (93 Annex A controls), **HIPAA** (76 Security/Privacy/Breach provisions), **HITRUST CSF v11** (156 control references), **PCI DSS v4.0** (246 requirements) — alongside complete catalogs for the ten AI/privacy/ethics frameworks (ISO 42001 38, NIST AI RMF 72, EU AI Act 34, GDPR 39, OWASP LLM 10, OECD 10, Singapore 25, UNESCO 25, Google SAIF 21, MITRE ATLAS 30). All control refs/titles are the real published identifiers. The catalog is a **global reference** (system-org rows readable by every tenant via RLS; per-tenant rows stay private), fixing a latent bug where the seeded frameworks were not visible to the demo tenant. Idempotent seeds; from-zero replay clean.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "ui",
      "summary": "enterprise design pass — unified the two divergent elevation systems (shadcn overlays vs. hand-built cards) onto one shadow-token ramp and upgraded to two-layer neutral-tinted shadows (both themes); typography optics (size-scaled heading tracking, balanced wrapping, tabular numerals on data columns); refined the left-nav sidebar (persistent brand mark, real hover/focus affordances on section headers); fixed an invisible-border bug in `ErrorState`. Tokens/markup only — no behavior, routes, or component APIs changed.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "frameworks",
      "summary": "wire the published control catalog (`framework_controls`) into the Frameworks UI, interlinked both ways. New `frameworkCatalogService.ts` (throwing reads + pure framework/clause matchers) and `useFrameworkCatalog.ts` hook (catalog grouped by domain, org-controls join tolerant per the `safeSource` discipline). The framework detail sheet gains a **Requirements** tab rendering the catalog grouped by domain (`control_ref`, `title`, `description`, `control_type`) with skeleton/empty/error states; each published control links to the org `controls` implementing it, or shows an honest \"Not yet implemented\" (\"Implementation status unavailable\" when the register can't be read). Overview now shows the catalog count distinct from the implemented count. Reverse link: `ControlDetail` Interlinks tab resolves the catalog entry a control satisfies (`useControlCatalogEntry`) and deep-links to `/frameworks?open=<framework_id>`; `?open=` now opens a framework's detail. Queries carry no `org_id` filter — the catalog is a global reference at the system org, readable by every tenant via RLS. Interlink proof: 936 catalog controls, 12 resolve to an implementing org control; reverse 13/13 org controls resolve back to a catalog entry. Read-only — no migration touched.",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "demo-table-retirement",
      "summary": "rebuild the last five modules reading generic `(id, doc jsonb)` demo tables — Asset Registry (`assets`), Business Impact Analysis (`bia_records`), Identity Governance / Access Reviews (`access_reviews`), Model Risk Committee (`mrc_meetings`/`mrc_agenda_items`/`mrc_votes` + new `mrc_committee_members`) and Reporting (`security_reports`/`security_report_runs`) — on throwing services, React Query hooks and platform primitives with skeleton/empty/error states, `logAction` on every mutation, and bidirectional interlinks. Fixes the invisible MRC model-id defect (0/12 → 4/4 agenda items, 8/8 votes resolve; `model_id` converted text→uuid with a FK so a fabricated id is now rejected by the DB). Deletes every fabricated metric on these pages (fake audit history, invented KPIs, named approvers, the RSA-SHA256 \"sign-off\" tab, the `setTimeout` fake-generate flow)",
      "breaking": false,
      "sha": null,
      "section": null
    },
    {
      "type": "feat",
      "scope": "onboarding",
      "summary": "data-driven \"Get started\" guided-setup checklist — each step's done-state is derived from the real tables (never stored), surfaced in the RightSidebar and as a dismissible `/overview` card; `null` sources render as \"Unknown\", never as done or not-done",
      "breaking": false,
      "sha": null,
      "section": null
    }
  ]
}

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
  "entryCount": 1,
  "entries": [
    {
      "type": "feat",
      "scope": "integrations",
      "summary": "**Microsoft Entra ID adapter, and the shared Graph client the phase-1 cluster will build on.** Real evidence collection goes from four products to six (`microsoft_entra_id` + `microsoft_entra_id_gcc_high`), and — more consequentially — the token, sovereign-endpoint selection and `@odata.nextLink` paging now live in one place (`sentinel/integrations/msgraph/`) that every phase-1 Graph adapter (Intune, SharePoint, OneDrive, Teams, Defender, Sentinel, Key Vault, DevOps) will consume next, so each of those slugs is checks-only. Two catalogue slugs, one adapter: the sovereign cloud is chosen by the credentials class (`EntraGccHighCredentials` defaults `cloud='usgov'`), not by a hostname in the check code — a GCC High connection cannot silently query commercial Graph and report an empty tenant as clean, which is the specific failure mode this design refuses. Six checks against documented Graph v1.0 endpoints: **tenant-wide MFA** (passes on **either** security defaults OR an enabled Conditional Access policy — the two are mutually exclusive in practice, so checking only one would fail a correctly configured tenant); **Global Administrator count** at or below Microsoft's own guidance of five; **dormant enabled accounts** (leaver-review evidence); **guest inventory** (reported as INFO — guests are legitimate; the control is that they are reviewed); **app-registration credential expiry** (separates expired from expiring so rotation can be scheduled); **sign-in log retrievability** for Art. 12/CC7.2. Mapped to SOC 2 CC6.x/CC7.x, ISO 27001 A.9.x/A.12.4, HIPAA 164.308/312, PCI 7/8/10, GDPR Art. 30. **Honesty enforced in code, not copy:** a permission that was not consented (or an unlicensed sign-in-activity `$select`) reports `NOT_AVAILABLE`, never `PASSED`; the Global Administrator role being absent from the tenant is an *unknown*, not zero admins; and the validate() error deliberately does not echo the response body, because an Entra error can quote the submitted `client_id`. Ships **`beta`, not `available`** — written against the documented Graph API and unit-tested against recorded payloads via `httpx.MockTransport` (16 tests, including one that asserts GCC High requests land on `graph.microsoft.us` / `login.microsoftonline.us`), not yet run against a live tenant. Landed the full four steps the registry docstring requires — adapter, registry entries for both slugs, connect forms (`microsoft_entra_id`, `microsoft_entra_id_gcc_high`), and catalogue flip (`20260923000001`) — and the six sync guards (Python + TS) were updated in the same commit. **Rollout ratio:** 6 of 217 collect, 213 remaining across phases 1–8; Phase 1 progressed from 0/13 to 2/13.",
      "breaking": false,
      "sha": null,
      "section": null
    }
  ]
}

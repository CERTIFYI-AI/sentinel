// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// setupChecklists — the declarative registry behind the "Get started" guided
// setup experience.
//
// This is NOT a product tour. A tour points at UI chrome and claims "you have
// been shown this"; the moment a layout changes it lies, and it can never know
// whether the thing it pointed at was actually configured. This registry
// instead declares governance-meaningful steps whose done-state is DERIVED from
// the real tables by `useSetupProgress` — so the checklist doubles as an honest
// completeness indicator and cannot go stale (CLAUDE.md, First principle #5).
//
// The one hard contract every step honours:
//
//   isDone(ctx) -> boolean | null
//     true  = the query proves the step is done
//     false = the query proves it is not
//     null  = the underlying source could not be checked ("Unknown")
//
// A `null` NEVER renders as done and NEVER renders as not-done — it renders as
// "Unknown", so a failed query never nags a correctly-configured org and never
// congratulates an empty one. `detail(ctx)` returns a factual sub-line
// ("3 of 7 models have an owner") or null when it cannot be computed — a
// missing count is omitted, never shown as 0 (CLAUDE.md UI/UX gate).

/**
 * Everything a step needs to decide its own state, resolved once per pass by
 * `useSetupProgress`. Every field is `number | null` (or `boolean | null`):
 * `null` means the query for that source failed and the step must show
 * "Unknown". A real, empty org yields `0`, which is an honest "not started".
 */
export interface SetupContext {
  /** ai_models carrying the { demo_seed:true } marker exist. */
  demoImported: boolean | null

  // AI inventory ------------------------------------------------------------
  modelsTotal: number | null
  /** Models with a business or technical owner set. */
  modelsWithOwner: number | null
  /** Models carrying an EU AI Act risk tier. */
  modelsWithTier: number | null
  useCasesTotal: number | null
  useCasesLinkedToModel: number | null

  // Risk & incidents --------------------------------------------------------
  risksTotal: number | null
  risksLinkedToModel: number | null
  incidentsTotal: number | null

  // Compliance & controls ---------------------------------------------------
  controlsTotal: number | null
  conformityTotal: number | null

  // Evidence ----------------------------------------------------------------
  evidenceTotal: number | null
  evidenceLinkedToControl: number | null

  // Vendors / TPRM ----------------------------------------------------------
  vendorsTotal: number | null
  /** Vendors whose linked_models is non-empty — the exact control whose
   *  absence made vendor concentration risk permanently empty. */
  vendorsLinkedToModel: number | null
  criticalVendorsTotal: number | null
  criticalVendorsWithReassessment: number | null

  // AI supply chain ---------------------------------------------------------
  aibomTotal: number | null
  attestationsTotal: number | null
  provenanceTotal: number | null

  // Sustainability / ESG ----------------------------------------------------
  carbonTotal: number | null
  energyTotal: number | null
  esgTotal: number | null

  // Tasks -------------------------------------------------------------------
  tasksTotal: number | null
  tasksLinked: number | null
}

export interface SetupStep {
  id: string
  title: string
  /** One sentence: what this unlocks / which obligation it serves. */
  why: string
  actionLabel: string
  /** Route, deep-linked where the destination page supports it. */
  actionTo: string
  /** Real-data verdict: true done, false not-done, null cannot-tell. */
  isDone: (ctx: SetupContext) => boolean | null
  /** Optional factual sub-line, or null when it cannot be computed. */
  detail?: (ctx: SetupContext) => string | null
}

export interface SetupGroup {
  id: string
  title: string
  description: string
  /** Route prefixes that map a page to this group (longest match wins). */
  routePrefixes: string[]
  steps: SetupStep[]
}

// ── detail helpers ───────────────────────────────────────────────────────────

/**
 * "N of M <noun> …". Returns null (line omitted) when either count is unknown
 * or there is nothing to describe — a fraction of 0 is never fabricated.
 */
function fraction(done: number | null, total: number | null, noun: string, verb: string): string | null {
  if (done === null || total === null || total === 0) return null
  return `${done} of ${total} ${total === 1 ? noun : `${noun}s`} ${verb}`
}

/** `true` iff both counts are known and every one of `total` satisfies. */
function allOf(done: number | null, total: number | null): boolean | null {
  if (done === null || total === null) return null
  return total > 0 && done === total
}

/** `true` iff the count is known and at least one row exists. */
function atLeastOne(n: number | null): boolean | null {
  if (n === null) return null
  return n > 0
}

// ── registry ─────────────────────────────────────────────────────────────────

const platformGroup: SetupGroup = {
  id: 'platform',
  title: 'Start here',
  description: 'The fastest way to see the whole platform working end to end.',
  routePrefixes: ['/overview'],
  steps: [
    {
      id: 'import-demo',
      title: 'Import demo data to explore the platform',
      why: 'Seeds a small, clearly-labelled fictional dataset — linked models, vendors, risks and more — so every module shows real interlinks instead of empty states.',
      actionLabel: 'Open demo data',
      actionTo: '/settings?tab=demo-data',
      isDone: (c) => c.demoImported,
    },
    {
      id: 'register-model',
      title: 'Register your first AI model',
      why: 'The model registry is the platform’s id-space — every risk, control, vendor link and assessment resolves back to a model (EU AI Act Art. 11 technical documentation).',
      actionLabel: 'Open model registry',
      actionTo: '/models/inventory',
      isDone: (c) => atLeastOne(c.modelsTotal),
      detail: (c) => (c.modelsTotal === null ? null : c.modelsTotal === 0 ? null : `${c.modelsTotal} model${c.modelsTotal === 1 ? '' : 's'} registered`),
    },
  ],
}

const inventoryGroup: SetupGroup = {
  id: 'inventory',
  title: 'AI inventory',
  description: 'Register the models and use cases everything else hangs off.',
  routePrefixes: ['/models', '/use-cases', '/aiia', '/ai-risk-tiering'],
  steps: [
    {
      id: 'register-model',
      title: 'Register your first AI model',
      why: 'Nothing can be governed until it is inventoried — the model registry is the entity every other module links to.',
      actionLabel: 'Open model registry',
      actionTo: '/models/inventory',
      isDone: (c) => atLeastOne(c.modelsTotal),
      detail: (c) => (c.modelsTotal === null || c.modelsTotal === 0 ? null : `${c.modelsTotal} model${c.modelsTotal === 1 ? '' : 's'} registered`),
    },
    {
      id: 'model-owner',
      title: 'Give every model an owner',
      why: 'Accountability is the first governance obligation — an unowned model has no one answerable for it (ISO/IEC 42001 A.3, EU AI Act Art. 14).',
      actionLabel: 'Assign owners',
      actionTo: '/models/inventory',
      isDone: (c) => allOf(c.modelsWithOwner, c.modelsTotal),
      detail: (c) => fraction(c.modelsWithOwner, c.modelsTotal, 'model', 'have an owner'),
    },
    {
      id: 'classify-tier',
      title: 'Classify models under the EU AI Act risk tier',
      why: 'The risk tier decides which obligations apply — high-risk systems carry the heaviest documentation and oversight duties (EU AI Act Art. 6).',
      actionLabel: 'Open risk tiering',
      actionTo: '/ai-risk-tiering',
      isDone: (c) => allOf(c.modelsWithTier, c.modelsTotal),
      detail: (c) => fraction(c.modelsWithTier, c.modelsTotal, 'model', 'carry a risk tier'),
    },
    {
      id: 'link-use-case',
      title: 'Link a use case to its model',
      why: 'Obligations attach to how a model is used, not just to the model — the use case is where intended purpose and affected people are recorded (EU AI Act Art. 9).',
      actionLabel: 'Open use cases',
      actionTo: '/use-cases',
      isDone: (c) => atLeastOne(c.useCasesLinkedToModel),
      detail: (c) => fraction(c.useCasesLinkedToModel, c.useCasesTotal, 'use case', 'linked to a model'),
    },
  ],
}

const riskGroup: SetupGroup = {
  id: 'risk',
  title: 'Risk & incidents',
  description: 'Turn the risks and incidents you find into tracked, owned records.',
  routePrefixes: ['/risks', '/risk', '/financial-risk'],
  steps: [
    {
      id: 'record-risk',
      title: 'Record a risk against a model',
      why: 'Risk management is continuous, not a one-off classification — a risk linked to its model is the unit the AI Act’s Art. 9 process operates on.',
      actionLabel: 'Open risk register',
      actionTo: '/risks',
      isDone: (c) => atLeastOne(c.risksLinkedToModel),
      detail: (c) => fraction(c.risksLinkedToModel, c.risksTotal, 'risk', 'linked to a model'),
    },
    {
      id: 'log-incident',
      title: 'Log an incident',
      why: 'Serious incidents are reportable within tight deadlines — a live incident log is what makes that traceable (EU AI Act Art. 73).',
      actionLabel: 'Open incident log',
      actionTo: '/risk/incidents',
      isDone: (c) => atLeastOne(c.incidentsTotal),
      detail: (c) => (c.incidentsTotal === null || c.incidentsTotal === 0 ? null : `${c.incidentsTotal} incident${c.incidentsTotal === 1 ? '' : 's'} logged`),
    },
  ],
}

const complianceGroup: SetupGroup = {
  id: 'compliance',
  title: 'Compliance & controls',
  description: 'Stand up the control library and back it with evidence.',
  routePrefixes: ['/compliance', '/controls', '/frameworks', '/conformity'],
  steps: [
    {
      id: 'define-control',
      title: 'Define your control library',
      why: 'Controls are how obligations become operational — without them a framework is a checklist no one can test (ISO/IEC 42001 Clause 8).',
      actionLabel: 'Open controls',
      actionTo: '/compliance/controls',
      isDone: (c) => atLeastOne(c.controlsTotal),
      detail: (c) => (c.controlsTotal === null || c.controlsTotal === 0 ? null : `${c.controlsTotal} control${c.controlsTotal === 1 ? '' : 's'} defined`),
    },
    {
      id: 'attach-evidence',
      title: 'Attach evidence to a control',
      why: 'An untested, unevidenced control is an assertion, not assurance — evidence is what an auditor actually inspects (EU AI Act Art. 12).',
      actionLabel: 'Open evidence vault',
      actionTo: '/evidence-vault',
      isDone: (c) => atLeastOne(c.evidenceLinkedToControl),
      detail: (c) => fraction(c.evidenceLinkedToControl, c.evidenceTotal, 'evidence item', 'linked to a control'),
    },
    {
      id: 'run-conformity',
      title: 'Run a conformity assessment',
      why: 'High-risk systems need a conformity assessment before deployment — it is the formal record that the obligations were met (EU AI Act Art. 43).',
      actionLabel: 'Open conformity',
      actionTo: '/conformity',
      isDone: (c) => atLeastOne(c.conformityTotal),
      detail: (c) => (c.conformityTotal === null || c.conformityTotal === 0 ? null : `${c.conformityTotal} assessment${c.conformityTotal === 1 ? '' : 's'} on record`),
    },
  ],
}

const vendorGroup: SetupGroup = {
  id: 'vendors',
  title: 'Vendors & TPRM',
  description: 'Bring third parties into governance and tie them to the models they supply.',
  routePrefixes: ['/vendors'],
  steps: [
    {
      id: 'add-vendor',
      title: 'Add your first vendor',
      why: 'Third-party AI carries obligations through to you — the vendor register is where that inherited risk becomes visible (EU AI Act Art. 25 value-chain duties).',
      actionLabel: 'Open vendor register',
      actionTo: '/vendors',
      isDone: (c) => atLeastOne(c.vendorsTotal),
      detail: (c) => (c.vendorsTotal === null || c.vendorsTotal === 0 ? null : `${c.vendorsTotal} vendor${c.vendorsTotal === 1 ? '' : 's'} registered`),
    },
    {
      id: 'link-vendor-model',
      title: 'Link models to their supplier',
      why: 'Concentration risk cannot be computed until vendors point at the models they serve — this is the exact link whose absence leaves that view empty.',
      actionLabel: 'Link on a vendor',
      actionTo: '/vendors',
      isDone: (c) => atLeastOne(c.vendorsLinkedToModel),
      detail: (c) => fraction(c.vendorsLinkedToModel, c.vendorsTotal, 'vendor', 'linked to a model'),
    },
    {
      id: 'reassess-critical',
      title: 'Set a reassessment date on your critical vendors',
      why: 'Due diligence is not a one-time gate — a reassessment date is what stops a critical vendor drifting out of review (ISO/IEC 42001 A.10 third-party).',
      actionLabel: 'Open vendor register',
      actionTo: '/vendors',
      isDone: (c) => allOf(c.criticalVendorsWithReassessment, c.criticalVendorsTotal),
      detail: (c) =>
        c.criticalVendorsTotal === null
          ? null
          : c.criticalVendorsTotal === 0
            ? 'No critical vendors flagged yet'
            : fraction(c.criticalVendorsWithReassessment, c.criticalVendorsTotal, 'critical vendor', 'have a reassessment date'),
    },
  ],
}

const supplyChainGroup: SetupGroup = {
  id: 'supply-chain',
  title: 'AI supply chain',
  description: 'Document what your models are built from and where they came from.',
  routePrefixes: ['/aibom', '/supply-chain', '/provenance'],
  steps: [
    {
      id: 'generate-aibom',
      title: 'Generate an AI bill of materials',
      why: 'You cannot assess supply-chain risk in components you have not enumerated — the AIBOM is that enumeration (EU AI Act Art. 15 robustness).',
      actionLabel: 'Open AIBOM',
      actionTo: '/aibom',
      isDone: (c) => atLeastOne(c.aibomTotal),
      detail: (c) => (c.aibomTotal === null || c.aibomTotal === 0 ? null : `${c.aibomTotal} AIBOM record${c.aibomTotal === 1 ? '' : 's'}`),
    },
    {
      id: 'record-attestation',
      title: 'Record a supply-chain attestation',
      why: 'Assurance about a supplier has to be evidenced, not assumed — an attestation is the artefact that carries it (ISO/IEC 42001 A.10).',
      actionLabel: 'Open supply chain',
      actionTo: '/supply-chain',
      isDone: (c) => atLeastOne(c.attestationsTotal),
      detail: (c) => (c.attestationsTotal === null || c.attestationsTotal === 0 ? null : `${c.attestationsTotal} attestation${c.attestationsTotal === 1 ? '' : 's'} on record`),
    },
    {
      id: 'map-provenance',
      title: 'Map model provenance',
      why: 'Traceability from data through pipeline to model is a record-keeping duty — the provenance graph is where that lineage lives (EU AI Act Art. 10 data governance).',
      actionLabel: 'Open provenance graph',
      actionTo: '/provenance',
      isDone: (c) => atLeastOne(c.provenanceTotal),
      detail: (c) => (c.provenanceTotal === null || c.provenanceTotal === 0 ? null : `${c.provenanceTotal} provenance node${c.provenanceTotal === 1 ? '' : 's'}`),
    },
  ],
}

const sustainabilityGroup: SetupGroup = {
  id: 'sustainability',
  title: 'Sustainability & ESG',
  description: 'Start measuring the footprint of the models you run.',
  routePrefixes: ['/carbon-ledger', '/energy-efficiency', '/esg-reports', '/model-efficiency'],
  steps: [
    {
      id: 'record-carbon',
      title: 'Record a carbon footprint',
      why: 'AI energy use is an emerging disclosure obligation — a cited carbon record is the honest, auditable start (measurement basis travels with the row).',
      actionLabel: 'Open carbon ledger',
      actionTo: '/carbon-ledger',
      isDone: (c) => atLeastOne(c.carbonTotal),
      detail: (c) => (c.carbonTotal === null || c.carbonTotal === 0 ? null : `${c.carbonTotal} carbon record${c.carbonTotal === 1 ? '' : 's'}`),
    },
    {
      id: 'record-energy',
      title: 'Log an energy reading',
      why: 'Energy per workload is the base metric everything else in sustainability derives from — record it once and the efficiency views come to life.',
      actionLabel: 'Open energy efficiency',
      actionTo: '/energy-efficiency',
      isDone: (c) => atLeastOne(c.energyTotal),
      detail: (c) => (c.energyTotal === null || c.energyTotal === 0 ? null : `${c.energyTotal} energy reading${c.energyTotal === 1 ? '' : 's'}`),
    },
    {
      id: 'draft-esg',
      title: 'Draft an ESG disclosure',
      why: 'A disclosure ties the measured figures to a reporting framework — starting a draft is how the sustainability story becomes reportable.',
      actionLabel: 'Open ESG reports',
      actionTo: '/esg-reports',
      isDone: (c) => atLeastOne(c.esgTotal),
      detail: (c) => (c.esgTotal === null || c.esgTotal === 0 ? null : `${c.esgTotal} ESG report${c.esgTotal === 1 ? '' : 's'}`),
    },
  ],
}

const tasksGroup: SetupGroup = {
  id: 'tasks',
  title: 'Tasks',
  description: 'Make governance findings into tracked work that closes.',
  routePrefixes: ['/tasks'],
  steps: [
    {
      id: 'create-task',
      title: 'Create a governance task',
      why: 'A finding that does not become tracked work does not get fixed — the task queue is where continuous risk management is evidenced (EU AI Act Art. 9).',
      actionLabel: 'Open tasks',
      actionTo: '/tasks',
      isDone: (c) => atLeastOne(c.tasksTotal),
      detail: (c) => (c.tasksTotal === null || c.tasksTotal === 0 ? null : `${c.tasksTotal} task${c.tasksTotal === 1 ? '' : 's'} in the queue`),
    },
    {
      id: 'link-task',
      title: 'Link tasks to the records they resolve',
      why: 'A task tied to its model, risk or vendor is what makes the audit trail show how a finding was managed to closure (EU AI Act Art. 12).',
      actionLabel: 'Open tasks',
      actionTo: '/tasks',
      isDone: (c) => atLeastOne(c.tasksLinked),
      detail: (c) => fraction(c.tasksLinked, c.tasksTotal, 'task', 'linked to a record'),
    },
  ],
}

const evidenceGroup: SetupGroup = {
  id: 'evidence',
  title: 'Evidence',
  description: 'Build the evidence vault that audits actually inspect.',
  routePrefixes: ['/evidence-vault', '/evidence'],
  steps: [
    {
      id: 'add-evidence',
      title: 'Add evidence to the vault',
      why: 'Evidence is the primary artefact of an audit — a populated vault is the difference between claiming compliance and demonstrating it (EU AI Act Art. 12).',
      actionLabel: 'Open evidence vault',
      actionTo: '/evidence-vault',
      isDone: (c) => atLeastOne(c.evidenceTotal),
      detail: (c) => (c.evidenceTotal === null || c.evidenceTotal === 0 ? null : `${c.evidenceTotal} evidence item${c.evidenceTotal === 1 ? '' : 's'}`),
    },
    {
      id: 'link-evidence',
      title: 'Link evidence to a control',
      why: 'Evidence only proves something once it is attached to the control it satisfies — an unlinked artefact backs nothing.',
      actionLabel: 'Open evidence vault',
      actionTo: '/evidence-vault',
      isDone: (c) => atLeastOne(c.evidenceLinkedToControl),
      detail: (c) => fraction(c.evidenceLinkedToControl, c.evidenceTotal, 'evidence item', 'linked to a control'),
    },
  ],
}

/** Ordered registry. The platform group leads; the rest follow module order. */
export const SETUP_GROUPS: readonly SetupGroup[] = [
  platformGroup,
  inventoryGroup,
  riskGroup,
  complianceGroup,
  vendorGroup,
  supplyChainGroup,
  sustainabilityGroup,
  tasksGroup,
  evidenceGroup,
]

// ── progress computation (pure — same input always yields same output) ───────

export type StepState = 'done' | 'todo' | 'unknown'

export function stepState(step: SetupStep, ctx: SetupContext): StepState {
  const v = step.isDone(ctx)
  if (v === null) return 'unknown'
  return v ? 'done' : 'todo'
}

export interface GroupProgress {
  total: number
  done: number
  todo: number
  unknown: number
}

export function groupProgress(group: SetupGroup, ctx: SetupContext): GroupProgress {
  const acc: GroupProgress = { total: group.steps.length, done: 0, todo: 0, unknown: 0 }
  for (const s of group.steps) {
    const st = stepState(s, ctx)
    acc[st] += 1
  }
  return acc
}

/**
 * Whole-platform progress, de-duplicated by step id so a step that appears in
 * two groups (e.g. "register-model") is counted once.
 */
export function overallProgress(ctx: SetupContext): GroupProgress {
  const seen = new Set<string>()
  const acc: GroupProgress = { total: 0, done: 0, todo: 0, unknown: 0 }
  for (const g of SETUP_GROUPS) {
    for (const s of g.steps) {
      if (seen.has(s.id)) continue
      seen.add(s.id)
      acc.total += 1
      acc[stepState(s, ctx)] += 1
    }
  }
  return acc
}

/** The de-duplicated flat step list, in registry order — for the summary card. */
export function allStepsDeduped(): SetupStep[] {
  const seen = new Set<string>()
  const out: SetupStep[] = []
  for (const g of SETUP_GROUPS) {
    for (const s of g.steps) {
      if (seen.has(s.id)) continue
      seen.add(s.id)
      out.push(s)
    }
  }
  return out
}

/** Match a route to its group (longest prefix wins); null when none matches. */
export function groupForRoute(pathname: string): SetupGroup | null {
  let best: SetupGroup | null = null
  let bestLen = -1
  for (const g of SETUP_GROUPS) {
    for (const p of g.routePrefixes) {
      if (pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')) {
        if (p.length > bestLen) {
          bestLen = p.length
          best = g
        }
      }
    }
  }
  return best
}

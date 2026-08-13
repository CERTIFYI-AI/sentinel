// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Validation & Evals domain model.
// Aggregate roots (ValidationRun, BiasAudit, …) embed their child collections
// so a detail page reads a single document. Aligned to SR 11-7, OCC 2011-12,
// EU AI Act, GDPR Art.22, NIST AI RMF, ISO/IEC 42001, ECOA, CFPB Fair Lending.

export type ISODate = string

/** Soft-delete + audit envelope carried on every governed aggregate root. */
export interface GrcBase {
  id: string
  tenantId?: string
  orgId?: string
  createdAt?: ISODate
  createdBy?: string
  updatedAt?: ISODate
  updatedBy?: string
  deletedAt?: ISODate | null
  version?: number
}

export type WorkflowState = 'Draft' | 'InReview' | 'Approved' | 'CondApproved' | 'Rejected'
export type Verdict = 'pass' | 'warn' | 'fail' | 'na'
export type RiskTier = 'low' | 'medium' | 'high' | 'critical'
export type DriftTier = 'stable' | 'WATCH' | 'WARNING' | 'CRITICAL'

export type RegFramework =
  | 'SR 11-7' | 'OCC 2011-12' | 'EU AI Act' | 'GDPR'
  | 'NIST AI RMF' | 'ISO 42001' | 'ECOA' | 'CFPB Fair Lending'

/** Regulatory clause satisfaction — reused by every "regulatory mapping" view. */
export interface RegMapping {
  framework: RegFramework
  clause: string
  status: 'satisfied' | 'partial' | 'missing' | 'na'
  evidenceIds?: string[]
  note?: string
}

/** Audit-trail entry rendered by every detail timeline. */
export interface AuditEntry {
  id: string
  actor: string
  action: string
  field?: string
  before?: unknown
  after?: unknown
  at: ISODate
  note?: string
}

// ── Validation Lab ──────────────────────────────────────────────────────────
export type ValSuiteKind = 'robustness' | 'performance' | 'adversarial' | 'backtesting'
export type RiskDimension = 'accuracy' | 'robustness' | 'stability' | 'drift' | 'explainability'
export const RISK_DIMENSIONS: RiskDimension[] = ['accuracy', 'robustness', 'stability', 'drift', 'explainability']

export interface ValidationTest {
  name: string
  dimension: RiskDimension
  metric: string
  value?: number
  threshold?: number
  verdict: Verdict
  detail?: string
}

export interface ValidationSuite {
  id: string
  kind: ValSuiteKind
  name: string
  score: number
  verdict: Verdict
  tests: ValidationTest[]
  coverage: Partial<Record<RiskDimension, Verdict>>
}

export interface ValidationEvidence {
  id: string
  kind: 'notebook' | 'pdf' | 'signoff' | 'dataset' | 'artifact'
  title: string
  uri: string
  sha256?: string
  signedBy?: string
  signedAt?: ISODate
}

export interface ValidationWorkflowStep {
  id: string
  from: WorkflowState
  to: WorkflowState
  actor: string
  role: 'builder' | 'validator' | 'approver'
  decision?: 'approve' | 'reject' | 'conditional'
  justification: string
  conditions?: string
  at: ISODate
}

export interface Signoff {
  role: 'business' | 'risk' | 'compliance'
  by?: string
  at?: ISODate
  status: 'pending' | 'signed' | 'rejected'
}

export interface ValidationRun extends GrcBase {
  runId: string
  modelId: string
  modelName: string
  modelVersion: string
  validatorId: string
  framework: string
  state: WorkflowState
  overallScore: number
  recommendation: 'Approve' | 'Conditional Approval' | 'Reject' | 'Pending'
  riskRating: RiskTier
  // SR 11-7 §III scope & assumptions
  scope: {
    intendedUse: string
    population: string
    dataPeriod: string
    keyLimitations: string[]
    assumptions: string[]
  }
  challenger?: { modelId: string; deltaAuc: number; deltaGini: number; verdict: Verdict }
  adversarial: { attack: string; successRate: number; baseline: number; verdict: Verdict }[]
  residualRisk: { rating: RiskTier; rationale: string; acceptedBy?: string; acceptedAt?: ISODate }
  signoffs: Signoff[]
  regMappings: RegMapping[]
  suites: ValidationSuite[]
  evidence: ValidationEvidence[]
  workflowSteps: ValidationWorkflowStep[]
  auditTrail: AuditEntry[]
}

// ── Explainability Center ───────────────────────────────────────────────────
export type Jurisdiction = 'GDPR' | 'EU AI Act' | 'ECOA' | 'CFPB' | 'NIST'
export type XaiMethod = 'SHAP' | 'LIME' | 'Anchors' | 'Counterfactual' | 'PDP' | 'IntegratedGradients'
export type AdequacyDim =
  | 'completeness' | 'faithfulness' | 'accessibility'
  | 'contrastiveness' | 'actionability' | 'regulatorySufficiency'
export const ADEQUACY_DIMS: AdequacyDim[] = [
  'completeness', 'faithfulness', 'accessibility', 'contrastiveness', 'actionability', 'regulatorySufficiency',
]

export interface ExplanationAdequacyPolicy {
  id: string
  name: string
  targets: Record<AdequacyDim, number>
  appliesTo: Jurisdiction[]
}

export interface ExplanationReport {
  id: string
  scope: 'global' | 'local'
  audience: 'regulator' | 'consumer'
  subjectRef?: string
  method: XaiMethod
  adequacy: Record<AdequacyDim, number>
  verdict: Verdict
  bodyMarkdown: string
}

export interface ExplanationTemplate {
  id: string
  name: string
  jurisdiction: Jurisdiction
  audience: 'regulator' | 'consumer'
  blocks: { key: string; label: string; text: string }[]
}

export interface ExplainabilityProfile extends GrcBase {
  modelId: string
  modelName: string
  modelVersion: string
  owner: string
  framework: string
  state: WorkflowState
  global: { method: XaiMethod; computedAt: ISODate; fidelity: number; topFeatures: { feature: string; importance: number }[] }
  localMethods: { method: XaiMethod; fidelity: number; coverage: number; stability: number }[]
  adequacyPolicy: ExplanationAdequacyPolicy
  jurisdictions: Jurisdiction[]
  reports: ExplanationReport[]
  templates: ExplanationTemplate[]
  regMappings: RegMapping[]
  auditTrail: AuditEntry[]
}

// ── Bias Audits ─────────────────────────────────────────────────────────────
export interface ProtectedAttribute {
  id: string
  attribute: string
  lawfulBasis: string
  proxyRisks: string[]
  categories: string[]
  active: boolean
}

export interface BiasMetricSnapshot {
  id: string
  phase: 'pre_deploy' | 'post_deploy'
  capturedAt: ISODate
  groups: string[]
  metrics: {
    demographicParity: number
    equalOpportunity: number
    equalizedOdds: number
    tprRatio: number
    fprRatio: number
    calibration: number
  }
  verdict: Verdict
}

export interface BiasRemediationTask {
  id: string
  title: string
  owner: string
  due: ISODate
  status: 'open' | 'in_progress' | 'done' | 'blocked'
  evidenceIds: string[]
}

export interface BiasRemediationPlan {
  id: string
  owner: string
  state: WorkflowState
  tasks: BiasRemediationTask[]
}

export interface BiasAudit extends GrcBase {
  auditId: string
  modelId: string
  modelName: string
  datasetId: string
  framework: string
  auditor: string
  state: WorkflowState
  fairnessScore: number
  result: Verdict
  riskTier: RiskTier
  protectedAttributes: ProtectedAttribute[]
  intersections: { key: string; verdict: Verdict; caseRefs: string[] }[]
  counterfactual: { flipRate: number; cases: { id: string; attribute: string; flipped: boolean }[] }
  drift?: DriftTier
  snapshots: BiasMetricSnapshot[]
  remediationPlan?: BiasRemediationPlan
  regMappings: RegMapping[]
  auditTrail: AuditEntry[]
}

// ── Metric Studio ───────────────────────────────────────────────────────────
export interface MetricThresholdConfig {
  id: string
  metric: string
  warn: number
  fail: number
  direction: 'higher_better' | 'lower_better'
  breachAction?: 'alert' | 'block_promotion' | 'kill_switch'
}

export interface BenchmarkProfile {
  id: string
  role: 'champion' | 'challenger' | 'legacy_baseline'
  modelId: string
  modelVersion: string
  metrics: Record<string, number>
}

export interface MetricProfile extends GrcBase {
  modelId: string
  modelName: string
  modelVersion: string
  owner: string
  state: WorkflowState
  /** Declared tracked-metric names (editable); measured values live in `current`. */
  metrics?: string[]
  current: Record<string, number>
  thresholds: MetricThresholdConfig[]
  benchmarks: BenchmarkProfile[]
  timeseries: { metric: string; points: { at: ISODate; value: number }[] }[]
  objectives: { accuracy: number; fairness: number; robustness: number; explainability: number }
  auditTrail: AuditEntry[]
}

// ── Dataset Wizard / Data Explorer ──────────────────────────────────────────
export interface DatasetSliceDefinition {
  id: string
  name: string
  predicate: string
  purpose: 'fairness' | 'robustness' | 'coverage' | 'drift'
  rowEstimate?: number
}

export interface DatasetGovernanceTag {
  id: string
  mapping: RegMapping
}

export interface DatasetCatalogEntry extends GrcBase {
  datasetId: string
  name: string
  datasetVersion: string
  category: 'Text' | 'Tabular' | 'Image' | 'Audio' | 'Behavioral' | 'Document'
  sensitivity: RiskTier
  lawfulBasis: string
  allowedPurposes: string[]
  retention: string
  lineage: { source: string; transform: string; upstreamIds: string[] }
  quality: { completeness: number; duplicateRate: number; labelErrorRate?: number }
  representativeness: { attribute: string; coverage: number }[]
  biasIndicators: { attribute: string; skew: number; verdict: Verdict }[]
  riskScore: number
  slices: DatasetSliceDefinition[]
  governanceTags: DatasetGovernanceTag[]
  auditTrail: AuditEntry[]
}

// ── Scenario Editor / Session Trace Viewer ──────────────────────────────────
export interface ScenarioTemplate extends GrcBase {
  name: string
  description: string
  state: WorkflowState
  /** Governed model under test — ai_models.id (uuid), resolved to a name at render time. */
  modelId?: string
  turns: { role: 'user' | 'assistant' | 'system'; content: string; expected?: string }[]
  guardrailChecks: string[]
  policiesReferenced: string[]
  riskTags: string[]
  campaignIds: string[]
  auditTrail: AuditEntry[]
}

export interface ScenarioCampaign extends GrcBase {
  name: string
  scenarioIds: string[]
  linkedValidationRunId?: string
  linkedBiasAuditId?: string
  schedule?: 'once' | 'on_deploy' | 'nightly'
  summary: { total: number; passed: number; failed: number; lastRunAt?: ISODate }
  auditTrail: AuditEntry[]
}

export interface PolicyCheckResult {
  turnIndex: number
  policyKey: string
  verdict: Verdict
  score?: number
  detail?: string
  intervention?: 'none' | 'block' | 'redact' | 'human_review' | 'override'
}

export interface SessionTrace extends GrcBase {
  campaignId?: string
  scenarioId?: string
  modelId: string
  modelVersion: string
  verdict: Verdict
  turns: { index: number; role: string; content: string; latencyMs?: number; at: ISODate }[]
  policyResults: PolicyCheckResult[]
  decisionPoints: { turnIndex: number; decision: string; actor?: string; overridden?: boolean }[]
  auditTrail: AuditEntry[]
}

// ── Continuous monitoring / kill-switch config ──────────────────────────────
export interface MonitoringConfig extends GrcBase {
  name: string
  scopeRef: string
  thresholds: { metric: string; warn: number; fail: number }[]
  alertChannels: ('email' | 'slack' | 'pagerduty' | 'in_app')[]
  killSwitch: {
    enabled: boolean
    onBreach: 'notify' | 'block_promotion' | 'disable_model'
    targetModelId: string
    requiresApproval: boolean
  }
}

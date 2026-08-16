/**
 * Sentinel Governance Event Type System
 * Fortune 500-grade type safety for the autonomous governance mesh.
 *
 * All events that flow through the event bus must be declared here with
 * a typed payload. Agents discriminate on `event_type` to get strongly
 * typed payloads at compile time.
 */

// ------------------------------------------------------------------
// Event type enum
// ------------------------------------------------------------------
export const GovernanceEventType = {
  // Model lifecycle
  MODEL_REGISTERED:        'MODEL_REGISTERED',
  MODEL_UPDATED:           'MODEL_UPDATED',
  MODEL_DELETED:           'MODEL_DELETED',
  MODEL_PAUSED:            'MODEL_PAUSED',
  MODEL_RESUMED:           'MODEL_RESUMED',

  // Risk
  RISK_CREATED:            'RISK_CREATED',
  RISK_UPDATED:            'RISK_UPDATED',
  RISK_DETECTED:           'RISK_DETECTED',
  IMPACT_ASSESSED:         'IMPACT_ASSESSED',

  // Incidents
  INCIDENT_CREATED:        'INCIDENT_CREATED',
  INCIDENT_RESOLVED:       'INCIDENT_RESOLVED',
  CONTAINMENT_EXECUTED:    'CONTAINMENT_EXECUTED',
  REGULATOR_NOTIFIED:      'REGULATOR_NOTIFIED',
  DSR_IMPACT_ASSESSED:     'DSR_IMPACT_ASSESSED',
  FINANCIAL_IMPACT_CALCULATED: 'FINANCIAL_IMPACT_CALCULATED',

  // Compliance
  COMPLIANCE_MAPPED:       'COMPLIANCE_MAPPED',
  COMPLIANCE_UPDATED:      'COMPLIANCE_UPDATED',
  CONTROL_GAP_FOUND:       'CONTROL_GAP_FOUND',

  // Fairness / Explainability
  FAIRNESS_SCAN_QUEUED:    'FAIRNESS_SCAN_QUEUED',
  FAIRNESS_SCAN_COMPLETED: 'FAIRNESS_SCAN_COMPLETED',
  EXPLAINABILITY_ASSESSED: 'EXPLAINABILITY_ASSESSED',

  // Data governance
  DATA_GOVERNANCE_CHECK:   'DATA_GOVERNANCE_CHECK',

  // Privacy (GDPR)
  CONSENT_WITHDRAWN:       'CONSENT_WITHDRAWN',
  PRIVACY_SCAN_REQUESTED:  'PRIVACY_SCAN_REQUESTED',
  PRIVACY_GAP_FOUND:       'PRIVACY_GAP_FOUND',

  // Vendor
  VENDOR_LINKED:           'VENDOR_LINKED',
  VENDOR_NOTIFIED:         'VENDOR_NOTIFIED',

  // Carbon / ESG
  CARBON_ESTIMATED:        'CARBON_ESTIMATED',
  ESG_UPDATED:             'ESG_UPDATED',

  // HITL / CI/CD / KG
  HITL_REVIEW_REQUIRED:    'HITL_REVIEW_REQUIRED',
  CICD_GATE_CONFIGURED:    'CICD_GATE_CONFIGURED',
  KNOWLEDGE_GRAPH_UPDATED: 'KNOWLEDGE_GRAPH_UPDATED',

  // Evidence / narrative / training
  EVIDENCE_COLLECTED:      'EVIDENCE_COLLECTED',
  NARRATIVE_UPDATED:       'NARRATIVE_UPDATED',
  TRAINING_UPDATED:        'TRAINING_UPDATED',

  // Continuous monitoring
  DRIFT_DETECTED:          'DRIFT_DETECTED',
  SLA_BREACHED:            'SLA_BREACHED',
  SECURITY_VULN_FOUND:     'SECURITY_VULN_FOUND',
  DATA_QUALITY_ANOMALY:    'DATA_QUALITY_ANOMALY',
  CARBON_BUDGET_EXCEEDED:  'CARBON_BUDGET_EXCEEDED',
  REGULATORY_DEADLINE:     'REGULATORY_DEADLINE',

  // Remediation + workflows
  REMEDIATION_CREATED:     'REMEDIATION_CREATED',
  WORKFLOW_TRIGGERED:      'WORKFLOW_TRIGGERED',
} as const

export type GovernanceEventType =
  (typeof GovernanceEventType)[keyof typeof GovernanceEventType]

// ------------------------------------------------------------------
// Event payload map (typed per event)
// ------------------------------------------------------------------
export type ModelRiskTier = 'UNACCEPTABLE' | 'HIGH' | 'LIMITED' | 'MINIMAL'
export type Severity      = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type IncidentP     = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

export interface ModelRegisteredPayload {
  modelId: string
  modelName: string
  modelType: 'GENERATIVE' | 'DISCRIMINATIVE' | 'REGRESSION' | 'CLUSTERING' | 'RL' | 'OTHER'
  owner: string
  ownerId?: string
  riskTier: 1 | 2 | 3 | 4
  euAiActClass?: ModelRiskTier
  purpose: string
  trainingDataRefs?: string[]
  vendor?: string
  vendorId?: string
  deploymentScope: 'PROD' | 'STAGING' | 'DEV'
  dataSensitivity: 'PII' | 'PHI' | 'CONFIDENTIAL' | 'PUBLIC'
  estimatedParams?: number
  expectedRequestsPerDay?: number
}

export interface ConsentWithdrawnPayload {
  consentId:     string
  consentRef?:   string
  subjectRef?:   string
  /** The systems that must now cease processing this subject's data. */
  affectedModels: string[]
  ropaId?:       string | null
  reason?:       string
  withdrawnAt:   string
}

export interface PrivacyGapFoundPayload {
  /** Which statutory duty the gap sits under. */
  kind:         'TRANSFER_NO_MECHANISM' | 'DPIA_RESIDUAL_UNTRACKED' | 'CONSENT_LAPSED' | 'DSR_OVERDUE'
  entityTable:  string
  entityId:     string
  entityRef?:   string
  title:        string
  description:  string
  severity:     Severity
  riskId?:      string
}

export interface RiskDetectedPayload {
  source:           'DRIFT' | 'FAIRNESS' | 'SECURITY' | 'VENDOR_SLA' | 'DATA_QUALITY' | 'CARBON' | 'REGULATORY'
  severity:         Severity
  affectedModels:   string[]
  title:            string
  description?:     string
  metrics?:         Record<string, number>
  detectedAt:       string
}

export interface IncidentCreatedPayload {
  incidentId:        string
  severity:          IncidentP
  type:              'BIAS' | 'DATA_BREACH' | 'MODEL_FAILURE' | 'SECURITY' | 'ETHICS' | 'REGULATORY'
  affectedModels:    string[]
  affectedSubjects?: number
  commanderId?:      string
  reportedVia:       'AUTOMATED' | 'ETHICS_REPORTING' | 'EXTERNAL' | 'CUSTOMER'
  summary:           string
}

// ------------------------------------------------------------------
// Generic governance event envelope
// ------------------------------------------------------------------
export interface GovernanceEvent<TPayload = Record<string, unknown>> {
  id?:                 string
  org_id:              string
  event_type:          GovernanceEventType
  source_module:       string
  payload:             TPayload
  status?:             'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter' | 'cancelled'
  triggered_agents?:   string[]
  processed_at?:       string | null
  error?:              string | null
  retry_count?:        number
  correlation_id?:     string
  causation_id?:       string
  idempotency_key?:    string
  trace_id?:           string
  actor_id?:           string
  cascade_depth?:      number
  created_at?:         string
}

// ------------------------------------------------------------------
// Agent context handed to every agent handler
// ------------------------------------------------------------------
export interface AgentContext {
  event:         GovernanceEvent
  orgId:         string
  traceId:       string
  emit:          <P>(type: GovernanceEventType, module: string, payload: P) => Promise<GovernanceEvent | null>
  log:           (msg: string, extra?: Record<string, unknown>) => void
  now:           () => number
}

export interface AgentResult {
  status:   'succeeded' | 'failed' | 'skipped'
  output?:  Record<string, unknown>
  error?:   string
}

export type AgentHandler = (ctx: AgentContext) => Promise<AgentResult>

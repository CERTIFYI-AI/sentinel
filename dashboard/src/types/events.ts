export type ComplianceEventType =
  | 'POLICY_CREATED' | 'POLICY_UPDATED' | 'POLICY_APPROVED' | 'POLICY_DELETED'
  | 'CONTROL_CREATED' | 'CONTROL_STATUS_CHANGED' | 'CONTROL_DELETED'
  | 'MODEL_REGISTERED' | 'MODEL_UPDATED' | 'MODEL_DECOMMISSIONED'
  | 'DATASET_CHANGED' | 'DATASET_DELETED'
  | 'AGENT_DISCOVERED' | 'AGENT_CONFIRMED' | 'AGENT_REJECTED'
  | 'VENDOR_ADDED' | 'VENDOR_RISK_CHANGED'
  | 'BIAS_AUDIT_COMPLETED' | 'BIAS_THRESHOLD_EXCEEDED'
  | 'EVIDENCE_SYNCED' | 'EVIDENCE_EXPIRED'
  | 'HITL_REQUIRED' | 'HITL_DECISION' | 'HITL_ESCALATED'
  | 'SHADOW_AI_DETECTED' | 'SHADOW_AI_SANCTIONED'
  | 'TRUST_SCORE_CHANGED' | 'GUARDRAIL_TRIGGERED'
  | 'REGULATION_UPDATED' | 'COMPLIANCE_SCORE_CHANGED'
  | 'RISK_LEVEL_CHANGED' | 'AUDIT_LOG_ENTRY';

export interface ComplianceEvent {
  id: string;
  type: ComplianceEventType;
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  payload: Record<string, any>;
  description: string;
  userId?: string;
}

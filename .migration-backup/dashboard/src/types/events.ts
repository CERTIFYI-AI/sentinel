// Event types for the compliance event bus system
export interface ComplianceEvent {
  id?: string;
  entityType: ComplianceEventType;
  entityId: string;
  action: string;
  payload?: Record<string, any>;
  timestamp?: string;
  source?: string;
  userId?: string;
}

export type ComplianceEventType =
  | 'policy'
  | 'risk'
  | 'control'
  | 'audit'
  | 'incident'
  | 'vendor'
  | 'model'
  | 'framework'
  | 'regulation'
  | 'task'
  | 'notification'
  | 'security'
  | 'data-governance'
  | 'explainability'
  | 'bias-audit';

export type EventHandler = (event: ComplianceEvent) => void;

export interface EventSubscription {
  unsubscribe: () => void;
}

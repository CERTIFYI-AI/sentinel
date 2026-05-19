export interface Policy {
  id: string; title: string; description: string; status: 'draft' | 'review' | 'approved' | 'archived';
  owner: string; version: string; category: string; linkedControls: string[];
  linkedModels: string[]; approvedBy?: string; approvalRemarks?: string;
  versions: { version: string; date: Date; author: string; changes: string }[];
  remarks: { id: string; author: string; text: string; date: Date }[];
  createdAt: Date; updatedAt: Date;
}

export interface Control {
  id: string; title: string; description: string; status: 'not_started' | 'in_progress' | 'implemented' | 'failed';
  owner: string; category: string; linkedPolicies: string[]; linkedModels: string[];
  testingLog: { date: Date; result: string; tester: string }[];
  evidenceIds: string[]; createdAt: Date; updatedAt: Date;
}

export interface Model {
  id: string; modelId: string; name: string; type: string; vendor: string;
  version: string; riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'development' | 'staging' | 'production' | 'decommissioned';
  owner: string; description: string; linkedPolicies: string[];
  linkedControls: string[]; trustScore: number;
  deploymentDate?: Date; createdAt: Date; updatedAt: Date;
}

export interface Dataset {
  id: string; datasetId: string; name: string; version: string;
  category: 'Text' | 'Tabular' | 'Image' | 'Audio' | 'Behavioral' | 'Document';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  source: string; volume: string; dataOwner: string;
  containsPII: boolean; demographicData: boolean;
  linkedModels: string[]; lineageNotes: string;
  lastUpdated: Date; createdAt: Date;
}

export interface Agent {
  id: string; name: string; type: string; source: string;
  status: 'discovered' | 'confirmed' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  linkedModel: string; owner: string;
  governingPolicy: string; discoveredAt: Date;
  confirmedAt?: Date; trustScore: number;
}

export interface Vendor {
  id: string; vendorId: string; name: string;
  category: string; riskTier: number;
  status: 'active' | 'review' | 'suspended';
  contractExpiry: Date; dataSharingAgreement: boolean;
  soc2Certified: boolean; isoCertified: boolean;
  contact: string; linkedModels: string[];
  linkedAgents: string[]; riskScore: number; createdAt: Date;
}

export interface BiasAudit {
  id: string; modelId: string; modelName: string;
  auditDate: Date; auditor: string;
  metrics: { metric: string; value: number; threshold: number; passed: boolean }[];
  overallResult: 'pass' | 'fail' | 'warning';
  recommendations: string; status: 'completed' | 'in_progress';
}

export interface Evidence {
  id: string; title: string; type: string;
  linkedControls: string[]; linkedPolicies: string[];
  uploadDate: Date; expiryDate?: Date;
  status: 'valid' | 'expired' | 'pending';
  fileUrl?: string; notes: string;
}

export interface HITLItem {
  id: string; entityType: string; entityId: string;
  entityName: string; action: string; reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  assignedTo: string; decision?: string;
  remarks?: string; history: { action: string; actor: string; timestamp: Date; remarks?: string }[];
  createdAt: Date; resolvedAt?: Date;
}

export interface Regulation {
  id: string; name: string; jurisdiction: string;
  status: 'draft' | 'enacted' | 'enforcing';
  effectiveDate: Date; relevanceScore: number;
  linkedFrameworks: string[]; linkedPolicies: string[];
  requirementsSummary: string; modelsInScope: number;
  controlsMapped: number; gapPercent: number; createdAt: Date;
}

export interface ShadowAI {
  id: string; sourceType: string; endpoint: string;
  firstSeen: Date; estimatedRisk: 'low' | 'medium' | 'high';
  status: 'detected' | 'sanctioned' | 'blocked';
  recommendedAction: string;
}

export interface TrustTrace {
  trustId: string; modelId: string; modelName: string;
  timestamp: Date; trustScore: number; latency: number;
  flags: string[]; tokenCount: { input: number; output: number; total: number };
  costEstimate: number;
  guardrailResults: { rule: string; result: string; latency: number }[];
}

export type RBACRole = 'admin' | 'compliance_officer' | 'model_owner' | 'auditor' | 'viewer' | 'data_steward' | 'security_analyst';

export interface User {
  id: string; name: string; email: string; role: RBACRole;
  department: string; avatar?: string;
}

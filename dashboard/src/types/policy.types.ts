export type PolicyStatus = 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Archived' | 'Expired';

export type PolicyCategory =
  | 'AI Ethics & Responsible Use'
  | 'Data Governance & Privacy'
  | 'Model Development & Lifecycle'
  | 'Security & Access Control'
  | 'Vendor & Third-Party AI'
  | 'Incident Response'
  | 'Fairness & Non-Discrimination'
  | 'Transparency & Explainability'
  | 'Human Oversight'
  | 'Risk Management';

export type PolicyPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface PolicyVersion {
  version: string;
  status: PolicyStatus;
  author: string;
  date: string;
  changesSummary: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface PolicyApprovalStep {
  step: number;
  label: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  assignee: string;
  completedDate?: string;
  comments?: string;
}

export interface PolicyAcknowledgment {
  userId: string;
  userName: string;
  department: string;
  status: 'Acknowledged' | 'Pending' | 'Overdue';
  acknowledgedDate?: string;
  dueDate: string;
}

export interface LinkedControl {
  id: string;
  name: string;
  framework: string;
  status: 'Implemented' | 'Partial' | 'Not Implemented';
}

export interface LinkedFramework {
  id: string;
  name: string;
  requirement: string;
  complianceStatus: 'Compliant' | 'Partial' | 'Non-Compliant';
}

export interface PolicyActivityEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details?: string;
}

export interface Policy {
  id: string;
  title: string;
  category: PolicyCategory;
  status: PolicyStatus;
  priority: PolicyPriority;
  currentVersion: string;
  author: string;
  owner: string;
  approver: string;
  department: string;
  description: string;
  body: string;
  scope: string;
  effectiveDate: string;
  expiryDate?: string;
  nextReviewDate: string;
  lastReviewedDate: string;
  createdAt: string;
  updatedAt: string;
  linkedControls: LinkedControl[];
  linkedFrameworks: LinkedFramework[];
  linkedModels: string[];
  approvalWorkflow: PolicyApprovalStep[];
  versions: PolicyVersion[];
  acknowledgments: PolicyAcknowledgment[];
  activityLog: PolicyActivityEvent[];
  tags: string[];
}

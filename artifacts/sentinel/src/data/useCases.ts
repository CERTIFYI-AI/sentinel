export type RiskClassification = 'Prohibited' | 'High Risk' | 'Limited Risk' | 'Minimal Risk';
export type HighRiskRole = 'Deployer' | 'Provider' | 'Distributor' | 'Importer' | 'Product Manufacturer' | 'Authorized Representative';
export type UCStatus = 'Not Started' | 'In Progress' | 'Under Review' | 'Completed' | 'Closed' | 'On Hold' | 'Rejected' | 'Approved';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'None';
export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface UCRisk {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  likelihood: number;
  impact: number;
  riskScore: number;
  status: 'Open' | 'Mitigated' | 'Accepted' | 'Closed';
  owner: string;
  mitigations: string[];
  framework?: string;
  controls?: string[];
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export interface UseCase {
  id: string;
  title: string;
  goal: string;
  description?: string;
  owner: string;
  members: string[];
  status: UCStatus;
  riskClassification: RiskClassification;
  highRiskRole: HighRiskRole;
  geography: string[];
  targetIndustry: string;
  startDate: string;
  lastUpdated: string;
  approvalWorkflow?: string;
  approvalStatus: ApprovalStatus;
  approvalLockedTabs: boolean;
  scope: {
    aiEnvironment?: string;
    technologyType?: string;
    novelTechnology: boolean;
    handlesPersonalData: boolean;
    hasMonitoring: boolean;
    unintendedOutcomes?: string;
    calculatedRisk?: RiskLevel;
  };
  frameworks: string[];
  risks: UCRisk[];
  linkedModels: string[];
  vendors: string[];
  controlsProgress: number;
  assessmentProgress: number;
}

export const seedUseCases: UseCase[] = [
  {
    id: 'UC-001',
    title: 'Credit Risk Scoring',
    goal: 'Automate credit risk for loans under $250K \u2014 target 92% accuracy, 2hr processing',
    description: 'ML-based credit risk assessment system that evaluates loan applications using historical repayment data, credit bureau scores, and alternative data sources. Deployed for retail banking division.',
    owner: 'Sarah Chen',
    members: ['James Patel', 'Maria Santos', 'Alex Thompson'],
    status: 'In Progress',
    riskClassification: 'High Risk',
    highRiskRole: 'Deployer',
    geography: ['Europe', 'North America'],
    targetIndustry: 'Financial Services',
    startDate: '2026-06-01',
    lastUpdated: '2026-03-28',
    approvalWorkflow: 'executive-review',
    approvalStatus: 'Approved',
    approvalLockedTabs: false,
    scope: {
      aiEnvironment: 'Cloud',
      technologyType: 'ML',
      novelTechnology: false,
      handlesPersonalData: true,
      hasMonitoring: true,
      calculatedRisk: 'High',
    },
    frameworks: ['EU AI Act', 'ISO 42001', 'GDPR'],
    risks: [
      { id: 'RISK-001', title: 'Discriminatory lending patterns in protected classes', severity: 'Critical', likelihood: 3, impact: 5, riskScore: 15, status: 'Open', owner: 'Sarah Chen', mitigations: ['Bias audit quarterly', 'Fairness constraints in training'], framework: 'EU AI Act', controls: ['CTRL-101'] },
      { id: 'RISK-002', title: 'Model drift causing approval rate deviation >5%', severity: 'High', likelihood: 4, impact: 4, riskScore: 16, status: 'Open', owner: 'James Patel', mitigations: ['Weekly PSI monitoring', 'Champion-challenger framework'], framework: 'ISO 42001' },
      { id: 'RISK-003', title: 'PII exposure through model inversion attacks', severity: 'High', likelihood: 2, impact: 5, riskScore: 10, status: 'Mitigated', owner: 'Alex Thompson', mitigations: ['Differential privacy epsilon=1.0', 'Access controls'], framework: 'GDPR' },
    ],
    linkedModels: ['Credit Risk Scorer v3.2.1'],
    vendors: ['DataVend Inc.'],
    controlsProgress: 74,
    assessmentProgress: 68,
  },
  {
    id: 'UC-002',
    title: 'Real-Time Fraud Detection',
    goal: 'Detect fraud in <100ms with 99.5% recall on 2.3M daily transactions',
    description: 'Ensemble ML pipeline for real-time transaction fraud detection across card-present, card-not-present, and ACH channels.',
    owner: 'Maria Santos',
    members: ['Alex Thompson', 'David Kim'],
    status: 'In Progress',
    riskClassification: 'High Risk',
    highRiskRole: 'Deployer',
    geography: ['North America'],
    targetIndustry: 'Financial Services',
    startDate: '2026-03-15',
    lastUpdated: '2026-03-25',
    approvalWorkflow: 'standard-review',
    approvalStatus: 'Approved',
    approvalLockedTabs: false,
    scope: {
      aiEnvironment: 'Cloud',
      technologyType: 'ML',
      novelTechnology: false,
      handlesPersonalData: true,
      hasMonitoring: true,
      calculatedRisk: 'High',
    },
    frameworks: ['EU AI Act', 'NIST AI RMF'],
    risks: [
      { id: 'RISK-004', title: 'High false positive rate impacting customer experience', severity: 'Medium', likelihood: 3, impact: 3, riskScore: 9, status: 'Mitigated', owner: 'Maria Santos', mitigations: ['Threshold tuning', 'Customer feedback loop'] },
      { id: 'RISK-005', title: 'Adversarial transaction patterns evading detection', severity: 'Medium', likelihood: 3, impact: 4, riskScore: 12, status: 'Open', owner: 'Alex Thompson', mitigations: ['Adversarial training', 'Ensemble diversity'] },
    ],
    linkedModels: ['FraudGuard ML v3.4', 'Transaction Anomaly Detector v1.2'],
    vendors: [],
    controlsProgress: 88,
    assessmentProgress: 82,
  },
  {
    id: 'UC-003',
    title: 'Customer Churn Prediction',
    goal: 'Predict 90-day churn to reduce attrition by 15% via targeted retention',
    owner: 'Maria Santos',
    members: ['James Patel'],
    status: 'Under Review',
    riskClassification: 'Limited Risk',
    highRiskRole: 'Provider',
    geography: ['North America'],
    targetIndustry: 'Financial Services',
    startDate: '2026-09-01',
    lastUpdated: '2026-03-20',
    approvalWorkflow: 'standard-review',
    approvalStatus: 'Pending',
    approvalLockedTabs: true,
    scope: {
      aiEnvironment: 'Cloud',
      technologyType: 'ML',
      novelTechnology: false,
      handlesPersonalData: false,
      hasMonitoring: false,
      calculatedRisk: 'Medium',
    },
    frameworks: ['NIST AI RMF', 'GDPR'],
    risks: [
      { id: 'RISK-006', title: 'Inaccurate churn predictions leading to wasted retention spend', severity: 'Medium', likelihood: 3, impact: 3, riskScore: 9, status: 'Open', owner: 'Maria Santos', mitigations: ['A/B testing retention offers'] },
    ],
    linkedModels: ['ChurnPredictor v2.0'],
    vendors: [],
    controlsProgress: 45,
    assessmentProgress: 38,
  },
  {
    id: 'UC-004',
    title: 'Loan Approval Assistant',
    goal: 'LLM-powered decision support reducing documentation time by 60% for loan officers',
    description: 'GPT-4o based assistant that summarizes loan applications, extracts key risk factors, and generates preliminary approval recommendations for loan officers.',
    owner: 'James Patel',
    members: ['Sarah Chen', 'Maria Santos'],
    status: 'Not Started',
    riskClassification: 'High Risk',
    highRiskRole: 'Deployer',
    geography: ['Europe', 'North America'],
    targetIndustry: 'Financial Services',
    startDate: '2026-04-01',
    lastUpdated: '2026-03-30',
    approvalStatus: 'None',
    approvalLockedTabs: false,
    scope: {
      aiEnvironment: 'SaaS',
      technologyType: 'NLP',
      novelTechnology: true,
      handlesPersonalData: true,
      hasMonitoring: false,
      calculatedRisk: 'High',
    },
    frameworks: ['EU AI Act', 'ISO 42001', 'GDPR', 'NIST AI RMF'],
    risks: [],
    linkedModels: [],
    vendors: ['OpenAI'],
    controlsProgress: 12,
    assessmentProgress: 8,
  },
  {
    id: 'UC-005',
    title: 'HR Resume Screening',
    goal: 'Pre-screen job applications to surface top 20% of candidates for recruiter review',
    description: 'NLP-based resume screening system that ranks candidates based on job requirements. Flagged for potential gender/age bias in historical training data.',
    owner: 'David Kim',
    members: ['Sarah Chen'],
    status: 'On Hold',
    riskClassification: 'High Risk',
    highRiskRole: 'Deployer',
    geography: ['Europe'],
    targetIndustry: 'Financial Services',
    startDate: '2026-11-01',
    lastUpdated: '2026-02-15',
    approvalWorkflow: 'executive-review',
    approvalStatus: 'Rejected',
    approvalLockedTabs: true,
    scope: {
      aiEnvironment: 'Cloud',
      technologyType: 'NLP',
      novelTechnology: false,
      handlesPersonalData: true,
      hasMonitoring: false,
      unintendedOutcomes: 'Potential gender/age bias in historical training data',
      calculatedRisk: 'High',
    },
    frameworks: ['EU AI Act', 'ISO 42001'],
    risks: [
      { id: 'RISK-007', title: 'Gender bias in resume scoring algorithm', severity: 'Critical', likelihood: 4, impact: 5, riskScore: 20, status: 'Open', owner: 'David Kim', mitigations: ['Blind resume screening', 'Bias audit'], framework: 'EU AI Act' },
      { id: 'RISK-008', title: 'Age discrimination in experience weighting', severity: 'High', likelihood: 3, impact: 4, riskScore: 12, status: 'Open', owner: 'David Kim', mitigations: ['Remove age-correlated features'] },
    ],
    linkedModels: ['ResumeRanker v1.5'],
    vendors: [],
    controlsProgress: 31,
    assessmentProgress: 24,
  },
  {
    id: 'UC-006',
    title: 'Customer Service Chatbot',
    goal: 'Handle tier-1 support queries with 85% resolution without human escalation',
    description: 'Conversational AI chatbot for customer service, handling account inquiries, FAQ responses, and basic troubleshooting across web and mobile channels.',
    owner: 'Maria Santos',
    members: ['Alex Thompson', 'James Patel'],
    status: 'Completed',
    riskClassification: 'Minimal Risk',
    highRiskRole: 'Deployer',
    geography: ['Global'],
    targetIndustry: 'Financial Services',
    startDate: '2026-01-15',
    lastUpdated: '2026-03-01',
    approvalWorkflow: 'standard-review',
    approvalStatus: 'Approved',
    approvalLockedTabs: false,
    scope: {
      aiEnvironment: 'SaaS',
      technologyType: 'NLP',
      novelTechnology: false,
      handlesPersonalData: false,
      hasMonitoring: true,
      calculatedRisk: 'Low',
    },
    frameworks: ['NIST AI RMF'],
    risks: [],
    linkedModels: ['ServiceBot NLU v4.1'],
    vendors: ['Dialogflow'],
    controlsProgress: 96,
    assessmentProgress: 94,
  },
];

export const seedActivityLogs: Record<string, ActivityEntry[]> = {
  'UC-001': [
    { id: 'ACT-001', timestamp: '2026-03-28T10:30:00Z', actor: 'Sarah Chen', action: 'Updated controls progress to 74%' },
    { id: 'ACT-002', timestamp: '2026-03-25T14:15:00Z', actor: 'James Patel', action: 'Added risk RISK-002: Model drift', field: 'risks' },
    { id: 'ACT-003', timestamp: '2026-03-20T09:00:00Z', actor: 'System', action: 'Approval granted by executive review' },
    { id: 'ACT-004', timestamp: '2026-03-15T16:45:00Z', actor: 'Sarah Chen', action: 'Submitted for approval', field: 'approvalStatus', oldValue: 'None', newValue: 'Pending' },
    { id: 'ACT-005', timestamp: '2026-06-01T08:00:00Z', actor: 'Sarah Chen', action: 'Created use case UC-001' },
  ],
  'UC-003': [
    { id: 'ACT-010', timestamp: '2026-03-20T11:00:00Z', actor: 'Maria Santos', action: 'Submitted for approval', field: 'approvalStatus', oldValue: 'None', newValue: 'Pending' },
    { id: 'ACT-011', timestamp: '2026-03-18T09:30:00Z', actor: 'Maria Santos', action: 'Changed status', field: 'status', oldValue: 'In Progress', newValue: 'Under Review' },
  ],
  'UC-005': [
    { id: 'ACT-020', timestamp: '2026-02-15T10:00:00Z', actor: 'Review Board', action: 'Rejected: Bias concerns must be addressed before proceeding', field: 'approvalStatus', oldValue: 'Pending', newValue: 'Rejected' },
    { id: 'ACT-021', timestamp: '2026-02-01T14:00:00Z', actor: 'David Kim', action: 'Submitted for approval' },
  ],
};

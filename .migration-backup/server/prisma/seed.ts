// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const summary: { entity: string; count: number; status: string }[] = [];

  // ── TENANT ──
  try {
    await prisma.tenant.upsert({
      where: { id: 'TNT-001' },
      update: {},
      create: {
        id: 'TNT-001',
        name: 'Acme Financial Corp',
        domain: 'acmefinancial.com',
        settings: { theme: 'dark', locale: 'en-US', mfa: true },
      },
    });
    summary.push({ entity: 'Tenant', count: 1, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Tenant', count: 0, status: e.message }); }

  // ── USERS ──
  try {
    const users = [
      { id: 'USR-001', email: 'admin@acmefinancial.com', name: 'Sarah Chen', role: 'SUPER_ADMIN' as const, department: 'Executive' },
      { id: 'USR-002', email: 'compliance@acmefinancial.com', name: 'James Wright', role: 'COMPLIANCE_OFFICER' as const, department: 'Compliance' },
      { id: 'USR-003', email: 'mleng@acmefinancial.com', name: 'Priya Sharma', role: 'ML_ENGINEER' as const, department: 'Engineering' },
      { id: 'USR-004', email: 'risk@acmefinancial.com', name: 'Michael Torres', role: 'RISK_ANALYST' as const, department: 'Risk Management' },
      { id: 'USR-005', email: 'auditor@acmefinancial.com', name: 'Emily Nakamura', role: 'AUDITOR' as const, department: 'Internal Audit' },
      { id: 'USR-006', email: 'hitl@acmefinancial.com', name: 'David Okonkwo', role: 'HITL_REVIEWER' as const, department: 'Operations' },
    ];
    for (const u of users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: { ...u, tenantId: 'TNT-001', passwordHash: '$2b$10$placeholder' },
      });
    }
    summary.push({ entity: 'Users', count: users.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Users', count: 0, status: e.message }); }

  // ── FRAMEWORKS ──
  try {
    const frameworks = [
      { id: 'FW-001', name: 'EU AI Act', version: '2024', description: 'European Union Artificial Intelligence Act', category: 'REGULATORY' },
      { id: 'FW-002', name: 'GDPR', version: '2016/679', description: 'General Data Protection Regulation', category: 'REGULATORY' },
      { id: 'FW-003', name: 'NIST AI RMF', version: '1.0', description: 'NIST AI Risk Management Framework', category: 'STANDARD' },
      { id: 'FW-004', name: 'ISO 42001', version: '2023', description: 'AI Management System Standard', category: 'STANDARD' },
    ];
    for (const fw of frameworks) {
      await prisma.framework.upsert({
        where: { id: fw.id },
        update: {},
        create: { ...fw, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Frameworks', count: frameworks.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Frameworks', count: 0, status: e.message }); }

  // ── POLICIES ──
  try {
    const policies = [
      { id: 'POL-001', title: 'AI Ethics and Responsible Use Policy', status: 'APPROVED' as const, version: 1, ownerId: 'USR-002', frameworkId: 'FW-001', content: 'Comprehensive policy governing the ethical development and deployment of AI systems.', approvedAt: new Date('2024-11-15') },
      { id: 'POL-002', title: 'Data Privacy and AI Training Policy', status: 'UNDER_REVIEW' as const, version: 2, ownerId: 'USR-002', frameworkId: 'FW-002', content: 'Policy covering data handling practices for AI model training and inference.' },
      { id: 'POL-003', title: 'Model Risk Management Policy', status: 'DRAFT' as const, version: 1, ownerId: 'USR-004', frameworkId: 'FW-003', content: 'Draft policy for managing risks associated with AI model lifecycle.' },
      { id: 'POL-004', title: 'Legacy Bias Detection Policy', status: 'DEPRECATED' as const, version: 3, ownerId: 'USR-005', frameworkId: 'FW-004', content: 'Deprecated policy superseded by POL-001.', deprecatedAt: new Date('2024-10-01') },
    ];
    for (const p of policies) {
      await prisma.policy.upsert({
        where: { id: p.id },
        update: {},
        create: { ...p, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Policies', count: policies.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Policies', count: 0, status: e.message }); }

  // ── CONTROLS ──
  try {
    const controls = [
      { id: 'CTRL-001', title: 'Human oversight for high-risk AI', status: 'IMPLEMENTED' as const, policyId: 'POL-001', frameworkId: 'FW-001', evidence: 'HITL workflow active for all high-risk models' },
      { id: 'CTRL-002', title: 'Bias testing before deployment', status: 'IMPLEMENTED' as const, policyId: 'POL-001', frameworkId: 'FW-001', evidence: 'Automated bias scans in CI/CD pipeline' },
      { id: 'CTRL-003', title: 'Data minimization for training', status: 'PARTIAL' as const, policyId: 'POL-002', frameworkId: 'FW-002', evidence: 'PII scrubbing active, retention policy pending' },
      { id: 'CTRL-004', title: 'Right to explanation mechanism', status: 'PARTIAL' as const, policyId: 'POL-002', frameworkId: 'FW-002', evidence: 'Explainability module in development' },
      { id: 'CTRL-005', title: 'Model versioning and lineage', status: 'IMPLEMENTED' as const, policyId: 'POL-003', frameworkId: 'FW-003', evidence: 'MLflow tracking integrated' },
      { id: 'CTRL-006', title: 'Adversarial robustness testing', status: 'NOT_IMPLEMENTED' as const, policyId: 'POL-003', frameworkId: 'FW-003', evidence: null },
      { id: 'CTRL-007', title: 'Continuous monitoring dashboard', status: 'IMPLEMENTED' as const, policyId: 'POL-001', frameworkId: 'FW-004', evidence: 'Grafana dashboards deployed' },
      { id: 'CTRL-008', title: 'Third-party model audit', status: 'NOT_IMPLEMENTED' as const, policyId: 'POL-004', frameworkId: 'FW-004', evidence: null },
      { id: 'CTRL-009', title: 'Incident response for AI failures', status: 'FAILED' as const, policyId: 'POL-003', frameworkId: 'FW-003', evidence: 'Last test failed: escalation path broken' },
    ];
    for (const c of controls) {
      await prisma.control.upsert({
        where: { id: c.id },
        update: {},
        create: { ...c, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Controls', count: controls.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Controls', count: 0, status: e.message }); }

  // ── MODELS ──
  try {
    const models = [
      { id: 'MDL-001', name: 'Credit Risk Scorer v3', type: 'Classification', status: 'PRODUCTION' as const, riskLevel: 'HIGH' as const, version: '3.2.1', vendorId: 'VND-001', datasetId: 'DS-001', description: 'Predicts credit default probability for loan applications', accuracy: 0.94, lastAuditDate: new Date('2024-12-01') },
      { id: 'MDL-002', name: 'Customer Churn Predictor', type: 'Classification', status: 'PRODUCTION' as const, riskLevel: 'MEDIUM' as const, version: '2.1.0', vendorId: 'VND-002', datasetId: 'DS-002', description: 'Identifies customers likely to churn within 90 days', accuracy: 0.87, lastAuditDate: new Date('2024-11-15') },
      { id: 'MDL-003', name: 'Document Classifier', type: 'NLP', status: 'STAGING' as const, riskLevel: 'LOW' as const, version: '1.0.0-rc1', vendorId: 'VND-003', datasetId: 'DS-003', description: 'Classifies incoming documents by type and urgency', accuracy: 0.91 },
      { id: 'MDL-004', name: 'Fraud Detection Ensemble', type: 'Ensemble', status: 'DRAFT' as const, riskLevel: 'CRITICAL' as const, version: '0.9.0', vendorId: 'VND-001', datasetId: 'DS-001', description: 'Real-time fraud detection for transaction monitoring' },
    ];
    for (const m of models) {
      await prisma.model.upsert({
        where: { id: m.id },
        update: {},
        create: { ...m, tenantId: 'TNT-001', ownerId: 'USR-003' },
      });
    }
    summary.push({ entity: 'Models', count: models.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Models', count: 0, status: e.message }); }

  // ── DATASETS ──
  try {
    const datasets = [
      { id: 'DS-001', name: 'Financial Transactions 2024', source: 'Internal DWH', recordCount: 2500000, hasPii: true, hasDemographicData: false, description: 'Transaction records with PII fields masked', lastUpdated: new Date('2024-12-10') },
      { id: 'DS-002', name: 'Customer Demographics Q4', source: 'CRM Export', recordCount: 180000, hasPii: false, hasDemographicData: true, description: 'Customer demographic and behavioral data', lastUpdated: new Date('2024-11-20') },
      { id: 'DS-003', name: 'Document Corpus Clean', source: 'Document Management System', recordCount: 75000, hasPii: false, hasDemographicData: false, description: 'Cleaned and labeled document dataset', lastUpdated: new Date('2024-10-05') },
    ];
    for (const d of datasets) {
      await prisma.dataset.upsert({
        where: { id: d.id },
        update: {},
        create: { ...d, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Datasets', count: datasets.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Datasets', count: 0, status: e.message }); }

  // ── AGENTS ──
  try {
    const agents = [
      { id: 'AGT-001', name: 'Compliance Copilot', status: 'CONFIRMED' as const, source: 'REGISTERED' as const, modelId: 'MDL-001', department: 'Compliance', description: 'Assists compliance officers with policy review', isShadowAi: false },
      { id: 'AGT-002', name: 'Risk Assessment Bot', status: 'CONFIRMED' as const, source: 'REGISTERED' as const, modelId: 'MDL-002', department: 'Risk Management', description: 'Automated risk scoring assistant', isShadowAi: false },
      { id: 'AGT-003', name: 'Email Summarizer', status: 'DISCOVERED' as const, source: 'NETWORK_SCAN' as const, modelId: null, department: 'Marketing', description: 'Discovered via network traffic analysis', isShadowAi: true },
      { id: 'AGT-004', name: 'Code Review Helper', status: 'DISCOVERED' as const, source: 'EMPLOYEE_REPORT' as const, modelId: null, department: 'Engineering', description: 'Reported by engineering team member', isShadowAi: false },
      { id: 'AGT-005', name: 'Meeting Note Taker', status: 'DISCOVERED' as const, source: 'NETWORK_SCAN' as const, modelId: null, department: 'Operations', description: 'Unauthorized AI meeting recorder', isShadowAi: false },
    ];
    for (const a of agents) {
      await prisma.agent.upsert({
        where: { id: a.id },
        update: {},
        create: { ...a, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Agents', count: agents.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Agents', count: 0, status: e.message }); }

  // ── VENDORS ──
  try {
    const vendors = [
      { id: 'VND-001', name: 'Azure AI Services', riskTier: 1, status: 'ACTIVE' as const, contactEmail: 'enterprise@microsoft.com', contractExpiry: new Date('2025-12-31'), lastAssessment: new Date('2024-11-01') },
      { id: 'VND-002', name: 'AWS SageMaker', riskTier: 2, status: 'ACTIVE' as const, contactEmail: 'aws-enterprise@amazon.com', contractExpiry: new Date('2025-06-30'), lastAssessment: new Date('2024-10-15') },
      { id: 'VND-003', name: 'Hugging Face Enterprise', riskTier: 2, status: 'ACTIVE' as const, contactEmail: 'enterprise@huggingface.co', contractExpiry: new Date('2025-03-31'), lastAssessment: new Date('2024-09-20') },
      { id: 'VND-004', name: 'DataRobot Legacy', riskTier: 3, status: 'SUSPENDED' as const, contactEmail: 'support@datarobot.com', contractExpiry: new Date('2024-06-30'), lastAssessment: new Date('2024-03-01'), suspendedReason: 'Failed security audit Q2 2024' },
    ];
    for (const v of vendors) {
      await prisma.vendor.upsert({
        where: { id: v.id },
        update: {},
        create: { ...v, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Vendors', count: vendors.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Vendors', count: 0, status: e.message }); }

  // ── BIAS AUDITS ──
  try {
    const biasAudits = [
      { id: 'BA-001', modelId: 'MDL-001', datasetId: 'DS-001', status: 'COMPLETE' as const, startedAt: new Date('2024-11-25'), completedAt: new Date('2024-11-28'), result: { fairnessScore: 0.62, threshold: 0.80, passed: false, disparateImpactRatio: 0.71, protectedGroups: ['age', 'gender', 'ethnicity'] }, triggeredBy: 'USR-005' },
      { id: 'BA-002', modelId: 'MDL-002', datasetId: 'DS-002', status: 'RUNNING' as const, startedAt: new Date('2024-12-12'), result: null, triggeredBy: 'USR-003' },
      { id: 'BA-003', modelId: 'MDL-004', datasetId: 'DS-001', status: 'PENDING' as const, result: null, triggeredBy: 'USR-004' },
    ];
    for (const ba of biasAudits) {
      await prisma.biasAudit.upsert({
        where: { id: ba.id },
        update: {},
        create: { ...ba, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Bias Audits', count: biasAudits.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Bias Audits', count: 0, status: e.message }); }

  // ── EVIDENCE ──
  try {
    const evidence = [
      { id: 'EV-001', controlId: 'CTRL-001', modelId: 'MDL-001', type: 'DOCUMENT', source: 'AUTO' as const, title: 'HITL Workflow Configuration', url: '/evidence/hitl-config.pdf', collectedAt: new Date('2024-12-01'), isStale: false },
      { id: 'EV-002', controlId: 'CTRL-002', modelId: 'MDL-001', type: 'TEST_RESULT', source: 'AUTO' as const, title: 'Bias Test Report - Credit Scorer', url: '/evidence/bias-report-mdl001.json', collectedAt: new Date('2024-11-28'), isStale: false },
      { id: 'EV-003', controlId: 'CTRL-003', modelId: null, type: 'SCREENSHOT', source: 'MANUAL' as const, title: 'PII Scrubbing Dashboard', url: '/evidence/pii-dashboard.png', collectedAt: new Date('2024-10-15'), isStale: true },
      { id: 'EV-004', controlId: 'CTRL-005', modelId: 'MDL-002', type: 'LOG', source: 'AUTO' as const, title: 'MLflow Version History', url: '/evidence/mlflow-versions.log', collectedAt: new Date('2024-12-10'), isStale: false },
      { id: 'EV-005', controlId: 'CTRL-007', modelId: null, type: 'DOCUMENT', source: 'MANUAL' as const, title: 'Monitoring SLA Report Q4', url: '/evidence/monitoring-sla-q4.pdf', collectedAt: new Date('2024-12-05'), isStale: false },
      { id: 'EV-006', controlId: 'CTRL-009', modelId: 'MDL-004', type: 'TEST_RESULT', source: 'AUTO' as const, title: 'Incident Response Drill Results', url: '/evidence/ir-drill-failed.json', collectedAt: new Date('2024-11-20'), isStale: true },
      { id: 'EV-007', controlId: 'CTRL-001', modelId: 'MDL-003', type: 'DOCUMENT', source: 'MANUAL' as const, title: 'Document Classifier Review Notes', url: '/evidence/doc-classifier-review.pdf', collectedAt: new Date('2024-08-10'), isStale: true },
    ];
    for (const ev of evidence) {
      await prisma.evidence.upsert({
        where: { id: ev.id },
        update: {},
        create: { ...ev, tenantId: 'TNT-001', uploadedBy: 'USR-005' },
      });
    }
    summary.push({ entity: 'Evidence', count: evidence.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Evidence', count: 0, status: e.message }); }

  // ── HITL ITEMS ──
  try {
    const hitlItems = [
      { id: 'HITL-001', entityType: 'MODEL', entityId: 'MDL-001', action: 'DEPLOYMENT_APPROVAL', status: 'APPROVED' as const, assignedTo: 'USR-006', decidedAt: new Date('2024-11-20'), decision: 'Approved for production after bias review', priority: 'HIGH' },
      { id: 'HITL-002', entityType: 'MODEL', entityId: 'MDL-004', action: 'DEPLOYMENT_APPROVAL', status: 'PENDING' as const, assignedTo: 'USR-006', priority: 'CRITICAL' },
      { id: 'HITL-003', entityType: 'POLICY', entityId: 'POL-002', action: 'POLICY_REVIEW', status: 'PENDING' as const, assignedTo: 'USR-002', priority: 'MEDIUM' },
      { id: 'HITL-004', entityType: 'BIAS_AUDIT', entityId: 'BA-001', action: 'AUDIT_REVIEW', status: 'REJECTED' as const, assignedTo: 'USR-005', decidedAt: new Date('2024-12-01'), decision: 'Bias score below threshold, remediation required', priority: 'HIGH' },
      { id: 'HITL-005', entityType: 'VENDOR', entityId: 'VND-004', action: 'VENDOR_REVIEW', status: 'APPROVED' as const, assignedTo: 'USR-004', decidedAt: new Date('2024-06-15'), decision: 'Suspension confirmed', priority: 'LOW' },
      { id: 'HITL-006', entityType: 'AGENT', entityId: 'AGT-003', action: 'AGENT_CLASSIFICATION', status: 'PENDING' as const, assignedTo: 'USR-002', priority: 'HIGH' },
      { id: 'HITL-007', entityType: 'MODEL', entityId: 'MDL-003', action: 'STAGING_REVIEW', status: 'APPROVED' as const, assignedTo: 'USR-006', decidedAt: new Date('2024-12-08'), decision: 'Ready for staging tests', priority: 'MEDIUM' },
      { id: 'HITL-008', entityType: 'CONTROL', entityId: 'CTRL-006', action: 'IMPLEMENTATION_REVIEW', status: 'REJECTED' as const, assignedTo: 'USR-003', decidedAt: new Date('2024-12-05'), decision: 'Insufficient test coverage', priority: 'MEDIUM' },
      { id: 'HITL-009', entityType: 'DATASET', entityId: 'DS-001', action: 'DATA_REVIEW', status: 'PENDING' as const, assignedTo: 'USR-004', priority: 'HIGH', dueDate: new Date('2024-11-30') },
      { id: 'HITL-010', entityType: 'MODEL', entityId: 'MDL-002', action: 'RETRAINING_APPROVAL', status: 'OVERDUE' as const, assignedTo: 'USR-006', priority: 'HIGH', dueDate: new Date('2024-12-01') },
    ];
    for (const h of hitlItems) {
      await prisma.hitlItem.upsert({
        where: { id: h.id },
        update: {},
        create: { ...h, tenantId: 'TNT-001', createdBy: 'USR-001' },
      });
    }
    summary.push({ entity: 'HITL Items', count: hitlItems.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'HITL Items', count: 0, status: e.message }); }

  // -- RISK ENTRIES --
  try {
    const risks = [
      { id: 'RSK-001', title: 'Biased credit decisions', likelihood: 4, impact: 5, category: 'FAIRNESS', modelId: 'MDL-001', mitigation: 'Quarterly bias audits, HITL for edge cases', status: 'OPEN' },
      { id: 'RSK-002', title: 'PII leakage in training data', likelihood: 3, impact: 5, category: 'PRIVACY', modelId: 'MDL-001', mitigation: 'PII scrubbing pipeline, access controls', status: 'MITIGATED' },
      { id: 'RSK-003', title: 'Model drift in churn predictor', likelihood: 3, impact: 3, category: 'PERFORMANCE', modelId: 'MDL-002', mitigation: 'Monthly retraining, drift monitoring', status: 'OPEN' },
      { id: 'RSK-004', title: 'Adversarial input attacks', likelihood: 2, impact: 5, category: 'SECURITY', modelId: 'MDL-004', mitigation: 'Input validation, guardrails', status: 'OPEN' },
      { id: 'RSK-005', title: 'Regulatory non-compliance EU AI Act', likelihood: 3, impact: 4, category: 'COMPLIANCE', modelId: null, mitigation: 'Gap analysis, remediation plan', status: 'OPEN' },
      { id: 'RSK-006', title: 'Shadow AI data exfiltration', likelihood: 4, impact: 4, category: 'SECURITY', modelId: null, mitigation: 'Network monitoring, agent discovery', status: 'OPEN' },
      { id: 'RSK-007', title: 'Vendor lock-in risk', likelihood: 2, impact: 3, category: 'OPERATIONAL', modelId: null, mitigation: 'Multi-cloud strategy', status: 'ACCEPTED' },
      { id: 'RSK-008', title: 'Explainability gap for high-risk models', likelihood: 3, impact: 4, category: 'TRANSPARENCY', modelId: 'MDL-001', mitigation: 'SHAP/LIME integration', status: 'OPEN' },
      { id: 'RSK-009', title: 'Insufficient incident response', likelihood: 4, impact: 3, category: 'OPERATIONAL', modelId: null, mitigation: 'IR plan update, quarterly drills', status: 'OPEN' },
      { id: 'RSK-010', title: 'Training data staleness', likelihood: 2, impact: 2, category: 'PERFORMANCE', modelId: 'MDL-003', mitigation: 'Automated data refresh pipeline', status: 'MITIGATED' },
      { id: 'RSK-011', title: 'Demographic proxy variables', likelihood: 5, impact: 4, category: 'FAIRNESS', modelId: 'MDL-002', mitigation: 'Feature audit, proxy detection', status: 'OPEN' },
      { id: 'RSK-012', title: 'Model output manipulation', likelihood: 1, impact: 5, category: 'SECURITY', modelId: 'MDL-004', mitigation: 'Output validation, anomaly detection', status: 'OPEN' },
      { id: 'RSK-013', title: 'Consent management gaps', likelihood: 2, impact: 4, category: 'PRIVACY', modelId: null, mitigation: 'Consent platform integration', status: 'MITIGATED' },
      { id: 'RSK-014', title: 'Single point of failure in pipeline', likelihood: 1, impact: 2, category: 'OPERATIONAL', modelId: 'MDL-001', mitigation: 'HA configuration', status: 'ACCEPTED' },
      { id: 'RSK-015', title: 'Insufficient audit trail', likelihood: 5, impact: 1, category: 'COMPLIANCE', modelId: null, mitigation: 'Enhanced logging, immutable audit log', status: 'OPEN' },
    ];
    for (const r of risks) {
      await prisma.riskEntry.upsert({
        where: { id: r.id },
        update: {},
        create: { ...r, tenantId: 'TNT-001', ownerId: 'USR-004', riskScore: r.likelihood * r.impact },
      });
    }
    summary.push({ entity: 'Risk Entries', count: risks.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Risk Entries', count: 0, status: e.message }); }

  // -- REGULATIONS --
  try {
    const regulations = [
      { id: 'REG-001', name: 'EU AI Act', jurisdiction: 'European Union', effectiveDate: new Date('2025-08-01'), category: 'AI_SPECIFIC', url: 'https://eur-lex.europa.eu/eli/reg/2024/1689' },
      { id: 'REG-002', name: 'GDPR', jurisdiction: 'European Union', effectiveDate: new Date('2018-05-25'), category: 'DATA_PROTECTION', url: 'https://eur-lex.europa.eu/eli/reg/2016/679' },
      { id: 'REG-003', name: 'CCPA/CPRA', jurisdiction: 'California, USA', effectiveDate: new Date('2023-01-01'), category: 'DATA_PROTECTION', url: 'https://oag.ca.gov/privacy/ccpa' },
      { id: 'REG-004', name: 'NIST AI RMF', jurisdiction: 'United States', effectiveDate: new Date('2023-01-26'), category: 'FRAMEWORK', url: 'https://www.nist.gov/artificial-intelligence' },
      { id: 'REG-005', name: 'ISO/IEC 42001:2023', jurisdiction: 'International', effectiveDate: new Date('2023-12-18'), category: 'STANDARD', url: 'https://www.iso.org/standard/81230.html' },
      { id: 'REG-006', name: 'NYC Local Law 144', jurisdiction: 'New York City, USA', effectiveDate: new Date('2023-07-05'), category: 'AI_SPECIFIC', url: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page' },
      { id: 'REG-007', name: 'Canada AIDA', jurisdiction: 'Canada', effectiveDate: new Date('2025-01-01'), category: 'AI_SPECIFIC', url: 'https://ised-isde.canada.ca/site/innovation-better-canada/en' },
      { id: 'REG-008', name: 'UK AI Safety Framework', jurisdiction: 'United Kingdom', effectiveDate: new Date('2024-11-01'), category: 'FRAMEWORK', url: 'https://www.gov.uk/government/organisations/ai-safety-institute' },
    ];
    for (const reg of regulations) {
      await prisma.regulation.upsert({
        where: { id: reg.id },
        update: {},
        create: { ...reg, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Regulations', count: regulations.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Regulations', count: 0, status: e.message }); }

  // -- GUARDRAIL RULES --
  try {
    const guardrails = [
      { id: 'GR-001', name: 'PII Input Filter', type: 'INPUT' as const, modelId: 'MDL-001', rule: 'Block inputs containing SSN, credit card, or passport numbers', action: 'BLOCK', isActive: true },
      { id: 'GR-002', name: 'Prompt Injection Detection', type: 'INPUT' as const, modelId: 'MDL-003', rule: 'Detect and block prompt injection patterns', action: 'BLOCK', isActive: true },
      { id: 'GR-003', name: 'Rate Limit Guard', type: 'INPUT' as const, modelId: null, rule: 'Limit to 100 requests per minute per user', action: 'THROTTLE', isActive: true },
      { id: 'GR-004', name: 'Confidence Threshold', type: 'OUTPUT' as const, modelId: 'MDL-001', rule: 'Flag outputs with confidence below 0.7', action: 'FLAG', isActive: true },
      { id: 'GR-005', name: 'Toxic Content Filter', type: 'OUTPUT' as const, modelId: 'MDL-003', rule: 'Block outputs containing toxic or harmful content', action: 'BLOCK', isActive: true },
      { id: 'GR-006', name: 'PII Output Redaction', type: 'OUTPUT' as const, modelId: 'MDL-002', rule: 'Redact any PII in model outputs', action: 'REDACT', isActive: true },
      { id: 'GR-007', name: 'Hallucination Check', type: 'OUTPUT' as const, modelId: 'MDL-003', rule: 'Cross-reference outputs against knowledge base', action: 'FLAG', isActive: false },
      { id: 'GR-008', name: 'Fairness Constraint', type: 'BEHAVIOR' as const, modelId: 'MDL-001', rule: 'Ensure demographic parity ratio stays above 0.8', action: 'ALERT', isActive: true },
      { id: 'GR-009', name: 'Drift Detection', type: 'BEHAVIOR' as const, modelId: 'MDL-002', rule: 'Alert when prediction distribution shifts >2 std dev', action: 'ALERT', isActive: true },
      { id: 'GR-010', name: 'Latency Guard', type: 'BEHAVIOR' as const, modelId: 'MDL-004', rule: 'Alert if p99 latency exceeds 500ms', action: 'ALERT', isActive: true },
    ];
    for (const g of guardrails) {
      await prisma.guardrailRule.upsert({
        where: { id: g.id },
        update: {},
        create: { ...g, tenantId: 'TNT-001', createdBy: 'USR-003' },
      });
    }
    summary.push({ entity: 'Guardrail Rules', count: guardrails.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Guardrail Rules', count: 0, status: e.message }); }

  // -- TRUST TRACES --
  try {
    const trustTraces = [
      { id: 'TT-001', modelId: 'MDL-001', trustScore: 72, fairnessScore: 62, transparencyScore: 78, robustnessScore: 85, privacyScore: 68, accountabilityScore: 80, timestamp: new Date('2024-12-01') },
      { id: 'TT-002', modelId: 'MDL-001', trustScore: 74, fairnessScore: 65, transparencyScore: 79, robustnessScore: 84, privacyScore: 70, accountabilityScore: 82, timestamp: new Date('2024-12-08') },
      { id: 'TT-003', modelId: 'MDL-001', trustScore: 71, fairnessScore: 60, transparencyScore: 77, robustnessScore: 86, privacyScore: 67, accountabilityScore: 79, timestamp: new Date('2024-12-15') },
      { id: 'TT-004', modelId: 'MDL-002', trustScore: 85, fairnessScore: 82, transparencyScore: 88, robustnessScore: 80, privacyScore: 90, accountabilityScore: 85, timestamp: new Date('2024-12-01') },
      { id: 'TT-005', modelId: 'MDL-002', trustScore: 83, fairnessScore: 80, transparencyScore: 86, robustnessScore: 82, privacyScore: 88, accountabilityScore: 84, timestamp: new Date('2024-12-08') },
      { id: 'TT-006', modelId: 'MDL-002', trustScore: 86, fairnessScore: 84, transparencyScore: 89, robustnessScore: 81, privacyScore: 91, accountabilityScore: 86, timestamp: new Date('2024-12-15') },
      { id: 'TT-007', modelId: 'MDL-003', trustScore: 91, fairnessScore: 90, transparencyScore: 93, robustnessScore: 88, privacyScore: 95, accountabilityScore: 90, timestamp: new Date('2024-12-01') },
      { id: 'TT-008', modelId: 'MDL-003', trustScore: 90, fairnessScore: 89, transparencyScore: 92, robustnessScore: 87, privacyScore: 94, accountabilityScore: 91, timestamp: new Date('2024-12-08') },
      { id: 'TT-009', modelId: 'MDL-004', trustScore: 45, fairnessScore: 40, transparencyScore: 50, robustnessScore: 35, privacyScore: 55, accountabilityScore: 42, timestamp: new Date('2024-12-01') },
      { id: 'TT-010', modelId: 'MDL-004', trustScore: 48, fairnessScore: 42, transparencyScore: 52, robustnessScore: 38, privacyScore: 58, accountabilityScore: 45, timestamp: new Date('2024-12-08') },
      { id: 'TT-011', modelId: 'MDL-001', trustScore: 73, fairnessScore: 63, transparencyScore: 78, robustnessScore: 85, privacyScore: 69, accountabilityScore: 81, timestamp: new Date('2024-11-24') },
      { id: 'TT-012', modelId: 'MDL-001', trustScore: 70, fairnessScore: 58, transparencyScore: 76, robustnessScore: 83, privacyScore: 66, accountabilityScore: 78, timestamp: new Date('2024-11-17') },
      { id: 'TT-013', modelId: 'MDL-002', trustScore: 84, fairnessScore: 81, transparencyScore: 87, robustnessScore: 79, privacyScore: 89, accountabilityScore: 85, timestamp: new Date('2024-11-24') },
      { id: 'TT-014', modelId: 'MDL-003', trustScore: 92, fairnessScore: 91, transparencyScore: 94, robustnessScore: 89, privacyScore: 95, accountabilityScore: 92, timestamp: new Date('2024-11-24') },
      { id: 'TT-015', modelId: 'MDL-004', trustScore: 43, fairnessScore: 38, transparencyScore: 48, robustnessScore: 33, privacyScore: 53, accountabilityScore: 40, timestamp: new Date('2024-11-24') },
      { id: 'TT-016', modelId: 'MDL-001', trustScore: 69, fairnessScore: 56, transparencyScore: 75, robustnessScore: 82, privacyScore: 65, accountabilityScore: 77, timestamp: new Date('2024-11-10') },
      { id: 'TT-017', modelId: 'MDL-002', trustScore: 82, fairnessScore: 79, transparencyScore: 85, robustnessScore: 78, privacyScore: 87, accountabilityScore: 83, timestamp: new Date('2024-11-10') },
      { id: 'TT-018', modelId: 'MDL-003', trustScore: 93, fairnessScore: 92, transparencyScore: 95, robustnessScore: 90, privacyScore: 96, accountabilityScore: 93, timestamp: new Date('2024-11-10') },
      { id: 'TT-019', modelId: 'MDL-004', trustScore: 41, fairnessScore: 36, transparencyScore: 46, robustnessScore: 31, privacyScore: 51, accountabilityScore: 38, timestamp: new Date('2024-11-10') },
      { id: 'TT-020', modelId: 'MDL-001', trustScore: 68, fairnessScore: 55, transparencyScore: 74, robustnessScore: 81, privacyScore: 64, accountabilityScore: 76, timestamp: new Date('2024-11-03') },
    ];
    for (const tt of trustTraces) {
      await prisma.trustTrace.upsert({
        where: { id: tt.id },
        update: {},
        create: { ...tt, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Trust Traces', count: trustTraces.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Trust Traces', count: 0, status: e.message }); }

  // -- AUDIT LOGS --
  try {
    const auditLogs = [
      { id: 'LOG-001', entityType: 'MODEL', entityId: 'MDL-001', action: 'CREATE' as const, userId: 'USR-003', details: { name: 'Credit Risk Scorer v3', version: '3.2.1' }, timestamp: new Date('2024-10-01') },
      { id: 'LOG-002', entityType: 'MODEL', entityId: 'MDL-001', action: 'UPDATE' as const, userId: 'USR-003', details: { field: 'status', from: 'STAGING', to: 'PRODUCTION' }, timestamp: new Date('2024-11-15') },
      { id: 'LOG-003', entityType: 'POLICY', entityId: 'POL-001', action: 'APPROVE' as const, userId: 'USR-002', details: { version: 1 }, timestamp: new Date('2024-11-15') },
      { id: 'LOG-004', entityType: 'CONTROL', entityId: 'CTRL-009', action: 'UPDATE' as const, userId: 'USR-004', details: { field: 'status', from: 'PARTIAL', to: 'FAILED' }, timestamp: new Date('2024-11-20') },
      { id: 'LOG-005', entityType: 'VENDOR', entityId: 'VND-004', action: 'SUSPEND' as const, userId: 'USR-001', details: { reason: 'Failed security audit' }, timestamp: new Date('2024-06-15') },
      { id: 'LOG-006', entityType: 'BIAS_AUDIT', entityId: 'BA-001', action: 'CREATE' as const, userId: 'USR-005', details: { modelId: 'MDL-001', datasetId: 'DS-001' }, timestamp: new Date('2024-11-25') },
      { id: 'LOG-007', entityType: 'HITL', entityId: 'HITL-001', action: 'APPROVE' as const, userId: 'USR-006', details: { entityType: 'MODEL', entityId: 'MDL-001' }, timestamp: new Date('2024-11-20') },
      { id: 'LOG-008', entityType: 'AGENT', entityId: 'AGT-003', action: 'DISCOVER' as const, userId: 'USR-001', details: { source: 'NETWORK_SCAN', isShadowAi: true }, timestamp: new Date('2024-12-01') },
      { id: 'LOG-009', entityType: 'EVIDENCE', entityId: 'EV-001', action: 'UPLOAD' as const, userId: 'USR-005', details: { controlId: 'CTRL-001', type: 'DOCUMENT' }, timestamp: new Date('2024-12-01') },
      { id: 'LOG-010', entityType: 'GUARDRAIL', entityId: 'GR-001', action: 'CREATE' as const, userId: 'USR-003', details: { type: 'INPUT', modelId: 'MDL-001' }, timestamp: new Date('2024-11-01') },
      { id: 'LOG-011', entityType: 'RISK', entityId: 'RSK-001', action: 'CREATE' as const, userId: 'USR-004', details: { likelihood: 4, impact: 5, riskScore: 20 }, timestamp: new Date('2024-10-15') },
      { id: 'LOG-012', entityType: 'DATASET', entityId: 'DS-001', action: 'UPDATE' as const, userId: 'USR-003', details: { field: 'recordCount', from: 2000000, to: 2500000 }, timestamp: new Date('2024-12-10') },
      { id: 'LOG-013', entityType: 'POLICY', entityId: 'POL-004', action: 'DEPRECATE' as const, userId: 'USR-005', details: { supersededBy: 'POL-001' }, timestamp: new Date('2024-10-01') },
      { id: 'LOG-014', entityType: 'HITL', entityId: 'HITL-004', action: 'REJECT' as const, userId: 'USR-005', details: { reason: 'Bias score below threshold' }, timestamp: new Date('2024-12-01') },
      { id: 'LOG-015', entityType: 'MODEL', entityId: 'MDL-003', action: 'CREATE' as const, userId: 'USR-003', details: { name: 'Document Classifier', version: '1.0.0-rc1' }, timestamp: new Date('2024-11-01') },
    ];
    for (const log of auditLogs) {
      await prisma.auditLog.upsert({
        where: { id: log.id },
        update: {},
        create: { ...log, tenantId: 'TNT-001' },
      });
    }
    summary.push({ entity: 'Audit Logs', count: auditLogs.length, status: 'OK' });
  } catch (e: any) { summary.push({ entity: 'Audit Logs', count: 0, status: e.message }); }

  // -- SUMMARY --
  console.log('\n========== SEED SUMMARY ==========');
  console.table(summary);
  const totalCount = summary.reduce((acc, s) => acc + s.count, 0);
  const failures = summary.filter(s => s.status !== 'OK');
  console.log(`Total records seeded: ${totalCount}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} entity type(s) failed:`);
    failures.forEach(f => console.error(`  - ${f.entity}: ${f.status}`));
  } else {
    console.log('All entity types seeded successfully!');
  }
  console.log('==================================\n');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error('Fatal seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

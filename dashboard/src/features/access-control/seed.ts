import type { Department, Role, ACUser } from './types'
import { ALL_PERMISSION_IDS, READ_EXPORT_IDS } from './permissions'

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept-001', name: 'AI Platform Engineering', code: 'AIPE', description: 'Builds and maintains the core AI infrastructure, model serving platform, and toolchain.', headCount: 24, createdAt: '2024-01-15', updatedAt: '2026-01-10', status: 'active' },
  { id: 'dept-002', name: 'Information Security', code: 'INFOSEC', description: 'Responsible for cybersecurity, threat management, and security policy enforcement.', headCount: 12, createdAt: '2024-01-15', updatedAt: '2026-02-01', status: 'active' },
  { id: 'dept-003', name: 'Compliance & Legal', code: 'COMP', description: 'Oversees regulatory compliance, legal risk, and policy governance across the organization.', headCount: 18, createdAt: '2024-01-15', updatedAt: '2026-03-15', status: 'active' },
  { id: 'dept-004', name: 'AI Governance & Ethics', code: 'AIGE', description: 'Responsible for responsible AI principles, fairness assessments, and AI ethics review board.', headCount: 9, createdAt: '2024-02-01', updatedAt: '2026-01-20', status: 'active' },
  { id: 'dept-005', name: 'Model Risk Management', code: 'MRM', description: 'Validates and monitors production AI/ML model risk per SR 11-7 and equivalent frameworks.', headCount: 11, createdAt: '2024-02-01', updatedAt: '2026-02-15', status: 'active' },
  { id: 'dept-006', name: 'Data Engineering', code: 'DATA', description: 'Manages data pipelines, data quality, lineage, and the enterprise data platform.', headCount: 20, createdAt: '2024-01-15', updatedAt: '2026-01-30', status: 'active' },
  { id: 'dept-007', name: 'Internal Audit', code: 'AUDIT', description: 'Independent audit function covering AI systems, IT controls, and SOX compliance.', headCount: 7, createdAt: '2024-03-01', updatedAt: '2026-03-01', status: 'active' },
  { id: 'dept-008', name: 'Executive Office', code: 'EXEC', description: 'C-suite and senior leadership with cross-functional oversight responsibility.', headCount: 5, createdAt: '2024-01-15', updatedAt: '2026-04-01', status: 'active' },
]

const COMPLIANCE_PERMS = [
  'policies:read','policies:write','policies:delete','policies:export',
  'frameworks:read','frameworks:write','frameworks:admin',
  'controls:read','controls:write','controls:delete',
  'evidence:read','evidence:write','evidence:delete','evidence:export',
  'audit_trail:read','audit_trail:export',
  'dsr:read','dsr:write','dsr:admin',
  'consent:read','consent:write','consent:admin',
  'risks:read','incidents:read',
  'esg_reports:read','esg_reports:write','esg_reports:export',
]

const CISO_PERMS = [
  ...READ_EXPORT_IDS,
  'risks:write','risks:delete',
  'incidents:write',
  'red_team:admin','trust_engine:admin','guardrails:admin',
  'access_control:read','system_audit:read','system_audit:export',
]

const AI_GOV_PERMS = [
  'models:read','models:write','models:delete','models:export',
  'agents:read','agents:write','agents:admin',
  'agent_iam:read','agent_iam:write','agent_iam:admin',
  'choreography:read','choreography:admin',
  'killswitch:read',
  'lineage:read','lineage:admin',
  'aibom:read','aibom:write','aibom:admin',
  'provenance:read','provenance:admin',
  'risks:read','trust_engine:read','guardrails:read',
]

const SECURITY_PERMS = [
  'red_team:read','red_team:write','red_team:admin',
  'incidents:read','incidents:write','incidents:delete',
  'guardrails:write',
  'risks:read','agents:read','system_audit:read','system_audit:export',
  'killswitch:execute',
  'trust_engine:read',
]

const ML_ENG_PERMS = [
  'models:read','models:write','models:delete','models:export',
  'agents:read',
  'lineage:read',
  'trust_engine:read',
  'benchmarks:read','benchmarks:admin',
  'aibom:read','aibom:write',
]

const DEPT_HEAD_PERMS = [
  'incidents:read','risks:read',
  'models:read','policies:read',
  'evidence:read','controls:read',
]

export const SEED_ROLES: Role[] = [
  {
    id: 'role-001', name: 'Super Admin', code: 'SUPER_ADMIN', isSystem: true, color: 'red',
    description: 'Full platform access — all modules and administrative functions. Assign with extreme caution.',
    permissions: ALL_PERMISSION_IDS, userCount: 2,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
  {
    id: 'role-002', name: 'CISO', code: 'CISO', isSystem: true, color: 'purple',
    description: 'Security leadership role — full security, compliance, and audit access with limited write permissions.',
    permissions: Array.from(new Set(CISO_PERMS)), userCount: 2,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
  {
    id: 'role-003', name: 'Compliance Officer', code: 'COMPLIANCE_OFFICER', isSystem: true, color: 'blue',
    description: 'Full governance and compliance lifecycle management — policies, frameworks, evidence, DSR, and consent.',
    permissions: Array.from(new Set(COMPLIANCE_PERMS)), userCount: 3,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
  {
    id: 'role-004', name: 'AI Governance Lead', code: 'AI_GOV_LEAD', isSystem: true, color: 'emerald',
    description: 'Responsible AI governance — model inventory, agent management, IAM, lineage, and AIBOM oversight.',
    permissions: Array.from(new Set(AI_GOV_PERMS)), userCount: 2,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
  {
    id: 'role-005', name: 'Security Engineer', code: 'SECURITY_ENG', isSystem: true, color: 'orange',
    description: 'Red team, incident response, guardrail configuration, and kill switch execution.',
    permissions: Array.from(new Set(SECURITY_PERMS)), userCount: 1,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
  {
    id: 'role-006', name: 'ML Engineer', code: 'ML_ENGINEER', isSystem: true, color: 'zinc',
    description: 'Model lifecycle management, lineage, AIBOM, and benchmarking. No risk or compliance write access.',
    permissions: Array.from(new Set(ML_ENG_PERMS)), userCount: 1,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
  {
    id: 'role-007', name: 'Auditor (Read Only)', code: 'AUDITOR', isSystem: true, color: 'amber',
    description: 'Read-only and export-only access across all modules. Suitable for internal audit and external review.',
    permissions: READ_EXPORT_IDS, userCount: 1,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
  {
    id: 'role-008', name: 'Department Head', code: 'DEPT_HEAD', isSystem: true, color: 'zinc',
    description: 'Read access scoped to key operational modules. Suitable for business line leads without deep technical access.',
    permissions: Array.from(new Set(DEPT_HEAD_PERMS)), userCount: 0,
    createdAt: '2024-01-15', updatedAt: '2024-01-15',
  },
]

export const SEED_USERS: ACUser[] = [
  { id: 'usr-001', firstName: 'Alexander', lastName: 'Chen', email: 'a.chen@acme-corp.com', departmentId: 'dept-001', roleIds: ['role-001'], status: 'active', lastLogin: '2026-04-10T09:15:00Z', createdAt: '2024-01-20', updatedAt: '2026-04-10' },
  { id: 'usr-002', firstName: 'Priya', lastName: 'Krishnamurthy', email: 'p.krishnamurthy@acme-corp.com', departmentId: 'dept-008', roleIds: ['role-001'], status: 'active', lastLogin: '2026-04-09T16:45:00Z', createdAt: '2024-01-20', updatedAt: '2026-03-15' },
  { id: 'usr-003', firstName: 'Marcus', lastName: 'Williams', email: 'm.williams@acme-corp.com', departmentId: 'dept-002', roleIds: ['role-002'], status: 'active', lastLogin: '2026-04-10T08:30:00Z', createdAt: '2024-02-01', updatedAt: '2026-04-01' },
  { id: 'usr-004', firstName: 'Sophia', lastName: 'Johansson', email: 's.johansson@acme-corp.com', departmentId: 'dept-002', roleIds: ['role-002'], status: 'active', lastLogin: '2026-04-08T11:20:00Z', createdAt: '2024-02-01', updatedAt: '2026-02-01' },
  { id: 'usr-005', firstName: 'James', lastName: 'Liu', email: 'j.liu@acme-corp.com', departmentId: 'dept-003', roleIds: ['role-003'], status: 'active', lastLogin: '2026-04-10T07:55:00Z', createdAt: '2024-03-01', updatedAt: '2026-03-20' },
  { id: 'usr-006', firstName: 'Maria', lastName: 'Santos', email: 'm.santos@acme-corp.com', departmentId: 'dept-003', roleIds: ['role-003'], status: 'active', lastLogin: '2026-04-09T14:30:00Z', createdAt: '2024-03-01', updatedAt: '2026-01-15' },
  { id: 'usr-007', firstName: 'Aisha', lastName: 'Okoye', email: 'a.okoye@acme-corp.com', departmentId: 'dept-003', roleIds: ['role-003'], status: 'pending', createdAt: '2026-03-28', updatedAt: '2026-03-28' },
  { id: 'usr-008', firstName: 'David', lastName: 'Park', email: 'd.park@acme-corp.com', departmentId: 'dept-004', roleIds: ['role-004'], status: 'active', lastLogin: '2026-04-09T10:00:00Z', createdAt: '2024-04-01', updatedAt: '2026-02-10' },
  { id: 'usr-009', firstName: 'Leila', lastName: 'Ahmadi', email: 'l.ahmadi@acme-corp.com', departmentId: 'dept-004', roleIds: ['role-004'], status: 'active', lastLogin: '2026-04-07T13:45:00Z', createdAt: '2024-04-01', updatedAt: '2026-04-05' },
  { id: 'usr-010', firstName: 'Ryan', lastName: 'O\'Brien', email: 'r.obrien@acme-corp.com', departmentId: 'dept-002', roleIds: ['role-005'], status: 'active', lastLogin: '2026-04-10T06:30:00Z', createdAt: '2024-05-01', updatedAt: '2026-03-01' },
  { id: 'usr-011', firstName: 'Yuki', lastName: 'Nakamura', email: 'y.nakamura@acme-corp.com', departmentId: 'dept-001', roleIds: ['role-006'], status: 'suspended', lastLogin: '2026-02-15T09:00:00Z', createdAt: '2024-06-01', updatedAt: '2026-03-10' },
  { id: 'usr-012', firstName: 'Eleanor', lastName: 'Thompson', email: 'e.thompson@acme-corp.com', departmentId: 'dept-007', roleIds: ['role-007'], status: 'active', lastLogin: '2026-04-08T15:10:00Z', createdAt: '2024-07-01', updatedAt: '2026-01-20' },
]

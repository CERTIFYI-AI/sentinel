import type { Permission } from './types'

export const PERMISSIONS: Permission[] = [
  // ── Governance & Compliance ──────────────────────────────────────────
  { id: 'policies:read',       key: 'policies:read',       label: 'View Policies',         module: 'Policies',            section: 'Governance & Compliance', action: 'read',   description: 'View policy documents and metadata' },
  { id: 'policies:write',      key: 'policies:write',      label: 'Edit Policies',         module: 'Policies',            section: 'Governance & Compliance', action: 'write',  description: 'Create and update policies' },
  { id: 'policies:delete',     key: 'policies:delete',     label: 'Delete Policies',       module: 'Policies',            section: 'Governance & Compliance', action: 'delete', description: 'Delete policy documents' },
  { id: 'policies:export',     key: 'policies:export',     label: 'Export Policies',       module: 'Policies',            section: 'Governance & Compliance', action: 'export', description: 'Export policies to PDF/CSV' },
  { id: 'frameworks:read',     key: 'frameworks:read',     label: 'View Frameworks',       module: 'Frameworks',          section: 'Governance & Compliance', action: 'read',   description: 'View compliance frameworks' },
  { id: 'frameworks:write',    key: 'frameworks:write',    label: 'Edit Frameworks',       module: 'Frameworks',          section: 'Governance & Compliance', action: 'write',  description: 'Update framework controls' },
  { id: 'frameworks:admin',    key: 'frameworks:admin',    label: 'Admin Frameworks',      module: 'Frameworks',          section: 'Governance & Compliance', action: 'admin',  description: 'Full framework administration' },
  { id: 'controls:read',       key: 'controls:read',       label: 'View Controls',         module: 'Controls',            section: 'Governance & Compliance', action: 'read',   description: 'View compliance controls' },
  { id: 'controls:write',      key: 'controls:write',      label: 'Edit Controls',         module: 'Controls',            section: 'Governance & Compliance', action: 'write',  description: 'Update control status and evidence' },
  { id: 'controls:delete',     key: 'controls:delete',     label: 'Delete Controls',       module: 'Controls',            section: 'Governance & Compliance', action: 'delete', description: 'Remove controls from framework' },
  { id: 'evidence:read',       key: 'evidence:read',       label: 'View Evidence',         module: 'Evidence Hub',        section: 'Governance & Compliance', action: 'read',   description: 'View evidence files and metadata' },
  { id: 'evidence:write',      key: 'evidence:write',      label: 'Upload Evidence',       module: 'Evidence Hub',        section: 'Governance & Compliance', action: 'write',  description: 'Upload and tag evidence' },
  { id: 'evidence:delete',     key: 'evidence:delete',     label: 'Delete Evidence',       module: 'Evidence Hub',        section: 'Governance & Compliance', action: 'delete', description: 'Remove evidence files' },
  { id: 'evidence:export',     key: 'evidence:export',     label: 'Export Evidence',       module: 'Evidence Hub',        section: 'Governance & Compliance', action: 'export', description: 'Export evidence packages' },
  { id: 'audit_trail:read',    key: 'audit_trail:read',    label: 'View Audit Trail',      module: 'Audit Trail',         section: 'Governance & Compliance', action: 'read',   description: 'View audit log entries' },
  { id: 'audit_trail:export',  key: 'audit_trail:export',  label: 'Export Audit Trail',    module: 'Audit Trail',         section: 'Governance & Compliance', action: 'export', description: 'Export audit logs' },
  { id: 'dsr:read',            key: 'dsr:read',            label: 'View DSR Requests',     module: 'DSR Management',      section: 'Governance & Compliance', action: 'read',   description: 'View data subject requests' },
  { id: 'dsr:write',           key: 'dsr:write',           label: 'Manage DSR Requests',   module: 'DSR Management',      section: 'Governance & Compliance', action: 'write',  description: 'Process and update DSR requests' },
  { id: 'dsr:admin',           key: 'dsr:admin',           label: 'Admin DSR',             module: 'DSR Management',      section: 'Governance & Compliance', action: 'admin',  description: 'Full DSR administration' },
  { id: 'consent:read',        key: 'consent:read',        label: 'View Consent Records',  module: 'Consent Management',  section: 'Governance & Compliance', action: 'read',   description: 'View consent records' },
  { id: 'consent:write',       key: 'consent:write',       label: 'Manage Consent',        module: 'Consent Management',  section: 'Governance & Compliance', action: 'write',  description: 'Update consent records' },
  { id: 'consent:admin',       key: 'consent:admin',       label: 'Admin Consent',         module: 'Consent Management',  section: 'Governance & Compliance', action: 'admin',  description: 'Full consent administration' },

  // ── Risk & Trust ─────────────────────────────────────────────────────
  { id: 'risks:read',          key: 'risks:read',          label: 'View Risks',            module: 'Risk Register',       section: 'Risk & Trust', action: 'read',   description: 'View risk register entries' },
  { id: 'risks:write',         key: 'risks:write',         label: 'Edit Risks',            module: 'Risk Register',       section: 'Risk & Trust', action: 'write',  description: 'Create and update risks' },
  { id: 'risks:delete',        key: 'risks:delete',        label: 'Delete Risks',          module: 'Risk Register',       section: 'Risk & Trust', action: 'delete', description: 'Remove risk entries' },
  { id: 'risks:export',        key: 'risks:export',        label: 'Export Risks',          module: 'Risk Register',       section: 'Risk & Trust', action: 'export', description: 'Export risk register' },
  { id: 'financial_risk:read', key: 'financial_risk:read', label: 'View Financial Risk',   module: 'Financial Risk',      section: 'Risk & Trust', action: 'read',   description: 'View FAIR quantification results' },
  { id: 'financial_risk:write',key: 'financial_risk:write',label: 'Run FAIR Analysis',     module: 'Financial Risk',      section: 'Risk & Trust', action: 'write',  description: 'Run financial risk simulations' },
  { id: 'financial_risk:export',key:'financial_risk:export',label: 'Export Financial Risk', module: 'Financial Risk',     section: 'Risk & Trust', action: 'export', description: 'Export FAIR reports' },
  { id: 'red_team:read',       key: 'red_team:read',       label: 'View Red Team',         module: 'Red Team Findings',   section: 'Risk & Trust', action: 'read',   description: 'View red team findings' },
  { id: 'red_team:write',      key: 'red_team:write',      label: 'Manage Red Team',       module: 'Red Team Findings',   section: 'Risk & Trust', action: 'write',  description: 'Add and update findings' },
  { id: 'red_team:admin',      key: 'red_team:admin',      label: 'Admin Red Team',        module: 'Red Team Findings',   section: 'Risk & Trust', action: 'admin',  description: 'Full red team administration' },
  { id: 'trust_engine:read',   key: 'trust_engine:read',   label: 'View Trust Engine',     module: 'Trust Engine',        section: 'Risk & Trust', action: 'read',   description: 'View trust scores and guardrail activity' },
  { id: 'trust_engine:admin',  key: 'trust_engine:admin',  label: 'Admin Trust Engine',    module: 'Trust Engine',        section: 'Risk & Trust', action: 'admin',  description: 'Configure trust engine rules' },
  { id: 'guardrails:read',     key: 'guardrails:read',     label: 'View Guardrails',       module: 'Guardrails',          section: 'Risk & Trust', action: 'read',   description: 'View guardrail configurations' },
  { id: 'guardrails:write',    key: 'guardrails:write',    label: 'Edit Guardrails',       module: 'Guardrails',          section: 'Risk & Trust', action: 'write',  description: 'Update guardrail rules' },
  { id: 'guardrails:admin',    key: 'guardrails:admin',    label: 'Admin Guardrails',      module: 'Guardrails',          section: 'Risk & Trust', action: 'admin',  description: 'Full guardrail administration' },
  { id: 'incidents:read',      key: 'incidents:read',      label: 'View Incidents',        module: 'Incidents',           section: 'Risk & Trust', action: 'read',   description: 'View incident reports' },
  { id: 'incidents:write',     key: 'incidents:write',     label: 'Manage Incidents',      module: 'Incidents',           section: 'Risk & Trust', action: 'write',  description: 'Create and update incidents' },
  { id: 'incidents:delete',    key: 'incidents:delete',    label: 'Delete Incidents',      module: 'Incidents',           section: 'Risk & Trust', action: 'delete', description: 'Remove incident records' },
  { id: 'system_audit:read',   key: 'system_audit:read',   label: 'View System Audit Log', module: 'System Audit Log',    section: 'Risk & Trust', action: 'read',   description: 'View system-level audit events' },
  { id: 'system_audit:export', key: 'system_audit:export', label: 'Export System Audit',   module: 'System Audit Log',    section: 'Risk & Trust', action: 'export', description: 'Export system audit log' },

  // ── AI Inventory & Operations ─────────────────────────────────────────
  { id: 'models:read',         key: 'models:read',         label: 'View Models',           module: 'Model Inventory',     section: 'AI Inventory & Operations', action: 'read',   description: 'View model registry' },
  { id: 'models:write',        key: 'models:write',        label: 'Edit Models',           module: 'Model Inventory',     section: 'AI Inventory & Operations', action: 'write',  description: 'Register and update models' },
  { id: 'models:delete',       key: 'models:delete',       label: 'Delete Models',         module: 'Model Inventory',     section: 'AI Inventory & Operations', action: 'delete', description: 'Remove models from registry' },
  { id: 'models:export',       key: 'models:export',       label: 'Export Models',         module: 'Model Inventory',     section: 'AI Inventory & Operations', action: 'export', description: 'Export model inventory' },
  { id: 'agents:read',         key: 'agents:read',         label: 'View Agents',           module: 'Agent Registry',      section: 'AI Inventory & Operations', action: 'read',   description: 'View AI agent registry' },
  { id: 'agents:write',        key: 'agents:write',        label: 'Edit Agents',           module: 'Agent Registry',      section: 'AI Inventory & Operations', action: 'write',  description: 'Register and configure agents' },
  { id: 'agents:admin',        key: 'agents:admin',        label: 'Admin Agents',          module: 'Agent Registry',      section: 'AI Inventory & Operations', action: 'admin',  description: 'Full agent administration' },
  { id: 'agent_iam:read',      key: 'agent_iam:read',      label: 'View Agent IAM',        module: 'Agent IAM',           section: 'AI Inventory & Operations', action: 'read',   description: 'View agent credentials and scopes' },
  { id: 'agent_iam:write',     key: 'agent_iam:write',     label: 'Edit Agent IAM',        module: 'Agent IAM',           section: 'AI Inventory & Operations', action: 'write',  description: 'Provision agent credentials' },
  { id: 'agent_iam:admin',     key: 'agent_iam:admin',     label: 'Admin Agent IAM',       module: 'Agent IAM',           section: 'AI Inventory & Operations', action: 'admin',  description: 'Full agent IAM administration' },
  { id: 'choreography:read',   key: 'choreography:read',   label: 'View Choreography',     module: 'Multi-Agent Choreography', section: 'AI Inventory & Operations', action: 'read', description: 'View multi-agent workflows' },
  { id: 'choreography:admin',  key: 'choreography:admin',  label: 'Admin Choreography',    module: 'Multi-Agent Choreography', section: 'AI Inventory & Operations', action: 'admin', description: 'Manage multi-agent workflows' },
  { id: 'killswitch:read',     key: 'killswitch:read',     label: 'View Kill Switch',      module: 'Kill Switch Events',  section: 'AI Inventory & Operations', action: 'read',   description: 'View kill switch event log' },
  { id: 'killswitch:execute',  key: 'killswitch:execute',  label: 'Execute Kill Switch',   module: 'Kill Switch Events',  section: 'AI Inventory & Operations', action: 'execute',description: 'Trigger model kill switches' },
  { id: 'killswitch:admin',    key: 'killswitch:admin',    label: 'Admin Kill Switch',     module: 'Kill Switch Events',  section: 'AI Inventory & Operations', action: 'admin',  description: 'Configure kill switch rules' },
  { id: 'lineage:read',        key: 'lineage:read',        label: 'View Data Lineage',     module: 'Data Lineage',        section: 'AI Inventory & Operations', action: 'read',   description: 'View data lineage graphs' },
  { id: 'lineage:admin',       key: 'lineage:admin',       label: 'Admin Data Lineage',    module: 'Data Lineage',        section: 'AI Inventory & Operations', action: 'admin',  description: 'Manage lineage configurations' },
  { id: 'integrations:read',   key: 'integrations:read',   label: 'View Integrations',     module: 'Integrations',        section: 'AI Inventory & Operations', action: 'read',   description: 'View integration connections' },
  { id: 'integrations:write',  key: 'integrations:write',  label: 'Edit Integrations',     module: 'Integrations',        section: 'AI Inventory & Operations', action: 'write',  description: 'Configure integrations' },
  { id: 'integrations:admin',  key: 'integrations:admin',  label: 'Admin Integrations',    module: 'Integrations',        section: 'AI Inventory & Operations', action: 'admin',  description: 'Full integration administration' },

  // ── AI Supply Chain ───────────────────────────────────────────────────
  { id: 'aibom:read',          key: 'aibom:read',          label: 'View AIBOM',            module: 'AIBOM Registry',      section: 'AI Supply Chain', action: 'read',   description: 'View AI bill of materials' },
  { id: 'aibom:write',         key: 'aibom:write',         label: 'Edit AIBOM',            module: 'AIBOM Registry',      section: 'AI Supply Chain', action: 'write',  description: 'Generate and update AIBOMs' },
  { id: 'aibom:admin',         key: 'aibom:admin',         label: 'Admin AIBOM',           module: 'AIBOM Registry',      section: 'AI Supply Chain', action: 'admin',  description: 'Full AIBOM administration' },
  { id: 'provenance:read',     key: 'provenance:read',     label: 'View Provenance',       module: 'Provenance Graph',    section: 'AI Supply Chain', action: 'read',   description: 'View provenance graphs' },
  { id: 'provenance:admin',    key: 'provenance:admin',    label: 'Admin Provenance',      module: 'Provenance Graph',    section: 'AI Supply Chain', action: 'admin',  description: 'Manage provenance tracking' },
  { id: 'vendor_upload:read',  key: 'vendor_upload:read',  label: 'View Vendor Uploads',   module: 'Vendor Upload Portal',section: 'AI Supply Chain', action: 'read',   description: 'View vendor submitted documents' },
  { id: 'vendor_upload:write', key: 'vendor_upload:write', label: 'Manage Vendor Uploads', module: 'Vendor Upload Portal',section: 'AI Supply Chain', action: 'write',  description: 'Approve/reject vendor uploads' },
  { id: 'attestations:read',   key: 'attestations:read',   label: 'View Attestations',     module: 'Supply Chain Attestations', section: 'AI Supply Chain', action: 'read', description: 'View supply chain attestations' },
  { id: 'attestations:write',  key: 'attestations:write',  label: 'Create Attestations',   module: 'Supply Chain Attestations', section: 'AI Supply Chain', action: 'write', description: 'Submit attestations' },
  { id: 'attestations:admin',  key: 'attestations:admin',  label: 'Admin Attestations',    module: 'Supply Chain Attestations', section: 'AI Supply Chain', action: 'admin', description: 'Approve and revoke attestations' },

  // ── Sustainability & ESG ──────────────────────────────────────────────
  { id: 'carbon:read',         key: 'carbon:read',         label: 'View Carbon Ledger',    module: 'Carbon Ledger',       section: 'Sustainability & ESG', action: 'read',   description: 'View carbon emission records' },
  { id: 'carbon:write',        key: 'carbon:write',        label: 'Log Carbon Data',       module: 'Carbon Ledger',       section: 'Sustainability & ESG', action: 'write',  description: 'Log carbon emission entries' },
  { id: 'carbon:export',       key: 'carbon:export',       label: 'Export Carbon Data',    module: 'Carbon Ledger',       section: 'Sustainability & ESG', action: 'export', description: 'Export carbon reports' },
  { id: 'energy:read',         key: 'energy:read',         label: 'View Energy Data',      module: 'Energy Efficiency',   section: 'Sustainability & ESG', action: 'read',   description: 'View energy consumption records' },
  { id: 'energy:admin',        key: 'energy:admin',        label: 'Admin Energy',          module: 'Energy Efficiency',   section: 'Sustainability & ESG', action: 'admin',  description: 'Full energy management' },
  { id: 'esg_reports:read',    key: 'esg_reports:read',    label: 'View ESG Reports',      module: 'ESG Reports',         section: 'Sustainability & ESG', action: 'read',   description: 'View ESG report data' },
  { id: 'esg_reports:write',   key: 'esg_reports:write',   label: 'Edit ESG Reports',      module: 'ESG Reports',         section: 'Sustainability & ESG', action: 'write',  description: 'Create and update ESG reports' },
  { id: 'esg_reports:export',  key: 'esg_reports:export',  label: 'Export ESG Reports',    module: 'ESG Reports',         section: 'Sustainability & ESG', action: 'export', description: 'Export ESG reports' },
  { id: 'benchmarks:read',     key: 'benchmarks:read',     label: 'View Benchmarks',       module: 'Model Efficiency Benchmarking', section: 'Sustainability & ESG', action: 'read', description: 'View benchmark results' },
  { id: 'benchmarks:admin',    key: 'benchmarks:admin',    label: 'Admin Benchmarks',      module: 'Model Efficiency Benchmarking', section: 'Sustainability & ESG', action: 'admin', description: 'Manage benchmark runs' },

  // ── Administration ────────────────────────────────────────────────────
  { id: 'access_control:read', key: 'access_control:read', label: 'View Access Control',   module: 'Access Control',      section: 'Administration', action: 'read',   description: 'View users, roles, and departments' },
  { id: 'access_control:write',key: 'access_control:write',label: 'Manage Access Control', module: 'Access Control',      section: 'Administration', action: 'write',  description: 'Create and edit users, roles, departments' },
  { id: 'access_control:admin',key: 'access_control:admin',label: 'Admin Access Control',  module: 'Access Control',      section: 'Administration', action: 'admin',  description: 'Full access control administration' },
  { id: 'settings:read',       key: 'settings:read',       label: 'View Settings',         module: 'Settings',            section: 'Administration', action: 'read',   description: 'View platform settings' },
  { id: 'settings:write',      key: 'settings:write',      label: 'Edit Settings',         module: 'Settings',            section: 'Administration', action: 'write',  description: 'Update platform settings' },
  { id: 'settings:admin',      key: 'settings:admin',      label: 'Admin Settings',        module: 'Settings',            section: 'Administration', action: 'admin',  description: 'Full settings administration' },
  { id: 'notifications:read',  key: 'notifications:read',  label: 'View Notifications',    module: 'Notifications',       section: 'Administration', action: 'read',   description: 'View platform notifications' },
  { id: 'notifications:admin', key: 'notifications:admin', label: 'Admin Notifications',   module: 'Notifications',       section: 'Administration', action: 'admin',  description: 'Configure notification rules' },
]

export const PERMISSION_SECTIONS = Array.from(new Set(PERMISSIONS.map(p => p.section)))

export const PERMISSION_MODULES_BY_SECTION: Record<string, string[]> = {}
for (const p of PERMISSIONS) {
  if (!PERMISSION_MODULES_BY_SECTION[p.section]) PERMISSION_MODULES_BY_SECTION[p.section] = []
  if (!PERMISSION_MODULES_BY_SECTION[p.section].includes(p.module)) {
    PERMISSION_MODULES_BY_SECTION[p.section].push(p.module)
  }
}

export const ALL_PERMISSION_IDS = PERMISSIONS.map(p => p.id)
export const READ_EXPORT_IDS = PERMISSIONS.filter(p => p.action === 'read' || p.action === 'export').map(p => p.id)
